import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/supabase/env";
import { getCurrentAccount } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/routes";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const account = await getCurrentAccount();
  if (account) redirect(destinationForRole(account.profile?.role ?? null));

  return (
    <AuthShell
      eyebrow="Comienza en minutos"
      title="Tu próximo partido empieza aquí."
      description="Crea una cuenta y luego elige si quieres reservar canchas o administrar un complejo."
    >
      <div className="auth-card-heading">
        <p className="eyebrow">Nueva cuenta</p>
        <h2>Crear cuenta</h2>
        <p>No te pediremos datos adicionales hasta confirmar tu acceso.</p>
      </div>
      <GoogleAuthButton enabled={isGoogleAuthEnabled()} />
      <div className="auth-divider"><span>o regístrate con correo</span></div>
      <SignupForm />
    </AuthShell>
  );
}
