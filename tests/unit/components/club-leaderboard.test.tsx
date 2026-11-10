import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadClubLeaderboardPage = vi.fn();
vi.mock("@/lib/actions/clubs", () => ({
  loadClubLeaderboardPage: (...args: unknown[]) =>
    loadClubLeaderboardPage(...args),
}));

import { ClubLeaderboard } from "@/components/leaderboards/club-leaderboard";
import type { ClubBoardRow } from "@/lib/queries/leaderboards";

afterEach(() => {
  cleanup();
  loadClubLeaderboardPage.mockReset();
});

const CLUB = "00000000-0000-4000-8000-000000000001";
const row = (rank: number): ClubBoardRow => ({
  player_id: `p${rank}`,
  rank,
  public_slug: `player-${rank}`,
  display_name: `Player ${rank}`,
  rating: 1600 - rank,
  wins: 10,
  losses: 5,
  win_rate: 0.666667,
  calculation_version: 1,
  is_member: rank % 2 === 0,
});
const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => row(from + i));

describe("club leaderboard", () => {
  it("pins the viewer's own rank even when they're past the first page", () => {
    render(
      <ClubLeaderboard
        clubId={CLUB}
        membersOnly={false}
        initial={{ items: rows(1, 50), total: 1240, hasMore: true }}
        me={{ row: row(312), total: 1240 }}
      />,
    );
    expect(screen.getByRole("region", { name: "Your rank" })).toHaveTextContent(
      "Your rank · #312 of 1,240",
    );
    expect(screen.getAllByRole("row")).toHaveLength(51); // header + 50
    expect(screen.getByText("Showing 50 of 1,240")).toBeInTheDocument();
  });

  it("loads the next 50 after the last rank shown", async () => {
    loadClubLeaderboardPage.mockResolvedValue({
      ok: true,
      data: { items: rows(51, 100), total: 1240, hasMore: true },
      requestId: "r",
    });
    render(
      <ClubLeaderboard
        clubId={CLUB}
        membersOnly
        initial={{ items: rows(1, 50), total: 1240, hasMore: true }}
        me={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(101));
    expect(loadClubLeaderboardPage).toHaveBeenCalledWith({
      clubId: CLUB,
      membersOnly: true,
      query: "",
      afterRank: 50,
    });
  });

  it("highlights the viewer's row and marks members on the full board", () => {
    render(
      <ClubLeaderboard
        clubId={CLUB}
        membersOnly={false}
        initial={{ items: rows(1, 4), total: 4, hasMore: false }}
        me={{ row: row(3), total: 4 }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Player 3" }).closest("tr"),
    ).toHaveClass("leaderboard-me");
    expect(screen.getAllByText("Member")).toHaveLength(2);
    // Small boards have no search and no Show more.
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });
});
