"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import { mapDatabaseError, type CommandErrorCode } from "@/lib/domain/errors";
import {
  assignNextQueuedMatchSchema,
  cancelMatchAssignmentSchema,
} from "@/lib/validation/matches";

const matchmakingErrors: Record<string, CommandErrorCode> = {
  INVALID_FORMAT: "VALIDATION_FAILED",
  INVALID_STATE_TRANSITION: "CONFLICT",
  INSUFFICIENT_PLAYERS: "INELIGIBLE",
  NO_COURT_AVAILABLE: "CONFLICT",
  COURT_CONFLICT: "CONFLICT",
  PLAYER_CONFLICT: "CONFLICT",
  RESOURCE_CONFLICT: "CONFLICT",
  PLAYER_NOT_VERIFIED: "INELIGIBLE",
};

function errorCode(error: {
  details?: string | null;
  message?: string | null;
}) {
  const detail = error.details ?? error.message ?? "";
  return matchmakingErrors[detail] ?? mapDatabaseError(detail);
}

const eventPath = (clubId: string, eventId: string) =>
  `/dashboard/clubs/${clubId}/events/${eventId}`;

export async function assignNextQueuedMatch(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = assignNextQueuedMatchSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "The standby lineup is invalid.",
      requestId,
    );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_next_queued_match", {
    p_event_id: parsed.data.eventId,
    p_format: parsed.data.format,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      errorCode(error),
      error.details === "NO_COURT_AVAILABLE"
        ? "No court is available yet. Finish a current match first."
        : error.details === "INSUFFICIENT_PLAYERS"
          ? "There are not enough players ready for this match."
          : error.details === "INELIGIBLE" ||
              error.details === "PLAYER_NOT_VERIFIED"
            ? "Every standby player must be identity-verified by this club before a ranked match can start."
            : "The standby match could not be assigned.",
      requestId,
    );
  const path = `/dashboard/clubs/${parsed.data.clubSlug}/events/${parsed.data.eventId}`;
  revalidatePath(`${path}/queue`);
  revalidatePath(`${path}/matches`);
  revalidatePath(`${path}/courts`);
  return success(data?.[0] ?? null, requestId);
}

export async function cancelMatchAssignment(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = cancelMatchAssignmentSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "A cancellation reason is required.",
      requestId,
    );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_match_assignment", {
    p_match_id: parsed.data.matchId,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      errorCode(error),
      "The assignment could not be canceled.",
      requestId,
    );
  revalidatePath(
    `${eventPath(parsed.data.clubId, parsed.data.eventId)}/matches`,
  );
  revalidatePath(
    `${eventPath(parsed.data.clubId, parsed.data.eventId)}/courts`,
  );
  return success(data?.[0] ?? null, requestId);
}
