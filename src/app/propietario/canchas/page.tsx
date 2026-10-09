import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { setCourtStatusAction } from "@/app/propietario/canchas/actions";
import { PrivateShell } from "@/components/auth/private-shell";
import { CourtForm } from "@/components/courts/court-form";
import { CourtPhotoManager } from "@/components/courts/court-photo-manager";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerVenues } from "@/lib/venues/owner";
import { VenueSwitcher } from "@/components/venues/venue-switcher";
import type { CourtPhoto } from "@/types/database";

export const metadata: Metadata = { title: "Mis canchas", robots: { index: false, follow: false } };

const statusLabels = { draft: "Borrador", active: "Activa", inactive: "Pausada" } as const;

export default async function CourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; guardado?: string; estado?: string }>;
}) {
  const [account, query] = await Promise.all([requireRole("venue_owner"), searchParams]);
  const supabase = await createClient();
  const { venues: ownerVenues, activeVenueId } = await getOwnerVenues(account.user.id);
  const { data: venue } = await supabase.from("venues").select("id, commercial_name, slug, status").eq("id", activeVenueId).eq("owner_id", account.user.id).maybeSingle();
  const shellLinks = [...ownerNavigation];

  if (!venue || venue.status !== "approved") {
    return (
      <PrivateShell links={shellLinks} title="Canchas" description="La configuración de canchas se habilita cuando el complejo está verificado."><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/canchas" venues={ownerVenues} />
        <section className="private-card court-gate-card">
          <span className="court-gate-icon" aria-hidden="true">✓</span>
          <div><h2>Primero necesitamos aprobar tu complejo</h2><p>Completa la ficha, agrega el logo y la portada, y envíala a revisión. Cuando el estado sea “Aprobado” podrás registrar todas tus canchas.</p></div>
          <Link className="button button--primary" href="/propietario">Volver a mi complejo</Link>
        </section>
      </PrivateShell>
    );
  }

  const [
    { data: sports },
    { data: modalities },
    { data: surfaces },
    { data: features },
    { data: courts },
  ] = await Promise.all([
    supabase.from("sports").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("sport_modalities").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("court_surfaces").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("court_features").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("courts").select("*").eq("venue_id", venue.id).order("created_at"),
  ]);

  const courtRows = courts ?? [];
  const courtIds = courtRows.map((court) => court.id);
  const [{ data: durations }, { data: assignments }, { data: rawPhotos }] = courtIds.length
    ? await Promise.all([
        supabase.from("court_durations").select("*").in("court_id", courtIds),
        supabase.from("court_feature_assignments").select("*").in("court_id", courtIds),
        supabase.from("court_photos").select("*").in("court_id", courtIds).order("kind").order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const photoRows = (rawPhotos ?? []) as CourtPhoto[];
  const { data: signedPhotos } = photoRows.length
    ? await supabase.storage.from("venue-media").createSignedUrls(photoRows.map((photo) => photo.object_path), 3600)
    : { data: [] };
  const urlByPath = new Map((signedPhotos ?? []).map((entry) => [entry.path, entry.signedUrl]));
  const photos = photoRows.flatMap((photo) => {
    const signedUrl = urlByPath.get(photo.object_path);
    return signedUrl ? [{ ...photo, signedUrl }] : [];
  });
  const sportById = new Map((sports ?? []).map((sport) => [sport.id, sport]));
  const modalityById = new Map((modalities ?? []).map((modality) => [modality.id, modality]));
  const surfaceById = new Map((surfaces ?? []).map((surface) => [surface.id, surface]));
  const editingCourt = query.editar ? courtRows.find((court) => court.id === query.editar) ?? null : null;
  const selectedFeatureIds = (assignments ?? []).filter((entry) => entry.court_id === editingCourt?.id).map((entry) => entry.feature_id);
  const editingPhotos = photos.filter((photo) => photo.court_id === editingCourt?.id);

  return (
    <PrivateShell
      links={shellLinks}
      title={`Canchas de ${venue.commercial_name}`}
      description="Administra la ficha deportiva de cada espacio antes de configurar disponibilidad y precios."
    ><VenueSwitcher activeVenueId={activeVenueId} returnTo="/propietario/canchas" venues={ownerVenues} />
      {query.guardado === "1" && <div className="page-notice page-notice--success">La cancha se guardó correctamente. Agrega una portada para poder activarla.</div>}
      {query.estado === "activada" && <div className="page-notice page-notice--success">La cancha está activa y ya aparece en la ficha pública.</div>}
      {query.estado === "pausada" && <div className="page-notice page-notice--success">La cancha quedó pausada y ya no es visible públicamente.</div>}
      {query.estado === "error" && <div className="page-notice page-notice--error">Para activar una cancha necesitas tener habilitadas las reservas por hora y una foto de portada.</div>}

      <section className="court-overview">
        <div><p className="eyebrow">Fase 4</p><h2>{courtRows.length ? `${courtRows.length} ${courtRows.length === 1 ? "cancha registrada" : "canchas registradas"}` : "Registra tu primera cancha"}</h2><p>Las canchas activas se muestran en la página pública del complejo.</p></div>
        <Link className="button button--primary" href="/propietario/canchas#editor">+ Nueva cancha</Link>
      </section>

      {courtRows.length > 0 && (
        <section className="court-manager-grid" aria-label="Canchas registradas">
          {courtRows.map((court) => {
            const cover = photos.find((photo) => photo.court_id === court.id && photo.kind === "cover");
            const courtDurations = (durations ?? []).filter((entry) => entry.court_id === court.id).map((entry) => entry.duration_minutes);
            const sport = sportById.get(court.sport_id);
            const modality = modalityById.get(court.modality_id);
            const surface = surfaceById.get(court.surface_id);
            const ready = Boolean(cover && courtDurations.length);
            return (
              <article className="court-manager-card" key={court.id}>
                <div className="court-manager-media">
                  {cover ? <Image alt={cover.alt_text} fill sizes="(max-width: 760px) 100vw, 360px" src={cover.signedUrl} /> : <div className="court-manager-placeholder">Sin portada</div>}
                  <span className={`court-status court-status--${court.status}`}>{statusLabels[court.status]}</span>
                </div>
                <div className="court-manager-body">
                  <p>{sport?.name} · {modality?.name}</p>
                  <h3>{court.name}</h3>
                  <div className="court-specs"><span>{surface?.name}</span><span>{court.length_m} × {court.width_m} m</span><span>{court.capacity} jugadores</span></div>
                  <div className="court-manager-actions">
                    <Link className="button court-edit-button" href={`/propietario/canchas?editar=${court.id}#editor`}>Editar</Link>
                    <form action={setCourtStatusAction}>
                      <input name="court_id" type="hidden" value={court.id} />
                      <input name="status" type="hidden" value={court.status === "active" ? "inactive" : "active"} />
                      <button className="button button--dark" disabled={!ready && court.status !== "active"} type="submit">{court.status === "active" ? "Pausar" : "Activar"}</button>
                    </form>
                  </div>
                  {!ready && <small>Agrega una portada para habilitar la activación.</small>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="private-card court-editor-card" id="editor">
        <CourtForm
          court={editingCourt}
          features={features ?? []}
          key={editingCourt?.id ?? "new"}
          modalities={modalities ?? []}
          selectedFeatureIds={selectedFeatureIds}
          sports={sports ?? []}
          surfaces={surfaces ?? []}
        />
      </section>

      {editingCourt && <CourtPhotoManager courtId={editingCourt.id} photos={editingPhotos} />}

      <section className="court-phase-note">
        <strong>Disponibilidad operativa</strong>
        <p>Configura días, franjas, precios y bloqueos para que cada cancha muestre únicamente horarios realmente disponibles.</p>
        <Link className="button button--dark" href="/propietario/disponibilidad">Configurar horarios y precios</Link>
      </section>
    </PrivateShell>
  );
}
