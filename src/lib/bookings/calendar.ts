type CalendarBooking = {
  publicCode: string;
  startsAt: string;
  endsAt: string;
  sport: string;
  venue: string;
  court: string;
  address: string;
};

function calendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(booking: CalendarBooking) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.sport} · ${booking.venue}`,
    dates: `${calendarDate(booking.startsAt)}/${calendarDate(booking.endsAt)}`,
    location: booking.address,
    details: `Cancha: ${booking.court}\nCódigo de reserva: ${booking.publicCode}\nReserva realizada con CANCHEA.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
