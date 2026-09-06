"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import { mapQueueDatabaseError } from "@/lib/domain/queue-errors";
import {
  adjustQueueSchema,
  attendanceSchema,
  joinQueueSchema,
  leaveQueueSchema,
  organizerCheckoutSchema,
  replaceStandbyPlayerSchema,
} from "@/lib/validation/queues";

export async function organizerCheckout(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = organizerCheckoutSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the player details.", requestId);

  const s = await createClient();
  const { data, error } = await s.rpc("organizer_checkout_player", {
    p_event_id: parsed.data.eventId,
    p_player_id: parsed.data.playerId,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) {
    const code = mapQueueDatabaseError(error);
    return failure(
      code,
      code === "CONFLICT"
        ? "Replace or finish this player's assigned match before checking them out."
        : "Player could not be checked out.",
      requestId,
    );
  }
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubId}/events/${parsed.data.eventId}/check-in`,
  );
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubId}/events/${parsed.data.eventId}/queue`,
  );
  return success(data?.[0] ?? null, requestId);
}

export async function replaceStandbyPlayer(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = replaceStandbyPlayerSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Choose a replacement player and reason.",
      requestId,
    );
  const s = await createClient();
  const { data, error } = await s.rpc("replace_standby_player", {
    p_event_id: parsed.data.eventId,
    p_format: parsed.data.format,
    p_outgoing_entry_id: parsed.data.outgoingEntryId,
    p_replacement_entry_id: parsed.data.replacementEntryId,
    p_expected_queue_version: parsed.data.expectedQueueVersion,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapQueueDatabaseError(error),
      "The queue changed. Refresh and choose the replacement again.",
      requestId,
    );
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubSlug}/events/${parsed.data.eventId}/queue`,
  );
  return success(data, requestId);
}
export async function setAttendance(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = attendanceSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Check attendance details.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("set_event_attendance", {
    p_event_id: p.data.eventId,
    p_player_id: p.data.playerId,
    p_state: p.data.state,
    p_reason: p.data.reason,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapQueueDatabaseError(error),
      "Attendance could not be updated.",
      requestId,
    );
  revalidatePath(`/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}`);
  return success(data?.[0] ?? null, requestId);
}
export async function organizerCheckInAndQueue(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = attendanceSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Check attendance details.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("organizer_check_in_and_queue", {
    p_event_id: p.data.eventId,
    p_player_id: p.data.playerId,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapQueueDatabaseError(error),
      "Player could not be checked in and queued.",
      requestId,
    );
  revalidatePath(
    `/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}/check-in`,
  );
  revalidatePath(
    `/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}/queue`,
  );
  return success(data?.[0] ?? null, requestId);
}
export async function joinQueue(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = joinQueueSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Invalid queue request.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("join_event_queue", {
    p_event_id: p.data.eventId,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error) {
    const code = mapQueueDatabaseError(error);
    return failure(
      code,
      code === "INELIGIBLE"
        ? "Ask the club to check you in before joining the queue."
        : code === "CONFLICT"
          ? "You are already in this event queue."
          : code === "UNAUTHENTICATED"
            ? "Log in before joining the queue."
            : "Unable to join queue. Refresh and try again.",
      requestId,
    );
  }
  return success(data?.[0] ?? null, requestId);
}
export async function leaveQueue(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = leaveQueueSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Invalid queue request.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("leave_event_queue", {
    p_event_id: p.data.eventId,
    p_reason: p.data.reason ?? "player_left",
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapQueueDatabaseError(error),
      "Unable to leave queue.",
      requestId,
    );
  return success(data?.[0] ?? null, requestId);
}
export async function adjustQueue(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = adjustQueueSchema.safeParse(input);
  if (!p.success)
    return failure(
      "VALIDATION_FAILED",
      "A reason and current version are required.",
      requestId,
    );
  const s = await createClient();
  const { data, error } = await s.rpc("adjust_event_queue", {
    p_queue_entry_id: p.data.queueEntryId,
    p_expected_version: p.data.expectedVersion,
    p_before_entry_id: p.data.beforeEntryId!,
    p_reason: p.data.reason,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapQueueDatabaseError(error),
      "Queue changed; refresh and retry.",
      requestId,
    );
  return success(data?.[0] ?? null, requestId);
}
