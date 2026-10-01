"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function reviewVenueAction(formData: FormData) {
  await requireRole("super_admin");

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!venueId || !["approve", "reject", "request_changes"].includes(decision)) {
    redirect("/admin?revision=error");
  }

  if (decision !== "approve" && note.length < 5) {
    redirect("/admin?revision=nota");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_venue", {
    p_venue_id: venueId,
    p_decision: decision,
    p_note: note || undefined,
  });

  if (error) redirect("/admin?revision=error");

  revalidatePath("/admin");
  revalidatePath("/propietario");
  revalidatePath("/complejos");
  redirect("/admin?revision=ok");
}

export async function processRefundAction(formData: FormData) {
  await requireRole("super_admin");
  const refundId = String(formData.get("refund_id") ?? "").trim();
  const reference = String(formData.get("provider_refund_id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(refundId)) redirect("/admin/operaciones?estado=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_refund_processed", {
    p_refund_id: refundId,
    p_provider_refund_id: reference || undefined,
  });
  if (error) redirect("/admin/operaciones?estado=error");

  revalidatePath("/admin");
  revalidatePath("/admin/operaciones");
  redirect("/admin/operaciones?estado=reembolso-ok");
}

export async function reviewComplaintAction(formData: FormData) {
  await requireRole("super_admin");
  const complaintId = String(formData.get("complaint_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "in_review" | "resolved" | "rejected";
  const note = String(formData.get("resolution_note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(complaintId) || !["in_review", "resolved", "rejected"].includes(status)) redirect("/admin/operaciones?estado=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_complaint", {
    p_complaint_id: complaintId,
    p_status: status,
    p_resolution_note: note || undefined,
  });
  if (error) redirect("/admin/operaciones?estado=error");

  revalidatePath("/admin/operaciones");
  redirect("/admin/operaciones?estado=reclamo-ok");
}

export async function createSettlementAction(formData: FormData) {
  await requireRole("super_admin");
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(venueId) || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) redirect("/admin/operaciones?estado=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_settlement", {
    p_venue_id: venueId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) redirect("/admin/operaciones?estado=sin-saldo");

  revalidatePath("/admin");
  revalidatePath("/admin/operaciones");
  redirect("/admin/operaciones?estado=liquidacion-ok");
}

export async function updatePlatformSettingAction(formData: FormData) {
  await requireRole("super_admin");
  const key = String(formData.get("key") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "").trim();
  const isBoolean = rawValue === "true" || rawValue === "false";
  const numericValue = Number(rawValue);
  if (!key || (!isBoolean && (!Number.isFinite(numericValue) || numericValue < 0))) redirect("/admin/configuracion?estado=error");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_platform_setting", {
    p_key: key,
    p_value: isBoolean ? rawValue === "true" : numericValue,
  });
  if (error) redirect("/admin/configuracion?estado=error");

  revalidatePath("/admin/configuracion");
  redirect("/admin/configuracion?estado=ok");
}
