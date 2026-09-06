import { describe, expect, it } from "vitest";
import {
  confirmMatchResultSchema,
  submitMatchResultSchema,
} from "@/lib/validation/results";
import { mapResultDatabaseError } from "@/lib/domain/result-errors";
const id = "10000000-0000-4000-8000-000000000001";
describe("score actions", () => {
  it("accepts canonical games", () =>
    expect(
      submitMatchResultSchema.safeParse({
        clubId: id,
        eventId: id,
        matchId: id,
        score: { games: [{ sideA: 11, sideB: 7 }] },
        idempotencyKey: id,
      }).success,
    ).toBe(true));
  it("rejects ties", () =>
    expect(
      submitMatchResultSchema.safeParse({
        clubId: id,
        eventId: id,
        matchId: id,
        score: { games: [{ sideA: 11, sideB: 11 }] },
        idempotencyKey: id,
      }).success,
    ).toBe(false));
  it("requires the exact revision", () =>
    expect(
      confirmMatchResultSchema.safeParse({
        clubId: id,
        eventId: id,
        resultId: id,
        revisionId: id,
        idempotencyKey: id,
      }).success,
    ).toBe(true));
  it("maps stale revisions safely", () =>
    expect(mapResultDatabaseError({ details: "REVISION_STALE" })).toBe(
      "CONFLICT",
    ));
});
