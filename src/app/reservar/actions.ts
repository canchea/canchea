"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validUuid(input: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

export async function createBookingHoldAction(formData: FormData) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/iniciar-sesion");
  if (account.profile?.role !== "player") redirect("/cuenta");

  const courtId = value(formData, "court_id");
  const startsAt = value(formData, "starts_at");
  const duration = Number(value(formData, "duration_minutes"));
  const returnPath = value(formData, "return_path");

  if (!validUuid(courtId) || !Number.isFinite(Date.parse(startsAt)) || duration !== 60) {
    redirect("/buscar?estado=reserva-invalida");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_hold", {
    p_court_id: courtId,
    p_starts_at: startsAt,
    p_duration_minutes: duration,
  });

  if (error || !data) {
    const safeReturn = returnPath.startsWith("/reservar?") ? returnPath : "/buscar";
    const separator = safeReturn.includes("?") ? "&" : "?";
    const state = error?.message.includes("VENUE_BALANCE_LOW") ? "complejo-sin-saldo" : "no-disponible";
    redirect(`${safeReturn}${separator}estado=${state}`);
  }

  revalidatePath("/buscar");
  revalidatePath("/jugador");
  redirect(`/reservar/${data.id}?estado=reserva-confirmada`);
}
