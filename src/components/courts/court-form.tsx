"use client";

import { useActionState, useId, useState } from "react";
import { saveCourtAction } from "@/app/propietario/canchas/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Court, Database } from "@/types/database";

type Sport = Database["public"]["Tables"]["sports"]["Row"];
type Modality = Database["public"]["Tables"]["sport_modalities"]["Row"];
type Surface = Database["public"]["Tables"]["court_surfaces"]["Row"];
type Feature = Database["public"]["Tables"]["court_features"]["Row"];

export function CourtForm({
  court,
  sports,
  modalities,
  surfaces,
  features,
  selectedDurations,
  selectedFeatureIds,
}: {
  court: Court | null;
  sports: Sport[];
  modalities: Modality[];
  surfaces: Surface[];
  features: Feature[];
  selectedDurations: number[];
  selectedFeatureIds: number[];
}) {
  const [state, action] = useActionState(saveCourtAction, initialFormState);
  const idPrefix = useId();
  const initialSport = sports.find((sport) => sport.id === court?.sport_id) ?? sports[0];
  const [sportSlug, setSportSlug] = useState(initialSport?.slug ?? "");
  const initialModality = modalities.find((modality) => modality.id === court?.modality_id)
    ?? modalities.find((modality) => modality.sport_id === initialSport?.id);
  const [modalitySlug, setModalitySlug] = useState(initialModality?.slug ?? "");
  const [capacity, setCapacity] = useState(String(court?.capacity ?? initialModality?.default_capacity ?? ""));
  const selectedSport = sports.find((sport) => sport.slug === sportSlug);
  const availableModalities = modalities.filter((modality) => modality.sport_id === selectedSport?.id);

  function selectSport(nextSlug: string) {
    setSportSlug(nextSlug);
    const nextSport = sports.find((sport) => sport.slug === nextSlug);
    const nextModality = modalities.find((modality) => modality.sport_id === nextSport?.id);
    setModalitySlug(nextModality?.slug ?? "");
    if (!court) setCapacity(String(nextModality?.default_capacity ?? ""));
  }

  function selectModality(nextSlug: string) {
    setModalitySlug(nextSlug);
    const nextModality = modalities.find((modality) => modality.slug === nextSlug);
    if (!court && nextModality) setCapacity(String(nextModality.default_capacity));
  }

  return (
    <form action={action} className="court-form">
      {court && <input name="court_id" type="hidden" value={court.id} />}
      <div className="section-heading">
        <span>{court ? "✎" : "+"}</span>
        <div>
          <h2>{court ? `Editar ${court.name}` : "Registrar una cancha"}</h2>
          <p>Configura su identidad deportiva. Los horarios y precios se definirán en la siguiente fase.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field form-field--wide">
          <label htmlFor={`${idPrefix}-name`}>Nombre de la cancha</label>
          <input defaultValue={court?.name ?? ""} id={`${idPrefix}-name`} maxLength={100} name="name" placeholder="Ej. Cancha Norte" required />
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-sport`}>Deporte</label>
          <select id={`${idPrefix}-sport`} name="sport" onChange={(event) => selectSport(event.target.value)} value={sportSlug}>
            {sports.map((sport) => <option key={sport.id} value={sport.slug}>{sport.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-modality`}>Modalidad</label>
          <select id={`${idPrefix}-modality`} name="modality" onChange={(event) => selectModality(event.target.value)} value={modalitySlug}>
            {availableModalities.map((modality) => <option key={modality.id} value={modality.slug}>{modality.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-surface`}>Superficie</label>
          <select defaultValue={surfaces.find((surface) => surface.id === court?.surface_id)?.slug ?? surfaces[0]?.slug} id={`${idPrefix}-surface`} name="surface">
            {surfaces.map((surface) => <option key={surface.id} value={surface.slug}>{surface.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-capacity`}>Capacidad de jugadores</label>
          <input id={`${idPrefix}-capacity`} inputMode="numeric" max={100} min={1} name="capacity" onChange={(event) => setCapacity(event.target.value)} required type="number" value={capacity} />
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-length`}>Largo (metros)</label>
          <input defaultValue={court?.length_m ?? ""} id={`${idPrefix}-length`} inputMode="decimal" max={200} min={3} name="length_m" placeholder="40" required step="0.01" type="number" />
        </div>
        <div className="form-field">
          <label htmlFor={`${idPrefix}-width`}>Ancho (metros)</label>
          <input defaultValue={court?.width_m ?? ""} id={`${idPrefix}-width`} inputMode="decimal" max={150} min={2} name="width_m" placeholder="20" required step="0.01" type="number" />
        </div>
      </div>

      <fieldset className="court-options">
        <legend>Infraestructura</legend>
        <div className="court-binary-grid">
          <label className="court-option"><input defaultChecked={court?.is_roofed ?? false} name="is_roofed" type="checkbox" /><span aria-hidden="true">✓</span><strong>Cancha techada</strong></label>
          <label className="court-option"><input defaultChecked={court?.has_lighting ?? false} name="has_lighting" type="checkbox" /><span aria-hidden="true">✓</span><strong>Iluminación nocturna</strong></label>
        </div>
      </fieldset>

      <fieldset className="court-options">
        <legend>Duraciones que aceptará</legend>
        <p>Podrás asignar horarios y precios distintos a cada duración en la Fase 5.</p>
        <div className="court-binary-grid">
          {[30, 60].map((duration) => (
            <label className="court-option" key={duration}>
              <input defaultChecked={selectedDurations.includes(duration) || (!court && duration === 60)} name="durations" type="checkbox" value={duration} />
              <span aria-hidden="true">✓</span><strong>{duration} minutos</strong>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="court-options">
        <legend>Características adicionales</legend>
        <div className="court-feature-grid">
          {features.map((feature) => (
            <label className="court-option" key={feature.id}>
              <input defaultChecked={selectedFeatureIds.includes(feature.id)} name="features" type="checkbox" value={feature.slug} />
              <span aria-hidden="true">✓</span><strong>{feature.name}</strong>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="court-form-footer">
        <AuthFeedback state={state} />
        <SubmitButton pendingText="Guardando cancha…">{court ? "Guardar cambios" : "Crear cancha"}</SubmitButton>
      </div>
    </form>
  );
}
