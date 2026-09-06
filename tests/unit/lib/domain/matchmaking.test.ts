import { describe, expect, it } from "vitest";
import { proposeBalancedMatch } from "@/lib/domain/matchmaking";

const players = [
  {
    playerId: "00000000-0000-4000-8000-000000000001",
    rating: 1510,
    queuePosition: 1,
  },
  {
    playerId: "00000000-0000-4000-8000-000000000002",
    rating: 1490,
    queuePosition: 2,
  },
  {
    playerId: "00000000-0000-4000-8000-000000000003",
    rating: 1520,
    queuePosition: 3,
  },
  {
    playerId: "00000000-0000-4000-8000-000000000004",
    rating: 1480,
    queuePosition: 4,
  },
] as const;

describe("matchmaking-v1", () => {
  it("produces the same singles proposal for the same snapshot", () => {
    const input = { format: "singles" as const, candidates: players };
    expect(proposeBalancedMatch(input)).toEqual(proposeBalancedMatch(input));
    expect(proposeBalancedMatch(input)).toMatchObject({
      policyVersion: "matchmaking-v1",
      sideAPlayerIds: [players[0].playerId],
      sideBPlayerIds: [players[1].playerId],
    });
  });

  it("balances doubles by arithmetic team rating with stable UUID tie-breaking", () => {
    const result = proposeBalancedMatch({
      format: "doubles",
      candidates: players,
    });
    expect(result.sideAPlayerIds).toEqual([
      players[0].playerId,
      players[1].playerId,
    ]);
    expect(result.sideBPlayerIds).toEqual([
      players[2].playerId,
      players[3].playerId,
    ]);
    expect(result.ratingDifference).toBe(0);
  });

  it("rejects an undersized candidate snapshot", () => {
    expect(() =>
      proposeBalancedMatch({
        format: "doubles",
        candidates: players.slice(0, 3),
      }),
    ).toThrow("INSUFFICIENT_PLAYERS");
  });
});
