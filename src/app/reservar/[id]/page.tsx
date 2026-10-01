import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createMockPaymentOrderAction,
  releaseBookingHoldAction,
  simulateMockPaymentAction,
} from "@/app/reservar/actions";
import { cancelBookingAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { HoldCountdown } from "@/components/bookings/hold-countdown";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { playerNavigation } from "@/config/dashboard-navigation";
import { googleCalendarUrl } from "@/lib/bookings/calendar";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout de reserva", robots: { index: false, follow: false } };

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

export default async function BookingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireRole("player");
  const { id } = await params;
  const { estado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: booking, error } = await supabase.rpc("get_my_booking_checkout", { p_booking_id: id });
  if (error || !booking) notFound();

  const [{ data: court }, { data: history }, { data: paymentOrder }] = await Promise.all([
    supabase.from("courts").select("name, venues(commercial_name, slug, zone, address), sports(name), sport_modalities(name)").eq("id", booking.court_id).maybeSingle(),
    supabase.from("booking_status_history").select("id, from_status, to_status, reason, created_at").eq("booking_id", booking.id).order("created_at"),
    supabase.rpc("get_my_payment_order", { p_booking_id: booking.id }),
  ]);
  const venue = court?.venues;
  const startsAt = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(booking.starts_at));
  const pending = booking.status === "pending_payment" && booking.hold_expires_at;
  const canCancel = booking.status === "confirmed" && new Date(booking.starts_at) > new Date();
  const calendarUrl = court?.venues && court.sports ? googleCalendarUrl({ publicCode: booking.public_code, startsAt: booking.starts_at, endsAt: booking.ends_at, sport: court.sports.name, venue: court.venues.commercial_name, court: court.name, address: court.venues.address }) : null;

  return (
    <PrivateShell title={`Reserva ${booking.public_code}`} description="Tu código público identifica esta reserva sin exponer su UUID interno." links={[...playerNavigation]}>
      {pending ? <HoldCountdown expiresAt={booking.hold_expires_at!} /> : null}
      {estado === "pago-confirmado" ? <p className="form-feedback form-feedback--success">Pago de prueba confirmado. Tu reserva ya está asegurada.</p> : null}
      {estado === "pago-rechazado" || estado === "pago-no-disponible" ? <p className="form-feedback form-feedback--error">No pudimos confirmar el pago. Revisa que el contador siga activo e inténtalo nuevamente.</p> : null}
      {estado === "cancelada-reembolso" ? <p className="form-feedback form-feedback--success">Reserva cancelada. Se generó un reembolso pendiente de Bs {Number(booking.refund_amount_bob).toFixed(0)}.</p> : null}
      {estado === "cancelada" ? <p className="form-feedback form-feedback--success">Reserva cancelada. Por el plazo aplicado no corresponde devolución.</p> : null}
      {estado === "cancelacion-error" ? <p className="form-feedback form-feedback--error">No pudimos cancelar la reserva. Puede haber comenzado o ya tener otro estado.</p> : null}
      <div className="booking-checkout-grid">
        <section className="private-card booking-checkout-card">
          <div className="booking-status-row"><span className={`booking-status booking-status--${booking.status}`}>{statusLabels[booking.status]}</span><strong>{booking.public_code}</strong></div>
          <h2>{venue?.commercial_name}</h2>
          <p>{court?.name} · {court?.sport_modalities?.name}</p>
          <dl className="booking-summary-list">
            <div><dt>Inicio</dt><dd>{startsAt}</dd></div>
            <div><dt>Duración</dt><dd>{booking.duration_minutes} min</dd></div>
            <div><dt>Zona</dt><dd>{venue?.zone}</dd></div>
            <div><dt>Precio total</dt><dd>Bs {Number(booking.total_price_bob).toFixed(0)}</dd></div>
            <div><dt>Seña</dt><dd>Bs {Number(booking.deposit_amount_bob).toFixed(0)}</dd></div>
            <div><dt>Saldo en complejo</dt><dd>Bs {Number(booking.remaining_balance_bob).toFixed(0)}</dd></div>
          </dl>
          {pending && !paymentOrder ? (
            <div className="payment-placeholder mock-payment-card">
              <span>Entorno de prueba</span>
              <h3>Genera la orden por Bs {Number(booking.deposit_amount_bob).toFixed(0)}</h3>
              <p>No se moverá dinero real. Esta orden permite verificar el flujo completo antes de conectar un proveedor QR boliviano.</p>
              <form action={createMockPaymentOrderAction}>
                <input name="booking_id" type="hidden" value={booking.id} />
                <button className="button button--primary" type="submit">Generar pago de prueba</button>
              </form>
            </div>
          ) : pending && paymentOrder?.status === "pending" ? (
            <div className="payment-placeholder mock-payment-card">
              <span>QR Mock · No pagar</span>
              <div className="mock-qr" aria-label="Marcador visual de QR de prueba"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <h3>Orden lista por Bs {Number(paymentOrder.amount_bob).toFixed(0)}</h3>
              <p>Referencia: {paymentOrder.provider_order_id}</p>
              <form action={simulateMockPaymentAction}>
                <input name="booking_id" type="hidden" value={booking.id} />
                <input name="payment_order_id" type="hidden" value={paymentOrder.id} />
                <button className="button button--primary" type="submit">Simular pago aprobado</button>
              </form>
              <small>Solo desarrollo: el botón reproduce una confirmación válida del proveedor sin cobrar dinero.</small>
            </div>
          ) : booking.status === "confirmed" && booking.payment_status === "paid" ? (
            <div className="payment-placeholder payment-confirmed-card">
              <span>Pago confirmado</span>
              <h3>Reserva asegurada</h3>
              <p>Recibimos la seña de Bs {Number(booking.deposit_amount_bob).toFixed(0)}. Pagarás Bs {Number(booking.remaining_balance_bob).toFixed(0)} directamente en el complejo.</p>
            </div>
          ) : booking.status === "expired" ? (
            <div className="payment-placeholder payment-placeholder--expired"><span>Tiempo agotado</span><h3>El horario fue liberado automáticamente</h3><p>Puedes buscarlo nuevamente si todavía está disponible.</p></div>
          ) : null}
          <div className="booking-checkout-actions">
            {pending ? <form action={releaseBookingHoldAction}><input name="booking_id" type="hidden" value={booking.id} /><button className="button button--secondary" type="submit">Liberar horario</button></form> : null}
            {calendarUrl && booking.status === "confirmed" ? <a className="button button--secondary" href={calendarUrl} rel="noreferrer" target="_blank">Agregar a Google Calendar</a> : null}
            {canCancel ? <form action={cancelBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><ConfirmSubmitButton className="button danger-button" message="¿Confirmas que deseas cancelar? La devolución dependerá del tiempo restante.">Cancelar reserva</ConfirmSubmitButton></form> : null}
            <Link className="button button--primary" href="/buscar">Buscar otra cancha</Link>
          </div>
        </section>
        <aside className="private-card booking-history-card">
          <p className="eyebrow">Historial inmutable</p>
          <h2>Cambios de estado</h2>
          <ol>{(history ?? []).map((entry) => <li key={entry.id}><span>{statusLabels[entry.to_status]}</span><time>{new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(entry.created_at))}</time><small>{entry.reason.replaceAll("_", " ")}</small></li>)}</ol>
        </aside>
      </div>
    </PrivateShell>
  );
}
