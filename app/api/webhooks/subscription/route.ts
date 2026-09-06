import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionWebhookSchema } from "@/lib/validation/clubs";
import {
  enforceRateLimit,
  requireJson,
  safeServerError,
} from "@/lib/security/request-guards";
export async function POST(request: NextRequest) {
  const rejected =
    enforceRateLimit(request, 120) ?? requireJson(request, 32_768);
  if (rejected) return rejected;
  const raw = await request.text();
  const supplied = request.headers.get("x-webhook-signature") ?? "";
  const expected = createHmac(
    "sha256",
    process.env.SUBSCRIPTION_WEBHOOK_SECRET!,
  )
    .update(raw)
    .digest("hex");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid signature" } },
      { status: 403 },
    );
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid payload" } },
      { status: 422 },
    );
  }
  const parsed = subscriptionWebhookSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid payload" } },
      { status: 422 },
    );
  const supabase = createAdminClient();
  const validUntil =
    parsed.data.status === "active" || parsed.data.status === "trialing"
      ? "infinity"
      : parsed.data.occurredAt;
  const { error } = await supabase.rpc("set_club_subscription_webhook", {
    p_club_id: parsed.data.clubId,
    p_status: parsed.data.status,
    p_valid_until: validUntil,
    p_event_id: parsed.data.eventId,
  });
  if (error) return safeServerError("subscription.webhook", error);
  return NextResponse.json({ ok: true });
}
