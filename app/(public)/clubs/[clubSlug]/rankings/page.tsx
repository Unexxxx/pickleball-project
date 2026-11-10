import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubLeaderboard } from "@/components/leaderboards/club-leaderboard";
import { currentPlayerId } from "@/lib/auth/authorization";
import { getClubHome } from "@/lib/queries/club-home";
import {
  getClubLeaderboardMe,
  getClubLeaderboardPage,
} from "@/lib/queries/leaderboards";

export const metadata: Metadata = { title: "Rankings" };

// The club leaderboard counts every player in this club's official ranked
// matches (spec FR-036), members or visitors. "Members only" ranks the
// members among themselves, so it starts at 1. Both load 50 at a time and
// are ranked in the database, so they hold up for clubs of any size.
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
  const playerId = await currentPlayerId();
  const [page, me] = await Promise.all([
    getClubLeaderboardPage(club.id, membersOnly),
    getClubLeaderboardMe(club.id, membersOnly, playerId),
  ]);
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
      </header>
      {page ? (
        <ClubLeaderboard
          key={membersOnly ? "members" : "all"}
          clubId={club.id}
          membersOnly={membersOnly}
          initial={page}
          me={me}
        />
      ) : (
        <p role="alert">
          Rankings couldn&apos;t be loaded. Please refresh and try again.
        </p>
      )}
    </div>
  );
}
