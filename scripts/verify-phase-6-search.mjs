import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tomorrow = new Date(Date.now() + 86400000);
const searchDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(tomorrow);

let lastError;
for (let attempt = 1; attempt <= 4; attempt += 1) {
  try {
    const { data, error } = await supabase.rpc("search_available_courts", {
      p_sport_slug: "futbol",
      p_zone: "Equipetrol",
      p_date: searchDate,
      p_time: "20:00",
      p_max_price_bob: 250,
      p_sort: "price_asc",
      p_latitude: -17.7695,
      p_longitude: -63.196,
      p_limit: 12,
      p_offset: 0,
    });
    if (error) throw error;
    if (!data || data.length !== 2) throw new Error(`Se esperaban 2 resultados y llegaron ${data?.length ?? 0}.`);
    if (Number(data[0].price_bob) > Number(data[1].price_bob)) throw new Error("El orden por precio no es correcto.");
    if (data.some((result) => result.start_time.slice(0, 5) !== "20:00")) throw new Error("La hora exacta no se respetó.");
    console.log(JSON.stringify(data.map((result) => ({
      court: result.court_name,
      price: Number(result.price_bob),
      time: result.start_time.slice(0, 5),
      distanceKm: Number(result.distance_km),
    })), null, 2));
    lastError = null;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }
}

if (lastError) throw lastError;
