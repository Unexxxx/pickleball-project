import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceRateLimit,
  requireJson,
  requireSameOrigin,
  safeServerError,
} from "@/lib/security/request-guards";
export async function POST(request: Request) {
  const rejected =
    enforceRateLimit(request, 20) ??
    requireSameOrigin(request) ??
    requireJson(request, 2048);
  if (rejected) return rejected;
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id, contentType } = body as {
    id: string;
    contentType: string;
  };
  if (!["image/jpeg", "image/png", "application/pdf"].includes(contentType))
    return Response.json({ error: "Invalid type" }, { status: 400 });
  const { data: account } = await s
    .from("accounts")
    .select("player_id")
    .eq("auth_user_id", user.id)
    .single();
  if (!account) return Response.json({ error: "Forbidden" }, { status: 403 });
  const path = `${account.player_id}/${id}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("evidence")
    .createSignedUploadUrl(path);
  if (error) return safeServerError("evidence.upload-url", error);
  return Response.json(data);
}
