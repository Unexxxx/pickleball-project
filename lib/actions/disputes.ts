"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import { mapDatabaseError } from "@/lib/domain/errors";
import {
  openDisputeSchema,
  resolveDisputeSchema,
} from "@/lib/validation/disputes";
import type { Json } from "@/lib/supabase/database.types";
export async function openResultDispute(input: unknown) {
  const id = crypto.randomUUID(),
    p = openDisputeSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Provide a dispute reason.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("open_result_dispute", {
      p_result_id: p.data.resultId,
      p_reason_code: p.data.reasonCode,
      p_description: p.data.description,
      p_evidence_object_ids: p.data.evidenceObjectIds,
      p_idempotency_key: p.data.idempotencyKey,
    });
  if (error)
    return failure(
      mapDatabaseError(error.details ?? ""),
      "Dispute could not be opened.",
      id,
    );
  revalidatePath(
    `/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}/disputes`,
  );
  return success(data?.[0] ?? null, id);
}
export async function resolveResultDispute(input: unknown) {
  const id = crypto.randomUUID(),
    p = resolveDisputeSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Provide a valid resolution.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("resolve_result_dispute", {
      p_dispute_id: p.data.disputeId,
      p_resolution: p.data.resolution,
      p_corrected_score: (p.data.correctedScore ?? null) as Json,
      p_reason: p.data.reason,
      p_idempotency_key: p.data.idempotencyKey,
    });
  if (error)
    return failure(
      mapDatabaseError(error.details ?? ""),
      "Dispute could not be resolved.",
      id,
    );
  revalidatePath(
    `/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}/disputes`,
  );
  return success(data?.[0] ?? null, id);
}
