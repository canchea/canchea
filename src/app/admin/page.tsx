import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { reviewVenueAction } from "@/app/admin/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { adminNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { bookingStatusLabels, formatBookingDate } from "@/lib/bookings/presentation";
import { createClient } from "@/lib/supabase/server";
import type { Booking, BookingStatus, Database } from "@/types/database";
import { venueStatusLabels } from "@/lib/venues/status";

export const metadata: Metadata = { title: "Dashboard administrativo", robots: { index: false, follow: false } };

const DAY_MS = 86_400_000;
const PERIOD_OPTIONS = [7, 30, 90] as const;
const COMMERCIAL_BOOKING_STATUSES = new Set<BookingStatus>(["confirmed", "in_progress", "completed", "no_show"]);

type DashboardPeriod = (typeof PERIOD_OPTIONS)[number];
type DashboardBooking = Pick<Booking, "id" | "public_code" | "status" | "starts_at" | "total_price_bob" | "deposit_amount_bob" | "commission_amount_bob" | "venue_id" | "created_at">;
type LedgerEntry = Pick<Database["public"]["Tables"]["ledger_entries"]["Row"], "account" | "direction" | "amount_bob" | "created_at">;

function getPeriod(value?: string): DashboardPeriod {
  const parsed = Number(value);
  return PERIOD_OPTIONS.includes(parsed as DashboardPeriod) ? parsed as DashboardPeriod : 30;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatBob(value: number) {
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(value);
}

function formatCompactDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", timeZone: "America/La_Paz" }).format(value);
}

function comparisonLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "Sin movimiento" : "Nuevo en este periodo";
  const change = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return `${change >= 0 ? "+" : ""}${change}% vs. periodo anterior`;
}

function accountBalance(entries: LedgerEntry[], account: LedgerEntry["account"]) {
  return entries
    .filter((entry) => entry.account === account)
    .reduce((total, entry) => total + (entry.direction === "credit" ? Number(entry.amount_bob) : -Number(entry.amount_bob)), 0);
}

function platformRevenue(entries: LedgerEntry[]) {
  return accountBalance(entries, "platform_commission_revenue") + accountBalance(entries, "platform_cancellation_revenue");
}

function buildBookingTrend(bookings: DashboardBooking[], days: DashboardPeriod, now: Date) {
  const bucketSize = days === 7 ? 1 : days === 30 ? 3 : 7;
  const bucketCount = Math.ceil(days / bucketSize);
  const rangeStart = new Date(now.getTime() - days * DAY_MS);

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(rangeStart.getTime() + index * bucketSize * DAY_MS);
    const end = new Date(Math.min(now.getTime(), start.getTime() + bucketSize * DAY_MS));
    const inBucket = bookings.filter((booking) => {
      const createdAt = new Date(booking.created_at).getTime();
      return createdAt >= start.getTime() && createdAt < end.getTime();
    });

    return {
      label: formatCompactDate(start),
      bookings: inBucket.length,
      gmv: sum(inBucket.map((booking) => Number(booking.total_price_bob))),
    };
  });
}

