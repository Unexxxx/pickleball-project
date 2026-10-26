"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clubContactSchema,
  clubMediaSchema,
  clubSchema,
  membershipRoleSchema,
} from "@/lib/validation/clubs";
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
export async function setClubContact(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubContactSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Keep the contact under 200 characters.",
      requestId,
    );
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_club_contact", {
    p_club_id: parsed.data.clubId,
    p_contact: parsed.data.contact,
  });
  if (error)
    return failure(
      "FORBIDDEN",
      "Only club owners and organizers can change the contact.",
      requestId,
    );
  revalidatePath(`/clubs/${parsed.data.clubSlug}`, "layout");
  return success({ contact: parsed.data.contact.trim() || null }, requestId);
}
/**
 * Records a club picture the client already uploaded to club-media/<club>/…
 * (or clears it). The database re-checks the role and the folder, then hands
 * back the replaced file so it can be removed from storage.
 */
export async function setClubMedia(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubMediaSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the image.", requestId);
  const supabase = await createClient();
  const { data: previous, error } = await supabase.rpc("set_club_media", {
    p_club_id: parsed.data.clubId,
    p_kind: parsed.data.kind,
    p_path: parsed.data.path,
  });
  if (error)
    return failure(
      "FORBIDDEN",
      "Only club owners and organizers can change club photos.",
      requestId,
    );
  if (previous && previous !== parsed.data.path)
    await supabase.storage.from("club-media").remove([previous]);
  revalidatePath(`/clubs/${parsed.data.clubSlug}`, "layout");
  return success({ path: parsed.data.path }, requestId);
}
