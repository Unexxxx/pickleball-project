import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaderboardRules } from "@/components/leaderboards/leaderboard-rules";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { getClubDirectory, getClubHome } from "@/lib/queries/club-home";
import {
  getLeaderboard,
  getLeaderboardRules,
} from "@/lib/queries/leaderboards";

export const metadata: Metadata = { title: "Rankings" };

// The club leaderboard counts every player in this club's official ranked
// matches (spec FR-036), members or visitors; "Members only" narrows it.
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
  const [rows, rules, directory] = await Promise.all([
    getLeaderboard({ scope: "club", clubSlug: club.slug, pageSize: 200 }),
    getLeaderboardRules(),
    getClubDirectory(club.id),
  ]);
  const memberIds = new Set(
    (directory ?? []).flatMap((m) => (m.playerId ? [m.playerId] : [])),
  );
  const shown = membersOnly
    ? rows.filter((row) => row.player_id && memberIds.has(row.player_id))
    : rows;
  const version = Math.max(0, ...rows.map((r) => r.calculation_version ?? 0));
  const base = `/clubs/${club.slug}/rankings`;

  return (
    <div className="club-rankings">
      <header className="ph-section-head">
        <div>
          <h2>Club leaderboard</h2>
          <p>
            Official ranked matches played at {club.name} events, by members and
            visiting players.
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
      <LeaderboardTable rows={shown} memberIds={memberIds} />
      {rules ? (
        <LeaderboardRules
          description={rules.description}
          ordering={rules.ordering}
          version={version}
        />
      ) : null}
    </div>
  );
}
