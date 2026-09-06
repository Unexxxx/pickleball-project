"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import {
  duplicateMergeSchema,
  moderationActionSchema,
  reviewReportSchema,
} from "@/lib/validation/moderation";
export async function reviewReport(input: unknown) {
  const id = crypto.randomUUID(),
    p = reviewReportSchema.safeParse(input);
  if (!p.success) return failure("VALIDATION_FAILED", "Invalid review.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("review_report", {
      p_report_id: p.data.reportId,
      p_expected_version: p.data.expectedVersion,
      p_decision: p.data.decision,
      p_reason: p.data.reason,
      p_idempotency_key: p.data.idempotencyKey,
    });
  if (error)
    return failure("FORBIDDEN", "Platform administrator access required.", id);
  revalidatePath("/admin/reports");
  return success(data?.[0] ?? null, id);
}
export async function applyModerationAction(input: unknown) {
  const id = crypto.randomUUID(),
    p = moderationActionSchema.safeParse(input);
  if (!p.success) return failure("VALIDATION_FAILED", "Invalid action.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("apply_moderation_action", {
      p_report_id: p.data.reportId!,
      p_subject_type: p.data.subjectType,
      p_subject_id: p.data.subjectId,
      p_action: p.data.action,
      p_reason: p.data.reason,
      p_expires_at: p.data.expiresAt!,
      p_idempotency_key: p.data.idempotencyKey,
    });
  return error
    ? failure("FORBIDDEN", "Platform administrator access required.", id)
    : success(data, id);
}
export async function mergeDuplicatePlayers(input: unknown) {
  const id = crypto.randomUUID(),
    p = duplicateMergeSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Invalid merge decision.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("merge_duplicate_players", {
      p_review_id: p.data.reviewId,
      p_surviving_player_id: p.data.survivingPlayerId,
      p_reason: p.data.reason,
      p_idempotency_key: p.data.idempotencyKey,
    });
  return error ? failure("FORBIDDEN", "Merge denied.", id) : success(data, id);
}
