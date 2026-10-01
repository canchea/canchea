import fs from "node:fs";
import { randomUUID } from "node:crypto";
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

const password = process.env.CANCHEA_TEST_OWNER_PASSWORD;
if (!password) throw new Error("Define CANCHEA_TEST_OWNER_PASSWORD para preparar los datos de demostración.");

const localEnv = readLocalEnv();
const supabase = createClient(
  localEnv.NEXT_PUBLIC_SUPABASE_URL,
  localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function withRetry(operation) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw lastError;
}

await withRetry(async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: "pruebas.propietario@canchea.bo",
    password,
  });
  if (error) throw error;
});

const { data: courts, error: courtsError } = await supabase
  .from("courts")
  .select("id, venue_id, name, status, court_photos(id, kind)")
  .order("created_at");
if (courtsError) throw courtsError;

const sourceImages = ["public/images/venue-football.png", "public/images/hero-canchea.png"];
const prepared = [];

for (const [index, court] of courts.entries()) {
  const hasCover = court.court_photos.some((photo) => photo.kind === "cover");
  if (!hasCover) {
    const objectPath = `${court.venue_id}/courts/${court.id}/cover/phase-6-${randomUUID()}.png`;
    const image = fs.readFileSync(sourceImages[index % sourceImages.length]);
    const { error: uploadError } = await supabase.storage.from("venue-media").upload(objectPath, image, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: registerError } = await supabase.rpc("register_my_court_photo", {
      p_court_id: court.id,
      p_object_path: objectPath,
      p_kind: "cover",
      p_alt_text: `${court.name} del complejo de prueba CANCHEA`,
    });
    if (registerError) {
      await supabase.storage.from("venue-media").remove([objectPath]);
      throw registerError;
    }
  }

  const { error: statusError } = await supabase.rpc("set_my_court_status", {
    p_court_id: court.id,
    p_status: "active",
  });
  if (statusError) throw statusError;
  prepared.push({ court: court.name, status: "active", cover: hasCover ? "existing" : "created" });
}

await supabase.auth.signOut();
console.log(JSON.stringify(prepared, null, 2));
