export const ELO_V1 = {
  version: "elo-v1",
  initialRating: 1500,
  scale: 400,
  kFactor: 32,
} as const;
export type EloSide = readonly number[];
export type EloOutcome = 1 | 2;
export const teamRating = (ratings: EloSide) =>
  ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
export const roundHalfAwayFromZero = (value: number) =>
  value < 0 ? Math.ceil(value - 0.5) : Math.floor(value + 0.5);
export function calculateEloV1(
  sideA: EloSide,
  sideB: EloSide,
  winner: EloOutcome,
) {
  if (!sideA.length || !sideB.length) throw new Error("ELO_SIDE_REQUIRED");
  const ratingA = teamRating(sideA);
  const ratingB = teamRating(sideB);
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / ELO_V1.scale));
  const deltaA = roundHalfAwayFromZero(
    ELO_V1.kFactor * ((winner === 1 ? 1 : 0) - expectedA),
  );
  return {
    expectedA,
    expectedB: 1 - expectedA,
    deltaA,
    deltaB: -deltaA,
    sideAPost: sideA.map((r) => r + deltaA),
    sideBPost: sideB.map((r) => r - deltaA),
  };
}
export const winRate = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : wins / (wins + losses);
export const nextStreak = (current: number, won: boolean) =>
  won
    ? Math.max(1, current > 0 ? current + 1 : 1)
    : Math.min(-1, current < 0 ? current - 1 : -1);
export const leaderboardComparator = (
  a: { rating: number; wins: number; losses: number; playerId: string },
  b: typeof a,
) =>
  b.rating - a.rating ||
  b.wins - a.wins ||
  winRate(b.wins, b.losses) - winRate(a.wins, a.losses) ||
  a.losses - b.losses ||
  a.playerId.localeCompare(b.playerId);
