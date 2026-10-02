import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_VENUE_COOKIE = "canchea_sucursal";

// Identificador que nunca existe: permite filtrar por sucursal activa aunque el
// propietario todavía no haya creado ninguna.
export const NO_VENUE_ID = "00000000-0000-0000-0000-000000000000";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Sucursales del propietario y la sucursal activa elegida en el selector. */
export const getOwnerVenues = cache(async (ownerId: string) => {
  const supabase = await createClient();
  const [{ data }, cookieStore] = await Promise.all([
    supabase
      .from("venues")
      .select("id, commercial_name, zone, status")
      .eq("owner_id", ownerId)
      .order("created_at"),
    cookies(),
  ]);

  const venues = data ?? [];
  const selectedId = cookieStore.get(ACTIVE_VENUE_COOKIE)?.value;
  const activeVenue = venues.find((venue) => venue.id === selectedId) ?? venues[0] ?? null;

  return { venues, activeVenue, activeVenueId: activeVenue?.id ?? NO_VENUE_ID };
});

export async function setActiveVenueCookie(venueId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_VENUE_COOKIE, venueId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