function MetricCard({ label, value, detail, featured = false }: { label: string; value: string; detail: string; featured?: boolean }) {
  return (
    <article className={`admin-kpi-card${featured ? " admin-kpi-card--featured" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ revision?: string; periodo?: string }> }) {
  const [account, query] = await Promise.all([requireRole("super_admin"), searchParams]);
  const period = getPeriod(query.periodo);
  const now = new Date();
  const currentStart = new Date(now.getTime() - period * DAY_MS);
  const previousStart = new Date(now.getTime() - period * 2 * DAY_MS);
  const supabase = await createClient();

  const [
    { data: venues },
    { data: bookings },
    { data: ledger },
    profilesResult,
    newProfilesResult,
    pendingRefundsResult,
    activeComplaintsResult,
  ] = await Promise.all([
    supabase.from("venues").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, public_code, status, starts_at, total_price_bob, deposit_amount_bob, commission_amount_bob, venue_id, created_at")
      .gte("created_at", previousStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("account, direction, amount_bob, created_at")
      .gte("created_at", previousStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", currentStart.toISOString()),
    supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("complaints").select("id", { count: "exact", head: true }).in("status", ["open", "in_review"]),
  ]);

  const allVenues = venues ?? [];
  const pending = allVenues.filter((venue) => venue.status === "pending_approval");
  const reviewed = allVenues.filter((venue) => venue.status !== "pending_approval");
  const approvedVenues = allVenues.filter((venue) => venue.status === "approved");
  const bookingRows = (bookings ?? []) as DashboardBooking[];
  const ledgerRows = (ledger ?? []) as LedgerEntry[];
  const currentBookings = bookingRows.filter((booking) => new Date(booking.created_at) >= currentStart);
  const previousBookings = bookingRows.filter((booking) => {
    const createdAt = new Date(booking.created_at);
    return createdAt >= previousStart && createdAt < currentStart;
  });
  const currentCommercialBookings = currentBookings.filter((booking) => COMMERCIAL_BOOKING_STATUSES.has(booking.status));
  const previousCommercialBookings = previousBookings.filter((booking) => COMMERCIAL_BOOKING_STATUSES.has(booking.status));
  const currentLedger = ledgerRows.filter((entry) => new Date(entry.created_at) >= currentStart);
  const previousLedger = ledgerRows.filter((entry) => {
    const createdAt = new Date(entry.created_at);
    return createdAt >= previousStart && createdAt < currentStart;
  });
  const currentGmv = sum(currentCommercialBookings.map((booking) => Number(booking.total_price_bob)));
  const previousGmv = sum(previousCommercialBookings.map((booking) => Number(booking.total_price_bob)));
  const currentRevenue = platformRevenue(currentLedger);
  const previousRevenue = platformRevenue(previousLedger);
  const deposits = sum(currentCommercialBookings.map((booking) => Number(booking.deposit_amount_bob)));
  const averageTicket = currentCommercialBookings.length ? currentGmv / currentCommercialBookings.length : 0;
  const confirmationRate = currentBookings.length ? currentCommercialBookings.length / currentBookings.length * 100 : 0;
  const trend = buildBookingTrend(currentCommercialBookings, period, now);
  const maxTrendBookings = Math.max(1, ...trend.map((bucket) => bucket.bookings));
  const venueNames = new Map(allVenues.map((venue) => [venue.id, venue.commercial_name]));
  const venuePerformance = Array.from(currentCommercialBookings.reduce((performance, booking) => {
    const current = performance.get(booking.venue_id) ?? { venueId: booking.venue_id, bookings: 0, gmv: 0 };
    current.bookings += 1;
    current.gmv += Number(booking.total_price_bob);
    performance.set(booking.venue_id, current);
    return performance;
  }, new Map<string, { venueId: string; bookings: number; gmv: number }>()).values()).sort((a, b) => b.gmv - a.gmv);
  const maxVenueGmv = Math.max(1, ...venuePerformance.map((venue) => venue.gmv));
  const statusBreakdown = (Object.keys(bookingStatusLabels) as BookingStatus[])
    .map((status) => ({ status, count: currentBookings.filter((booking) => booking.status === status).length }))
    .filter((item) => item.count > 0);
  const maxStatusCount = Math.max(1, ...statusBreakdown.map((item) => item.count));

  const { data: covers } = pending.length
    ? await supabase.from("venue_photos").select("venue_id, object_path, alt_text").in("venue_id", pending.map((venue) => venue.id)).eq("kind", "cover")
    : { data: [] };
  const { data: signedCovers } = covers?.length
    ? await supabase.storage.from("venue-media").createSignedUrls(covers.map((cover) => cover.object_path), 3600)
    : { data: [] };
  const coverUrls = new Map((signedCovers ?? []).map((item) => [item.path, item.signedUrl]));
  const coverByVenue = new Map((covers ?? []).map((cover) => [cover.venue_id, { ...cover, signedUrl: coverUrls.get(cover.object_path) }]));

  return (
    <PrivateShell title={account.profile.first_name ? `Administración · ${account.profile.first_name}` : "Administración CANCHEA"} description="Controla el negocio, los complejos y la operación con datos reales." links={[...adminNavigation]}>
      {query.revision === "ok" && <div className="page-notice page-notice--success">La decisión se registró correctamente.</div>}
      {query.revision === "nota" && <div className="page-notice page-notice--error">Explica el motivo con al menos 5 caracteres para rechazar o solicitar cambios.</div>}
      {query.revision === "error" && <div className="page-notice page-notice--error">No pudimos registrar la decisión. Actualiza la página y vuelve a intentarlo.</div>}

      <section className="admin-dashboard-header" aria-labelledby="admin-dashboard-title">
        <div>
          <p className="eyebrow">Visión general</p>
          <h2 id="admin-dashboard-title">Dashboard de negocio</h2>
          <p>Indicadores creados con reservas, movimientos contables y estados reales del piloto.</p>
        </div>
        <nav className="admin-period-filter" aria-label="Periodo del dashboard">
          {PERIOD_OPTIONS.map((option) => (
            <Link aria-current={period === option ? "page" : undefined} href={`/admin?periodo=${option}`} key={option}>{option} días</Link>
          ))}
        </nav>
      </section>

      <section className="admin-kpi-grid" aria-label="Indicadores clave">
        <MetricCard featured label="Reservas confirmadas" value={String(currentCommercialBookings.length)} detail={comparisonLabel(currentCommercialBookings.length, previousCommercialBookings.length)} />
        <MetricCard label="GMV reservado" value={`Bs ${formatBob(currentGmv)}`} detail={comparisonLabel(currentGmv, previousGmv)} />
        <MetricCard label="Ingreso CANCHEA" value={`Bs ${formatBob(currentRevenue)}`} detail={comparisonLabel(currentRevenue, previousRevenue)} />
        <MetricCard label="Señas registradas" value={`Bs ${formatBob(deposits)}`} detail={`En los últimos ${period} días`} />
        <MetricCard label="Ticket promedio" value={`Bs ${formatBob(averageTicket)}`} detail="Promedio por reserva confirmada" />
        <MetricCard label="Confirmación de holds" value={`${confirmationRate.toFixed(0)}%`} detail={`${currentBookings.length} intentos de reserva`} />
      </section>

      <p className="admin-finance-note"><strong>Lectura financiera:</strong> Ingreso CANCHEA suma comisiones y penalizaciones contabilizadas. No representa utilidad neta porque todavía no descuenta gastos, impuestos ni costos operativos.</p>

      <section className="admin-operational-strip" aria-label="Estado operativo">
        <article><span>Usuarios</span><strong>{profilesResult.count ?? 0}</strong><small>+{newProfilesResult.count ?? 0} en el periodo</small></article>
        <article><span>Complejos activos</span><strong>{approvedVenues.length}</strong><small>{pending.length} por revisar</small></article>
        <article><span>Reembolsos</span><strong>{pendingRefundsResult.count ?? 0}</strong><small>Pendientes de procesar</small></article>
        <article><span>Reclamos</span><strong>{activeComplaintsResult.count ?? 0}</strong><small>Abiertos o en revisión</small></article>
      </section>

      <section className="admin-insights-grid">
        <article className="private-card admin-insight-card">
          <div className="admin-card-heading"><div><p className="eyebrow">Tendencia</p><h2>Reservas por periodo</h2></div><span>Últimos {period} días</span></div>
          <ol className="admin-bar-chart" aria-label={`Reservas confirmadas durante los últimos ${period} días`}>
            {trend.map((bucket) => (
              <li key={bucket.label} title={`${bucket.label}: ${bucket.bookings} reservas, Bs ${formatBob(bucket.gmv)}`}>
                <strong>{bucket.bookings}</strong>
                <div className="admin-bar-track"><span style={{ height: `${Math.max(bucket.bookings ? 8 : 0, bucket.bookings / maxTrendBookings * 100)}%` }} /></div>
                <small>{bucket.label}</small>
              </li>
            ))}
          </ol>
        </article>

        <article className="private-card admin-insight-card">
          <div className="admin-card-heading"><div><p className="eyebrow">Calidad del flujo</p><h2>Estado de reservas</h2></div><span>{currentBookings.length} en total</span></div>
          {statusBreakdown.length ? (
            <div className="admin-status-list">
              {statusBreakdown.map((item) => (
                <div key={item.status}>
                  <div><span>{bookingStatusLabels[item.status]}</span><strong>{item.count}</strong></div>
                  <div className="admin-status-track"><span style={{ width: `${item.count / maxStatusCount * 100}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="empty-copy">Todavía no hay reservas en este periodo.</p>}
        </article>
      </section>

      <section className="admin-insights-grid admin-insights-grid--secondary">
        <article className="private-card admin-insight-card">
          <div className="admin-card-heading"><div><p className="eyebrow">Rendimiento</p><h2>Reservas por complejo</h2></div><Link href="/admin/operaciones">Ver operaciones</Link></div>
          {venuePerformance.length ? (
            <div className="admin-ranking-list">
              {venuePerformance.slice(0, 6).map((venue, index) => (
                <div key={venue.venueId}>
                  <span className="admin-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{venueNames.get(venue.venueId) ?? "Complejo"}</strong><span>{venue.bookings} reservas · Bs {formatBob(venue.gmv)}</span><div><i style={{ width: `${venue.gmv / maxVenueGmv * 100}%` }} /></div></div>
                </div>
              ))}
            </div>
          ) : <p className="empty-copy">Todavía no hay complejos con reservas confirmadas en este periodo.</p>}
        </article>

        <article className="private-card admin-insight-card">
          <div className="admin-card-heading"><div><p className="eyebrow">Actividad</p><h2>Reservas recientes</h2></div><span>{Math.min(currentBookings.length, 6)} mostradas</span></div>
          {currentBookings.length ? (
            <div className="admin-recent-list">
              {currentBookings.slice(0, 6).map((booking) => (
                <Link href={`/reservar/${booking.id}`} key={booking.id}>
                  <div><strong>{booking.public_code}</strong><span>{venueNames.get(booking.venue_id) ?? "Complejo"} · {formatBookingDate(booking.starts_at)}</span></div>
                  <div><strong>Bs {formatBob(Number(booking.total_price_bob))}</strong><span>{bookingStatusLabels[booking.status]}</span></div>
                </Link>
              ))}
            </div>
          ) : <p className="empty-copy">No hay reservas creadas en este periodo.</p>}
        </article>
      </section>

      <section className="private-card admin-operations-card">
        <div><p className="eyebrow">Operación</p><h2>Control financiero y operativo</h2></div>
        <p>Gestiona reembolsos, reclamos, liquidaciones, pagos y exportaciones. Los indicadores no incluyen datos inventados ni proyecciones externas.</p>
        <div className="booking-checkout-actions"><Link className="button button--primary" href="/admin/operaciones">Gestionar operaciones</Link><Link className="button button--secondary" href="/admin/configuracion">Configuración global</Link></div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading"><div><p className="eyebrow">Cola de revisión</p><h2>Complejos pendientes</h2></div><span>{pending.length} por revisar</span></div>
        {pending.length ? (
          <div className="review-list">
            {pending.map((venue) => {
              const cover = coverByVenue.get(venue.id);
              return (
                <article className="review-card" key={venue.id}>
                  <div className="review-card-media">
                    {cover?.signedUrl ? <Image alt={cover.alt_text} fill sizes="(max-width: 850px) 100vw, 380px" src={cover.signedUrl} /> : <div className="review-card-placeholder">Sin portada</div>}
                  </div>
                  <div className="review-card-body">
                    <div><span className="status-badge status-badge--pending_approval">En revisión</span><h3>{venue.commercial_name}</h3><p>{venue.description}</p></div>
                    <dl className="review-details">
                      <div><dt>Ubicación</dt><dd>{venue.address}, {venue.zone}, {venue.city}</dd></div>
                      <div><dt>Contacto</dt><dd>{venue.phone_e164} · WhatsApp {venue.whatsapp_e164}</dd></div>
                      <div><dt>Coordenadas</dt><dd>{venue.latitude}, {venue.longitude}</dd></div>
                    </dl>
                    <form action={reviewVenueAction} className="review-form">
                      <input name="venue_id" type="hidden" value={venue.id} />
                      <label htmlFor={`note-${venue.id}`}>Comentario para el propietario</label>
                      <textarea id={`note-${venue.id}`} maxLength={1000} name="note" placeholder="Obligatorio al rechazar o solicitar cambios" rows={3} />
                      <div className="review-actions">
                        <button className="button review-action review-action--approve" name="decision" type="submit" value="approve">Aprobar</button>
                        <button className="button review-action" name="decision" type="submit" value="request_changes">Solicitar cambios</button>
                        <button className="button review-action review-action--reject" name="decision" type="submit" value="reject">Rechazar</button>
                      </div>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="private-card admin-empty"><strong>Todo al día</strong><p>No hay complejos esperando revisión.</p></div>}
      </section>

      {reviewed.length > 0 && (
        <section className="private-card reviewed-card">
          <div className="admin-section-heading"><div><p className="eyebrow">Directorio</p><h2>Complejos registrados</h2></div><span>{reviewed.length}</span></div>
          <div className="reviewed-list">
            {reviewed.map((venue) => (
              <article key={venue.id}><div><strong>{venue.commercial_name}</strong><span>{venue.zone}, {venue.city}</span></div><div className={`status-badge status-badge--${venue.status}`}>{venueStatusLabels[venue.status]}</div>{venue.status === "approved" && <Link href={`/complejos/${venue.slug}`}>Ver público</Link>}</article>
            ))}
          </div>
        </section>
      )}
    </PrivateShell>
  );
}
