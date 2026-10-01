"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ComplaintCategory } from "@/types/database";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeReturnPath(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function cancelBookingAction(formData: FormData) {
  await requireRole("player");
  const bookingId = field(formData, "booking_id");
  if (!isUuid(bookingId)) redirect("/jugador/reservas?estado=error");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_my_booking", { p_booking_id: bookingId });
  if (error || !data) redirect(`/reservar/${bookingId}?estado=cancelacion-error`);

  revalidatePath("/jugador");
  revalidatePath("/jugador/reservas");
  revalidatePath("/buscar");
  redirect(`/reservar/${bookingId}?estado=${data.refund_amount_bob > 0 ? "cancelada-reembolso" : "cancelada"}`);
}

export async function toggleVenueFavoriteAction(formData: FormData) {
  await requireRole("player");
  const venueId = field(formData, "venue_id");
  const returnPath = safeReturnPath(field(formData, "return_path"), "/jugador/favoritos");
  if (!isUuid(venueId)) redirect(returnPath);

  const supabase = await createClient();
  await supabase.rpc("toggle_my_venue_favorite", { p_venue_id: venueId });
  revalidatePath(returnPath.split("?")[0]);
  revalidatePath("/jugador/favoritos");
  redirect(returnPath);
}

export async function toggleCourtFavoriteAction(formData: FormData) {
  await requireRole("player");
  const courtId = field(formData, "court_id");
  const returnPath = safeReturnPath(field(formData, "return_path"), "/jugador/favoritos");
  if (!isUuid(courtId)) redirect(returnPath);

  const supabase = await createClient();
  await supabase.rpc("toggle_my_court_favorite", { p_court_id: courtId });
  revalidatePath(returnPath.split("?")[0]);
  revalidatePath("/jugador/favoritos");
  redirect(returnPath);
}

export async function markNotificationReadAction(formData: FormData) {
  await requireRole("player");
  const notificationId = field(formData, "notification_id");
  if (isUuid(notificationId)) {
    const supabase = await createClient();
    await supabase.rpc("mark_my_notification_read", { p_notification_id: notificationId });
  }
  revalidatePath("/jugador/notificaciones");
}

export async function markAllNotificationsReadAction() {
  await requireRole("player");
  const supabase = await createClient();
  await supabase.rpc("mark_all_my_notifications_read");
  revalidatePath("/jugador");
  revalidatePath("/jugador/notificaciones");
}

export async function submitReviewAction(formData: FormData) {
  await requireRole("player");
  const bookingId = field(formData, "booking_id");
  const rating = Number(field(formData, "rating"));
  const comment = field(formData, "comment");
  if (!isUuid(bookingId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect("/jugador/valoraciones?estado=error");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_my_review", {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment || undefined,
  });
  if (error) redirect("/jugador/valoraciones?estado=error");

  revalidatePath("/jugador/valoraciones");
  revalidatePath("/complejos");
  redirect("/jugador/valoraciones?estado=ok");
}

const complaintCategories: ComplaintCategory[] = [
  "court_unavailable",
  "venue_closed",
  "payment_issue",
  "facility_mismatch",
  "cancellation",
  "other",
];

export async function createComplaintAction(formData: FormData) {
  await requireRole("player");
  const bookingId = field(formData, "booking_id");
  const category = field(formData, "category") as ComplaintCategory;
  const description = field(formData, "description");
  if (!isUuid(bookingId) || !complaintCategories.includes(category) || description.length < 10) {
    redirect("/jugador/reclamos?estado=error");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_my_complaint", {
    p_booking_id: bookingId,
    p_category: category,
    p_description: description,
  });
  if (error) redirect("/jugador/reclamos?estado=error");

  revalidatePath("/jugador/reclamos");
  redirect("/jugador/reclamos?estado=ok");
}
