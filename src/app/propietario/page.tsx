import type { Metadata } from "next";
import Link from "next/link";
import { PrivateShell } from "@/components/auth/private-shell";
import { VenueForm } from "@/components/venues/venue-form";
import { VenuePhotoManager } from "@/components/venues/venue-photo-manager";
import { ownerNavigation } from "@/config/dashboard-navigation";
import { submitVenueAction } from "@/app/propietario/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canEditVenue, venueStatusLabels } from "@/lib/venues/status";
import type { VenuePhoto } from "@/types/database";

export const metadata: Metadata = { title: "Mi complejo", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(value));
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ guardado?: string; enviado?: string; envio?: string }> }) {
  const [account, query] = await Promise.all([requireRole("venue_owner"), searchParams]);
  const supabase = await createClient();
  const [{ data: venue }, { data: services }] = await Promise.all([
    supabase.from("venues").select("*").eq("owner_id", account.user.id).maybeSingle(),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const [{ data: venueServices }, { data: openingHours }, { data: rawPhotos }, { data: history }] = venue
    ? await Promise.all([
        supabase.from("venue_services").select("service_id").eq("venue_id", venue.id),
        supabase.from("venue_opening_hours").select("*").eq("venue_id", venue.id).order("day_of_week"),
        supabase.from("venue_photos").select("*").eq("venue_id", venue.id).order("kind").order("created_at"),
        supabase.from("venue_status_history").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const photoRows = (rawPhotos ?? []) as VenuePhoto[];
  const { data: signedPhotos } = photoRows.length
    ? await supabase.storage.from("venue-media").createSignedUrls(photoRows.map((photo) => photo.object_path), 3600)
    : { data: [] };
  const urlByPath = new Map((signedPhotos ?? []).map((entry) => [entry.path, entry.signedUrl]));
  const photos = photoRows.flatMap((photo) => {
    const signedUrl = urlByPath.get(photo.object_path);
    return signedUrl ? [{ ...photo, signedUrl }] : [];
  });

  const editable = !venue || canEditVenue(venue.status);
  const hasLogo = photoRows.some((photo) => photo.kind === "logo");
  const hasCover = photoRows.some((photo) => photo.kind === "cover");
  const readyToSubmit = Boolean(venue && hasLogo && hasCover);

  return (
    <PrivateShell
      title={venue ? venue.commercial_name : `Hola, ${account.profile.first_name}`}
      description={venue ? "Gestiona la información que revisará el equipo CANCHEA." : "Registra tu complejo para empezar el proceso de verificación."}
      links={[...ownerNavigation]}
    >
      {query.guardado === "1" && <div className="page-notice page-notice--success">Los datos del complejo se guardaron correctamente.</div>}
      {query.enviado === "1" && <div className="page-notice page-notice--success">Tu complejo fue enviado a revisión. Te mostraremos aquí cualquier novedad.</div>}
      {query.envio === "error" && <div className="page-notice page-notice--error">Antes de enviar necesitas datos completos, al menos un horario abierto, logo y portada.</div>}

      {venue && (
        <section className={`venue-status-card venue-status-card--${venue.status}`}>
          <div><p className="eyebrow">Estado del proceso</p><h2>{venueStatusLabels[venue.status]}</h2><p>{venue.status === "draft" ? "Completa la ficha y agrega las imágenes obligatorias." : venue.status === "pending_approval" ? "El equipo CANCHEA está verificando la información. Mientras tanto la edición está bloqueada." : venue.status === "approved" ? "Tu complejo está verificado y visible públicamente." : "Revisa el comentario, corrige la ficha y vuelve a enviarla."}</p></div>
          <div className="status-card-actions">
            {venue.status === "approved" && <Link className="button button--primary" href={`/complejos/${venue.slug}`}>Ver ficha pública</Link>}
            {venue.status === "approved" && <Link className="button button--dark" href="/propietario/canchas">Gestionar canchas</Link>}
            {venue.status === "approved" && <Link className="button" href="/propietario/disponibilidad">Horarios y precios</Link>}
            {editable && readyToSubmit && <form action={submitVenueAction}><input name="venue_id" type="hidden" value={venue.id} /><button className="button button--dark" type="submit">Enviar a revisión</button></form>}
          </div>
          {venue.review_note && <div className="review-note"><strong>Comentario de revisión</strong><p>{venue.review_note}</p></div>}
        </section>
      )}

      <section className="private-card venue-editor-card">
        <VenueForm
          disabled={!editable}
          openingHours={openingHours ?? []}
          profileCity={account.profile.city ?? "Santa Cruz de la Sierra"}
          profilePhone={account.profile.phone_e164 ?? ""}
          selectedServiceIds={(venueServices ?? []).map((entry) => entry.service_id)}
          services={services ?? []}
          venue={venue}
        />
      </section>

      {venue && <VenuePhotoManager disabled={!editable} photos={photos} />}

      {venue && (
        <section className="private-card history-card">
          <div className="section-heading"><span>06</span><div><h2>Historial de revisión</h2><p>Cada cambio de estado queda registrado.</p></div></div>
          <ol className="status-history">
            {(history ?? []).map((entry) => (
              <li key={entry.id}><span aria-hidden="true" /><div><strong>{venueStatusLabels[entry.to_status]}</strong><time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>{entry.note && <p>{entry.note}</p>}</div></li>
            ))}
          </ol>
        </section>
      )}
    </PrivateShell>
  );
}
