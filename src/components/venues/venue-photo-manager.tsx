"use client";

import Image from "next/image";
import { useActionState } from "react";
import { deleteVenuePhotoAction, uploadVenuePhotoAction } from "@/app/propietario/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import type { VenuePhoto } from "@/types/database";

type PhotoWithUrl = VenuePhoto & { signedUrl: string };

const kindLabels = { logo: "Logo", cover: "Portada", gallery: "Galería" } as const;

export function VenuePhotoManager({ venueId, photos, disabled }: { venueId: string; photos: PhotoWithUrl[]; disabled: boolean }) {
  const [state, action] = useActionState(uploadVenuePhotoAction, initialFormState);

  return (
    <section className="private-card media-card">
      <div className="section-heading">
        <span>05</span>
        <div><h2>Identidad visual y fotos</h2><p>JPG, PNG o WebP, máximo 5 MB. Para enviar a revisión necesitas logo y portada.</p></div>
      </div>

      {photos.length ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article className="photo-tile" key={photo.id}>
              <Image alt={photo.alt_text} fill sizes="(max-width: 700px) 100vw, 280px" src={photo.signedUrl} />
              <div><span>{kindLabels[photo.kind]}</span><p>{photo.alt_text}</p></div>
              {!disabled && <form action={deleteVenuePhotoAction}><input name="photo_id" type="hidden" value={photo.id} /><button type="submit">Eliminar</button></form>}
            </article>
          ))}
        </div>
      ) : <div className="empty-media"><strong>Aún no cargaste imágenes</strong><p>Empieza por el logo y una buena portada horizontal.</p></div>}

      {!disabled && (
        <form action={action} className="photo-upload-form">
          <input name="venue_id" type="hidden" value={venueId} />
          <div className="form-grid">
            <div className="form-field"><label htmlFor="photo-kind">Tipo</label><select id="photo-kind" name="kind" required><option value="logo">Logo</option><option value="cover">Portada</option><option value="gallery">Galería</option></select></div>
            <div className="form-field"><label htmlFor="photo-alt">Descripción accesible</label><input id="photo-alt" maxLength={160} name="alt_text" placeholder="Cancha principal iluminada" required /></div>
            <div className="form-field form-field--wide"><label htmlFor="venue-photo">Archivo</label><input accept="image/jpeg,image/png,image/webp" id="venue-photo" name="photo" type="file" required /></div>
          </div>
          <AuthFeedback state={state} />
          <SubmitButton pendingText="Subiendo imagen…">Subir imagen</SubmitButton>
        </form>
      )}
    </section>
  );
}
