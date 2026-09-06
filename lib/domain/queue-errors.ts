import type { CommandErrorCode } from "@/lib/domain/errors";

export function mapQueueDatabaseError(error: {
  code?: string;
  details?: string | null;
}): CommandErrorCode {
  const detail = error.details ?? "";
  if (detail.includes("STALE_VERSION")) return "STALE_VERSION";
  if (detail.includes("AUTH_REQUIRED")) return "UNAUTHENTICATED";
  if (detail.includes("PERMISSION_DENIED")) return "FORBIDDEN";
  if (detail.includes("ALREADY_EXISTS")) return "CONFLICT";
  if (detail.includes("PLAYER_ASSIGNED")) return "CONFLICT";
  if (detail.includes("INELIGIBLE")) return "INELIGIBLE";
  return "INTERNAL_ERROR";
}
