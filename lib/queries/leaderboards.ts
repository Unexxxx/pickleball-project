import { createClient } from "@/lib/supabase/server";
import { measureCompetitionRead } from "@/lib/observability/competition";
import type { ClubLeaderboardRpcRow } from "@/lib/supabase/database.types";
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

/** Club leaderboards load this many at a time ("Show more"). */
export const CLUB_BOARD_PAGE_SIZE = 50;

export type ClubBoardRow = {
  player_id: string;
  rank: number;
  public_slug: string;
  display_name: string;
  rating: number;
  wins: number;
  losses: number;
  win_rate: number;
  calculation_version: number;
  is_member: boolean;
};
export type ClubBoardPage = {
  items: ClubBoardRow[];
  total: number;
  hasMore: boolean;
};

const toBoardRow = (row: ClubLeaderboardRpcRow): ClubBoardRow => ({
  player_id: row.player_id,
  rank: Number(row.rank),
  public_slug: row.public_slug,
  display_name: row.display_name,
  rating: Number(row.rating),
  wins: row.wins,
  losses: row.losses,
  win_rate: Number(row.win_rate),
  calculation_version: Number(row.calculation_version),
  is_member: row.is_member,
});

/**
 * One page of a club leaderboard, after a rank (the last one shown).
 * "Members only" ranks members among themselves; search keeps real ranks.
 * Null when it can't be read.
 */
export async function getClubLeaderboardPage(
  clubId: string,
  membersOnly = false,
  query = "",
  afterRank: number | null = null,
): Promise<ClubBoardPage | null> {
  const s = await createClient();
  const { data, error } = await s.rpc("club_leaderboard_page", {
    p_club_id: clubId,
    p_members_only: membersOnly,
    p_query: query || undefined,
    p_after_rank: afterRank ?? undefined,
    p_limit: CLUB_BOARD_PAGE_SIZE + 1,
  });
  if (error?.code === MISSING_FUNCTION)
    return pageOf(await boardFallback(clubId, membersOnly), query, afterRank);
  if (error || !data) return null;
  return {
    items: data.slice(0, CLUB_BOARD_PAGE_SIZE).map(toBoardRow),
    total: Number(data[0]?.total ?? 0),
    hasMore: data.length > CLUB_BOARD_PAGE_SIZE,
  };
}

/** The signed-in player's own row and how many are ranked, or null. */
export async function getClubLeaderboardMe(
  clubId: string,
  membersOnly = false,
  playerId: string | null = null,
): Promise<{ row: ClubBoardRow; total: number } | null> {
  if (!playerId) return null;
  const s = await createClient();
  const { data, error } = await s.rpc("club_leaderboard_me", {
    p_club_id: clubId,
    p_members_only: membersOnly,
  });
  if (error?.code === MISSING_FUNCTION) {
    const rows = await boardFallback(clubId, membersOnly);
    const row = rows?.find((r) => r.player_id === playerId);
    return row && rows ? { row, total: rows.length } : null;
  }
  const row = data?.[0];
  if (error || !row) return null;
  return { row: toBoardRow(row), total: Number(row.total) };
}

// Until the paged functions are deployed (local dev against the hosted
// database, or the moment between a deploy and its migration), build the
// board from the view and the member list instead.
const MISSING_FUNCTION = "PGRST202";

async function boardFallback(
  clubId: string,
  membersOnly: boolean,
): Promise<ClubBoardRow[] | null> {
  const s = await createClient();
  const [{ data: board }, { data: members }] = await Promise.all([
    s
      .from("public_leaderboards")
      .select("*")
      .eq("scope", "club")
      .eq("club_id", clubId)
      .order("rank")
      .limit(1000),
    s.rpc("club_member_directory", { p_club_id: clubId }),
  ]);
  if (!board) return null;
  const memberIds = new Set(
    (members ?? []).flatMap((m) => (m.player_id ? [m.player_id] : [])),
  );
  const rows = board.map((row) => ({
    player_id: row.player_id ?? "",
    rank: Number(row.rank),
    public_slug: row.public_slug ?? "",
    display_name: row.display_name ?? "",
    rating: Number(row.rating),
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    win_rate: Number(row.win_rate),
    calculation_version: Number(row.calculation_version),
    is_member: memberIds.has(row.player_id ?? ""),
  }));
  return membersOnly
    ? rows
        .filter((row) => row.is_member)
        .map((row, index) => ({ ...row, rank: index + 1 }))
    : rows;
}

function pageOf(
  rows: ClubBoardRow[] | null,
  query: string,
  afterRank: number | null,
): ClubBoardPage | null {
  if (!rows) return null;
  const q = query.toLowerCase();
  const matches = q
    ? rows.filter((row) => row.display_name.toLowerCase().includes(q))
    : rows;
  const rest =
    afterRank === null ? matches : matches.filter((r) => r.rank > afterRank);
  return {
    items: rest.slice(0, CLUB_BOARD_PAGE_SIZE),
    total: matches.length,
    hasMore: rest.length > CLUB_BOARD_PAGE_SIZE,
  };
}
