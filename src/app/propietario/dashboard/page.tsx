import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";
import { VenueSwitcher } from "@/components/venues/venue-switcher";

export const metadata: Metadata = { title: "Resumen del complejo", robots: { index: false, follow: false } };

function localDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

export default async function OwnerDashboardPage() {
  const account = await requireRole("venue_owner");
  const supabase = await createClient();
  await supabase.rpc("sync_my_venue_booking_states");
  const { venues: ownerVenues, activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase.from("venues").select("id, commercial_name, status, trial_ends_at, subscription_status").eq("id", activeVenueId).eq("owner_id", account.user.id).maybeSingle();
  if (!venue) return <PrivateShell title="Resumen" description="Primero registra tu complejo." links={[...ownerNavigation]}><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/dashboard" venues={ownerVenues} /><section className="private-card"><p>No existe un complejo asociado.</p><Link className="button button--primary" href="/propietario">Registrar complejo</Link></section></PrivateShell>;

  const now = new Date();
  const today = localDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T04:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = localDate(new Date(nextMonth.getTime() - 86_400_000));
  const weekEndDate = new Date(now.getTime() + 7 * 86_400_000);
  const [bookingsResult, schedulesResult, ledgerResult] = await Promise.all([
    supabase.from("bookings").select("id, public_code, status, starts_at, ends_at, duration_minutes, total_price_bob, commission_amount_bob, venue_net_amount_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name)").eq("venue_id", venue.id).gte("starts_at", `${monthStart}T00:00:00-04:00`).lte("starts_at", `${monthEnd}T23:59:59-04:00`).order("starts_at"),
    supabase.from("court_weekly_schedules").select("day_of_week, opens_minute, closes_minute, is_available, courts!inner(venue_id)").eq("courts.venue_id", venue.id),
    supabase.from("ledger_transactions").select("id, kind, booking_id, ledger_entries(account, direction, amount_bob), bookings!ledger_transactions_booking_id_fkey!inner(venue_id)").eq("bookings.venue_id", venue.id).order("created_at", { ascending: false }).limit(1000),
  ]);
  const bookings = bookingsResult.data ?? [];
  const activeStatuses = new Set(["confirmed", "in_progress", "completed", "no_show"]);
  const todayBookings = bookings.filter((booking) => localDate(new Date(booking.starts_at)) === today);
  const weekBookings = bookings.filter((booking) => new Date(booking.starts_at) >= now && new Date(booking.starts_at) < weekEndDate);
  const bookedMinutes = bookings.filter((booking) => activeStatuses.has(booking.status)).reduce((sum, booking) => sum + booking.duration_minutes, 0);
  let capacityMinutes = 0;
  for (let cursor = new Date(`${monthStart}T12:00:00Z`); localDate(cursor) <= monthEnd; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const day = (cursor.getUTCDay() + 6) % 7;
    capacityMinutes += (schedulesResult.data ?? []).filter((schedule) => schedule.is_available && schedule.day_of_week === day).reduce((sum, schedule) => sum + Number(schedule.closes_minute ?? 0) - Number(schedule.opens_minute ?? 0), 0);
  }
  const occupancy = capacityMinutes ? Math.min(100, Math.round(bookedMinutes / capacityMinutes * 100)) : 0;
  const ledgerEntries = (ledgerResult.data ?? []).flatMap((transaction) => transaction.ledger_entries);
  const accountBalance = (accountName: string) => ledgerEntries.filter((entry) => entry.account === accountName).reduce((sum, entry) => sum + (entry.direction === "credit" ? Number(entry.amount_bob) : -Number(entry.amount_bob)), 0);
  const upcoming = bookings.filter((booking) => activeStatuses.has(booking.status) && new Date(booking.ends_at) >= now).slice(0, 6);

  return <PrivateShell title={venue.commercial_name} description="Resumen operativo calculado con reservas y movimientos reales." links={[...ownerNavigation]}><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/dashboard" venues={ownerVenues} /><div className="export-links"><Link className="button button--secondary" href="/api/exports/owner/bookings">Descargar reservas CSV</Link></div><section className="dashboard-metrics"><article><span>Reservas hoy</span><strong>{todayBookings.length}</strong></article><article><span>Próximos 7 días</span><strong>{weekBookings.length}</strong></article><article><span>Ocupación del mes</span><strong>{occupancy}%</strong></article><article><span>Saldo por liquidar</span><strong>Bs {accountBalance("venue_payable").toFixed(0)}</strong></article><article><span>GMV del mes</span><strong>Bs {bookings.filter((booking) => activeStatuses.has(booking.status)).reduce((sum, booking) => sum + Number(booking.total_price_bob), 0).toFixed(0)}</strong></article><article><span>Comisiones devengadas</span><strong>Bs {accountBalance("platform_commission_revenue").toFixed(0)}</strong></article></section>{venue.subscription_status === "trial" ? <div className="page-notice page-notice--success">Prueba gratuita activa hasta {venue.trial_ends_at ? localDate(new Date(venue.trial_ends_at)) : "fecha por confirmar"}. La comisión por reserva continúa vigente.</div> : null}<section className="private-card dashboard-section"><div className="section-heading-inline"><div><p className="eyebrow">Próximas reservas</p><h2>Operación inmediata</h2></div><Link href="/propietario/reservas">Gestionar</Link></div><div className="operations-list">{upcoming.map((booking) => <article key={booking.id}><div><span className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</span><h3>{booking.courts?.name}</h3><p>{booking.profiles?.first_name} {booking.profiles?.last_name} · {formatBookingDate(booking.starts_at)}</p></div><strong>{booking.public_code}</strong></article>)}</div>{!upcoming.length ? <p className="empty-copy">No hay reservas próximas.</p> : null}</section></PrivateShell>;
}
