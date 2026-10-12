import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelBookingAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { playerNavigation } from "@/config/dashboard-navigation";
import { googleCalendarUrl } from "@/lib/bookings/calendar";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detalle de reserva", robots: { index: false, follow: false } };

const statusLabels = {
  pending_payment: "Pendiente (flujo anterior)",
  confirmed: "Confirmada",
  in_progress: "En juego",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
  expired: "Vencida",
  refunded_partial: "Reembolso parcial",
} as const;

export default async function BookingDetailPage({
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

  const [{ data: court }, { data: history }] = await Promise.all([
    supabase.from("courts").select("name, venues(commercial_name, slug, zone, address), sports(name), sport_modalities(name)").eq("id", booking.court_id).maybeSingle(),
    supabase.from("booking_status_history").select("id, from_status, to_status, reason, created_at").eq("booking_id", booking.id).order("created_at"),
  ]);
  const venue = court?.venues;
  const startsAt = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(booking.starts_at));
  const canCancel = booking.status === "confirmed" && new Date(booking.starts_at) > new Date();
  const legacyDeposit = Number(booking.deposit_amount_bob) > 0;
  const calendarUrl = court?.venues && court.sports ? googleCalendarUrl({ publicCode: booking.public_code, startsAt: booking.starts_at, endsAt: booking.ends_at, sport: court.sports.name, venue: court.venues.commercial_name, court: court.name, address: court.venues.address }) : null;

  return (
    <PrivateShell title={`Reserva ${booking.public_code}`} description="Tu código público identifica esta reserva sin exponer su UUID interno." links={[...playerNavigation]}>
      {estado === "reserva-confirmada" ? <p className="form-feedback form-feedback--success">Reserva confirmada. No realizaste ningún pago online.</p> : null}
      {estado === "cancelada" ? <p className="form-feedback form-feedback--success">Reserva cancelada. El horario volvió a estar disponible.</p> : null}
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
            {legacyDeposit ? <><div><dt>Seña histórica</dt><dd>Bs {Number(booking.deposit_amount_bob).toFixed(0)}</dd></div><div><dt>Saldo en complejo</dt><dd>Bs {Number(booking.remaining_balance_bob).toFixed(0)}</dd></div></> : <div><dt>Pago en complejo</dt><dd>Bs {Number(booking.total_price_bob).toFixed(0)}</dd></div>}
          </dl>

          {booking.status === "confirmed" && !legacyDeposit ? (
            <div className="payment-placeholder payment-confirmed-card">
              <span>Reserva gratuita</span>
              <h3>Tu horario está asegurado</h3>
              <p>No pagaste nada en CANCHEA. Abona Bs {Number(booking.total_price_bob).toFixed(0)} directamente al complejo cuando vayas a jugar.</p>
            </div>
          ) : booking.status === "confirmed" && legacyDeposit ? (
            <div className="payment-placeholder payment-confirmed-card">
              <span>Reserva del piloto anterior</span>
              <h3>Tu horario está asegurado</h3>
              <p>Esta reserva conserva la seña registrada originalmente. Pagarás Bs {Number(booking.remaining_balance_bob).toFixed(0)} en el complejo.</p>
            </div>
          ) : booking.status === "pending_payment" ? (
            <div className="payment-placeholder payment-placeholder--expired">
              <span>Flujo anterior</span>
              <h3>Esta reserva de prueba no fue confirmada</h3>
              <p>Las reservas nuevas ya no requieren pagos online. Busca nuevamente el horario para usar el flujo actual.</p>
            </div>
          ) : booking.status === "expired" ? (
            <div className="payment-placeholder payment-placeholder--expired"><span>Tiempo agotado</span><h3>El horario fue liberado automáticamente</h3><p>Puedes buscarlo nuevamente si todavía está disponible.</p></div>
          ) : null}

          <div className="booking-checkout-actions">
            {calendarUrl && booking.status === "confirmed" ? <a className="button button--secondary" href={calendarUrl} rel="noreferrer" target="_blank">Agregar a Google Calendar</a> : null}
            {canCancel ? <form action={cancelBookingAction}><input name="booking_id" type="hidden" value={booking.id} /><ConfirmSubmitButton className="button danger-button" message="¿Confirmas que deseas cancelar? El horario quedará libre para otro jugador.">Cancelar reserva</ConfirmSubmitButton></form> : null}
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
