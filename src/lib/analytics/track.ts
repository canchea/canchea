import "server-only";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { isVisitorId, VISITOR_COOKIE } from "@/lib/analytics/visitor";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type FunnelEvent = "search_performed" | "venue_viewed" | "slot_selected";

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse|headless|curl|wget/i;

/**
 * Registra un evento del embudo después de enviar la respuesta, sin bloquear
 * el render. Ignora bots y prefetch para no inflar las métricas.
 */
export async function trackFunnelEvent(
  name: FunnelEvent,
  { venueId = null, actorId = null, metadata = {} }: { venueId?: string | null; actorId?: string | null; metadata?: Record<string, Json | undefined> } = {},
) {
  if (!process.env.SUPABASE_SECRET_KEY) return;

  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const userAgent = headerStore.get("user-agent") ?? "";
  const isPrefetch = headerStore.has("next-router-prefetch")
    || headerStore.get("purpose") === "prefetch"
    || (headerStore.get("sec-purpose") ?? "").includes("prefetch");
  if (!userAgent || BOT_PATTERN.test(userAgent) || isPrefetch) return;

  const visitorCookie = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(visitorCookie) ? visitorCookie : null;
  const cleanMetadata = Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== "")) as Json;

  after(async () => {
    try {
      const { error } = await createAdminClient().from("analytics_events").insert({
        event_name: name,
        actor_id: actorId,
        venue_id: venueId,
        visitor_id: visitorId,
        metadata: cleanMetadata,
      });
      if (error) console.error("Analytics event failed", error.code);
    } catch {
      // La analítica nunca debe romper la navegación.
    }
  });
}
