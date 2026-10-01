"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv, isGoogleAuthEnabled } from "@/lib/supabase/env";
import { destinationForRole } from "@/lib/auth/routes";
import type { FormState } from "@/components/auth/auth-feedback";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function rawText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function unavailable(): FormState {
  return {
    status: "error",
    message: "Supabase todavía no está conectado. Completa las variables de .env.local para activar el acceso.",
  };
}

function safeInternalPath(input: string) {
  return input.startsWith("/") && !input.startsWith("//") && !input.includes("\\") ? input : null;
}

export async function signInAction(_state: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return unavailable();

  const email = text(formData, "email").toLowerCase();
  const password = rawText(formData, "password");
  const continueTo = safeInternalPath(text(formData, "continue_to"));

  if (!email || !password) {
    return { status: "error", message: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { status: "error", message: "El correo o la contraseña no son correctos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(continueTo ?? destinationForRole(profile?.role ?? null));
}

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return unavailable();

  const email = text(formData, "email").toLowerCase();
  const password = rawText(formData, "password");
  const passwordConfirmation = rawText(formData, "password_confirmation");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Ingresa un correo electrónico válido." };
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { status: "error", message: "La contraseña debe tener al menos 8 caracteres, una letra y un número." };
  }

  if (password !== passwordConfirmation) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
  });

  if (error) {
    return { status: "error", message: "No pudimos crear la cuenta. Revisa los datos e inténtalo nuevamente." };
  }

  if (data.session) redirect("/onboarding");

  return {
    status: "success",
    message: "Cuenta creada. Revisa tu correo y confirma el enlace para continuar.",
  };
}

export async function signInWithGoogle() {
  if (!hasSupabaseEnv() || !isGoogleAuthEnabled()) {
    redirect("/auth/iniciar-sesion?estado=google-pendiente");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });

  if (error || !data.url) redirect("/auth/iniciar-sesion?estado=oauth-error");
  redirect(data.url);
}
