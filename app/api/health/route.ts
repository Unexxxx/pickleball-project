import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/security/request-guards";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 30);
  if (limited) return limited;
  const { error } = await createAdminClient()
    .from("clubs")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  return Response.json(
    { status: error ? "degraded" : "ok" },
    { status: error ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
}
