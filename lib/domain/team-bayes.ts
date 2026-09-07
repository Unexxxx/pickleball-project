/** Two equal-sized teams, no draws. Mirrors private.team_bayes_update. */
export const TEAM_BAYES_V1 = {
  version: "team-bayes-v1",
  initialMean: 1500,
  initialSigma: 350,
  beta: 175,
  tau: 3.5,
  sigmaFloor: 35,
  provisionalSigma: 175,
} as const;

export type TeamSkill = { id: string; side: 1 | 2; mu: number; sigma: number };

export function normalCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const q =
    (Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI)) *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - q : q;
}

export function updateTeamSkills(players: readonly TeamSkill[], winner: 1 | 2) {
  if (
    ![1, 2].includes(winner) ||
    ![2, 4].includes(players.length) ||
    new Set(players.map((p) => p.id)).size !== players.length ||
    players.filter((p) => p.side === 1).length * 2 !== players.length ||
    players.some(
      (p) =>
        ![1, 2].includes(p.side) ||
        !Number.isFinite(p.mu) ||
        Math.abs(p.mu) > 100000 ||
        !Number.isFinite(p.sigma) ||
        p.sigma < 0.001 ||
        p.sigma > 350,
    )
  ) {
    throw new Error("INVALID_RATING_INPUT");
  }
  const variance = (p: TeamSkill) => p.sigma ** 2 + TEAM_BAYES_V1.tau ** 2;
  const c = Math.sqrt(
    players.reduce((sum, p) => sum + variance(p) + TEAM_BAYES_V1.beta ** 2, 0),
  );
  const difference = players.reduce(
    (sum, p) => sum + (p.side === 1 ? p.mu : -p.mu),
    0,
  );
  const expectedA = normalCdf(difference / c);
  const t = (winner === 1 ? difference : -difference) / c;
  const v =
    t < -10
      ? -t + 1 / -t - 2 / (-t) ** 3 + 10 / (-t) ** 5
      : Math.exp((-t * t) / 2) /
        Math.sqrt(2 * Math.PI) /
        Math.max(normalCdf(t), 1e-30);
  const w = Math.min(1, Math.max(0, v * (v + t)));
  return players.map((p) => ({
    ...p,
    mu: p.mu + (((p.side === winner ? 1 : -1) * variance(p)) / c) * v,
    sigma: Math.min(
      350,
      Math.sqrt(
        Math.max(
          TEAM_BAYES_V1.sigmaFloor ** 2,
          variance(p) * (1 - (variance(p) / (c * c)) * w),
        ),
      ),
    ),
    expected: p.side === 1 ? expectedA : 1 - expectedA,
  }));
}
