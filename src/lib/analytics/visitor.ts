import type { NextRequest, NextResponse } from "next/server";

export const VISITOR_COOKIE = "canchea_vid";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorId(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

/**
 * Asigna un identificador anónimo de primera parte para medir el embudo.
 * Se escribe también en la petición para que el primer render ya lo vea.
 */
export function ensureVisitorCookie(request: NextRequest) {
  const current = request.cookies.get(VISITOR_COOKIE)?.value;
  if (isVisitorId(current)) return null;
  const visitorId = crypto.randomUUID();
  request.cookies.set(VISITOR_COOKIE, visitorId);
  return visitorId;
}

export function persistVisitorCookie(response: NextResponse, visitorId: string | null) {
  if (!visitorId) return response;
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
