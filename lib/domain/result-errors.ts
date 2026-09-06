import { mapDatabaseError, type CommandErrorCode } from "@/lib/domain/errors";
const codes: Record<string, CommandErrorCode> = {
  INVALID_SCORE: "VALIDATION_FAILED",
  REVISION_STALE: "CONFLICT",
  INVALID_STATE_TRANSITION: "CONFLICT",
  PLAYER_NOT_VERIFIED: "INELIGIBLE",
  IDENTITY_NOT_ATTESTED: "INELIGIBLE",
};
export function mapResultDatabaseError(error: {
  details?: string | null;
  message?: string | null;
}) {
  const detail = error.details ?? error.message ?? "";
  return codes[detail] ?? mapDatabaseError(detail);
}
