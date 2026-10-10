import type { Metadata } from "next";
import { ownerBookingAction } from "@/app/propietario/reservas/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";
import { VenueSwitcher } from "@/components/venues/venue-switcher";

export const metadata: Metadata = { title: "Reservas del complejo", robots: { index: false, follow: false } };

export default async function OwnerBookingsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("venue_owner");
  const query = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("sync_my_venue_booking_states");
  const { venues: ownerVenues, activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase.from("venues").select("id, commercial_name").eq("id", activeVenueId).eq("owner_id", account.user.id).maybeSingle();
  const { data } = venue ? await supabase.from("bookings").select("id, public_code, status, starts_at, ends_at, duration_minutes, total_price_bob, remaining_balance_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name, phone_e164)").eq("venue_id", venue.id).order("starts_at", { ascending: false }).limit(150) : { data: [] };
  const bookings = data ?? [];
  const now = new Date();

  return <PrivateShell title="Reservas" description="Consulta clientes y actualiza el servicio sin crear reservas manuales." links={[...ownerNavigation]}><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/reservas" venues={ownerVenues} />{query.estado === "ok" ? <p className="form-feedback form-feedback--success">Reserva actualizada correctamente.</p> : null}{query.estado === "error" ? <p className="form-feedback form-feedback--error">La acción no está permitida para el estado o la hora actual.</p> : null}<section className="private-card dashboard-section"><p className="eyebrow">Operación</p><h2>{venue?.commercial_name ?? "Mi complejo"}</h2><div className="operations-list owner-reservation-list">{bookings.map((booking) => { const ended = new Date(booking.ends_at) <= now; const mayStart = booking.status === "confirmed" && new Date(booking.starts_at).getTime() <= now.getTime() + 15 * 60_000; const mayComplete = booking.status === "in_progress" && new Date(booking.ends_at).getTime() <= now.getTime() + 15 * 60_000; return <article id={`reserva-${booking.id}`} key={booking.id}><div><span className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</span><h3>{booking.courts?.name} · {booking.public_code}</h3><p>{formatBookingDate(booking.starts_at)} · {booking.duration_minutes} min</p><small>Cliente: {booking.profiles?.first_name} {booking.profiles?.last_name} · {booking.profiles?.phone_e164}</small><small>Saldo a cobrar en complejo: Bs {Number(booking.remaining_balance_bob).toFixed(0)}</small></div><div className="operation-actions">{mayStart ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="start" /><button className="button button--primary" type="submit">Iniciar servicio</button></form> : null}{mayComplete ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="complete" /><ConfirmSubmitButton message="¿Confirmas que el servicio finalizó?">Finalizar servicio</ConfirmSubmitButton></form> : null}{ended && ["confirmed", "in_progress"].includes(booking.status) ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="no_show" /><ConfirmSubmitButton className="button danger-button" message="¿Confirmas que el jugador no asistió? Se aplicará la penalización completa.">Marcar no-show</ConfirmSubmitButton></form> : null}</div></article>; })}</div>{!bookings.length ? <p className="empty-copy">Aún no existen reservas para el complejo.</p> : null}</section></PrivateShell>;
}
