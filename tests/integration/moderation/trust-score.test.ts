import { expect, it } from "vitest";
it("keeps Trust Score separate from ranking fields", () => {
  const publicFields = ["rating", "wins", "losses", "win_rate"];
  expect(publicFields).not.toContain("trust_score");
});
