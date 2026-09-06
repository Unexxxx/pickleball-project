import { expect, it } from "vitest";
import { reportSchema } from "@/lib/validation/reports";
import {
  reviewReportSchema,
  moderationActionSchema,
} from "@/lib/validation/moderation";
const id = "10000000-0000-4000-8000-000000000001";
it("validates reports and admin actions", () => {
  expect(
    reportSchema.safeParse({
      subjectType: "club",
      subjectId: id,
      reasonCode: "abuse",
      description: "Detailed harmful content report",
      evidenceObjectIds: [],
      idempotencyKey: id,
    }).success,
  ).toBe(true);
  expect(
    reviewReportSchema.safeParse({
      reportId: id,
      expectedVersion: 1,
      decision: "dismissed",
      reason: "No policy violation",
      idempotencyKey: id,
    }).success,
  ).toBe(true);
  expect(
    moderationActionSchema.safeParse({
      reportId: id,
      subjectType: "club",
      subjectId: id,
      action: "hide",
      reason: "Confirmed policy violation",
      expiresAt: null,
      idempotencyKey: id,
    }).success,
  ).toBe(true);
});
