import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { LocationSortButton } from "@/components/search/location-sort-button";
import { PlayerDiscoveryCard } from "@/components/search/player-discovery-card";
import type { SearchResultWithImage } from "@/components/search/search-result-card";
import { Icon } from "@/components/ui/icon";
import { playerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { dateInTimeZone } from "@/lib/courts/time";
import { getSearchOptions } from "@/lib/search/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reservar cancha", robots: { index: false, follow: false } };

const statusLabels = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  in_progress: "En juego",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
  expired: "Hold vencido",
  refunded_partial: "Reembolso parcial",
} as const;

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}

function uniqueVenues(results: SearchResultWithImage[], limit = 4) {
  const venueIds = new Set<string>();
  return results.filter((result) => {
    if (venueIds.has(result.venue_id) || venueIds.size >= limit) return false;
    venueIds.add(result.venue_id);
    return true;
  });
}

function DiscoverySection({
  id,
  eyebrow,
  title,
  description,
  badge,
  results,
  href,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  results: SearchResultWithImage[];
  href: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="player-discovery-section" aria-labelledby={`${id}-title`}>
      <div className="player-discovery-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="player-discovery-heading-actions">
          {action}
          <Link href={href}>Ver todas</Link>
        </div>
      </div>
      {results.length ? (
        <div className="player-discovery-rail">
          {results.map((result, index) => (
            <PlayerDiscoveryCard badge={badge} eager={id === "cerca" && index === 0} key={`${id}-${result.court_id}`} result={result} />
          ))}
        </div>
      ) : (
        <div className="player-discovery-empty">
          <Icon name="calendar" size={24} />
          <div><strong>Aún no hay opciones para mostrar aquí.</strong><p>Prueba otra fecha para revisar toda la disponibilidad.</p></div>
        </div>
      )}
    </section>
  );
}

