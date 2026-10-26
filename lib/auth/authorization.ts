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
/** The signed-in player's active role in a club, or null (signed out / not a member). */
export async function viewerClubRole(clubId: string): Promise<ClubRole | null> {
  const playerId = await currentPlayerId();
  if (!playerId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_memberships")
    .select("role")
    .eq("club_id", clubId)
    .eq("player_id", playerId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as ClubRole | undefined) ?? null;
}
export async function isPlatformAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}
