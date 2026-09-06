"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { failure, success } from "@/lib/actions/result";
import { reportSchema } from "@/lib/validation/reports";
export async function createReport(input: unknown) {
  const id = crypto.randomUUID(),
    p = reportSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Provide valid report details.", id);
  const s = await createClient(),
    { data, error } = await s.rpc("create_report", {
      p_subject_type: p.data.subjectType,
      p_subject_id: p.data.subjectId,
      p_reason_code: p.data.reasonCode,
      p_description: p.data.description,
      p_evidence_object_ids: p.data.evidenceObjectIds,
      p_idempotency_key: p.data.idempotencyKey,
    });
  if (error) return failure("FORBIDDEN", "Report could not be submitted.", id);
  revalidatePath("/dashboard");
  return success(data?.[0] ?? null, id);
}
