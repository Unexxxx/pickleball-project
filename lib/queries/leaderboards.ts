import { createClient } from "@/lib/supabase/server";
import { measureCompetitionRead } from "@/lib/observability/competition";
export type LeaderboardScope = {
  scope: "overall" | "club";
  clubSlug?: string;
  page?: number;
  pageSize?: number;
};
export async function getLeaderboard({
  scope,
  clubSlug,
  page = 1,
  pageSize = 50,
}: LeaderboardScope) {
  return measureCompetitionRead("leaderboard.read", async () => {
    const s = await createClient();
    let q = s
      .from("public_leaderboards")
      .select("*")
      .eq("scope", scope)
      .order("rank")
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (scope === "club") q = q.eq("club_slug", clubSlug!);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}
export async function getLeaderboardRules() {
  const s = await createClient(),
    { data } = await s
      .from("leaderboard_rules")
      .select("*")
      .eq("id", "team-bayes-v1")
      .single();
  return data;
}
export const isCalculationFresh = (visible: number, expected: number) =>
  visible >= expected;
export async function getLeaderboardCalculationVersion() {
  const s = await createClient(),
    { data } = await s
      .from("leaderboard_entries")
      .select("calculation_version")
      .order("calculation_version", { ascending: false })
      .limit(1)
      .maybeSingle();
  return data?.calculation_version ?? 0;
}
