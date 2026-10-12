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
  const [{ data }, { data: commissionHolds }] = venue ? await Promise.all([
    supabase.from("bookings").select("id, public_code, status, starts_at, ends_at, duration_minutes, total_price_bob, deposit_amount_bob, remaining_balance_bob, commission_amount_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name, phone_e164)").eq("venue_id", venue.id).order("starts_at", { ascending: false }).limit(150),
    supabase.from("venue_commission_holds").select("booking_id, amount_bob, status").eq("venue_id", venue.id),
  ]) : [{ data: [] }, { data: [] }];
  const bookings = data ?? [];
  const commissionByBooking = new Map((commissionHolds ?? []).map((hold) => [hold.booking_id, hold]));
  const now = new Date();

  return <PrivateShell title="Reservas" description="Consulta clientes, cobra en el complejo y actualiza cada servicio." links={[...ownerNavigation]}><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/reservas" venues={ownerVenues} />{query.estado === "ok" ? <p className="form-feedback form-feedback--success">Reserva actualizada correctamente.</p> : null}{query.estado === "error" ? <p className="form-feedback form-feedback--error">La acción no está permitida para el estado o la hora actual.</p> : null}<section className="private-card dashboard-section"><p className="eyebrow">Operación</p><h2>{venue?.commercial_name ?? "Mi complejo"}</h2><p className="owner-reservation-help">El jugador reserva gratis y paga el total directamente en tu complejo. La comisión retenida solo se descuenta cuando marcas el servicio como finalizado.</p><div className="operations-list owner-reservation-list">{bookings.map((booking) => { const ended = new Date(booking.ends_at) <= now; const mayStart = booking.status === "confirmed" && new Date(booking.starts_at).getTime() <= now.getTime() + 15 * 60_000; const mayComplete = booking.status === "in_progress" && new Date(booking.ends_at).getTime() <= now.getTime() + 15 * 60_000; const hold = commissionByBooking.get(booking.id); const collectAtVenue = Number(booking.deposit_amount_bob) > 0 ? Number(booking.remaining_balance_bob) : Number(booking.total_price_bob); return <article id={`reserva-${booking.id}`} key={booking.id}><div><span className={`booking-status booking-status--${booking.status}`}>{bookingStatusLabels[booking.status]}</span><h3>{booking.courts?.name} · {booking.public_code}</h3><p>{formatBookingDate(booking.starts_at)} · {booking.duration_minutes} min</p><small>Cliente: {booking.profiles?.first_name} {booking.profiles?.last_name} · {booking.profiles?.phone_e164}</small><small><strong>Cobrar en el complejo: Bs {collectAtVenue.toFixed(0)}</strong></small><small>Comisión CANCHEA: Bs {Number(hold?.amount_bob ?? booking.commission_amount_bob).toFixed(2)} · {hold?.status === "held" ? "retenida" : hold?.status === "captured" ? "cobrada" : hold?.status === "released" ? "liberada" : "histórica"}</small></div><div className="operation-actions">{mayStart ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="start" /><button className="button button--primary" type="submit">Iniciar servicio</button></form> : null}{mayComplete ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="complete" /><ConfirmSubmitButton message="¿Confirmas que el servicio finalizó y cobraste al jugador? La comisión retenida se descontará.">Finalizar servicio</ConfirmSubmitButton></form> : null}{ended && ["confirmed", "in_progress"].includes(booking.status) ? <form action={ownerBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><input name="booking_action" type="hidden" value="no_show" /><ConfirmSubmitButton className="button danger-button" message="¿Confirmas que el jugador no asistió? La comisión retenida volverá a tu saldo y la inasistencia quedará registrada.">Marcar no-show</ConfirmSubmitButton></form> : null}</div></article>; })}</div>{!bookings.length ? <p className="empty-copy">Aún no existen reservas para el complejo.</p> : null}</section></PrivateShell>;
}
