"use client";

import Link from "next/link";
import { useActionState } from "react";
import { completeOnboardingAction } from "@/app/onboarding/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";

export function OnboardingForm({ initialFirstName = "", initialLastName = "" }: { initialFirstName?: string; initialLastName?: string }) {
  const [state, action] = useActionState(completeOnboardingAction, initialFormState);

  return (
    <form action={action} className="onboarding-form">
      <fieldset className="role-fieldset">
        <legend>¿Cómo quieres utilizar CANCHEA?</legend>
        <label className="role-option">
          <input name="role" required type="radio" value="player" />
          <span><strong>Quiero reservar canchas</strong><small>Busca horarios, reserva y administra tus partidos.</small></span>
        </label>
        <label className="role-option">
          <input name="role" required type="radio" value="venue_owner" />
          <span><strong>Administro un complejo</strong><small>Registra tu complejo y gestiona su disponibilidad.</small></span>
        </label>
      </fieldset>

      <div className="form-grid">
        <div className="form-field"><label htmlFor="first-name">Nombre</label><input defaultValue={initialFirstName} id="first-name" name="first_name" required /></div>
        <div className="form-field"><label htmlFor="last-name">Apellido</label><input defaultValue={initialLastName} id="last-name" name="last_name" required /></div>
        <div className="form-field"><label htmlFor="phone">Teléfono / WhatsApp</label><input autoComplete="tel" id="phone" inputMode="tel" name="phone" placeholder="70000000" required /><small>Los 8 dígitos bolivianos se guardarán como +591.</small></div>
        <div className="form-field"><label htmlFor="city">Ciudad</label><input defaultValue="Santa Cruz de la Sierra" id="city" name="city" required /></div>
      </div>

      <div className="consent-list">
        <label><input name="accept_terms" required type="checkbox" /> <span>Acepto los <Link href="/terminos">términos y condiciones</Link>.</span></label>
        <label><input name="accept_privacy" required type="checkbox" /> <span>Acepto la <Link href="/privacidad">política de privacidad</Link>.</span></label>
      </div>

      <AuthFeedback state={state} />
      <SubmitButton pendingText="Guardando perfil…">Completar registro</SubmitButton>
    </form>
  );
}
