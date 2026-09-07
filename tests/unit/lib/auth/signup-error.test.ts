import { describe, expect, it } from "vitest";
import { describeSignupError } from "@/lib/auth/signup-error";

describe("signup error messages", () => {
  it("explains the hosted email rate limit", () => {
    expect(describeSignupError({ code: "over_email_send_rate_limit" })).toEqual(
      {
        code: "RATE_LIMITED",
        message:
          "The verification email limit has been reached. Wait up to an hour before trying again, or configure custom SMTP in Supabase.",
      },
    );
  });

  it("explains restricted test-email delivery", () => {
    expect(
      describeSignupError({ code: "email_address_not_authorized" }),
    ).toEqual({
      code: "FORBIDDEN",
      message:
        "Supabase's test email service cannot send to this address. Use an authorized project-team email or configure custom SMTP.",
    });
  });

  it("does not expose unknown provider errors", () => {
    expect(describeSignupError({ code: "unexpected_failure" })).toEqual({
      code: "INTERNAL_ERROR",
      message: "Unable to create that account. Please try again shortly.",
    });
  });
});
