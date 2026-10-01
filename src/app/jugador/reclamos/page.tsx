import type { Metadata } from "next";
import { createComplaintAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis reclamos", robots: { index: false, follow: false } };

const categoryLabels = { court_unavailable: "Cancha no disponible", venue_closed: "Complejo cerrado", payment_issue: "Problema de pago", facility_mismatch: "Instalación diferente", cancellation: "Cancelación", other: "Otro" } as const;
const statusLabels = { open: "Abierto", in_review: "En revisión", resolved: "Resuelto", rejected: "Rechazado" } as const;

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const query = await searchParams;
  const supabase = await createClient();
  const [bookingsResult, complaintsResult] = await Promise.all([
    supabase.from("bookings").select("id, public_code, starts_at, status, venues(commercial_name), courts!bookings_court_id_fkey(name)").eq("player_id", account.user.id).in("status", ["confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded_partial"]).order("starts_at", { ascending: false }).limit(30),
    supabase.from("complaints").select("*, venues(commercial_name), bookings(public_code)").eq("player_id", account.user.id).order("created_at", { ascending: false }),
  ]);
  const usedBookings = new Set((complaintsResult.data ?? []).map((item) => item.booking_id));
  const eligible = (bookingsResult.data ?? []).filter((booking) => !usedBookings.has(booking.id));

  return <PrivateShell title="Reclamos" description="Reporta un problema vinculado a una reserva verificable." links={[...playerNavigation]}>{query.estado === "ok" ? <p className="form-feedback form-feedback--success">Reclamo registrado. El equipo CANCHEA lo revisará.</p> : null}{query.estado === "error" ? <p className="form-feedback form-feedback--error">No pudimos registrar el reclamo. Revisa el plazo y los datos.</p> : null}<section className="private-card dashboard-section"><p className="eyebrow">Nuevo reclamo</p><h2>Cuéntanos qué ocurrió</h2>{eligible.length ? <form action={createComplaintAction} className="operations-form"><label>Reserva<select name="booking_id" required>{eligible.map((booking) => <option key={booking.id} value={booking.id}>{booking.public_code} · {booking.venues?.commercial_name} · {formatBookingDate(booking.starts_at)}</option>)}</select></label><label>Categoría<select name="category" required>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Descripción<textarea minLength={10} maxLength={2000} name="description" required rows={5} /></label><button className="button button--primary" type="submit">Enviar reclamo</button></form> : <p className="empty-copy">No tienes reservas elegibles sin reclamo.</p>}</section><section className="private-card dashboard-section"><p className="eyebrow">Seguimiento</p><h2>Reclamos registrados</h2><div className="operations-list">{(complaintsResult.data ?? []).map((complaint) => <article key={complaint.id}><div><span className={`status-badge status-badge--${complaint.status}`}>{statusLabels[complaint.status]}</span><h3>{complaint.venues?.commercial_name}</h3><p>{categoryLabels[complaint.category]} · {complaint.bookings?.public_code}</p><small>{complaint.description}</small>{complaint.resolution_note ? <small><strong>Resolución:</strong> {complaint.resolution_note}</small> : null}</div></article>)}</div>{!complaintsResult.data?.length ? <p className="empty-copy">No registraste reclamos.</p> : null}</section></PrivateShell>;
}
