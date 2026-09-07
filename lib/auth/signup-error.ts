import type { CommandErrorCode } from "@/lib/domain/errors";

type SupabaseSignupError = {
  code?: string;
  status?: number;
};

export function describeSignupError(error: SupabaseSignupError): {
  code: CommandErrorCode;
  message: string;
} {
  if (error.code === "over_email_send_rate_limit" || error.status === 429)
    return {
      code: "RATE_LIMITED",
      message:
        "The verification email limit has been reached. Wait up to an hour before trying again, or configure custom SMTP in Supabase.",
    };

  if (error.code === "email_address_not_authorized")
    return {
      code: "FORBIDDEN",
      message:
        "Supabase's test email service cannot send to this address. Use an authorized project-team email or configure custom SMTP.",
    };

  if (error.code === "email_exists" || error.code === "user_already_exists")
    return {
      code: "CONFLICT",
      message:
        "An account already exists for this email. Log in or recover your password instead.",
    };

  if (error.code === "weak_password")
    return {
      code: "VALIDATION_FAILED",
      message: "Choose a stronger password and try again.",
    };

  if (error.code === "email_address_invalid")
    return {
      code: "VALIDATION_FAILED",
      message: "Enter a valid email address.",
    };

  if (
    error.code === "signup_disabled" ||
    error.code === "email_provider_disabled"
  )
    return {
      code: "FORBIDDEN",
      message: "Email registration is currently unavailable.",
    };

  return {
    code: "INTERNAL_ERROR",
    message: "Unable to create that account. Please try again shortly.",
  };
}
