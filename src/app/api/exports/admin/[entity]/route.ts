import { getCurrentAccount } from "@/lib/auth/session";
import { csvResponse, toCsv } from "@/lib/exports/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const account = await getCurrentAccount();
  if (!account || account.profile?.role !== "super_admin") return new Response("No autorizado", { status: 403 });
  const { entity } = await params;
  const supabase = await createClient();
  if (entity === "usuarios") {
    const { data, error } = await supabase.from("profiles").select("id, role, first_name, last_name, phone_e164, city, onboarding_completed_at, created_at").order("created_at", { ascending: false });
    if (error) return new Response("Error de exportación", { status: 500 });
    return csvResponse("canchea-usuarios.csv", toCsv(["id", "rol", "nombre", "apellido", "telefono", "ciudad", "onboarding", "creado"], (data ?? []).map((row) => [row.id, row.role, row.first_name, row.last_name, row.phone_e164, row.city, row.onboarding_completed_at, row.created_at])));
  }
  if (entity === "complejos") {
    const { data, error } = await supabase.from("venues").select("id, commercial_name, slug, status, city, zone, rating_average, review_count, subscription_status, trial_ends_at, created_at").order("created_at", { ascending: false });
    if (error) return new Response("Error de exportación", { status: 500 });
    return csvResponse("canchea-complejos.csv", toCsv(["id", "nombre", "slug", "estado", "ciudad", "zona", "calificacion", "valoraciones", "suscripcion", "fin_prueba", "creado"], (data ?? []).map((row) => [row.id, row.commercial_name, row.slug, row.status, row.city, row.zone, row.rating_average, row.review_count, row.subscription_status, row.trial_ends_at, row.created_at])));
  }
  if (entity === "reservas" || entity === "comisiones") {
    const { data, error } = await supabase.from("bookings").select("id, public_code, status, starts_at, ends_at, total_price_bob, deposit_amount_bob, commission_amount_bob, venue_net_amount_bob, refund_amount_bob, penalty_amount_bob, venues!bookings_venue_id_fkey(commercial_name), courts!bookings_court_id_fkey(name)").order("created_at", { ascending: false });
    if (error) return new Response("Error de exportación", { status: 500 });
    return csvResponse(`canchea-${entity}.csv`, toCsv(["id", "codigo", "estado", "inicio", "fin", "complejo", "cancha", "total_bob", "reserva_bob", "comision_bob", "neto_bob", "reembolso_bob", "penalizacion_bob"], (data ?? []).map((row) => [row.id, row.public_code, row.status, row.starts_at, row.ends_at, row.venues?.commercial_name, row.courts?.name, row.total_price_bob, row.deposit_amount_bob, row.commission_amount_bob, row.venue_net_amount_bob, row.refund_amount_bob, row.penalty_amount_bob])));
  }
  if (entity === "pagos") {
    const { data, error } = await supabase.from("payment_orders").select("id, booking_id, provider, status, amount_bob, currency, idempotency_key, paid_at, failed_at, created_at, bookings!payment_orders_booking_id_fkey(public_code)").order("created_at", { ascending: false });
    if (error) return new Response("Error de exportación", { status: 500 });
    return csvResponse("canchea-pagos.csv", toCsv(["id", "reserva_id", "codigo", "proveedor", "estado", "monto_bob", "moneda", "idempotencia", "pagado", "fallido", "creado"], (data ?? []).map((row) => [row.id, row.booking_id, row.bookings?.public_code, row.provider, row.status, row.amount_bob, row.currency, row.idempotency_key, row.paid_at, row.failed_at, row.created_at])));
  }
  return new Response("Exportación no encontrada", { status: 404 });
}
