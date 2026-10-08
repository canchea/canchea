import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/auth/profile-form";
import { PrivateShell } from "@/components/auth/private-shell";
import { adminNavigation, ownerNavigation, playerNavigation } from "@/config/dashboard-navigation";
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
  const navigation = account.profile.role === "super_admin"
    ? adminNavigation
    : account.profile.role === "venue_owner"
      ? ownerNavigation
      : playerNavigation;
  const primaryAction = account.profile.role === "player"
    ? "Volver a reservar"
    : account.profile.role === "venue_owner"
      ? "Volver al resumen"
      : "Volver a administración";

  return (
    <PrivateShell
      title="Mi perfil"
      description="Actualiza tus datos de contacto. El rol principal no puede cambiarse desde esta pantalla."
      links={[...navigation]}
    >
      <section className="private-card">
        <div className="account-summary">
          <div><span>Correo</span><strong>{account.user.email}</strong></div>
          <div><span>Tipo de cuenta</span><strong>{roleNames[account.profile.role]}</strong></div>
        </div>
        <div className="account-return">
          <Link className="button button--secondary" href={navigation[0].href}>{primaryAction}</Link>
        </div>
        <ProfileForm profile={account.profile} />
      </section>
    </PrivateShell>
  );
}
