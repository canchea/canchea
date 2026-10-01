import type { AppRole } from "@/types/database";

export function destinationForRole(role: AppRole | null) {
  if (role === "player") return "/jugador";
  if (role === "venue_owner") return "/propietario";
  if (role === "super_admin") return "/admin";
  return "/onboarding";
}

export function safeInternalPath(value: string | null, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
