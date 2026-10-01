import type { Metadata } from "next";
import { submitReviewAction } from "@/app/jugador/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { formatBookingDate } from "@/lib/bookings/presentation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis valoraciones", robots: { index: false, follow: false } };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const query = await searchParams;
  const supabase = await createClient();
  const [bookingsResult, reviewsResult] = await Promise.all([
    supabase.from("bookings").select("id, public_code, completed_at, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name)").eq("player_id", account.user.id).eq("status", "completed").order("completed_at", { ascending: false }),
    supabase.from("reviews").select("id, booking_id, rating, comment, created_at, venues(commercial_name), courts(name)").eq("player_id", account.user.id).order("created_at", { ascending: false }),
  ]);
  const reviews = reviewsResult.data ?? [];
  const reviewed = new Set(reviews.map((review) => review.booking_id));
  const pending = (bookingsResult.data ?? []).filter((booking) => !reviewed.has(booking.id));

  return <PrivateShell title="Valoraciones" description="Sólo puedes valorar servicios realmente completados." links={[...playerNavigation]}>{query.estado === "ok" ? <p className="form-feedback form-feedback--success">Gracias. Tu valoración fue publicada.</p> : null}{query.estado === "error" ? <p className="form-feedback form-feedback--error">No pudimos guardar la valoración. Verifica el plazo y que no exista otra.</p> : null}<section className="private-card dashboard-section"><p className="eyebrow">Pendientes</p><h2>Cuenta tu experiencia</h2>{pending.length ? <div className="review-entry-list">{pending.map((booking) => <form action={submitReviewAction} className="review-entry" key={booking.id}><input name="booking_id" type="hidden" value={booking.id} /><div><strong>{booking.venues?.commercial_name}</strong><span>{booking.courts?.name} · {formatBookingDate(booking.starts_at)}</span></div><label>Puntuación<select defaultValue="5" name="rating"><option value="5">5 · Excelente</option><option value="4">4 · Muy buena</option><option value="3">3 · Buena</option><option value="2">2 · Regular</option><option value="1">1 · Mala</option></select></label><label>Comentario opcional<textarea maxLength={1000} name="comment" rows={3} /></label><button className="button button--primary" type="submit">Publicar valoración</button></form>)}</div> : <p className="empty-copy">No tienes valoraciones pendientes.</p>}</section><section className="private-card dashboard-section"><p className="eyebrow">Publicadas</p><h2>Tu historial</h2><div className="operations-list">{reviews.map((review) => <article key={review.id}><div><strong>{review.venues?.commercial_name}</strong><p>{review.courts?.name}</p>{review.comment ? <small>{review.comment}</small> : null}</div><div className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div></article>)}</div>{!reviews.length ? <p className="empty-copy">Aún no publicaste valoraciones.</p> : null}</section></PrivateShell>;
}
