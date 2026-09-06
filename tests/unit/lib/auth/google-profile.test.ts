import { describe, expect, it } from "vitest";
import {
  googleAvatarExtension,
  googleAvatarUrl,
} from "@/lib/auth/google-profile";

describe("Google profile imports", () => {
  it("accepts Google avatar hosts and rejects arbitrary remote URLs", () => {
    expect(
      googleAvatarUrl("https://lh3.googleusercontent.com/a/photo=s96-c")
        ?.hostname,
    ).toBe("lh3.googleusercontent.com");
    expect(googleAvatarUrl("https://example.com/avatar.jpg")).toBeNull();
    expect(
      googleAvatarUrl("https://lh3.googleusercontent.com.example.com/a"),
    ).toBeNull();
  });

  it("allows only avatar image formats accepted by storage", () => {
    expect(googleAvatarExtension("image/jpeg; charset=binary")).toBe("jpg");
    expect(googleAvatarExtension("image/svg+xml")).toBeNull();
  });
});
