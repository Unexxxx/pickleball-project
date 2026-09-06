import { expect, it } from "vitest";
import {
  openDisputeSchema,
  resolveDisputeSchema,
} from "@/lib/validation/disputes";
const id = "10000000-0000-4000-8000-000000000001";
it("validates dispute workflows", () => {
  expect(
    openDisputeSchema.safeParse({
      clubId: id,
      eventId: id,
      resultId: id,
      reasonCode: "score",
      description: "The recorded score is incorrect",
      evidenceObjectIds: [],
      idempotencyKey: id,
    }).success,
  ).toBe(true);
  expect(
    resolveDisputeSchema.safeParse({
      clubId: id,
      eventId: id,
      disputeId: id,
      resolution: "upheld",
      reason: "Score sheet confirms the result",
      idempotencyKey: id,
    }).success,
  ).toBe(true);
});
