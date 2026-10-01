"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/app/auth/actions";
import { AuthFeedback, initialFormState } from "@/components/auth/auth-feedback";
import { SubmitButton } from "@/components/auth/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} className="auth-form">
      <div className="form-field">
        <label htmlFor="signup-email">Correo electrónico</label>
        <input autoComplete="email" id="signup-email" name="email" placeholder="tu@correo.com" required type="email" />
      </div>
      <div className="form-field">
        <label htmlFor="signup-password">Contraseña</label>
        <input aria-describedby="password-help" autoComplete="new-password" id="signup-password" minLength={8} name="password" required type="password" />
        <small id="password-help">Mínimo 8 caracteres, con una letra y un número.</small>
      </div>
      <div className="form-field">
        <label htmlFor="signup-password-confirmation">Confirmar contraseña</label>
        <input autoComplete="new-password" id="signup-password-confirmation" minLength={8} name="password_confirmation" required type="password" />
      </div>
      <AuthFeedback state={state} />
      <SubmitButton pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="auth-switch">¿Ya tienes cuenta? <Link href="/auth/iniciar-sesion">Ingresa aquí</Link></p>
    </form>
  );
}
