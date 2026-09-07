export const MATCHMAKING_POLICY_VERSION = "matchmaking-v2" as const;

export type MatchFormat = "singles" | "doubles";
export type MatchCandidate = {
  playerId: string;
  rating?: number | null;
  wins?: number | null;
  losses?: number | null;
  rank?: number | null;
  queuePosition: number;
};

export type MatchProposal = {
  policyVersion: typeof MATCHMAKING_POLICY_VERSION;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  ratingDifference: number;
  winRateDifference: number;
  rankDifference: number;
  recentTeammatePenalty: number;
};

const average = (players: MatchCandidate[]) =>
  players.reduce((sum, player) => sum + (player.rating ?? 1500), 0) /
  players.length;

const canonical = (ids: string[]) => [...ids].sort().join(":");

export const teammatePairKey = (
  firstPlayerId: string,
  secondPlayerId: string,
) => [firstPlayerId, secondPlayerId].sort().join(":");

const winRate = (player: MatchCandidate) => {
  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  return wins + losses === 0 ? 0.5 : wins / (wins + losses);
};

const averageWinRate = (players: MatchCandidate[]) =>
  players.reduce((sum, player) => sum + winRate(player), 0) / players.length;

const averageRank = (players: MatchCandidate[], fallbackRank: number) =>
  players.reduce((sum, player) => sum + (player.rank ?? fallbackRank), 0) /
  players.length;

export function proposeBalancedMatch(input: {
  format: MatchFormat;
  candidates: readonly MatchCandidate[];
  recentTeammatePairs?: Readonly<Record<string, number>>;
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
      winRateDifference: Math.abs(
        averageWinRate([selected[0]!]) - averageWinRate([selected[1]!]),
      ),
      rankDifference: Math.abs(
        (selected[0]!.rank ?? 0) - (selected[1]!.rank ?? 0),
      ),
      recentTeammatePenalty: 0,
    };
  }

  const fallbackRank =
    Math.max(0, ...selected.map((player) => player.rank ?? 0)) + 1;
  const recentPairs = input.recentTeammatePairs ?? {};

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
      recentTeammatePenalty:
        (recentPairs[teammatePairKey(sideA[0]!.playerId, sideA[1]!.playerId)] ??
          0) +
        (recentPairs[teammatePairKey(sideB[0]!.playerId, sideB[1]!.playerId)] ??
          0),
      winRateDifference: Math.abs(
        averageWinRate(sideA) - averageWinRate(sideB),
      ),
      rankDifference: Math.abs(
        averageRank(sideA, fallbackRank) - averageRank(sideB, fallbackRank),
      ),
      difference: Math.abs(average(sideA) - average(sideB)),
      tie: `${canonical(sideA.map((p) => p.playerId))}|${canonical(sideB.map((p) => p.playerId))}`,
    };
  });
  choices.sort(
    (a, b) =>
      a.recentTeammatePenalty - b.recentTeammatePenalty ||
      a.winRateDifference - b.winRateDifference ||
      a.rankDifference - b.rankDifference ||
      a.difference - b.difference ||
      a.tie.localeCompare(b.tie),
  );
  const best = choices[0]!;
  return {
    policyVersion: MATCHMAKING_POLICY_VERSION,
    sideAPlayerIds: best.sideA.map((player) => player.playerId).sort(),
    sideBPlayerIds: best.sideB.map((player) => player.playerId).sort(),
    ratingDifference: best.difference,
    winRateDifference: best.winRateDifference,
    rankDifference: best.rankDifference,
    recentTeammatePenalty: best.recentTeammatePenalty,
  };
}
