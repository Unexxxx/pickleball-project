import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SITE_URL } from "@/lib/site";

// Rebuilt at most hourly so new clubs and players show up without a deploy.
export const revalidate = 3600;

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
  { url: `${SITE_URL}/leaderboards`, changeFrequency: "daily", priority: 0.8 },
  { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return STATIC_PAGES;

  // Cookie-free anonymous client: the sitemap only lists what anyone can see.
  // Player profiles are left out on purpose: most are thin and the database
  // still holds test/demo players. Google finds real ones via the leaderboard.
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  const { data: clubs } = await supabase
    .from("clubs")
    .select("slug,updated_at")
    .limit(5000);

  return [
    ...STATIC_PAGES,
    ...(clubs ?? []).map((club) => ({
      url: `${SITE_URL}/clubs/${club.slug}`,
      lastModified: club.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
