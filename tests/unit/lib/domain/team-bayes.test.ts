import { describe, expect, it } from "vitest";
import { updateTeamSkills, type TeamSkill } from "@/lib/domain/team-bayes";
const players: TeamSkill[] = [1, 2, 3, 4].map((n) => ({
  id: String(n),
  side: n <= 2 ? 1 : 2,
  mu: 1500,
  sigma: 350,
}));
describe("team-bayes-v1", () => {
  it("has symmetric equal-team updates and reduces uncertainty", () => {
    const result = updateTeamSkills(players, 1);
    expect(result[0]!.mu).toBeCloseTo(1624.899, 2);
    expect(result[0]!.mu).toBe(result[1]!.mu);
    expect(result[0]!.mu + result[2]!.mu).toBeCloseTo(3000);
    expect(result[0]!.sigma).toBeLessThan(350);
  });
  it("moves uncertain teammates more, not lower-rated teammates automatically", () => {
    const input = players.map((p) => ({ ...p }));
    input[0]!.mu = 3000;
    input[1]!.mu = 1500;
    input[2]!.mu = 2900;
    input[3]!.mu = 1600;
    const equal = updateTeamSkills(input, 1);
    expect(equal[0]!.mu - 3000).toBeCloseTo(equal[1]!.mu - 1500);
    input[0]!.sigma = 70;
    const uncertain = updateTeamSkills(input, 1);
    expect(uncertain[1]!.mu - 1500).toBeGreaterThan(uncertain[0]!.mu - 3000);
  });
  it("handles extreme upsets without NaN or exploding uncertainty", () => {
    const input = players.map((p) => ({
      ...p,
      mu: p.side === 1 ? 10000 : -10000,
      sigma: 35,
    }));
    for (const p of updateTeamSkills(input, 2)) {
      expect(Number.isFinite(p.mu)).toBe(true);
      expect(p.sigma).toBeGreaterThanOrEqual(35);
    }
  });
  it("supports singles and rejects invalid/duplicate players", () => {
    expect(updateTeamSkills([players[0]!, players[2]!], 1)).toHaveLength(2);
    expect(() => updateTeamSkills([players[0]!, players[0]!], 1)).toThrow();
    expect(() =>
      updateTeamSkills(
        players.map((p) => ({ ...p, sigma: NaN })),
        1,
      ),
    ).toThrow();
  });
});
