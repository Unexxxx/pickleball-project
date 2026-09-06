"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clubSchema, membershipRoleSchema } from "@/lib/validation/clubs";
import { failure, success } from "@/lib/actions/result";
export async function createClub(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Check the Club details.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_club_auto", {
    p_name: parsed.data.name,
    p_timezone: parsed.data.timezone,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure("CONFLICT", "Unable to create this Club.", requestId);
  revalidatePath("/dashboard");
  const created = data?.[0];
  if (!created)
    return failure("INTERNAL_ERROR", "Unable to create this Club.", requestId);
  return success({ clubId: created.club_id, slug: created.slug }, requestId);
}
export async function setMembershipRole(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = membershipRoleSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the role change.", requestId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_membership_role", {
    p_club_id: parsed.data.clubId,
    p_membership_id: parsed.data.membershipId,
    p_role: parsed.data.role,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure("FORBIDDEN", "Role change was not allowed.", requestId);
  revalidatePath("/dashboard/clubs");
  return success({ version: Number(data) }, requestId);
}
