import { describe, expect, it } from "vitest";
import { failure, success } from "@/lib/actions/result";

describe("command results", () => {
  it("returns stable success metadata", () => {
    expect(success({ id: "one" }, "request-1")).toEqual({
      ok: true,
      data: { id: "one" },
      requestId: "request-1",
    });
  });
  it("redacts internal failure details", () => {
    expect(failure("FORBIDDEN", "Not allowed", "request-2")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });
});
