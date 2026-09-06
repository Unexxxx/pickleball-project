import { describe, expect, it } from "vitest";
import {
  clubSchema,
  membershipRoleSchema,
  subscriptionWebhookSchema,
} from "@/lib/validation/clubs";

describe("Club command validation", () => {
  it("accepts one canonical Club model", () =>
    expect(
      clubSchema.safeParse({
        name: "Northside Pickleball",
        timezone: "Asia/Manila",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true));
  it("cannot assign platform administrator as a Club role", () =>
    expect(
      membershipRoleSchema.safeParse({
        clubId: crypto.randomUUID(),
        membershipId: crypto.randomUUID(),
        role: "platform_admin",
        reason: "test",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false));
  it("validates subscription webhook envelopes", () =>
    expect(
      subscriptionWebhookSchema.safeParse({
        eventId: "evt_1",
        clubId: crypto.randomUUID(),
        status: "active",
        occurredAt: new Date().toISOString(),
      }).success,
    ).toBe(true));
});
