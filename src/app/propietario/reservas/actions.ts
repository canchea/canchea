"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function ownerBookingAction(formData: FormData) {
  await requireRole("venue_owner");
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const action = String(formData.get("booking_action") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !["start", "complete", "no_show"].includes(action)) {
    redirect("/propietario/reservas?estado=error");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_update_booking_status", {
    p_booking_id: bookingId,
    p_action: action,
  });
  if (error) redirect("/propietario/reservas?estado=error");

  revalidatePath("/propietario/dashboard");
  revalidatePath("/propietario/reservas");
  revalidatePath("/propietario/calendario");
  revalidatePath("/jugador");
  redirect("/propietario/reservas?estado=ok");
}
