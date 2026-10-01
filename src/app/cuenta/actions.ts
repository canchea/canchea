"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhoneE164 } from "@/lib/auth/phone";
import type { FormState } from "@/components/auth/auth-feedback";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const firstName = text(formData, "first_name");
  const lastName = text(formData, "last_name");
  const phone = normalizePhoneE164(text(formData, "phone"));
  const city = text(formData, "city");

  if (firstName.length < 2 || lastName.length < 2 || city.length < 2 || !phone) {
    return { status: "error", message: "Revisa tu nombre, apellido, teléfono y ciudad." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, phone_e164: phone, city })
    .eq("id", userData.user.id);

  if (error) return { status: "error", message: "No pudimos actualizar el perfil." };

  revalidatePath("/cuenta");
  return { status: "success", message: "Perfil actualizado correctamente." };
}
