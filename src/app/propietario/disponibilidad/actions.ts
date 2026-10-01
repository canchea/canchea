"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/auth/auth-feedback";
import { requireRole } from "@/lib/auth/session";
import { timeToMinute } from "@/lib/courts/time";
import { createClient } from "@/lib/supabase/server";
import type { CourtBlockKind, Json } from "@/types/database";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function revalidateAvailability() {
  revalidatePath("/propietario/disponibilidad");
  revalidatePath("/complejos", "layout");
}

export async function saveWeeklyScheduleAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");
  const courtId = text(formData, "court_id");
  if (!courtId) return { status: "error", message: "Selecciona una cancha." };

  const schedule = Array.from({ length: 7 }, (_, day) => {
    const isAvailable = formData.get(`available_${day}`) === "on";
    return {
      day_of_week: day,
      is_available: isAvailable,
      opens_minute: isAvailable ? timeToMinute(text(formData, `opens_${day}`)) : null,
      closes_minute: isAvailable ? timeToMinute(text(formData, `closes_${day}`)) : null,
    };
  });

  if (schedule.every((entry) => !entry.is_available)) {
    return { status: "error", message: "Marca al menos un día disponible." };
  }
  if (schedule.some((entry) => entry.is_available && (entry.opens_minute === null || entry.closes_minute === null || entry.opens_minute >= entry.closes_minute))) {
    return { status: "error", message: "Usa horas válidas en intervalos de 30 minutos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_court_schedule", {
    p_court_id: courtId,
    p_schedule: schedule as Json,
  });

  if (error) {
    const message = error.message.includes("existing pricing")
      ? "El nuevo horario dejaría reglas de precio fuera de funcionamiento. Elimina o ajusta esas reglas primero."
      : error.message.includes("venue opening")
        ? "El horario de la cancha debe estar dentro del horario general del complejo."
        : "No pudimos guardar el horario. Revisa los días y las horas.";
    return { status: "error", message };
  }

  revalidateAvailability();
  return { status: "success", message: "Horario semanal guardado correctamente." };
}

export async function createPricingRuleAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");
  const courtId = text(formData, "court_id");
  const day = integer(text(formData, "day_of_week"), 0, 6);
  const startsMinute = timeToMinute(text(formData, "starts_at"));
  const endsMinute = timeToMinute(text(formData, "ends_at"));
  const duration = integer(text(formData, "duration_minutes"), 30, 60);
  const price = Number(text(formData, "price_bob").replace(",", "."));

  if (!courtId || day === null || startsMinute === null || endsMinute === null || startsMinute >= endsMinute) {
    return { status: "error", message: "Completa correctamente el día y la franja horaria." };
  }
  if ((duration !== 30 && duration !== 60) || !Number.isFinite(price) || price <= 0 || price > 100000) {
    return { status: "error", message: "Ingresa una duración habilitada y un precio válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_my_pricing_rule", {
    p_court_id: courtId,
    p_day_of_week: day,
    p_starts_minute: startsMinute,
    p_ends_minute: endsMinute,
    p_duration_minutes: duration,
    p_price_bob: price,
  });

  if (error) {
    const message = error.message.includes("overlaps")
      ? "La regla se superpone con otra del mismo día y duración. Divide las franjas sin cruces."
      : error.message.includes("court schedule")
        ? "La franja debe estar completamente dentro del horario configurado para ese día."
        : error.message.includes("not enabled")
          ? "Esta duración no está habilitada en la cancha."
          : "No pudimos crear la regla de precio.";
    return { status: "error", message };
  }

  revalidateAvailability();
  return { status: "success", message: "Regla de precio creada." };
}

export async function deletePricingRuleAction(formData: FormData) {
  await requireRole("venue_owner");
  const ruleId = text(formData, "rule_id");
  if (!ruleId) return;
  const supabase = await createClient();
  await supabase.rpc("delete_my_pricing_rule", { p_rule_id: ruleId });
  revalidateAvailability();
}

export async function createCourtBlockAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");
  const courtId = text(formData, "court_id");
  const startsLocal = text(formData, "starts_local");
  const endsLocal = text(formData, "ends_local");
  const rawKind = text(formData, "kind");
  const kind: CourtBlockKind | null = ["maintenance", "event", "internal_use", "other"].includes(rawKind) ? rawKind as CourtBlockKind : null;
  const reason = text(formData, "reason");
  const localPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

  if (!courtId || !kind || !localPattern.test(startsLocal) || !localPattern.test(endsLocal) || startsLocal >= endsLocal) {
    return { status: "error", message: "Selecciona un inicio, un final y un tipo de bloqueo válidos." };
  }
  if (reason && (reason.length < 3 || reason.length > 240)) {
    return { status: "error", message: "El motivo debe tener entre 3 y 240 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_my_court_block", {
    p_court_id: courtId,
    p_starts_local: startsLocal.replace("T", " "),
    p_ends_local: endsLocal.replace("T", " "),
    p_kind: kind,
    p_reason: reason || undefined,
  });

  if (error) {
    const message = error.message.includes("overlaps")
      ? "Ese periodo se cruza con otro bloqueo existente."
      : "No pudimos crear el bloqueo. Sólo puedes bloquear periodos futuros de hasta 31 días.";
    return { status: "error", message };
  }

  revalidateAvailability();
  return { status: "success", message: "Horario bloqueado correctamente." };
}

export async function deleteCourtBlockAction(formData: FormData) {
  await requireRole("venue_owner");
  const blockId = text(formData, "block_id");
  if (!blockId) return;
  const supabase = await createClient();
  await supabase.rpc("delete_my_court_block", { p_block_id: blockId });
  revalidateAvailability();
}
