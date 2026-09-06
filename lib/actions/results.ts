"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import { mapResultDatabaseError } from "@/lib/domain/result-errors";
import {
  confirmMatchResultSchema,
  endMatchWithScoreSchema,
  submitMatchResultSchema,
} from "@/lib/validation/results";

export async function endMatchWithScore(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = endMatchWithScoreSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Enter a valid final score.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("end_match_with_score", {
    p_match_id: parsed.data.matchId,
    p_score: parsed.data.score,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapResultDatabaseError(error),
      "The match could not be ended. Refresh and try again.",
      requestId,
    );
  const path = `/dashboard/clubs/${parsed.data.clubSlug}/events/${parsed.data.eventId}`;
  revalidatePath(`${path}/queue`);
  revalidatePath(`${path}/matches`);
  revalidatePath(`${path}/courts`);
  return success(data?.[0] ?? null, requestId);
}
export async function submitMatchResult(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = submitMatchResultSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Enter a valid score.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("submit_match_result", {
    p_match_id: parsed.data.matchId,
    p_score: parsed.data.score,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapResultDatabaseError(error),
      "Score could not be submitted.",
      requestId,
    );
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubId}/events/${parsed.data.eventId}/matches`,
  );
  return success(data?.[0] ?? null, requestId);
}
export async function confirmMatchResult(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = confirmMatchResultSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "The result confirmation is invalid.",
      requestId,
    );
  const s = await createClient();
  const { data, error } = await s.rpc("confirm_match_result", {
    p_result_id: parsed.data.resultId,
    p_revision_id: parsed.data.revisionId,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      mapResultDatabaseError(error),
      "Result could not be confirmed.",
      requestId,
    );
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubId}/events/${parsed.data.eventId}/matches`,
  );
  return success(data?.[0] ?? null, requestId);
}
