import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { playerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Área de jugador", robots: { index: false, follow: false } };

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

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}

export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const account = await requireRole("player");
  const params = await searchParams;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [bookingsResult, nextResult, favoritesResult, unreadResult, reviewsResult] = await Promise.all([
    supabase.from("bookings").select("id, public_code, status, starts_at, total_price_bob, duration_minutes, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("bookings").select("id, public_code, status, starts_at, courts!bookings_court_id_fkey(name), venues(commercial_name, zone)").eq("player_id", account.user.id).in("status", ["confirmed", "in_progress"]).gte("ends_at", now).order("starts_at").limit(1).maybeSingle(),
    supabase.from("favorite_venues").select("venue_id", { count: "exact", head: true }).eq("player_id", account.user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", account.user.id).is("read_at", null),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("player_id", account.user.id),
  ]);

  const bookings = bookingsResult.data ?? [];
  const nextBooking = nextResult.data;

  return (
    <PrivateShell title={`Hola, ${account.profile.first_name}`} description="Tus reservas, favoritos, valoraciones y novedades en un solo lugar." links={[...playerNavigation]}>
      {params.estado === "hold-liberado" ? <p className="form-feedback form-feedback--success" role="status">El horario fue liberado correctamente.</p> : null}
      <section className="dashboard-metrics" aria-label="Resumen de cuenta">
        <article><span>Reservas recientes</span><strong>{bookings.length}</strong></article>
        <article><span>Complejos favoritos</span><strong>{favoritesResult.count ?? 0}</strong></article>
        <article><span>Notificaciones nuevas</span><strong>{unreadResult.count ?? 0}</strong></article>
        <article><span>Valoraciones enviadas</span><strong>{reviewsResult.count ?? 0}</strong></article>
      </section>
      <section className="private-card next-booking-card">
        <div><p className="eyebrow">Próxima reserva</p><h2>{nextBooking ? nextBooking.venues?.commercial_name : "Tu próximo partido empieza aquí"}</h2></div>
        {nextBooking ? (
          <div className="next-booking-content">
            <div><strong>{nextBooking.courts?.name}</strong><span>{dateTime(nextBooking.starts_at)} · {nextBooking.venues?.zone}</span></div>
            <div><span className={`booking-status booking-status--${nextBooking.status}`}>{statusLabels[nextBooking.status]}</span><Link className="button button--primary" href={`/reservar/${nextBooking.id}`}>Ver reserva</Link></div>
          </div>
        ) : <div className="empty-action"><p>No tienes reservas próximas.</p><Link className="button button--primary" href="/buscar">Encontrar una cancha</Link></div>}
      </section>
      <section className="dashboard-shortcuts">
        <Link href="/jugador/reservas"><strong>Mis reservas</strong><span>Próximas, canceladas e historial</span></Link>
        <Link href="/jugador/favoritos"><strong>Mis favoritos</strong><span>Complejos y canchas guardadas</span></Link>
        <Link href="/jugador/valoraciones"><strong>Valoraciones pendientes</strong><span>Sólo después de jugar</span></Link>
        <Link href="/jugador/notificaciones"><strong>Notificaciones</strong><span>Confirmaciones y recordatorios</span></Link>
      </section>
      <section className="private-card player-bookings-card">
        <div className="section-heading-inline"><div><p className="eyebrow">Actividad reciente</p><h2>Últimas reservas</h2></div><Link href="/jugador/reservas">Ver todas</Link></div>
        {bookings.length ? <div className="player-booking-list">{bookings.map((booking) => (
          <Link href={`/reservar/${booking.id}`} key={booking.id}><div><strong>{booking.venues?.commercial_name}</strong><span>{booking.courts?.name} · {dateTime(booking.starts_at)}</span></div><div><span className={`booking-status booking-status--${booking.status}`}>{statusLabels[booking.status]}</span><strong>{booking.public_code}</strong></div></Link>
        ))}</div> : <p className="empty-copy">Todavía no iniciaste ninguna reserva.</p>}
      </section>
    </PrivateShell>
  );
}
