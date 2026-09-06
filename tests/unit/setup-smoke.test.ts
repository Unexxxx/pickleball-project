import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs in a DOM-capable environment", () => {
    expect(document.documentElement).toBeDefined();
  });
});
