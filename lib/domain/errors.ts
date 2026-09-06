export const commandErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_FAILED",
  "INELIGIBLE",
  "SUBSCRIPTION_INACTIVE",
  "STALE_VERSION",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;
export type CommandErrorCode = (typeof commandErrorCodes)[number];

const databaseCodeMap: Record<string, CommandErrorCode> = {
  AUTH_REQUIRED: "UNAUTHENTICATED",
  PERMISSION_DENIED: "FORBIDDEN",
  TENANT_MISMATCH: "NOT_FOUND",
  SUBSCRIPTION_INACTIVE: "SUBSCRIPTION_INACTIVE",
  STALE_VERSION: "STALE_VERSION",
  ALREADY_EXISTS: "CONFLICT",
  IDEMPOTENCY_CONFLICT: "CONFLICT",
};

export function mapDatabaseError(code?: string): CommandErrorCode {
  return (code && databaseCodeMap[code]) || "INTERNAL_ERROR";
}
