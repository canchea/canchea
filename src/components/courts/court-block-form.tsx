"use client";

import { useActionState } from "react";
import { createCourtBlockAction } from "@/app/propietario/disponibilidad/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";

export function CourtBlockForm({ courtId, minimumDate }: { courtId: string; minimumDate: string }) {
  const [state, action] = useActionState(createCourtBlockAction, initialFormState);

  return (
    <form action={action} className="availability-form compact-availability-form">
      <input name="court_id" type="hidden" value={courtId} />
      <div className="form-grid block-form-grid">
        <div className="form-field"><label htmlFor="block-start">Inicio</label><input id="block-start" min={`${minimumDate}T00:00`} name="starts_local" required step="1800" type="datetime-local" /></div>
        <div className="form-field"><label htmlFor="block-end">Final</label><input id="block-end" min={`${minimumDate}T00:00`} name="ends_local" required step="1800" type="datetime-local" /></div>
        <div className="form-field"><label htmlFor="block-kind">Tipo</label><select id="block-kind" name="kind"><option value="maintenance">Mantenimiento</option><option value="event">Evento</option><option value="internal_use">Uso interno</option><option value="other">Otro</option></select></div>
        <div className="form-field form-field--wide"><label htmlFor="block-reason">Motivo opcional</label><input id="block-reason" maxLength={240} name="reason" placeholder="Ej. cambio de luminarias" /></div>
      </div>
      <div className="availability-form-footer"><AuthFeedback state={state} /><SubmitButton pendingText="Bloqueando horario…">Bloquear horario</SubmitButton></div>
    </form>
  );
}
