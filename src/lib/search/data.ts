import { cache } from "react";
import { areas, sports as fallbackSports } from "@/data/home";
import { createPublicClient } from "@/lib/supabase/server";

export type SearchOption = { slug: string; name: string };

export const getSearchOptions = cache(async () => {
  const supabase = createPublicClient();
  const [{ data: sportRows }, { data: venueRows }] = await Promise.all([
    supabase.from("sports").select("slug, name").eq("is_active", true).order("sort_order"),
    supabase.from("venues").select("zone").eq("status", "approved").order("zone"),
  ]);

  const sports: SearchOption[] = sportRows?.length
    ? sportRows
    : fallbackSports.map((sport) => ({
        slug: sport.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
        name: sport.name,
      }));
  const zones = Array.from(new Set((venueRows ?? []).map((venue) => venue.zone).filter(Boolean)));

  return { sports, zones: zones.length ? zones : areas };
});
