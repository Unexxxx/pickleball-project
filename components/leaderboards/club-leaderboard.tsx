"use client";

import {
  MemberPagerFooter,
  MemberSearch,
  useMemberPages,
} from "@/components/clubs/member-pages";
import {
  LeaderboardTable,
  rankMedal,
} from "@/components/leaderboards/leaderboard-table";
import { loadClubLeaderboardPage } from "@/lib/actions/clubs";
import type { ClubBoardPage, ClubBoardRow } from "@/lib/queries/leaderboards";

const n = (value: number) => value.toLocaleString("en-US");

/**
 * A club leaderboard of any size: the top 50, then Show more; a search that
 * covers everyone ranked; and a "Your rank" card so a signed-in player sees
 * where they stand even when they're far down the list.
 */
export function ClubLeaderboard({
  clubId,
  membersOnly,
  initial,
  me,
}: {
  clubId: string;
  membersOnly: boolean;
  initial: ClubBoardPage;
  me: { row: ClubBoardRow; total: number } | null;
}) {
  const pages = useMemberPages<ClubBoardRow, number>({
    initial,
    load: (query, afterRank) =>
      loadClubLeaderboardPage({ clubId, membersOnly, query, afterRank }),
    cursorOf: (row) => row.rank,
  });
  // The Member badge only distinguishes players in the full list.
  const memberIds = membersOnly
    ? undefined
    : new Set(pages.items.flatMap((r) => (r.is_member ? [r.player_id] : [])));

  return (
    <div className="club-board">
      {me ? (
        <section className="board-me" aria-label="Your rank">
          <span className="rank-chip" data-medal={rankMedal(me.row.rank)}>
            {me.row.rank}
          </span>
          <div>
            <strong>
              Your rank · #{n(me.row.rank)} of {n(me.total)}
            </strong>
            <span>
              Rating {Math.round(me.row.rating)} · {me.row.wins}–{me.row.losses}{" "}
              · {(me.row.win_rate * 100).toFixed(1)}% wins
            </span>
          </div>
        </section>
      ) : null}
      {initial.total > 10 ? (
        <MemberSearch
          value={pages.query}
          onChange={pages.setQuery}
          label="Search players"
        />
      ) : null}
      <LeaderboardTable
        rows={pages.items}
        memberIds={memberIds}
        currentPlayerId={me?.row.player_id ?? null}
        emptyText={
          pages.searched
            ? `No ranked players match “${pages.searched}”.`
            : membersOnly
              ? "No members are ranked yet."
              : "No eligible ranked players yet."
        }
      />
      <MemberPagerFooter
        shown={pages.items.length}
        total={pages.total}
        hasMore={pages.hasMore}
        loading={pages.loading}
        error={pages.error}
        onMore={pages.showMore}
      />
    </div>
  );
}
