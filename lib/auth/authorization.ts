import "server-only";
import { createClient } from "@/lib/supabase/server";
export type ClubRole =
  "owner" | "organizer" | "score_official" | "staff" | "member";
export async function currentPlayerId() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_player_id");
  if (error || !data) return null;
  return data as string;
}
export async function requireClubRole(clubId: string, roles: ClubRole[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_memberships")
    .select("role")
    .eq("club_id", clubId)
    .eq("status", "active")
    .single();
  if (!data || !roles.includes((data as { role: ClubRole }).role))
    throw new Error("FORBIDDEN");
  return data;
}
export async function isPlatformAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}
