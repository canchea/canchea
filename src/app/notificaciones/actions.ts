"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  await requireOnboardedAccount();
  const id = String(formData.get("notification_id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("mark_my_notification_read", { p_notification_id: id });
  }
  revalidatePath("/notificaciones");
}

export async function markAllNotificationsReadAction() {
  await requireOnboardedAccount();
  const supabase = await createClient();
  await supabase.rpc("mark_all_my_notifications_read");
  revalidatePath("/notificaciones");
}
