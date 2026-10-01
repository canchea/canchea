import type { Metadata } from "next";
import Link from "next/link";
import { createSettlementAction, processRefundAction, reviewComplaintAction } from "@/app/admin/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { adminNavigation } from "@/config/dashboard-navigation";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Operaciones", robots: { index: false, follow: false } };

const complaintLabels = {
  court_unavailable: "Cancha no disponible",
  venue_closed: "Complejo cerrado",
  payment_issue: "Problema de pago",
  facility_mismatch: "Instalación diferente",
  cancellation: "Cancelación",
  other: "Otro",
} as const;

export default async function AdminOperationsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireRole("super_admin");
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: venues }, { data: bookings }, { data: refunds }, { data: settlements }, { data: complaints }, { data: payments }, { data: audits }] = await Promise.all([
    supabase.from("venues").select("id, commercial_name, status").order("commercial_name"),
    supabase.from("bookings").select("id, public_code, status, starts_at, total_price_bob, deposit_amount_bob, commission_amount_bob, venue_net_amount_bob, courts!bookings_court_id_fkey(name), venues!bookings_venue_id_fkey(commercial_name), profiles!bookings_player_id_fkey(first_name, last_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("refunds").select("id, booking_id, amount_bob, status, reason, requested_at, provider_refund_id, bookings!refunds_booking_id_fkey(public_code)").order("requested_at", { ascending: false }).limit(50),
    supabase.from("settlements").select("id, venue_id, period_start, period_end, amount_bob, status, reference, created_at, venues!settlements_venue_id_fkey(commercial_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("complaints").select("id, category, status, description, resolution_note, created_at, bookings!complaints_booking_id_fkey(public_code), venues!complaints_venue_id_fkey(commercial_name), profiles!complaints_player_id_fkey(first_name, last_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("payment_orders").select("id, provider, status, amount_bob, created_at, bookings!payment_orders_booking_id_fkey(public_code)").order("created_at", { ascending: false }).limit(50),
    supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const notices: Record<string, string> = {
    "reembolso-ok": "El reembolso quedó marcado como procesado y auditado.",
    "reclamo-ok": "El reclamo fue actualizado.",
    "liquidacion-ok": "La liquidación fue creada con sus reservas elegibles.",
    "sin-saldo": "No se encontró saldo elegible para liquidar en ese periodo.",
    error: "No pudimos completar la operación. Revisa los datos e inténtalo nuevamente.",
  };
  const errorNotice = query.estado === "error" || query.estado === "sin-saldo";

  return <PrivateShell title="Operaciones" description="Reservas, cobros, devoluciones, reclamos y liquidaciones desde una sola vista." links={[...adminNavigation]}>
    {query.estado && notices[query.estado] ? <div className={`page-notice page-notice--${errorNotice ? "error" : "success"}`}>{notices[query.estado]}</div> : null}
    <section className="private-card dashboard-section">
      <div className="section-heading-inline"><div><p className="eyebrow">Exportación</p><h2>Datos operativos</h2></div></div>
      <div className="export-links">
        {[["usuarios", "Usuarios"], ["complejos", "Complejos"], ["reservas", "Reservas"], ["pagos", "Pagos"], ["comisiones", "Comisiones"]].map(([entity, label]) => <Link className="button button--secondary" href={`/api/exports/admin/${entity}`} key={entity}>CSV {label}</Link>)}
      </div>
    </section>
    <section className="private-card dashboard-section">
      <div className="section-heading-inline"><div><p className="eyebrow">Finanzas</p><h2>Reembolsos</h2></div><span>{(refunds ?? []).filter((item) => item.status === "pending").length}</span></div>
      <div className="admin-data-list">{(refunds ?? []).map((refund) => <article key={refund.id}><div><strong>{refund.bookings?.public_code} · Bs {Number(refund.amount_bob).toFixed(2)}</strong><span>{refund.reason} · {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeZone: "America/La_Paz" }).format(new Date(refund.requested_at))}</span></div><span className={`booking-status booking-status--${refund.status === "processed" ? "completed" : "pending_payment"}`}>{refund.status}</span>{refund.status === "pending" ? <form action={processRefundAction}><input name="refund_id" type="hidden" value={refund.id} /><input aria-label="Referencia del proveedor" name="provider_refund_id" placeholder="Referencia externa (opcional)" /><ConfirmSubmitButton message="¿Confirmas que el dinero ya fue devuelto al jugador?">Marcar procesado</ConfirmSubmitButton></form> : <small>{refund.provider_refund_id ?? "Procesado"}</small>}</article>)}</div>
      {!refunds?.length ? <p className="empty-copy">No hay reembolsos registrados.</p> : null}
    </section>
    <section className="private-card dashboard-section">
      <div className="section-heading-inline"><div><p className="eyebrow">Soporte</p><h2>Reclamos</h2></div><span>{(complaints ?? []).filter((item) => ["open", "in_review"].includes(item.status)).length}</span></div>
      <div className="admin-data-list">{(complaints ?? []).map((complaint) => <article key={complaint.id}><div><strong>{complaintLabels[complaint.category]} · {complaint.bookings?.public_code}</strong><span>{complaint.profiles?.first_name} {complaint.profiles?.last_name} · {complaint.venues?.commercial_name}</span><p>{complaint.description}</p>{complaint.resolution_note ? <small>Resolución: {complaint.resolution_note}</small> : null}</div><span className={`booking-status booking-status--${complaint.status === "resolved" ? "completed" : complaint.status === "rejected" ? "cancelled" : "pending_payment"}`}>{complaint.status}</span>{["open", "in_review"].includes(complaint.status) ? <form action={reviewComplaintAction}><input name="complaint_id" type="hidden" value={complaint.id} /><select defaultValue={complaint.status === "open" ? "in_review" : "resolved"} name="status"><option value="in_review">En revisión</option><option value="resolved">Resuelto</option><option value="rejected">Rechazado</option></select><textarea minLength={5} name="resolution_note" placeholder="Nota de resolución" rows={2} /><button className="button button--primary" type="submit">Guardar</button></form> : null}</article>)}</div>
      {!complaints?.length ? <p className="empty-copy">No hay reclamos.</p> : null}
    </section>
    <section className="private-card dashboard-section">
      <div className="section-heading-inline"><div><p className="eyebrow">Proveedores</p><h2>Crear liquidación</h2></div></div>
      <form action={createSettlementAction} className="operations-form"><label>Complejo<select name="venue_id" required><option value="">Selecciona</option>{(venues ?? []).filter((venue) => venue.status === "approved").map((venue) => <option key={venue.id} value={venue.id}>{venue.commercial_name}</option>)}</select></label><label>Desde<input name="period_start" required type="date" /></label><label>Hasta<input name="period_end" required type="date" /></label><ConfirmSubmitButton message="¿Crear la liquidación con las reservas elegibles de este periodo?">Crear liquidación</ConfirmSubmitButton></form>
      <div className="admin-data-list compact-list">{(settlements ?? []).map((settlement) => <article key={settlement.id}><div><strong>{settlement.venues?.commercial_name} · Bs {Number(settlement.amount_bob).toFixed(2)}</strong><span>{settlement.period_start} — {settlement.period_end} · {settlement.reference}</span></div><span className="booking-status booking-status--confirmed">{settlement.status}</span></article>)}</div>
    </section>
    <section className="private-card dashboard-section">
      <div className="section-heading-inline"><div><p className="eyebrow">Últimas reservas</p><h2>Trazabilidad</h2></div></div>
      <div className="operations-table" role="region" aria-label="Últimas reservas" tabIndex={0}><table><thead><tr><th>Código</th><th>Jugador</th><th>Complejo / cancha</th><th>Fecha</th><th>Total</th><th>Comisión</th><th>Estado</th></tr></thead><tbody>{(bookings ?? []).map((booking) => <tr key={booking.id}><td><Link href={`/reservar/${booking.id}`}>{booking.public_code}</Link></td><td>{booking.profiles?.first_name} {booking.profiles?.last_name}</td><td>{booking.venues?.commercial_name} / {booking.courts?.name}</td><td>{formatBookingDate(booking.starts_at)}</td><td>Bs {Number(booking.total_price_bob).toFixed(0)}</td><td>Bs {Number(booking.commission_amount_bob).toFixed(2)}</td><td>{bookingStatusLabels[booking.status]}</td></tr>)}</tbody></table></div>
    </section>
    <section className="admin-secondary-grid">
      <article className="private-card dashboard-section"><p className="eyebrow">Cobros</p><h2>Últimos pagos</h2><div className="compact-events">{(payments ?? []).slice(0, 12).map((payment) => <div key={payment.id}><strong>{payment.bookings?.public_code} · Bs {Number(payment.amount_bob).toFixed(2)}</strong><span>{payment.provider} · {payment.status}</span></div>)}</div></article>
      <article className="private-card dashboard-section"><p className="eyebrow">Auditoría</p><h2>Últimos eventos</h2><div className="compact-events">{(audits ?? []).map((audit) => <div key={audit.id}><strong>{audit.action}</strong><span>{audit.entity_type} · {audit.entity_id}</span></div>)}</div></article>
    </section>
  </PrivateShell>;
}
