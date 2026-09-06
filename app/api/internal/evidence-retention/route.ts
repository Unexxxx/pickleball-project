import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceRateLimit,
  safeServerError,
} from "@/lib/security/request-guards";
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 10);
  if (limited) return limited;
  const supplied =
      request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
    expected = process.env.INTERNAL_SCHEDULER_SECRET ?? "";
  if (
    !supplied ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const s = createAdminClient(),
    token = crypto.randomUUID(),
    { data: objects, error } = await s.rpc("claim_expired_evidence", {
      p_batch_size: 50,
      p_claim_token: token,
    });
  if (error) return safeServerError("evidence.retention.claim", error);
  let deleted = 0;
  for (const object of objects ?? []) {
    const result = await s.storage
      .from("evidence")
      .remove([object.object_path]);
    if (!result.error) {
      const { data: done } = await s.rpc("finalize_evidence_deletion", {
        p_evidence_id: object.evidence_id,
        p_claim_token: token,
      });
      if (done) deleted++;
    }
  }
  return Response.json({ claimed: objects?.length ?? 0, deleted });
}
