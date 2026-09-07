import { createClient } from "@/lib/supabase/server";
export async function getPublicMatchHistory(
  playerId: string,
  {
    recordClass,
    page = 1,
    pageSize = 20,
  }: {
    recordClass?: "ranked" | "unranked";
    page?: number;
    pageSize?: number;
  } = {},
) {
  const s = await createClient();
  let q = s
    .from("public_match_history")
    .select("*")
    .eq("player_id", playerId)
    .order("played_at", { ascending: false })
    .order("match_id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize);
  if (recordClass) q = q.eq("record_class", recordClass);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
