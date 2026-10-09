"use client";

import { useActionState } from "react";
import { createPricingRuleAction } from "@/app/propietario/disponibilidad/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { dayNames } from "@/lib/courts/time";

export function PricingRuleForm({ courtId }: { courtId: string }) {
  const [state, action] = useActionState(createPricingRuleAction, initialFormState);

  return (
    <form action={action} className="availability-form compact-availability-form">
      <input name="court_id" type="hidden" value={courtId} />
      <div className="form-grid pricing-form-grid">
        <div className="form-field"><label htmlFor="pricing-day">Día</label><select id="pricing-day" name="day_of_week">{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div>
        <div className="form-field"><label htmlFor="pricing-start">Desde</label><input defaultValue="07:00" id="pricing-start" name="starts_at" required step="3600" type="time" /></div>
        <div className="form-field"><label htmlFor="pricing-end">Hasta</label><input defaultValue="23:00" id="pricing-end" name="ends_at" required step="3600" type="time" /></div>
        <div className="form-field"><label htmlFor="pricing-price">Precio por hora (Bs)</label><input id="pricing-price" inputMode="decimal" min="1" name="price_bob" placeholder="150" required step="0.01" type="number" /></div>
      </div>
      <div className="availability-form-footer"><AuthFeedback state={state} /><SubmitButton pendingText="Creando regla…">Agregar precio</SubmitButton></div>
    </form>
  );
}
