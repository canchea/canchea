import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function localEnv() {
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}

function client(env) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const env = localEnv();
const password = process.env.CANCHEA_TEST_PLAYER_PASSWORD;
if (!password) throw new Error("Define CANCHEA_TEST_PLAYER_PASSWORD para ejecutar la prueba.");

const first = client(env);
const second = client(env);
for (const supabase of [first, second]) {
  const { error } = await supabase.auth.signInWithPassword({ email: "pruebas.jugador@canchea.bo", password });
  if (error) throw error;
}

const { data: courts, error: courtError } = await first.from("courts").select("id, name").eq("status", "active").limit(1);
if (courtError || !courts?.[0]) throw courtError ?? new Error("No existe una cancha activa para probar.");

const startDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

const { data: slots, error: slotsError } = await first.rpc("get_court_availability_range", {
  p_court_id: courts[0].id,
  p_start_date: startDate,
  p_days: 14,
});
if (slotsError || !slots?.[0]) throw slotsError ?? new Error("No existe disponibilidad para probar.");

const slot = slots[0];
const attempts = await Promise.all([
  first.rpc("create_booking_hold", {
    p_court_id: slot.court_id,
    p_starts_at: slot.starts_at,
    p_duration_minutes: slot.duration_minutes,
  }),
  second.rpc("create_booking_hold", {
    p_court_id: slot.court_id,
    p_starts_at: slot.starts_at,
    p_duration_minutes: slot.duration_minutes,
  }),
]);

const successes = attempts.filter((attempt) => attempt.data && !attempt.error);
const conflicts = attempts.filter((attempt) => attempt.error);
if (successes.length !== 1 || conflicts.length !== 1) {
  throw new Error(`Concurrencia inválida: ${successes.length} éxitos y ${conflicts.length} conflictos.`);
}

const booking = successes[0].data;
const { data: unavailableAfterHold } = await first.rpc("get_court_availability", {
  p_court_id: slot.court_id,
  p_date: slot.slot_date,
});
if (unavailableAfterHold?.some((candidate) => candidate.starts_at === slot.starts_at)) {
  throw new Error("El horario continúa visible durante el hold.");
}

const { error: releaseError } = await first.rpc("release_my_booking_hold", { p_booking_id: booking.id });
if (releaseError) throw releaseError;

const [{ data: availableAfterRelease }, { data: storedBooking }, { data: history }] = await Promise.all([
  first.rpc("get_court_availability", { p_court_id: slot.court_id, p_date: slot.slot_date }),
  first.from("bookings").select("id, public_code, status, hold_expires_at").eq("id", booking.id).single(),
  first.from("booking_status_history").select("from_status, to_status, reason").eq("booking_id", booking.id).order("id"),
]);

if (!availableAfterRelease?.some((candidate) => candidate.starts_at === slot.starts_at)) {
  throw new Error("El horario no fue liberado después de cerrar el checkout.");
}
if (storedBooking?.status !== "expired" || history?.length !== 2) {
  throw new Error("El estado o su historial no se registraron correctamente.");
}

console.log(JSON.stringify({
  court: courts[0].name,
  slot: slot.starts_at,
  simultaneousAttempts: attempts.length,
  accepted: successes.length,
  rejected: conflicts.length,
  publicCode: booking.public_code,
  finalStatus: storedBooking.status,
  history: history.map((entry) => `${entry.from_status ?? "inicio"}->${entry.to_status}`),
  released: true,
}, null, 2));

await Promise.all([first.auth.signOut(), second.auth.signOut()]);
