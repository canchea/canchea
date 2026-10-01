import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { AppRole, Profile } from "@/types/database";

export const getCurrentAccount = cache(async () => {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, phone_e164, city, terms_accepted_at, privacy_accepted_at, onboarding_completed_at, created_at, updated_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  return {
    user: {
      id: userData.user.id,
      email: userData.user.email ?? "",
    },
    profile: profile as Profile | null,
  };
});

export async function requireAccount() {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/iniciar-sesion");
  return account;
}

export async function requireOnboardedAccount() {
  const account = await requireAccount();
  if (!account.profile?.role) {
    redirect("/onboarding");
  }
  if (account.profile.role !== "super_admin" && !account.profile.onboarding_completed_at) {
    redirect("/onboarding");
  }
  return account as typeof account & { profile: Profile & { role: AppRole } };
}

export async function requireRole(role: AppRole) {
  const account = await requireOnboardedAccount();
  if (account.profile.role !== role) redirect("/cuenta");
  return account;
}
