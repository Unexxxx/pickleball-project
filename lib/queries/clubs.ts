import "server-only";
import { createClient } from "@/lib/supabase/server";
export async function listMyClubs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id,role,status,clubs(id,name,slug,subscription_status)")
    .eq("status", "active");
  if (error) return [];
  return data;
}
export async function getClub(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select(
      "id,name,slug,timezone,subscription_status,profile_image_path,background_image_path,version",
    )
    .eq("slug", slug)
    .single();
  return data;
}
