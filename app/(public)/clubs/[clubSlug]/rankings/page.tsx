import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { getClubDirectory, getClubHome } from "@/lib/queries/club-home";
import { getLeaderboard } from "@/lib/queries/leaderboards";

export const metadata: Metadata = { title: "Rankings" };

// The club leaderboard counts every player in this club's official ranked
// matches (spec FR-036), members or visitors. "Members only" ranks the
// members among themselves, so it starts at 1 (ties keep a shared rank).
export default async function ClubRankings({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const membersOnly = (await searchParams).show === "members";
  const [rows, directory] = await Promise.all([
    getLeaderboard({ scope: "club", clubSlug: club.slug, pageSize: 200 }),
    getClubDirectory(club.id),
  ]);
  const memberIds = new Set(
    (directory ?? []).flatMap((m) => (m.playerId ? [m.playerId] : [])),
  );
  const shown = membersOnly
    ? rankAmongThemselves(
        rows.filter((row) => row.player_id && memberIds.has(row.player_id)),
      )
    : rows;
  const base = `/clubs/${club.slug}/rankings`;

  return (
    <div className="club-rankings">
      <header className="ph-section-head">
        <div>
          <h2>Club leaderboard</h2>
          <p>
            {membersOnly
              ? `${club.name} members ranked among themselves, from official ranked matches at the club's events.`
              : `Official ranked matches played at ${club.name} events, by members and visiting players.`}
          </p>
        </div>
        {directory ? (
          <nav className="ph-tabs" aria-label="Leaderboard filter">
            <Link href={base} aria-current={membersOnly ? undefined : "page"}>
              All players
            </Link>
            <Link
              href={`${base}?show=members`}
              aria-current={membersOnly ? "page" : undefined}
            >
              Members only
            </Link>
          </nav>
        ) : null}
      </header>
      {/* The Member badge only distinguishes players in the full list. */}
      <LeaderboardTable
        rows={shown}
        memberIds={membersOnly ? undefined : memberIds}
      />
    </div>
  );
}

/**
 * Renumbers rows already sorted by club rank as 1, 2, 3…; players tied on
 * the club leaderboard share a rank (standard competition ranking).
 */
function rankAmongThemselves<T extends { rank: number | null }>(rows: T[]) {
  let previousClubRank: number | null = null;
  let previousRank = 0;
  return rows.map((row, index) => {
    const rank =
      index > 0 && row.rank !== null && row.rank === previousClubRank
        ? previousRank
        : index + 1;
    previousClubRank = row.rank;
    previousRank = rank;
    return { ...row, rank };
  });
}
