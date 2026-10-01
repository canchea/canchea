"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/cuenta/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Profile } from "@/types/database";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);

  return (
    <form action={action} className="profile-form">
      <div className="form-grid">
        <div className="form-field"><label htmlFor="profile-first-name">Nombre</label><input defaultValue={profile.first_name ?? ""} id="profile-first-name" name="first_name" required /></div>
        <div className="form-field"><label htmlFor="profile-last-name">Apellido</label><input defaultValue={profile.last_name ?? ""} id="profile-last-name" name="last_name" required /></div>
        <div className="form-field"><label htmlFor="profile-phone">Teléfono / WhatsApp</label><input autoComplete="tel" defaultValue={profile.phone_e164 ?? ""} id="profile-phone" inputMode="tel" name="phone" required /></div>
        <div className="form-field"><label htmlFor="profile-city">Ciudad</label><input defaultValue={profile.city ?? ""} id="profile-city" name="city" required /></div>
      </div>
      <AuthFeedback state={state} />
      <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
}
