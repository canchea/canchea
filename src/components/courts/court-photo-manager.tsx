"use client";

import Image from "next/image";
import { useActionState, useId } from "react";
import { deleteCourtPhotoAction, uploadCourtPhotoAction } from "@/app/propietario/canchas/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import type { CourtPhoto } from "@/types/database";

type PhotoWithUrl = CourtPhoto & { signedUrl: string };

export function CourtPhotoManager({ courtId, photos }: { courtId: string; photos: PhotoWithUrl[] }) {
  const [state, action] = useActionState(uploadCourtPhotoAction, initialFormState);
  const idPrefix = useId();

  return (
    <section className="private-card media-card court-media-card">
      <div className="section-heading">
        <span>02</span>
        <div><h2>Fotos de la cancha</h2><p>Agrega una portada obligatoria para activarla y hasta 8 imágenes de galería.</p></div>
      </div>

      {photos.length ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article className="photo-tile" key={photo.id}>
              <Image alt={photo.alt_text} fill sizes="(max-width: 700px) 100vw, 280px" src={photo.signedUrl} />
              <div><span>{photo.kind === "cover" ? "Portada" : "Galería"}</span><p>{photo.alt_text}</p></div>
              <form action={deleteCourtPhotoAction}><input name="photo_id" type="hidden" value={photo.id} /><button type="submit">Eliminar</button></form>
            </article>
          ))}
        </div>
      ) : <div className="empty-media"><strong>Aún no hay fotos</strong><p>Sube una portada clara de la cancha para poder activarla.</p></div>}

      <form action={action} className="photo-upload-form">
        <input name="court_id" type="hidden" value={courtId} />
        <div className="form-grid">
          <div className="form-field"><label htmlFor={`${idPrefix}-kind`}>Tipo</label><select id={`${idPrefix}-kind`} name="kind" required><option value="cover">Portada</option><option value="gallery">Galería</option></select></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-alt`}>Descripción accesible</label><input id={`${idPrefix}-alt`} maxLength={160} name="alt_text" placeholder="Cancha de fútbol iluminada" required /></div>
          <div className="form-field form-field--wide"><label htmlFor={`${idPrefix}-photo`}>Archivo</label><input accept="image/jpeg,image/png,image/webp" id={`${idPrefix}-photo`} name="photo" type="file" required /></div>
        </div>
        <AuthFeedback state={state} />
        <SubmitButton pendingText="Subiendo imagen…">Subir imagen</SubmitButton>
      </form>
    </section>
  );
}
