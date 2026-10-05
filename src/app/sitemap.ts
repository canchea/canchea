import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/buscar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/complejos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/terminos`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/cancelaciones`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/soporte`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = createPublicClient();
    const { data: venues, error } = await supabase
      .from("venues")
      .select("slug, updated_at")
      .eq("status", "approved")
      .order("updated_at", { ascending: false });

    if (error) return staticPages;

    return [
      ...staticPages,
      ...(venues ?? []).map((venue) => ({
        url: `${siteUrl}/complejos/${venue.slug}`,
        lastModified: new Date(venue.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
