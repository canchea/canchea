import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import { LocationSortButton } from "@/components/search/location-sort-button";
import { PlayerDiscoveryCard } from "@/components/search/player-discovery-card";
import type { SearchResultWithImage } from "@/components/search/search-result-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Icon } from "@/components/ui/icon";
import { sports } from "@/data/home";
import { requireRole } from "@/lib/auth/session";
import { dateInTimeZone } from "@/lib/courts/time";
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

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function availabilityLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
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
  availability,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  results: SearchResultWithImage[];
  href: string;
  availability: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="venue-section player-discovery-section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <div className="section-heading player-discovery-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}</h2>
            <p>{description}</p>
          </div>
          <div className="player-discovery-heading-actions">
            {action}
            <Link className="text-link" href={href}>Ver todas →</Link>
          </div>
        </div>
        {results.length ? (
          <div className="card-grid player-discovery-grid">
            {results.map((result, index) => (
              <PlayerDiscoveryCard
                availabilityLabel={availability}
                badge={badge}
                eager={id === "cerca" && index === 0}
                key={`${id}-${result.court_id}`}
                result={result}
              />
            ))}
          </div>
        ) : (
          <div className="player-discovery-empty">
            <Icon name="calendar" size={24} />
            <div><strong>Aún no hay opciones para mostrar aquí.</strong><p>Prueba otra fecha para revisar toda la disponibilidad.</p></div>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const params = await searchParams;
  const supabase = await createClient();
  const today = dateInTimeZone("America/La_Paz");
  const now = new Date().toISOString();
  const loadAvailableCourts = async (
    sort: "recommended" | "rating" | "popularity" | "newest",
    limit: number,
    date: string,
  ) => {
    let response = await supabase.rpc("search_available_courts", {
      p_date: date,
      p_sort: sort,
      p_limit: limit,
      p_offset: 0,
    });
    if (response.error) {
      response = await supabase.rpc("search_available_courts", {
        p_date: date,
        p_sort: sort,
        p_limit: limit,
        p_offset: 0,
      });
    }
    return response;
  };

  const personalDataPromise = Promise.all([
    supabase.from("bookings").select("id, public_code, status, starts_at, total_price_bob, duration_minutes, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("bookings").select("id, public_code, status, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).in("status", ["confirmed", "in_progress"]).gte("ends_at", now).order("starts_at").limit(1).maybeSingle(),
    supabase.from("bookings").select("court_id, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone, slug)").eq("player_id", account.user.id).eq("status", "completed").order("starts_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const discoveryDates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const nearbyByDate = await Promise.all(discoveryDates.map((date) => loadAvailableCourts("recommended", 8, date)));
  const availableDateIndex = nearbyByDate.findIndex((response) => !response.error && (response.data?.length ?? 0) > 0);
  const selectedDateIndex = availableDateIndex >= 0 ? availableDateIndex : 0;
  const discoveryDate = discoveryDates[selectedDateIndex];
  const nearbyResult = nearbyByDate[selectedDateIndex];

  const [[bookingsResult, nextResult, lastPlayedResult], ratedResult, popularResult, newestResult] = await Promise.all([
    personalDataPromise,
    loadAvailableCourts("rating", 8, discoveryDate),
    loadAvailableCourts("popularity", 8, discoveryDate),
    loadAvailableCourts("newest", 8, discoveryDate),
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
  const firstName = account.profile.first_name ?? "Jugador";
  const city = account.profile.city ?? "Santa Cruz de la Sierra";
  const nextAvailabilityLabel = availabilityLabel(discoveryDate, today);
  const discoveryError = nearbyResult.error ?? ratedResult.error ?? popularResult.error ?? newestResult.error;

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <SiteHeader player={{ firstName }} />
      <main className="player-home" id="contenido">
        {params.estado === "hold-liberado" ? (
          <div className="container player-home-feedback">
            <p className="form-feedback form-feedback--success" role="status">El horario fue liberado correctamente.</p>
          </div>
        ) : null}

        <section className="hero player-home-hero" aria-labelledby="player-booking-title">
          <div className="hero-media" aria-hidden="true">
            <Image alt="" fill priority sizes="100vw" src="/images/hero-canchea.png" />
            <div className="hero-overlay" />
          </div>
          <div className="container hero-content">
            <div className="hero-copy">
              <p className="eyebrow eyebrow--light"><Icon name="spark" size={17} /> Hola, {firstName}</p>
              <h1 id="player-booking-title">¿Dónde quieres <span>jugar?</span></h1>
              <p>Encuentra una cancha, revisa sus horarios reales y asegura tu próxima partida.</p>
            </div>
            <SearchPanel defaults={{ sport: "futbol", zone: "", date: today, time: "" }} />
          </div>
        </section>

        <section className="sport-strip" aria-label="Deportes disponibles">
          <div className="container sport-grid">
            {sports.map((sport, index) => (
              <Link href={`/buscar?deporte=${encodeURIComponent(sport.name)}&fecha=${discoveryDate}`} key={sport.name} className="sport-link">
                <span className={`sport-symbol sport-symbol--${index + 1}`} aria-hidden="true">{sport.name.charAt(0)}</span>
                <span><strong>{sport.name}</strong><small>{sport.detail}</small></span>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </div>
        </section>

        <section className="player-personal-overview" aria-label="Resumen de tu cuenta">
          <div className="container player-personal-grid">
            <article className="player-upcoming-card">
              <div><p className="eyebrow">Tu próxima reserva</p><h2>{nextBooking ? nextBooking.venues?.commercial_name : "Tu próxima partida empieza aquí"}</h2></div>
              {nextBooking ? (
                <div className="next-booking-content">
                  <div><strong>{nextBooking.courts?.name}</strong><span>{dateTime(nextBooking.starts_at)} · {nextBooking.venues?.zone}</span></div>
                  <div><span className={`booking-status booking-status--${nextBooking.status}`}>{statusLabels[nextBooking.status]}</span><Link className="button button--primary" href={`/reservar/${nextBooking.id}`}>Ver reserva</Link></div>
                </div>
              ) : <div className="empty-action"><p>Explora las canchas disponibles y elige tu horario.</p><Link className="button button--secondary" href={`/buscar?fecha=${discoveryDate}`}>Explorar canchas</Link></div>}
            </article>

            <nav className="player-quick-links" aria-label="Accesos de jugador">
              <Link href="/jugador/reservas"><Icon name="calendar" size={20} /><span><strong>Mis reservas</strong><small>Próximas e historial</small></span></Link>
              <Link href="/jugador/favoritos"><Icon name="star" size={20} /><span><strong>Favoritos</strong><small>Tus canchas guardadas</small></span></Link>
              <Link href="/cuenta"><Icon name="user" size={20} /><span><strong>Mi perfil</strong><small>Datos y seguridad</small></span></Link>
            </nav>
          </div>
        </section>

        {lastPlayed?.venues?.slug ? (
          <div className="container player-rebook-wrap">
            <section className="player-rebook-card" aria-labelledby="rebook-title">
              <div className="player-rebook-icon"><Icon name="calendar" size={25} /></div>
              <div><p className="eyebrow">Basado en tu historial</p><h2 id="rebook-title">¿Volvemos a {lastPlayed.venues.commercial_name}?</h2><p>{lastPlayed.courts?.name} · {lastPlayed.venues.zone}</p></div>
              <Link className="button button--primary" href={`/complejos/${lastPlayed.venues.slug}?${new URLSearchParams({ cancha: lastPlayed.court_id, fecha: discoveryDate, desde: discoveryDate }).toString()}#disponibilidad`}>Volver a reservar</Link>
            </section>
          </div>
        ) : null}

        {discoveryError ? (
          <div className="container">
            <div className="search-state search-state--error player-discovery-error" role="alert">
              <strong>No pudimos cargar todas las recomendaciones.</strong>
              <p>La búsqueda principal sigue disponible. Actualiza la pantalla para volver a intentarlo.</p>
            </div>
          </div>
        ) : null}

        <div className="venue-sections player-venue-sections">
          <DiscoverySection
            action={<LocationSortButton active={false} />}
            availability={nextAvailabilityLabel}
            badge={discoveryDate === today ? "Disponible hoy" : `Disponible ${nextAvailabilityLabel.toLowerCase()}`}
            description={`Canchas con la disponibilidad más próxima en ${city}. Activa tu ubicación para ordenarlas por distancia.`}
            eyebrow="Para tu próxima partida"
            href={`/buscar?fecha=${discoveryDate}`}
            id="cerca"
            results={nearbyCourts}
            title="Cerca de ti"
          />
          <DiscoverySection
            availability={nextAvailabilityLabel}
            badge="Mejor valorado"
            description="Complejos destacados por reseñas verificadas de jugadores que sí completaron su reserva."
            eyebrow="Elegidos por jugadores"
            href={`/buscar?fecha=${discoveryDate}&orden=rating`}
            id="valoradas"
            results={ratedCourts}
            title="Mejor valoradas"
          />
          <DiscoverySection
            availability={nextAvailabilityLabel}
            badge="Más reservado"
            description="Las opciones con mayor actividad real dentro de CANCHEA."
            eyebrow="Favoritas de la comunidad"
            href={`/buscar?fecha=${discoveryDate}&orden=popularity`}
            id="reservadas"
            results={popularCourts}
            title="Más reservadas"
          />
          <DiscoverySection
            availability={nextAvailabilityLabel}
            badge="Nuevo"
            description="Complejos aprobados recientemente y listos para recibir reservas."
            eyebrow="Recién llegados"
            href={`/buscar?fecha=${discoveryDate}&orden=newest`}
            id="nuevos"
            results={newestCourts}
            title="Nuevos complejos"
          />
        </div>

        {bookings.length ? (
          <section className="venue-section player-history-section">
            <div className="container">
              <div className="private-card player-bookings-card">
                <div className="section-heading-inline"><div><p className="eyebrow">Actividad reciente</p><h2>Últimas reservas</h2></div><Link href="/jugador/reservas">Ver todas</Link></div>
                <div className="player-booking-list">{bookings.map((booking) => (
                  <Link href={`/reservar/${booking.id}`} key={booking.id}><div><strong>{booking.venues?.commercial_name}</strong><span>{booking.courts?.name} · {dateTime(booking.starts_at)}</span></div><div><span className={`booking-status booking-status--${booking.status}`}>{statusLabels[booking.status]}</span><strong>{booking.public_code}</strong></div></Link>
                ))}</div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
