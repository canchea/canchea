"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/auth/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";

export function LoginForm({ continueTo = null }: { continueTo?: string | null }) {
  const [state, action] = useActionState(signInAction, initialFormState);

  return (
    <form action={action} className="auth-form">
      {continueTo ? <input name="continue_to" type="hidden" value={continueTo} /> : null}
      <div className="form-field">
        <label htmlFor="login-email">Correo electrónico</label>
        <input autoComplete="email" id="login-email" name="email" placeholder="tu@correo.com" required type="email" />
      </div>
      <div className="form-field">
        <label htmlFor="login-password">Contraseña</label>
        <input autoComplete="current-password" id="login-password" minLength={8} name="password" required type="password" />
      </div>
      <AuthFeedback state={state} />
      <SubmitButton pendingText="Ingresando…">Ingresar</SubmitButton>
      <p className="auth-switch">¿Todavía no tienes cuenta? <Link href="/auth/registro">Créala aquí</Link></p>
    </form>
  );
}
