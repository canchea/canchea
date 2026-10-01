import type { Metadata } from "next";
import { ProfileForm } from "@/components/auth/profile-form";
import { PrivateShell } from "@/components/auth/private-shell";
import { requireOnboardedAccount } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false, follow: false },
};

const roleNames = {
  player: "Jugador",
  venue_owner: "Propietario de complejo",
  super_admin: "Superadministrador",
} as const;

export default async function AccountPage() {
  const account = await requireOnboardedAccount();

  return (
    <PrivateShell title="Mi perfil" description="Actualiza tus datos de contacto. El rol principal no puede cambiarse desde esta pantalla.">
      <section className="private-card">
        <div className="account-summary">
          <div><span>Correo</span><strong>{account.user.email}</strong></div>
          <div><span>Tipo de cuenta</span><strong>{roleNames[account.profile.role]}</strong></div>
        </div>
        <ProfileForm profile={account.profile} />
      </section>
    </PrivateShell>
  );
}
