import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { reviewVenueAction } from "@/app/admin/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { adminNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { venueStatusLabels } from "@/lib/venues/status";

export const metadata: Metadata = { title: "Revisión de complejos", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ revision?: string }> }) {
  const [account, query] = await Promise.all([requireRole("super_admin"), searchParams]);
  const supabase = await createClient();
  const [{ data: venues }, { data: bookings }, { data: ledger }, profilesResult, { data: refunds }, { data: complaints }] = await Promise.all([
    supabase.from("venues").select("*").order("updated_at", { ascending: false }),
    supabase.from("bookings").select("id, status, total_price_bob"),
    supabase.from("ledger_entries").select("account, direction, amount_bob"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("refunds").select("id, status, amount_bob"),
    supabase.from("complaints").select("id, status"),
  ]);
  const allVenues = venues ?? [];
  const pending = allVenues.filter((venue) => venue.status === "pending_approval");
  const reviewed = allVenues.filter((venue) => venue.status !== "pending_approval");
  const bookingRows = bookings ?? [];
  const ledgerRows = ledger ?? [];
  const accountBalance = (account: string) => ledgerRows.filter((entry) => entry.account === account).reduce((sum, entry) => sum + (entry.direction === "credit" ? Number(entry.amount_bob) : -Number(entry.amount_bob)), 0);
  const activeBookings = bookingRows.filter((booking) => !["expired"].includes(booking.status));

  const { data: covers } = pending.length
    ? await supabase.from("venue_photos").select("venue_id, object_path, alt_text").in("venue_id", pending.map((venue) => venue.id)).eq("kind", "cover")
    : { data: [] };
  const { data: signedCovers } = covers?.length
    ? await supabase.storage.from("venue-media").createSignedUrls(covers.map((cover) => cover.object_path), 3600)
    : { data: [] };
  const coverUrls = new Map((signedCovers ?? []).map((item) => [item.path, item.signedUrl]));
  const coverByVenue = new Map((covers ?? []).map((cover) => [cover.venue_id, { ...cover, signedUrl: coverUrls.get(cover.object_path) }]));

  return (
    <PrivateShell title={account.profile.first_name ? `Administración · ${account.profile.first_name}` : "Administración CANCHEA"} description="Controla complejos, reservas, finanzas y calidad operativa con datos reales." links={[...adminNavigation]}>
      {query.revision === "ok" && <div className="page-notice page-notice--success">La decisión se registró correctamente.</div>}
      {query.revision === "nota" && <div className="page-notice page-notice--error">Explica el motivo con al menos 5 caracteres para rechazar o solicitar cambios.</div>}
      {query.revision === "error" && <div className="page-notice page-notice--error">No pudimos registrar la decisión. Actualiza la página y vuelve a intentarlo.</div>}

      <section className="admin-stats" aria-label="Resumen operativo">
        <article><strong>{profilesResult.count ?? 0}</strong><span>Usuarios</span></article>
        <article><strong>{activeBookings.length}</strong><span>Reservas</span></article>
        <article><strong>Bs {activeBookings.reduce((sum, booking) => sum + Number(booking.total_price_bob), 0).toFixed(0)}</strong><span>GMV reservado</span></article>
        <article><strong>Bs {(accountBalance("platform_commission_revenue") + accountBalance("platform_cancellation_revenue")).toFixed(0)}</strong><span>Ingreso CANCHEA</span></article>
        <article><strong>Bs {accountBalance("venue_payable").toFixed(0)}</strong><span>Por liquidar</span></article>
        <article><strong>{(refunds ?? []).filter((refund) => refund.status === "pending").length}</strong><span>Reembolsos pendientes</span></article>
        <article><strong>{(complaints ?? []).filter((complaint) => ["open", "in_review"].includes(complaint.status)).length}</strong><span>Reclamos activos</span></article>
        <article><strong>{pending.length}</strong><span>Complejos por revisar</span></article>
      </section>

      <section className="private-card admin-operations-card">
        <div><p className="eyebrow">Operación</p><h2>Control financiero y operativo</h2></div>
        <p>Los indicadores provienen de reservas y asientos contables reales. No incluyen datos inventados ni proyecciones externas.</p>
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
          <div className="admin-section-heading"><div><p className="eyebrow">Historial reciente</p><h2>Otros complejos</h2></div></div>
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
