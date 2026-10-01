import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis reservas", robots: { index: false, follow: false } };

export default async function PlayerBookingsPage() {
  const account = await requireRole("player");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("id, public_code, status, starts_at, duration_minutes, total_price_bob, refund_amount_bob, penalty_amount_bob, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).order("starts_at", { ascending: false }).limit(100);
  const bookings = data ?? [];
  const upcoming = bookings.filter((booking) => ["pending_payment", "confirmed", "in_progress"].includes(booking.status));
  const history = bookings.filter((booking) => !upcoming.includes(booking));

  const list = (items: typeof bookings) => items.length ? <div className="operations-list">{items.map((booking) => (
    <article key={booking.id}><div><span className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</span><h3>{booking.venues?.commercial_name}</h3><p>{booking.courts?.name} · {formatBookingDate(booking.starts_at)} · {booking.duration_minutes} min</p></div><div><strong>{booking.public_code}</strong><span>Bs {Number(booking.total_price_bob).toFixed(0)}</span>{Number(booking.refund_amount_bob) > 0 ? <small>Reembolso Bs {Number(booking.refund_amount_bob).toFixed(0)}</small> : null}<Link href={`/reservar/${booking.id}`}>Ver detalle</Link></div></article>
  ))}</div> : <p className="empty-copy">No hay reservas en esta sección.</p>;

  return <PrivateShell title="Mis reservas" description="Consulta próximas reservas, cancelaciones e historial completo." links={[...playerNavigation]}><section className="private-card dashboard-section"><p className="eyebrow">Próximas</p><h2>Lo que viene</h2>{list(upcoming)}</section><section className="private-card dashboard-section"><p className="eyebrow">Historial</p><h2>Reservas anteriores</h2>{list(history)}</section></PrivateShell>;
}
