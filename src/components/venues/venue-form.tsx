"use client";

import { useActionState } from "react";
import { saveVenueAction } from "@/app/propietario/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Database, Venue } from "@/types/database";

type Service = Database["public"]["Tables"]["services"]["Row"];
type OpeningHour = Database["public"]["Tables"]["venue_opening_hours"]["Row"];

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function VenueForm({
  venue,
  services,
  selectedServiceIds,
  openingHours,
  profilePhone,
  profileCity,
  disabled,
}: {
  venue: Venue | null;
  services: Service[];
  selectedServiceIds: number[];
  openingHours: OpeningHour[];
  profilePhone: string;
  profileCity: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(saveVenueAction, initialFormState);
  const hoursByDay = new Map(openingHours.map((entry) => [entry.day_of_week, entry]));

  return (
    <form action={action} className="venue-form">
      {venue && <input name="venue_id" type="hidden" value={venue.id} />}
      <fieldset disabled={disabled}>
        <div className="venue-form-section">
          <div className="section-heading">
            <span>01</span>
            <div><h2>Identidad del complejo</h2><p>Así te encontrarán los jugadores.</p></div>
          </div>
          <div className="form-grid">
            <div className="form-field form-field--wide">
              <label htmlFor="commercial-name">Nombre comercial</label>
              <input defaultValue={venue?.commercial_name ?? ""} id="commercial-name" name="commercial_name" maxLength={120} required />
            </div>
            <div className="form-field form-field--wide">
              <label htmlFor="venue-description">Descripción</label>
              <textarea defaultValue={venue?.description ?? ""} id="venue-description" name="description" minLength={30} maxLength={2000} rows={5} required />
              <small>Cuenta qué hace especial al complejo, sus canchas y el ambiente.</small>
            </div>
          </div>
        </div>

        <div className="venue-form-section">
          <div className="section-heading">
            <span>02</span>
            <div><h2>Contacto y ubicación</h2><p>Datos operativos y coordenadas exactas.</p></div>
          </div>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="venue-phone">Teléfono</label><input defaultValue={venue?.phone_e164 ?? profilePhone} id="venue-phone" inputMode="tel" name="phone" required /></div>
            <div className="form-field"><label htmlFor="venue-whatsapp">WhatsApp</label><input defaultValue={venue?.whatsapp_e164 ?? profilePhone} id="venue-whatsapp" inputMode="tel" name="whatsapp" required /></div>
            <div className="form-field form-field--wide"><label htmlFor="venue-address">Dirección</label><input defaultValue={venue?.address ?? ""} id="venue-address" name="address" maxLength={240} required /></div>
            <div className="form-field"><label htmlFor="venue-zone">Zona / barrio</label><input defaultValue={venue?.zone ?? ""} id="venue-zone" name="zone" required /></div>
            <div className="form-field"><label htmlFor="venue-city">Ciudad</label><input defaultValue={venue?.city ?? profileCity} id="venue-city" name="city" required /></div>
            <div className="form-field"><label htmlFor="venue-latitude">Latitud</label><input defaultValue={venue?.latitude ?? ""} id="venue-latitude" inputMode="decimal" name="latitude" placeholder="-17.7833" required /><small>Copia la coordenada desde Google Maps.</small></div>
            <div className="form-field"><label htmlFor="venue-longitude">Longitud</label><input defaultValue={venue?.longitude ?? ""} id="venue-longitude" inputMode="decimal" name="longitude" placeholder="-63.1821" required /><small>Ejemplo para Santa Cruz: -63.1821.</small></div>
          </div>
        </div>

        <div className="venue-form-section">
          <div className="section-heading">
            <span>03</span>
            <div><h2>Servicios disponibles</h2><p>Selecciona todo lo que encontrarán en el lugar.</p></div>
          </div>
          <div className="service-check-grid">
            {services.map((service) => (
              <label className="service-check" key={service.id}>
                <input defaultChecked={selectedServiceIds.includes(service.id)} name="services" type="checkbox" value={service.slug} />
                <span aria-hidden="true">✓</span>
                <strong>{service.name}</strong>
              </label>
            ))}
          </div>
        </div>

        <div className="venue-form-section">
          <div className="section-heading">
            <span>04</span>
            <div><h2>Horario general</h2><p>La disponibilidad por cancha se configurará en una fase posterior.</p></div>
          </div>
          <div className="hours-list">
            {dayNames.map((dayName, day) => {
              const entry = hoursByDay.get(day);
              const closed = entry?.is_closed ?? day === 6;
              return (
                <div className="hours-row" key={dayName}>
                  <strong>{dayName}</strong>
                  <label className="hours-closed"><input defaultChecked={closed} name={`closed_${day}`} type="checkbox" /> Cerrado</label>
                  <label><span>Apertura</span><input defaultValue={entry?.opens_at?.slice(0, 5) ?? "07:00"} name={`opens_${day}`} type="time" /></label>
                  <label><span>Cierre</span><input defaultValue={entry?.closes_at?.slice(0, 5) ?? "23:00"} name={`closes_${day}`} type="time" /></label>
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>

      {!disabled && <div className="venue-form-footer"><AuthFeedback state={state} /><SubmitButton pendingText="Guardando complejo…">{venue ? "Guardar cambios" : "Crear complejo"}</SubmitButton></div>}
    </form>
  );
}
