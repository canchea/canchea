import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/supabase/env";
import { getCurrentAccount } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/routes";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ estado?: string | string[]; continuar?: string | string[] }> }) {
  const [params, account] = await Promise.all([searchParams, getCurrentAccount()]);
  const status = typeof params.estado === "string" ? params.estado : null;
  const continueTo = typeof params.continuar === "string" && params.continuar.startsWith("/") && !params.continuar.startsWith("//")
    ? params.continuar
    : null;
  if (account) redirect(continueTo ?? destinationForRole(account.profile?.role ?? null));

  return (
    <AuthShell
      eyebrow="Tu cuenta CANCHEA"
      title="Vuelve a la cancha."
      description="Ingresa para administrar tus reservas o tu complejo deportivo."
    >
      <div className="auth-card-heading">
        <p className="eyebrow">Acceso seguro</p>
        <h2>Ingresar</h2>
        <p>Usa Google o tu correo y contraseña.</p>
      </div>
      {status === "google-pendiente" && <p className="form-feedback form-feedback--error" role="alert">Google OAuth estará activo cuando conectemos el proyecto Supabase.</p>}
      {status === "oauth-error" && <p className="form-feedback form-feedback--error" role="alert">No pudimos completar el acceso con Google. Inténtalo nuevamente.</p>}
      {status === "confirm-error" && <p className="form-feedback form-feedback--error" role="alert">El enlace de confirmación no es válido o ya expiró.</p>}
      <GoogleAuthButton enabled={isGoogleAuthEnabled()} />
      <div className="auth-divider"><span>o continúa con correo</span></div>
      <LoginForm continueTo={continueTo} />
    </AuthShell>
  );
}
