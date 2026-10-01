import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireAccount } from "@/lib/auth/session";
import { destinationForRole } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Completa tu perfil",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const account = await requireAccount();
  if (account.profile?.role === "super_admin" || (account.profile?.onboarding_completed_at && account.profile.role)) {
    redirect(destinationForRole(account.profile.role));
  }

  return (
    <main className="private-page onboarding-page">
      <div className="private-topbar"><Logo /></div>
      <section className="onboarding-card">
        <div className="onboarding-heading">
          <p className="eyebrow">Último paso</p>
          <h1>Cuéntanos cómo usarás CANCHEA</h1>
          <p>El rol principal queda asociado a esta cuenta y protege las funciones que podrás utilizar.</p>
        </div>
        <OnboardingForm initialFirstName={account.profile?.first_name ?? ""} initialLastName={account.profile?.last_name ?? ""} />
      </section>
    </main>
  );
}
