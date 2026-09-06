import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "@/lib/env";

describe("environment boundaries", () => {
  it("accepts public Supabase configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
      }),
    ).toBeTruthy();
  });
  it("requires secrets only on the server", () => {
    expect(() => parseServerEnv({})).toThrow();
  });
});
