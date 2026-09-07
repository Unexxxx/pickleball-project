import { describe, expect, it } from "vitest";
import {
  attestationSchema,
  createPublicSlug,
  loginSchema,
  profileSchema,
  registrationSchema,
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
  it("accepts a normal registration name without a manually entered slug", () =>
    expect(
      registrationSchema.safeParse({
        email: "kent@example.com",
        password: "a-secure-password",
        displayName: "Kent Onyx Arintok",
        termsVersion: "2026-09-01",
      }).success,
    ).toBe(true));
  it("generates a valid unique public slug from the player name", () =>
    expect(createPublicSlug("Kent Onyx Arintok", "12345678-test")).toBe(
      "kent-onyx-arintok-12345678",
    ));
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
