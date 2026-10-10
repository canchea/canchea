import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { VenueSwitcher } from "@/components/venues/venue-switcher";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";

export const metadata: Metadata = { title: "Panel del complejo", robots: { index: false, follow: false } };

const DAY_MS = 86_400_000;
const ACTIVE_BOOKING_STATUSES = new Set(["confirmed", "in_progress", "completed", "no_show"]);
const ACTIONABLE_BOOKING_STATUSES = new Set(["confirmed", "in_progress"]);

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00-04:00`);
}

function shiftDateKey(value: string, days: number) {
  return dateKey(new Date(dateFromKey(value).getTime() + days * DAY_MS));
}

function formatBob(value: number) {
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "full",
    timeZone: "America/La_Paz",
  }).format(value);
}

function formatRangeDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(dateFromKey(value)).replace(".", "");
}

function formatShortDate(value: string) {
  const date = dateFromKey(value);
  return {
    weekday: new Intl.DateTimeFormat("es-BO", { weekday: "short", timeZone: "America/La_Paz" }).format(date).replace(".", ""),
    day: new Intl.DateTimeFormat("es-BO", { day: "numeric", timeZone: "America/La_Paz" }).format(date),
    month: new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "America/La_Paz" }).format(date).replace(".", ""),
  };
}

function MetricCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "primary" }) {
  return (
    <article className={`owner-kpi-card owner-kpi-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default async function OwnerDashboardPage({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  const [account, query] = await Promise.all([requireRole("venue_owner"), searchParams]);
  const supabase = await createClient();
  await supabase.rpc("sync_my_venue_booking_states");

  const { venues: ownerVenues, activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase
    .from("venues")
    .select("id, commercial_name, status, trial_ends_at, subscription_status")
    .eq("id", activeVenueId)
    .eq("owner_id", account.user.id)
    .maybeSingle();

  if (!venue) {
    return (
      <PrivateShell title={`Hola, ${account.profile.first_name}`} description="Registra tu complejo para empezar a recibir reservas." links={[...ownerNavigation]}>
        <VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/dashboard" venues={ownerVenues} />
        <section className="private-card owner-empty-dashboard">
          <span aria-hidden="true">01</span>
          <div><h2>Primero registra tu complejo</h2><p>Completa los datos básicos y envíalos a revisión. Después podrás crear canchas, horarios y precios.</p></div>
          <Link className="button button--primary" href="/propietario">Registrar complejo</Link>
        </section>
      </PrivateShell>
    );
  }

  const now = new Date();
  const today = dateKey(now);
  const selectedStart = /^\d{4}-\d{2}-\d{2}$/.test(query.desde ?? "") ? query.desde! : today;
  const weekStart = new Date(`${selectedStart}T00:00:00-04:00`);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const monthStartKey = `${today.slice(0, 7)}-01`;
  const monthStart = new Date(`${monthStartKey}T00:00:00-04:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const [monthBookingsResult, weekBookingsResult, schedulesResult, courtsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, public_code, status, starts_at, ends_at, duration_minutes, remaining_balance_bob, venue_net_amount_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name)")
      .eq("venue_id", venue.id)
      .gte("starts_at", monthStart.toISOString())
      .lt("starts_at", monthEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("bookings")
      .select("id, public_code, status, starts_at, ends_at, duration_minutes, remaining_balance_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name)")
      .eq("venue_id", venue.id)
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("court_weekly_schedules")
      .select("day_of_week, opens_minute, closes_minute, is_available, courts!inner(venue_id)")
      .eq("courts.venue_id", venue.id),
    supabase
      .from("courts")
      .select("id, name, status")
      .eq("venue_id", venue.id)
      .order("created_at"),
  ]);

  const monthBookings = monthBookingsResult.data ?? [];
  const weekBookings = (weekBookingsResult.data ?? []).filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status));
  const courts = courtsResult.data ?? [];
  const activeCourts = courts.filter((court) => court.status === "active");
  const todayBookings = monthBookings.filter((booking) => dateKey(new Date(booking.starts_at)) === today && ACTIVE_BOOKING_STATUSES.has(booking.status));
  const actionableToday = todayBookings.filter((booking) => ACTIONABLE_BOOKING_STATUSES.has(booking.status));
  const monthCommercialBookings = monthBookings.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status));
  const monthNetIncome = monthCommercialBookings.reduce((sum, booking) => sum + Number(booking.venue_net_amount_bob), 0);
  const todayReceivable = actionableToday.reduce((sum, booking) => sum + Number(booking.remaining_balance_bob), 0);
  const bookedMinutes = monthCommercialBookings.reduce((sum, booking) => sum + booking.duration_minutes, 0);
  let capacityMinutes = 0;

  for (let cursor = new Date(`${monthStartKey}T12:00:00-04:00`); cursor < monthEnd; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const dayOfWeek = (cursor.getUTCDay() + 6) % 7;
    capacityMinutes += (schedulesResult.data ?? [])
      .filter((schedule) => schedule.is_available && schedule.day_of_week === dayOfWeek)
      .reduce((sum, schedule) => sum + Number(schedule.closes_minute ?? 0) - Number(schedule.opens_minute ?? 0), 0);
  }

  const occupancy = capacityMinutes ? Math.min(100, Math.round(bookedMinutes / capacityMinutes * 100)) : 0;
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDateKey(selectedStart, index));
  const bookingsByDay = Map.groupBy(weekBookings, (booking) => dateKey(new Date(booking.starts_at)));
  const nextWeek = shiftDateKey(selectedStart, 7);
  const previousWeek = shiftDateKey(selectedStart, -7);
  const visibleRangeEnd = shiftDateKey(selectedStart, 6);

  return (
    <PrivateShell
      title={`Hola, ${account.profile.first_name}`}
      description={`Aquí tienes el control diario de ${venue.commercial_name}.`}
      eyebrow="Panel del complejo"
      links={[...ownerNavigation]}
      wide
    >
      <VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/dashboard" venues={ownerVenues} />

      <section className="owner-today-bar" aria-label="Resumen del día">
        <div><span>Hoy</span><strong>{formatLongDate(now)}</strong></div>
        <div className="owner-today-actions">
          <Link className="button button--primary" href="/propietario/reservas">Gestionar reservas</Link>
          <Link className="button button--secondary" href="/propietario/calendario">Abrir calendario</Link>
        </div>
      </section>

      <section className="owner-kpi-grid" aria-label="Indicadores principales">
        <MetricCard tone="primary" label="Reservas de hoy" value={String(todayBookings.length)} detail={`${actionableToday.length} requieren seguimiento`} />
        <MetricCard label="Por cobrar hoy" value={`Bs ${formatBob(todayReceivable)}`} detail="Saldo en el complejo" />
        <MetricCard label="Ocupación del mes" value={`${occupancy}%`} detail={`${monthCommercialBookings.length} reservas registradas`} />
        <MetricCard label="Ingreso estimado" value={`Bs ${formatBob(monthNetIncome)}`} detail="Neto del complejo este mes" />
      </section>

      {venue.status !== "approved" ? (
        <div className="page-notice page-notice--error owner-status-notice">
          Tu complejo todavía no está publicado. Completa la configuración para habilitar reservas.
          <Link href="/propietario">Revisar configuración</Link>
        </div>
      ) : null}

      <div className="owner-control-grid">
        <section className="private-card owner-calendar-card" aria-labelledby="owner-calendar-title">
          <div className="owner-card-heading">
            <div><p className="eyebrow">Agenda</p><h2 id="owner-calendar-title">Próximos 7 días</h2><p>{formatRangeDate(selectedStart)} — {formatRangeDate(visibleRangeEnd)}</p></div>
            <div className="owner-calendar-controls" aria-label="Cambiar semana">
              <Link aria-label="Ver los 7 días anteriores" href={`/propietario/dashboard?desde=${previousWeek}`}>←</Link>
              <Link href="/propietario/dashboard">Hoy</Link>
              <Link aria-label="Ver los siguientes 7 días" href={`/propietario/dashboard?desde=${nextWeek}`}>→</Link>
            </div>
          </div>

          <div className="owner-week-grid" aria-label={`Reservas del ${selectedStart} al ${visibleRangeEnd}`}>
            {weekDays.map((day) => {
              const label = formatShortDate(day);
              const dayBookings = bookingsByDay.get(day) ?? [];
              return (
                <section className={day === today ? "owner-day-column owner-day-column--today" : "owner-day-column"} key={day}>
                  <header><span>{label.weekday}</span><strong>{label.day}</strong><small>{label.month}</small></header>
                  <div>
                    {dayBookings.map((booking) => (
                      <Link className={`owner-calendar-booking owner-calendar-booking--${booking.status}`} href={`/propietario/reservas#reserva-${booking.id}`} key={booking.id}>
                        <strong>{formatTime(booking.starts_at)}</strong>
                        <span>{booking.courts?.name ?? "Cancha"}</span>
                        <small>{booking.profiles?.first_name ?? "Jugador"}</small>
                      </Link>
                    ))}
                    {!dayBookings.length ? <span className="owner-day-empty">Sin reservas</span> : null}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="owner-calendar-legend"><span><i /> Reserva</span><small>Desliza horizontalmente para ver todos los días.</small></div>
        </section>

        <aside className="private-card owner-today-card" aria-labelledby="owner-today-title">
          <div className="owner-card-heading">
            <div><p className="eyebrow">Operación</p><h2 id="owner-today-title">Reservas de hoy</h2></div>
            <span>{todayBookings.length}</span>
          </div>
          {todayBookings.length ? (
            <div className="owner-today-list">
              {todayBookings.map((booking) => (
                <Link href={`/propietario/reservas#reserva-${booking.id}`} key={booking.id}>
                  <time>{formatTime(booking.starts_at)}</time>
                  <div><strong>{booking.courts?.name ?? "Cancha"}</strong><span>{booking.profiles?.first_name} {booking.profiles?.last_name}</span></div>
                  <small className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="owner-today-empty"><strong>Día libre</strong><p>No tienes reservas activas para hoy.</p></div>
          )}
          <Link className="owner-card-link" href="/propietario/reservas">Ver todas las reservas →</Link>
        </aside>
      </div>

      <section className="private-card owner-courts-card" aria-labelledby="owner-courts-title">
        <div className="owner-card-heading">
          <div><p className="eyebrow">Tus espacios</p><h2 id="owner-courts-title">Canchas registradas</h2><p>{activeCourts.length} activas de {courts.length}</p></div>
          <Link className="button button--secondary" href="/propietario/canchas">Administrar canchas</Link>
        </div>
        {courts.length ? (
          <div className="owner-court-list">
            {courts.map((court) => (
              <article key={court.id}>
                <span className={`owner-court-status owner-court-status--${court.status}`} aria-hidden="true" />
                <div><strong>{court.name}</strong><small>{court.status === "active" ? "Activa y visible" : court.status === "inactive" ? "Pausada" : "Configuración pendiente"}</small></div>
                <div><Link href={`/propietario/canchas?editar=${court.id}#editor`}>Editar</Link><Link href={`/propietario/disponibilidad?cancha=${court.id}`}>Horarios</Link></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="owner-inline-empty"><p>Aún no registraste ninguna cancha.</p><Link className="button button--primary" href="/propietario/canchas#editor">Registrar cancha</Link></div>
        )}
      </section>

      <section className="owner-quick-links" aria-label="Accesos de configuración">
        <Link href="/propietario/disponibilidad"><strong>Horarios y precios</strong><span>Define cuándo se puede reservar</span></Link>
        <Link href="/propietario"><strong>Datos del complejo</strong><span>Edita información y fotografías</span></Link>
        <Link href="/api/exports/owner/bookings"><strong>Exportar reservas</strong><span>Descarga el historial en CSV</span></Link>
      </section>

      {venue.subscription_status === "trial" ? (
        <p className="owner-trial-note">Prueba gratuita activa hasta {venue.trial_ends_at ? dateKey(new Date(venue.trial_ends_at)) : "fecha por confirmar"}.</p>
      ) : null}
    </PrivateShell>
  );
}
