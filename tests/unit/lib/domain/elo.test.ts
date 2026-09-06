import { describe, expect, it } from "vitest";
import fixtures from "@/tests/fixtures/elo-v1.json";
import {
  calculateEloV1,
  leaderboardComparator,
  nextStreak,
  roundHalfAwayFromZero,
} from "@/lib/domain/elo";
describe("Elo v1", () => {
  it.each(fixtures.fixtures)("matches $name", (fixture) => {
    expect(
      calculateEloV1(fixture.sideA, fixture.sideB, fixture.winner as 1 | 2)
        .deltaA,
    ).toBe(fixture.delta);
  });
  it("rounds halves away from zero", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });
  it("updates win and loss streaks", () => {
    expect(nextStreak(2, true)).toBe(3);
    expect(nextStreak(2, false)).toBe(-1);
  });
  it("uses stable leaderboard tie breaks", () => {
    const rows = [
      { rating: 1500, wins: 2, losses: 1, playerId: "b" },
      { rating: 1500, wins: 2, losses: 1, playerId: "a" },
    ];
    expect(rows.sort(leaderboardComparator)[0]?.playerId).toBe("a");
  });
});
