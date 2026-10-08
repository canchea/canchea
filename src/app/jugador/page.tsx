import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { SearchResultCard, type SearchResultWithImage } from "@/components/search/search-result-card";
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

export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const params = await searchParams;
  const supabase = await createClient();
  const today = dateInTimeZone("America/La_Paz");
  const now = new Date().toISOString();
  const loadAvailableCourts = async () => {
    let response = await supabase.rpc("search_available_courts", {
      p_date: today,
      p_sort: "recommended",
      p_limit: 3,
      p_offset: 0,
    });
    if (response.error) {
      response = await supabase.rpc("search_available_courts", {
        p_date: today,
        p_sort: "recommended",
        p_limit: 3,
        p_offset: 0,
      });
    }
    return response;
  };

  const [searchOptions, bookingsResult, nextResult, availabilityResult] = await Promise.all([
    getSearchOptions(),
    supabase.from("bookings").select("id, public_code, status, starts_at, total_price_bob, duration_minutes, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("bookings").select("id, public_code, status, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).in("status", ["confirmed", "in_progress"]).gte("ends_at", now).order("starts_at").limit(1).maybeSingle(),
    loadAvailableCourts(),
  ]);

  const bookings = bookingsResult.data ?? [];
  const nextBooking = nextResult.data;
  const availabilityRows = availabilityResult.data ?? [];
  const imagePaths = availabilityRows.flatMap((row) => row.cover_object_path ? [row.cover_object_path] : []);
  const { data: signedImages } = imagePaths.length
    ? await supabase.storage.from("venue-media").createSignedUrls(imagePaths, 3600)
    : { data: [] };
  const signedByPath = new Map((signedImages ?? []).map((image) => [image.path, image.signedUrl]));
  const availableCourts: SearchResultWithImage[] = availabilityRows.map((row) => ({
    ...row,
    signedCoverUrl: row.cover_object_path ? signedByPath.get(row.cover_object_path) ?? null : null,
  }));

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
          <button className="button button--accent" type="submit"><Icon name="search" size={19} /> Ver canchas disponibles</button>
        </form>
        <ol className="player-booking-steps" aria-label="Pasos para reservar">
          <li><span>1</span><strong>Elige una cancha</strong></li>
          <li><span>2</span><strong>Selecciona fecha y hora</strong></li>
          <li><span>3</span><strong>Confirma tu reserva</strong></li>
        </ol>
      </section>

      <section className="player-discovery-section" aria-labelledby="available-today-title">
        <div className="section-heading-inline">
          <div>
            <p className="eyebrow">Disponibles para reservar</p>
            <h2 id="available-today-title">Canchas con horarios desde hoy</h2>
          </div>
          <Link href={`/buscar?fecha=${today}`}>Ver todas</Link>
        </div>
        {availabilityResult.error ? (
          <div className="search-state search-state--error" role="alert">
            <strong>No pudimos cargar la disponibilidad.</strong>
            <p>Actualiza la pantalla en unos segundos para volver a intentarlo.</p>
          </div>
        ) : availableCourts.length ? (
          <div className="search-result-grid">
            {availableCourts.map((result, index) => <SearchResultCard eager={index === 0} key={result.court_id} result={result} />)}
          </div>
        ) : (
          <div className="search-state">
            <span className="search-state-icon"><Icon name="calendar" size={30} /></span>
            <strong>No encontramos horarios disponibles para hoy.</strong>
            <p>Busca otra fecha para revisar todas las canchas del piloto.</p>
            <Link className="button button--primary" href="/buscar">Buscar otra fecha</Link>
          </div>
        )}
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
