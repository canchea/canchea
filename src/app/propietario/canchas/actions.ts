"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/auth/auth-feedback";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CourtPhotoKind } from "@/types/database";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseNumber(value: string, min: number, max: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function saveCourtAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");

  const courtId = text(formData, "court_id");
  const name = text(formData, "name");
  const sportSlug = text(formData, "sport");
  const modalitySlug = text(formData, "modality");
  const surfaceSlug = text(formData, "surface");
  const capacity = parseNumber(text(formData, "capacity"), 1, 100);
  const length = parseNumber(text(formData, "length_m"), 3, 200);
  const width = parseNumber(text(formData, "width_m"), 2, 150);
  const durations = formData.getAll("durations").map(Number).filter((value) => value === 30 || value === 60);
  const featureSlugs = formData.getAll("features").map(String);

  if (name.length < 3) return { status: "error", message: "El nombre de la cancha debe tener al menos 3 caracteres." };
  if (!sportSlug || !modalitySlug || !surfaceSlug) return { status: "error", message: "Selecciona deporte, modalidad y superficie." };
  if (capacity === null || !Number.isInteger(capacity)) return { status: "error", message: "Ingresa una capacidad válida entre 1 y 100 jugadores." };
  if (length === null || width === null) return { status: "error", message: "Ingresa dimensiones válidas para la cancha." };
  if (!durations.length) return { status: "error", message: "Selecciona al menos una duración: 30 o 60 minutos." };

  const supabase = await createClient();
  const { data: court, error } = await supabase.rpc("save_my_court", {
    p_court_id: (courtId || null) as string,
    p_name: name,
    p_sport_slug: sportSlug,
    p_modality_slug: modalitySlug,
    p_surface_slug: surfaceSlug,
    p_capacity: capacity,
    p_length_m: length,
    p_width_m: width,
    p_is_roofed: formData.get("is_roofed") === "on",
    p_has_lighting: formData.get("has_lighting") === "on",
    p_duration_minutes: [...new Set(durations)],
    p_feature_slugs: [...new Set(featureSlugs)],
  });

  if (error || !court) {
    return { status: "error", message: "No pudimos guardar la cancha. Revisa los datos y vuelve a intentarlo." };
  }

  revalidatePath("/propietario/canchas");
  revalidatePath("/admin");
  redirect(`/propietario/canchas?guardado=1&editar=${court.id}`);
}

export async function setCourtStatusAction(formData: FormData) {
  await requireRole("venue_owner");
  const courtId = text(formData, "court_id");
  const status = text(formData, "status");
  if (!courtId || (status !== "active" && status !== "inactive")) return;

  const supabase = await createClient();
  const { data: court, error } = await supabase.rpc("set_my_court_status", {
    p_court_id: courtId,
    p_status: status,
  });

  if (error) redirect(`/propietario/canchas?estado=error&editar=${courtId}`);

  revalidatePath("/propietario/canchas");
  revalidatePath("/admin");
  if (court) revalidatePath("/complejos", "layout");
  redirect(`/propietario/canchas?estado=${status === "active" ? "activada" : "pausada"}&editar=${courtId}`);
}

export async function uploadCourtPhotoAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");
  const courtId = text(formData, "court_id");
  const file = formData.get("photo");
  const rawKind = text(formData, "kind");
  const kind: CourtPhotoKind | null = rawKind === "cover" || rawKind === "gallery" ? rawKind : null;
  const altText = text(formData, "alt_text");

  if (!courtId) return { status: "error", message: "Guarda primero la cancha." };
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Selecciona una imagen." };
  if (!IMAGE_TYPES.has(file.type)) return { status: "error", message: "Usa una imagen JPG, PNG o WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { status: "error", message: "La imagen no puede superar 5 MB." };
  if (!kind) return { status: "error", message: "Elige portada o galería." };
  if (altText.length < 3 || altText.length > 160) return { status: "error", message: "Describe brevemente la imagen." };

  const supabase = await createClient();
  const { data: court } = await supabase
    .from("courts")
    .select("id, venue_id")
    .eq("id", courtId)
    .maybeSingle();

  if (!court) return { status: "error", message: "No encontramos la cancha." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${court.venue_id}/courts/${court.id}/${kind}/${randomUUID()}.${extension}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("venue-media").upload(objectPath, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) return { status: "error", message: "No pudimos subir la imagen. Verifica el formato e inténtalo nuevamente." };

  const { error: registerError } = await supabase.rpc("register_my_court_photo", {
    p_court_id: courtId,
    p_object_path: objectPath,
    p_kind: kind,
    p_alt_text: altText,
  });

  if (registerError) {
    await supabase.storage.from("venue-media").remove([objectPath]);
    return {
      status: "error",
      message: kind === "cover" ? "La cancha ya tiene portada. Elimínala antes de reemplazarla." : "No pudimos registrar la imagen.",
    };
  }

  revalidatePath("/propietario/canchas");
  return { status: "success", message: "Imagen cargada correctamente." };
}

export async function deleteCourtPhotoAction(formData: FormData) {
  await requireRole("venue_owner");
  const photoId = text(formData, "photo_id");
  if (!photoId) return;

  const supabase = await createClient();
  const { data: objectPath, error } = await supabase.rpc("delete_my_court_photo", { p_photo_id: photoId });
  if (!error && objectPath) await supabase.storage.from("venue-media").remove([objectPath]);
  revalidatePath("/propietario/canchas");
}
