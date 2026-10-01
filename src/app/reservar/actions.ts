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

  if (!validUuid(courtId) || !Number.isFinite(Date.parse(startsAt)) || ![30, 60].includes(duration)) {
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
    redirect(`${safeReturn}${separator}estado=no-disponible`);
  }

  revalidatePath("/buscar");
  revalidatePath("/jugador");
  redirect(`/reservar/${data.id}`);
}

export async function releaseBookingHoldAction(formData: FormData) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/iniciar-sesion");
  if (account.profile?.role !== "player") redirect("/cuenta");

  const bookingId = value(formData, "booking_id");
  if (!validUuid(bookingId)) redirect("/jugador");

  const supabase = await createClient();
  await supabase.rpc("release_my_booking_hold", { p_booking_id: bookingId });
  revalidatePath("/buscar");
  revalidatePath("/jugador");
  redirect("/jugador?estado=hold-liberado");
}

export async function createMockPaymentOrderAction(formData: FormData) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/iniciar-sesion");
  if (account.profile?.role !== "player") redirect("/cuenta");

  const bookingId = value(formData, "booking_id");
  if (!validUuid(bookingId)) redirect("/jugador");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_my_mock_payment_order", {
    p_booking_id: bookingId,
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error || !data) redirect(`/reservar/${bookingId}?estado=pago-no-disponible`);

  revalidatePath(`/reservar/${bookingId}`);
  redirect(`/reservar/${bookingId}?estado=orden-creada`);
}

export async function simulateMockPaymentAction(formData: FormData) {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/iniciar-sesion");
  if (account.profile?.role !== "player") redirect("/cuenta");

  const bookingId = value(formData, "booking_id");
  const paymentOrderId = value(formData, "payment_order_id");
  if (!validUuid(bookingId) || !validUuid(paymentOrderId)) redirect("/jugador");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simulate_my_mock_payment", {
    p_payment_order_id: paymentOrderId,
    p_idempotency_key: crypto.randomUUID(),
  });

  const result = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  if (error || result?.payment_status !== "paid") {
    redirect(`/reservar/${bookingId}?estado=pago-rechazado`);
  }

  revalidatePath(`/reservar/${bookingId}`);
  revalidatePath("/jugador");
  revalidatePath("/buscar");
  redirect(`/reservar/${bookingId}?estado=pago-confirmado`);
}
