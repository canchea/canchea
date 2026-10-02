import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";
import { VenueSwitcher } from "@/components/venues/venue-switcher";

export const metadata: Metadata = { title: "Calendario de reservas", robots: { index: false, follow: false } };

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default async function OwnerCalendarPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string }> }) {
  const account = await requireRole("venue_owner");
  const query = await searchParams;
  const view = ["day", "week", "month"].includes(query.vista ?? "") ? query.vista! : "week";
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(query.fecha ?? "") ? query.fecha! : dateKey(new Date());
  const start = new Date(`${selected}T00:00:00-04:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + (view === "day" ? 1 : view === "week" ? 7 : 31));
  const supabase = await createClient();
  const { venues: ownerVenues, activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase.from("venues").select("id, commercial_name").eq("id", activeVenueId).eq("owner_id", account.user.id).maybeSingle();
  const { data } = venue ? await supabase.from("bookings").select("id, public_code, status, starts_at, ends_at, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name)").eq("venue_id", venue.id).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at") : { data: [] };
  const bookings = data ?? [];
  const grouped = Map.groupBy(bookings, (booking) => dateKey(new Date(booking.starts_at)));

  return <PrivateShell title="Calendario" description="Vista diaria, semanal o mensual de todas las canchas." links={[...ownerNavigation]}><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/calendario" venues={ownerVenues} /><section className="private-card dashboard-section"><div className="calendar-toolbar"><div><Link className={view === "day" ? "active" : ""} href={`/propietario/calendario?vista=day&fecha=${selected}`}>Día</Link><Link className={view === "week" ? "active" : ""} href={`/propietario/calendario?vista=week&fecha=${selected}`}>Semana</Link><Link className={view === "month" ? "active" : ""} href={`/propietario/calendario?vista=month&fecha=${selected}`}>Mes</Link></div><form><input name="vista" type="hidden" value={view} /><input defaultValue={selected} name="fecha" type="date" /><button className="button button--secondary" type="submit">Ir</button></form></div><div className={`booking-calendar booking-calendar--${view}`}>{[...grouped.entries()].map(([date, entries]) => <section key={date}><time>{new Intl.DateTimeFormat("es-BO", { dateStyle: "full", timeZone: "America/La_Paz" }).format(new Date(`${date}T12:00:00-04:00`))}</time><div>{entries.map((booking) => <Link href="/propietario/reservas" key={booking.id}><strong>{new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" }).format(new Date(booking.starts_at))} · {booking.courts?.name}</strong><span>{booking.profiles?.first_name} {booking.profiles?.last_name}</span><small>{bookingStatusLabels[booking.status]} · {booking.public_code}</small></Link>)}</div></section>)}</div>{!bookings.length ? <p className="empty-copy">No hay reservas en el periodo seleccionado.</p> : null}</section></PrivateShell>;
}
