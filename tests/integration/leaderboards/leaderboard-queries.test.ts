import { describe, expect, it } from "vitest";
import { isCalculationFresh } from "@/lib/observability/competition";
import { serializeLeaderboardCsv } from "@/lib/domain/leaderboard-export";
describe("leaderboards", () => {
  it("detects stale calculation versions", () => {
    expect(isCalculationFresh(8, 9)).toBe(false);
    expect(isCalculationFresh(9, 9)).toBe(true);
  });
  it("escapes CSV fields", () =>
    expect(
      serializeLeaderboardCsv([
        {
          rank: 1,
          displayName: 'Alex, "Ace"',
          rating: 1516,
          wins: 1,
          losses: 0,
          winRate: 1,
        },
      ]),
    ).toContain('"Alex, ""Ace"""'));
});
