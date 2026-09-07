import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";

describe("leaderboard rating display", () => {
  it.each([
    [1867.5, "1868"],
    [1847.39, "1847"],
    [1500, "1500"],
    [null, "—"],
  ])("displays %s as %s", (rating, display) => {
    render(
      <LeaderboardTable
        rows={[
          {
            rank: 1,
            public_slug: "test-player",
            display_name: "Test Player",
            rating,
            wins: 5,
            losses: 1,
            win_rate: 5 / 6,
            calculation_version: 1,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("cell", { name: display }),
    ).toBeInTheDocument();
  });
});
