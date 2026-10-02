"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizePhoneE164 } from "@/lib/auth/phone";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid, setActiveVenueCookie } from "@/lib/venues/owner";
import type { FormState } from "@/components/auth/auth-feedback";
import type { Json, VenuePhotoKind } from "@/types/database";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseCoordinate(value: string, min: number, max: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function saveVenueAction(_state: FormState, formData: FormData): Promise<FormState> {
  await requireRole("venue_owner");

  const venueId = text(formData, "venue_id");
  if (venueId && !isUuid(venueId)) return { status: "error", message: "No encontramos la sucursal que intentas editar." };

  const commercialName = text(formData, "commercial_name");
  const description = text(formData, "description");
  const phone = normalizePhoneE164(text(formData, "phone"));
  const whatsapp = normalizePhoneE164(text(formData, "whatsapp"));
  const address = text(formData, "address");
  const zone = text(formData, "zone");
  const city = text(formData, "city");
  const latitude = parseCoordinate(text(formData, "latitude"), -90, 90);
  const longitude = parseCoordinate(text(formData, "longitude"), -180, 180);
  const serviceSlugs = formData.getAll("services").map(String);

  if (commercialName.length < 3) return { status: "error", message: "Ingresa el nombre comercial del complejo." };
  if (description.length < 30) return { status: "error", message: "La descripción debe tener al menos 30 caracteres." };
  if (!phone || !whatsapp) return { status: "error", message: "Ingresa teléfonos válidos para llamadas y WhatsApp." };
  if (address.length < 5 || zone.length < 2 || city.length < 2) return { status: "error", message: "Completa la dirección, zona y ciudad." };
  if (latitude === null || longitude === null) return { status: "error", message: "Ingresa coordenadas válidas para ubicar el complejo." };
  if (!serviceSlugs.length) return { status: "error", message: "Selecciona al menos un servicio." };

  const hours = Array.from({ length: 7 }, (_, day) => {
    const isClosed = formData.get(`closed_${day}`) === "on";
    return {
      day_of_week: day,
      is_closed: isClosed,
      opens_at: isClosed ? null : text(formData, `opens_${day}`),
      closes_at: isClosed ? null : text(formData, `closes_${day}`),
    };
  });

  if (hours.every((entry) => entry.is_closed)) return { status: "error", message: "Marca al menos un día de atención." };
  if (hours.some((entry) => !entry.is_closed && (!entry.opens_at || !entry.closes_at || entry.opens_at >= entry.closes_at))) {
    return { status: "error", message: "Revisa los horarios: la apertura debe ser anterior al cierre." };
  }

  const supabase = await createClient();
  const { data: savedVenue, error } = await supabase.rpc("save_my_venue", {
    p_venue_id: (venueId || null) as string,
    p_commercial_name: commercialName,
    p_description: description,
    p_phone_e164: phone,
    p_whatsapp_e164: whatsapp,
    p_address: address,
    p_zone: zone,
    p_city: city,
    p_latitude: latitude,
    p_longitude: longitude,
    p_service_slugs: serviceSlugs,
    p_hours: hours as Json,
  });

  if (error || !savedVenue) {
    return { status: "error", message: "No pudimos guardar el complejo. Revisa los datos e inténtalo nuevamente." };
  }

  await setActiveVenueCookie(savedVenue.id);
  revalidatePath("/propietario", "layout");
  redirect("/propietario?guardado=1");
}

export async function uploadVenuePhotoAction(_state: FormState, formData: FormData): Promise<FormState> {
  const account = await requireRole("venue_owner");
  const file = formData.get("photo");
  const rawKind = text(formData, "kind");
  const kind: VenuePhotoKind | null = rawKind === "logo" || rawKind === "cover" || rawKind === "gallery" ? rawKind : null;
  const altText = text(formData, "alt_text");
  const venueId = text(formData, "venue_id");

  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Selecciona una imagen." };
  if (!IMAGE_TYPES.has(file.type)) return { status: "error", message: "Usa una imagen JPG, PNG o WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { status: "error", message: "La imagen no puede superar 5 MB." };
  if (!kind) return { status: "error", message: "Elige el uso de la imagen." };
  if (altText.length < 3 || altText.length > 160) return { status: "error", message: "Describe brevemente la imagen." };

  if (!isUuid(venueId)) return { status: "error", message: "Guarda primero los datos del complejo." };

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("id, status")
    .eq("id", venueId)
    .eq("owner_id", account.user.id)
    .maybeSingle();

  if (!venue) return { status: "error", message: "Guarda primero los datos del complejo." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${venue.id}/${kind}/${randomUUID()}.${extension}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("venue-media").upload(objectPath, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) return { status: "error", message: "No pudimos subir la imagen. Verifica el formato e inténtalo nuevamente." };

  const { error: registerError } = await supabase.rpc("register_my_venue_photo", {
    p_venue_id: venue.id,
    p_object_path: objectPath,
    p_kind: kind,
    p_alt_text: altText,
  });

  if (registerError) {
    await supabase.storage.from("venue-media").remove([objectPath]);
    const duplicateMessage = kind === "logo" || kind === "cover"
      ? `Ya existe una ${kind === "logo" ? "imagen de logo" : "portada"}. Elimínala antes de reemplazarla.`
      : "No pudimos registrar la imagen.";
    return { status: "error", message: duplicateMessage };
  }

  revalidatePath("/propietario");
  return { status: "success", message: "Imagen cargada correctamente." };
}

export async function deleteVenuePhotoAction(formData: FormData) {
  await requireRole("venue_owner");
  const photoId = text(formData, "photo_id");
  if (!photoId) return;

  const supabase = await createClient();
  const { data: objectPath, error } = await supabase.rpc("delete_my_venue_photo", { p_photo_id: photoId });
  if (!error && objectPath) {
    await supabase.storage.from("venue-media").remove([objectPath]);
  }
  revalidatePath("/propietario");
}

export async function submitVenueAction(formData: FormData) {
  await requireRole("venue_owner");
  const venueId = text(formData, "venue_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_my_venue", { p_venue_id: venueId });

  if (error) redirect("/propietario?envio=error");

  revalidatePath("/propietario");
  revalidatePath("/admin");
  redirect("/propietario?enviado=1");
}

export async function selectOwnerVenueAction(formData: FormData) {
  const account = await requireRole("venue_owner");
  const venueId = text(formData, "venue_id");
  const returnTo = text(formData, "return_to");
  const destination = /^\/propietario(\/[a-z-]+)?$/.test(returnTo) ? returnTo : "/propietario/dashboard";

  if (isUuid(venueId)) {
    const supabase = await createClient();
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .eq("owner_id", account.user.id)
      .maybeSingle();
    if (venue) await setActiveVenueCookie(venue.id);
  }

  revalidatePath("/propietario", "layout");
  redirect(destination);
}
