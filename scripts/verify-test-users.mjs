import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
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

const localEnv = readLocalEnv();
const accounts = [
  {
    email: "pruebas.propietario@canchea.bo",
    password: process.env.CANCHEA_TEST_OWNER_PASSWORD,
    expectedRole: "venue_owner",
  },
  {
    email: "pruebas.jugador@canchea.bo",
    password: process.env.CANCHEA_TEST_PLAYER_PASSWORD,
    expectedRole: "player",
  },
];

if (accounts.some((account) => !account.password)) {
  throw new Error("Define las dos contraseñas de prueba antes de ejecutar la verificación.");
}

const results = [];

async function verifyAccount(account) {
  const supabase = createClient(
    localEnv.NEXT_PUBLIC_SUPABASE_URL,
    localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (authError || !authData.user) throw new Error(`${account.email}: ${authError?.message ?? "sin sesión"}`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, onboarding_completed_at")
    .eq("id", authData.user.id)
    .single();
  if (profileError || profile.role !== account.expectedRole) {
    throw new Error(`${account.email}: perfil o rol incorrecto`);
  }

  const result = { email: account.email, role: profile.role, name: `${profile.first_name} ${profile.last_name}` };

  if (account.expectedRole === "venue_owner") {
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, commercial_name, status, courts(id, name, status)")
      .eq("owner_id", authData.user.id)
      .single();
    if (venueError || !venue) throw new Error(`${account.email}: complejo de prueba no disponible`);
    result.venue = venue.commercial_name;
    result.venueStatus = venue.status;
    result.courts = venue.courts.length;
    const firstCourt = venue.courts[0];
    if (firstCourt) {
      const startDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/La_Paz",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const { data: availability, error: availabilityError } = await supabase.rpc("get_court_availability_range", {
        p_court_id: firstCourt.id,
        p_start_date: startDate,
        p_days: 7,
      });
      if (availabilityError) throw availabilityError;
      result.slotsByDate = Object.fromEntries(
        availability.reduce((counts, slot) => counts.set(slot.slot_date, (counts.get(slot.slot_date) ?? 0) + 1), new Map()),
      );
    }
  } else {
    const { count, error: venuesError } = await supabase
      .from("venues")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    if (venuesError) throw venuesError;
    result.visibleApprovedVenues = count ?? 0;
  }

  await supabase.auth.signOut();
  return result;
}

for (const account of accounts) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      results.push(await verifyAccount(account));
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  if (lastError) throw lastError;
}

console.log(JSON.stringify(results, null, 2));
