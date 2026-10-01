import type { BookingStatus } from "@/types/database";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  in_progress: "En juego",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
  expired: "Hold vencido",
  refunded_partial: "Reembolso parcial",
};

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}
