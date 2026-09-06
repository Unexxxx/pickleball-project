import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
export const getPublicPlayer = cache(async (slug: string) => {
  const s = await createClient(),
    { data } = await s
      .from("public_player_profiles")
      .select("player_id,public_slug,display_name,avatar_path,created_at")
      .eq("public_slug", slug)
      .maybeSingle();
  return data;
});
export const getPublicPlayerStatistics = cache(async (slug: string) => {
  const s = await createClient(),
    { data } = await s
      .from("public_player_statistics")
      .select("*")
      .eq("public_slug", slug)
      .maybeSingle();
  return data;
});
