import type { VenueStatus } from "@/types/database";

export const venueStatusLabels: Record<VenueStatus, string> = {
  draft: "Borrador",
  pending_approval: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  changes_requested: "Cambios solicitados",
};

export const editableVenueStatuses: VenueStatus[] = ["draft", "rejected", "changes_requested"];

export function canEditVenue(status: VenueStatus) {
  return editableVenueStatuses.includes(status);
}