export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const params = await searchParams;
  const supabase = await createClient();
  const today = dateInTimeZone("America/La_Paz");
  const now = new Date().toISOString();
  const loadAvailableCourts = async (sort: "recommended" | "rating" | "popularity" | "newest", limit: number) => {
    let response = await supabase.rpc("search_available_courts", {
      p_date: today,
      p_sort: sort,
      p_limit: limit,
      p_offset: 0,
    });
    if (response.error) {
      response = await supabase.rpc("search_available_courts", {
        p_date: today,
        p_sort: sort,
        p_limit: limit,
        p_offset: 0,
      });
    }
    return response;
  };

  const [searchOptions, bookingsResult, nextResult, lastPlayedResult, nearbyResult, ratedResult, popularResult, newestResult] = await Promise.all([
    getSearchOptions(),
    supabase.from("bookings").select("id, public_code, status, starts_at, total_price_bob, duration_minutes, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("bookings").select("id, public_code, status, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).in("status", ["confirmed", "in_progress"]).gte("ends_at", now).order("starts_at").limit(1).maybeSingle(),
    supabase.from("bookings").select("court_id, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone, slug)").eq("player_id", account.user.id).eq("status", "completed").order("starts_at", { ascending: false }).limit(1).maybeSingle(),
    loadAvailableCourts("recommended", 8),
    loadAvailableCourts("rating", 8),
    loadAvailableCourts("popularity", 8),
    loadAvailableCourts("newest", 8),
  ]);

  const bookings = bookingsResult.data ?? [];
  const nextBooking = nextResult.data;
  const lastPlayed = lastPlayedResult.data;
  const allRows = [...(nearbyResult.data ?? []), ...(ratedResult.data ?? []), ...(popularResult.data ?? []), ...(newestResult.data ?? [])];
  const uniqueRows = [...new Map(allRows.map((row) => [row.court_id, row])).values()];
  const imagePaths = [...new Set(uniqueRows.flatMap((row) => row.cover_object_path ? [row.cover_object_path] : []))];
  const venueIds = [...new Set(uniqueRows.map((row) => row.venue_id))];
  const [signedImagesResult, ratingsResult] = await Promise.all([
    imagePaths.length
      ? supabase.storage.from("venue-media").createSignedUrls(imagePaths, 3600)
      : Promise.resolve({ data: [] }),
    venueIds.length
      ? supabase.from("venues").select("id, rating_average, review_count").in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);
  const signedImages = signedImagesResult.data ?? [];
  const signedByPath = new Map((signedImages ?? []).map((image) => [image.path, image.signedUrl]));
  const ratingByVenue = new Map((ratingsResult.data ?? []).map((venue) => [venue.id, venue]));
  const decorate = (rows: typeof allRows): SearchResultWithImage[] => rows.map((row) => ({
      ...row,
      signedCoverUrl: row.cover_object_path ? signedByPath.get(row.cover_object_path) ?? null : null,
      ratingAverage: Number(ratingByVenue.get(row.venue_id)?.rating_average ?? 0) || null,
      reviewCount: Number(ratingByVenue.get(row.venue_id)?.review_count ?? 0),
      nextSlots: [{ slotDate: row.slot_date, startTime: row.start_time, priceBob: Number(row.price_bob) }],
    }));
  const nearbyCourts = uniqueVenues(decorate(nearbyResult.data ?? []));
  const ratedCourts = uniqueVenues(decorate(ratedResult.data ?? []));
  const popularCourts = uniqueVenues(decorate(popularResult.data ?? []));
  const newestCourts = uniqueVenues(decorate(newestResult.data ?? []));
  const city = account.profile.city ?? "Santa Cruz de la Sierra";
  const discoveryError = nearbyResult.error ?? ratedResult.error ?? popularResult.error ?? newestResult.error;

  return (
    <PrivateShell
      description="Elige una cancha, revisa el calendario y asegura tu horario."
      hideHeading
      links={[...playerNavigation]}
      title="Reservar cancha"
    >
      {params.estado === "hold-liberado" ? <p className="form-feedback form-feedback--success" role="status">El horario fue liberado correctamente.</p> : null}

      <section className="player-booking-hero" aria-labelledby="player-booking-title">
        <div className="player-booking-intro">
          <p className="eyebrow"><Icon name="spark" size={17} /> Hola, {account.profile.first_name}</p>
          <h1 id="player-booking-title">¿Dónde quieres jugar?</h1>
          <p>Selecciona el deporte y la zona. Después podrás elegir una cancha y revisar su calendario completo.</p>
        </div>
        <form action="/buscar" className="player-booking-form" method="get" aria-label="Comenzar una reserva">
          <label>
            <span><Icon name="whistle" size={18} /> Deporte</span>
            <select defaultValue="futbol" name="deporte">
              <option value="">Todos los deportes</option>
              {searchOptions.sports.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
            </select>
          </label>
          <label>
            <span><Icon name="location" size={18} /> Zona</span>
            <select defaultValue="" name="zona">
              <option value="">Cualquier zona</option>
              {searchOptions.zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </label>
          <label>
            <span><Icon name="calendar" size={18} /> Fecha</span>
            <input defaultValue={today} min={today} name="fecha" type="date" />
          </label>
          <label>
            <span><Icon name="clock" size={18} /> Hora</span>
            <input name="hora" step="3600" type="time" />
          </label>
          <button className="button button--accent" type="submit"><Icon name="search" size={19} /> Ver canchas disponibles</button>
        </form>
        <ol className="player-booking-steps" aria-label="Pasos para reservar">
          <li><span>1</span><strong>Elige una cancha</strong></li>
          <li><span>2</span><strong>Selecciona fecha y hora</strong></li>
          <li><span>3</span><strong>Confirma tu reserva</strong></li>
        </ol>
      </section>

      <section className="private-card next-booking-card">
        <div><p className="eyebrow">Tu próxima reserva</p><h2>{nextBooking ? nextBooking.venues?.commercial_name : "Todavía no tienes un partido programado"}</h2></div>
        {nextBooking ? (
          <div className="next-booking-content">
            <div><strong>{nextBooking.courts?.name}</strong><span>{dateTime(nextBooking.starts_at)} · {nextBooking.venues?.zone}</span></div>
            <div><span className={`booking-status booking-status--${nextBooking.status}`}>{statusLabels[nextBooking.status]}</span><Link className="button button--primary" href={`/reservar/${nextBooking.id}`}>Ver reserva</Link></div>
          </div>
        ) : <div className="empty-action"><p>Empieza eligiendo una de las canchas disponibles.</p><Link className="button button--secondary" href="/buscar">Explorar todas</Link></div>}
      </section>

      {lastPlayed?.venues?.slug ? (
        <section className="player-rebook-card" aria-labelledby="rebook-title">
          <div className="player-rebook-icon"><Icon name="calendar" size={25} /></div>
          <div><p className="eyebrow">Basado en tu historial</p><h2 id="rebook-title">¿Volvemos a {lastPlayed.venues.commercial_name}?</h2><p>{lastPlayed.courts?.name} · {lastPlayed.venues.zone}</p></div>
          <Link className="button button--primary" href={`/complejos/${lastPlayed.venues.slug}?${new URLSearchParams({ cancha: lastPlayed.court_id, fecha: today, desde: today }).toString()}#disponibilidad`}>Volver a reservar</Link>
        </section>
      ) : null}

      {discoveryError ? (
        <div className="search-state search-state--error player-discovery-error" role="alert">
          <strong>No pudimos cargar todas las recomendaciones.</strong>
          <p>La búsqueda principal sigue disponible. Actualiza la pantalla para volver a intentarlo.</p>
        </div>
      ) : null}

      <DiscoverySection
        action={<LocationSortButton active={false} />}
        badge="Disponible hoy"
        description={`Opciones con horarios disponibles en ${city}. Activa tu ubicación para ordenarlas por distancia.`}
        eyebrow="Juega hoy"
        href={`/buscar?fecha=${today}`}
        id="cerca"
        results={nearbyCourts}
        title="Cerca de ti"
      />
      <DiscoverySection
        badge="Mejor valorado"
        description="Complejos destacados por reseñas verificadas de jugadores que sí completaron su reserva."
        eyebrow="Elegidos por jugadores"
        href={`/buscar?fecha=${today}&orden=rating`}
        id="valoradas"
        results={ratedCourts}
        title="Mejor valoradas"
      />
      <DiscoverySection
        badge="Más reservado"
        description="Las opciones con mayor actividad real dentro de CANCHEA."
        eyebrow="Favoritas de la comunidad"
        href={`/buscar?fecha=${today}&orden=popularity`}
        id="reservadas"
        results={popularCourts}
        title="Más reservadas"
      />
      <DiscoverySection
        badge="Nuevo"
        description="Complejos aprobados recientemente y listos para recibir reservas."
        eyebrow="Recién llegados"
        href={`/buscar?fecha=${today}&orden=newest`}
        id="nuevos"
        results={newestCourts}
        title="Nuevos complejos"
      />

      <section className="dashboard-shortcuts player-account-shortcuts" aria-label="Opciones de la cuenta">
        <Link href="/jugador/reservas"><strong>Mis reservas</strong><span>Próximas, canceladas e historial</span></Link>
        <Link href="/jugador/favoritos"><strong>Favoritos</strong><span>Complejos y canchas guardadas</span></Link>
        <Link href="/jugador/notificaciones"><strong>Notificaciones</strong><span>Confirmaciones y recordatorios</span></Link>
      </section>

      {bookings.length ? (
        <section className="private-card player-bookings-card">
          <div className="section-heading-inline"><div><p className="eyebrow">Actividad reciente</p><h2>Últimas reservas</h2></div><Link href="/jugador/reservas">Ver todas</Link></div>
          <div className="player-booking-list">{bookings.map((booking) => (
            <Link href={`/reservar/${booking.id}`} key={booking.id}><div><strong>{booking.venues?.commercial_name}</strong><span>{booking.courts?.name} · {dateTime(booking.starts_at)}</span></div><div><span className={`booking-status booking-status--${booking.status}`}>{statusLabels[booking.status]}</span><strong>{booking.public_code}</strong></div></Link>
          ))}</div>
        </section>
      ) : null}
    </PrivateShell>
  );
}
