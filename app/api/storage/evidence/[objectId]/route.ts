import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceRateLimit,
  safeServerError,
} from "@/lib/security/request-guards";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ objectId: string }> },
) {
  const limited = enforceRateLimit(request, 30);
  if (limited) return limited;
  const { objectId } = await params,
    s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: evidence } = await s
    .from("dispute_evidence")
    .select("evidence_object_id")
    .eq("evidence_object_id", objectId)
    .maybeSingle();
  if (!evidence) return Response.json({ error: "Not found" }, { status: 404 });
  const { data: objectPath } = await s.rpc("get_dispute_evidence_path", {
    p_evidence_object_id: objectId,
  });
  if (!objectPath)
    return Response.json({ error: "Not found" }, { status: 404 });
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("evidence")
    .createSignedUrl(objectPath, 60);
  if (error) return safeServerError("evidence.download", error);
  return Response.redirect(data.signedUrl);
}
