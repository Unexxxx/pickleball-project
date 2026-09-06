"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
export async function requestTrustScoreReview(
  ledgerEntryId: string,
  reason: string,
) {
  const id = crypto.randomUUID();
  if (reason.trim().length < 10)
    return failure("VALIDATION_FAILED", "Explain the requested review.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("request_trust_score_review", {
      p_ledger_entry_id: ledgerEntryId,
      p_reason: reason,
      p_idempotency_key: crypto.randomUUID(),
    });
  if (error) return failure("FORBIDDEN", "Review could not be opened.", id);
  revalidatePath("/dashboard/profile/trust-score");
  return success(data, id);
}
export async function decideTrustScoreReview(
  reviewId: string,
  decision: "upheld" | "adjusted" | "dismissed",
  reason: string,
) {
  const id = crypto.randomUUID(),
    s = await createClient(),
    { data, error } = await s.rpc("decide_trust_score_review", {
      p_review_id: reviewId,
      p_decision: decision,
      p_reason: reason,
      p_idempotency_key: crypto.randomUUID(),
    });
  return error
    ? failure("FORBIDDEN", "Administrator access required.", id)
    : success(data, id);
}
