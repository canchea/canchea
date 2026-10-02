import { getCurrentAccount } from "@/lib/auth/session";
import { csvResponse, fetchAllRows, toCsv } from "@/lib/exports/csv";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account || account.profile?.role !== "venue_owner") return new Response("No autorizado", { status: 403 });
  const supabase = await createClient();
  const { activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase.from("venues").select("id, slug").eq("id", activeVenueId).eq("owner_id", account.user.id).maybeSingle();
  if (!venue) return new Response("Complejo no encontrado", { status: 404 });
  const { data, error } = await fetchAllRows((from, to) => supabase.from("bookings").select("public_code, status, starts_at, ends_at, duration_minutes, total_price_bob, deposit_amount_bob, commission_amount_bob, venue_net_amount_bob, refund_amount_bob, penalty_amount_bob, courts!bookings_court_id_fkey(name), profiles!bookings_player_id_fkey(first_name, last_name)").eq("venue_id", venue.id).order("starts_at", { ascending: false }).order("id").range(from, to));
  if (error) return new Response("No se pudo generar el reporte", { status: 500 });
  return csvResponse(`reservas-${venue.slug}.csv`, toCsv(
    ["codigo", "estado", "inicio", "fin", "duracion_min", "cancha", "jugador", "total_bob", "reserva_bob", "comision_bob", "neto_complejo_bob", "reembolso_bob", "penalizacion_bob"],
    (data ?? []).map((booking) => [booking.public_code, booking.status, booking.starts_at, booking.ends_at, booking.duration_minutes, booking.courts?.name, `${booking.profiles?.first_name ?? ""} ${booking.profiles?.last_name ?? ""}`.trim(), booking.total_price_bob, booking.deposit_amount_bob, booking.commission_amount_bob, booking.venue_net_amount_bob, booking.refund_amount_bob, booking.penalty_amount_bob]),
  ));
}
