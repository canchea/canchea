import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { dateInTimeZone } from "@/lib/courts/time";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis reservas", robots: { index: false, follow: false } };

export default async function PlayerBookingsPage() {
  const account = await requireRole("player");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("id, court_id, public_code, status, starts_at, duration_minutes, total_price_bob, refund_amount_bob, penalty_amount_bob, courts!bookings_court_id_fkey(name), venues(commercial_name, zone, slug)").eq("player_id", account.user.id).order("starts_at", { ascending: false }).limit(100);
  const bookings = data ?? [];
  const upcoming = bookings.filter((booking) => ["pending_payment", "confirmed", "in_progress"].includes(booking.status));
  const history = bookings.filter((booking) => !upcoming.includes(booking));
  const today = dateInTimeZone("America/La_Paz");

  const list = (items: typeof bookings) => items.length ? <div className="operations-list">{items.map((booking) => (
    <article key={booking.id}>
      <div><span className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</span><h3>{booking.venues?.commercial_name}</h3><p>{booking.courts?.name} · {formatBookingDate(booking.starts_at)} · {booking.duration_minutes} min</p></div>
      <div><strong>{booking.public_code}</strong><span>Bs {Number(booking.total_price_bob).toFixed(0)}</span>{Number(booking.refund_amount_bob) > 0 ? <small>Reembolso Bs {Number(booking.refund_amount_bob).toFixed(0)}</small> : null}
        <div className="booking-list-actions">
          <Link href={`/reservar/${booking.id}`}>Ver detalle</Link>
          {!upcoming.includes(booking) && booking.venues?.slug ? <Link className="booking-rebook-link" href={`/complejos/${booking.venues.slug}?${new URLSearchParams({ cancha: booking.court_id, fecha: today, desde: today }).toString()}#disponibilidad`}>Volver a reservar</Link> : null}
          {booking.status === "completed" ? <Link href="/jugador/valoraciones">Valorar</Link> : null}
        </div>
      </div>
    </article>
  ))}</div> : <p className="empty-copy">No hay reservas en esta sección.</p>;

  return <PrivateShell title="Mis reservas" description="Consulta próximas reservas, cancelaciones e historial completo." links={[...playerNavigation]}><section className="private-card dashboard-section"><p className="eyebrow">Próximas</p><h2>Lo que viene</h2>{list(upcoming)}</section><section className="private-card dashboard-section"><p className="eyebrow">Historial</p><h2>Reservas anteriores</h2>{list(history)}</section></PrivateShell>;
}
