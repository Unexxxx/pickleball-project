import { describe, expect, it } from "vitest";
import {
  attestationSchema,
  loginSchema,
  profileSchema,
  recoverySchema,
} from "@/lib/validation/auth";

describe("player registration contracts", () => {
  it("rejects prohibited identity labels", () =>
    expect(
      profileSchema.safeParse({
        displayName: "Guest",
        publicSlug: "guest",
        termsVersion: "2026-01",
      }).success,
    ).toBe(false));
  it("accepts account recovery email", () =>
    expect(
      recoverySchema.safeParse({ email: "player@example.com" }).success,
    ).toBe(true));
  it("requires a valid login email and password", () => {
    expect(
      loginSchema.safeParse({
        email: "player@example.com",
        password: "test-password",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "invalid", password: "short" }).success,
    ).toBe(false);
  });
  it("requires an idempotent Club attestation", () =>
    expect(
      attestationSchema.safeParse({
        clubId: crypto.randomUUID(),
        playerId: crypto.randomUUID(),
        attestationType: "in_person",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true));
});
