export const MATCHMAKING_POLICY_VERSION = "matchmaking-v1" as const;

export type MatchFormat = "singles" | "doubles";
export type MatchCandidate = {
  playerId: string;
  rating?: number | null;
  queuePosition: number;
};

export type MatchProposal = {
  policyVersion: typeof MATCHMAKING_POLICY_VERSION;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  ratingDifference: number;
};

const average = (players: MatchCandidate[]) =>
  players.reduce((sum, player) => sum + (player.rating ?? 1500), 0) /
  players.length;

const canonical = (ids: string[]) => [...ids].sort().join(":");

export function proposeBalancedMatch(input: {
  format: MatchFormat;
  candidates: readonly MatchCandidate[];
}): MatchProposal {
  const required = input.format === "singles" ? 2 : 4;
  const selected = [...input.candidates]
    .sort(
      (a, b) =>
        a.queuePosition - b.queuePosition ||
        a.playerId.localeCompare(b.playerId),
    )
    .slice(0, required);
  if (selected.length !== required) throw new Error("INSUFFICIENT_PLAYERS");

  if (input.format === "singles") {
    return {
      policyVersion: MATCHMAKING_POLICY_VERSION,
      sideAPlayerIds: [selected[0]!.playerId],
      sideBPlayerIds: [selected[1]!.playerId],
      ratingDifference: Math.abs(
        average([selected[0]!]) - average([selected[1]!]),
      ),
    };
  }

  const partitions = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ] as const;
  const choices = partitions.map(([a, b]) => {
    const sideA = a.map((index) => selected[index]!);
    const sideB = b.map((index) => selected[index]!);
    return {
      sideA,
      sideB,
      difference: Math.abs(average(sideA) - average(sideB)),
      tie: `${canonical(sideA.map((p) => p.playerId))}|${canonical(sideB.map((p) => p.playerId))}`,
    };
  });
  choices.sort(
    (a, b) => a.difference - b.difference || a.tie.localeCompare(b.tie),
  );
  const best = choices[0]!;
  return {
    policyVersion: MATCHMAKING_POLICY_VERSION,
    sideAPlayerIds: best.sideA.map((player) => player.playerId).sort(),
    sideBPlayerIds: best.sideB.map((player) => player.playerId).sort(),
    ratingDifference: best.difference,
  };
}
