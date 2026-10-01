"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { normalizePhoneE164 } from "@/lib/auth/phone";
import { destinationForRole } from "@/lib/auth/routes";
import type { FormState } from "@/components/auth/auth-feedback";
import type { AppRole } from "@/types/database";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function completeOnboardingAction(_state: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) {
    return { status: "error", message: "Conecta el proyecto Supabase antes de completar el perfil." };
  }

  const rawRole = text(formData, "role");
  const role: AppRole | null = rawRole === "player" || rawRole === "venue_owner" ? rawRole : null;
  const firstName = text(formData, "first_name");
  const lastName = text(formData, "last_name");
  const phone = normalizePhoneE164(text(formData, "phone"));
  const city = text(formData, "city");
  const acceptTerms = formData.get("accept_terms") === "on";
  const acceptPrivacy = formData.get("accept_privacy") === "on";

  if (!role) return { status: "error", message: "Elige cómo quieres utilizar CANCHEA." };
  if (firstName.length < 2 || lastName.length < 2) return { status: "error", message: "Ingresa tu nombre y apellido." };
  if (!phone) return { status: "error", message: "Ingresa un teléfono válido. Para Bolivia puedes escribir 8 dígitos." };
  if (city.length < 2) return { status: "error", message: "Ingresa tu ciudad." };
  if (!acceptTerms || !acceptPrivacy) return { status: "error", message: "Debes aceptar los términos y la política de privacidad." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/iniciar-sesion");

  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: role,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone_e164: phone,
    p_city: city,
    p_accept_terms: acceptTerms,
    p_accept_privacy: acceptPrivacy,
  });

  if (error) {
    return { status: "error", message: "No pudimos guardar tu perfil. Revisa los datos e inténtalo nuevamente." };
  }

  redirect(destinationForRole(role));
}
