"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clubContactSchema,
  clubContactsSchema,
  clubMediaSchema,
  clubTargetSchema,
  joinPolicySchema,
  membershipRemoveSchema,
  membershipReviewSchema,
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
/**
 * Explains why a club command failed instead of always blaming permissions.
 * PGRST202 means the database function isn't deployed on this project yet.
 */
function clubCommandFailure(
  error: { code?: string; details?: string | null; message?: string },
  what: string,
  requestId: string,
) {
  const detail = `${error.details ?? ""} ${error.message ?? ""}`;
  if (error.code === "PGRST202")
    return failure(
      "INTERNAL_ERROR",
      `Saving the ${what} isn't available yet. Please try again later.`,
      requestId,
    );
  if (detail.includes("PERMISSION_DENIED"))
    return failure(
      "FORBIDDEN",
      `Only club owners and organizers can change the ${what}.`,
      requestId,
    );
  if (detail.includes("VALIDATION_FAILED"))
    return failure(
      "VALIDATION_FAILED",
      `That ${what} couldn't be saved. Check it and try again.`,
      requestId,
    );
  return failure(
    "INTERNAL_ERROR",
    `The ${what} couldn't be saved. Please try again.`,
    requestId,
  );
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
  if (error) return clubCommandFailure(error, "contact", requestId);
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
    return clubCommandFailure(
      error,
      parsed.data.kind === "profile" ? "club picture" : "cover photo",
      requestId,
    );
  if (previous && previous !== parsed.data.path)
    await supabase.storage.from("club-media").remove([previous]);
  revalidatePath(`/clubs/${parsed.data.clubSlug}`, "layout");
  return success({ path: parsed.data.path }, requestId);
}

/** Clear reasons for join / leave / review / remove failures. */
function membershipFailure(
  error: { code?: string; details?: string | null; message?: string },
  requestId: string,
) {
  const detail = `${error.details ?? ""} ${error.message ?? ""}`;
  if (error.code === "PGRST202")
    return failure(
      "INTERNAL_ERROR",
      "Club membership isn't available yet. Please try again later.",
      requestId,
    );
  if (detail.includes("AUTH_REQUIRED"))
    return failure("UNAUTHENTICATED", "Log in to join this club.", requestId);
  if (detail.includes("LAST_OWNER"))
    return failure(
      "CONFLICT",
      "A club needs at least one owner. Make someone else an owner first.",
      requestId,
    );
  if (detail.includes("PERMISSION_DENIED"))
    return failure(
      "FORBIDDEN",
      "You don't have permission to do that in this club.",
      requestId,
    );
  if (detail.includes("NOT_FOUND") || detail.includes("INVALID_STATE"))
    return failure(
      "CONFLICT",
      "This changed in the meantime. Refresh and try again.",
      requestId,
    );
  return failure(
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
    requestId,
  );
}

const refreshClub = (slug: string) => {
  revalidatePath(`/clubs/${slug}`, "layout");
  revalidatePath("/dashboard/clubs");
  revalidatePath("/dashboard");
};

/** Join an open club, or request to join one that needs approval. */
export async function joinClub(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubTargetSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the club.", requestId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_club_membership", {
    p_club_id: parsed.data.clubId,
  });
  if (error) return membershipFailure(error, requestId);
  refreshClub(parsed.data.clubSlug);
  return success({ status: data }, requestId);
}

/** Leave a club, or cancel a pending request. */
export async function leaveClub(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubTargetSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the club.", requestId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_club", {
    p_club_id: parsed.data.clubId,
  });
  if (error) return membershipFailure(error, requestId);
  refreshClub(parsed.data.clubSlug);
  return success({}, requestId);
}

/** Staff approve or decline a join request. */
export async function reviewMembership(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = membershipReviewSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the request.", requestId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_club_membership", {
    p_club_id: parsed.data.clubId,
    p_membership_id: parsed.data.membershipId,
    p_approve: parsed.data.approve,
  });
  if (error) return membershipFailure(error, requestId);
  refreshClub(parsed.data.clubSlug);
  return success({}, requestId);
}

/** Staff remove a member (owners are needed to remove staff or owners). */
export async function removeMember(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = membershipRemoveSchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Check the member.", requestId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_club_member", {
    p_club_id: parsed.data.clubId,
    p_membership_id: parsed.data.membershipId,
  });
  if (error) return membershipFailure(error, requestId);
  refreshClub(parsed.data.clubSlug);
  return success({}, requestId);
}

/** Owners and organizers choose "Anyone can join" or "Approval required". */
export async function setJoinPolicy(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = joinPolicySchema.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Choose a join setting.", requestId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_club_join_policy", {
    p_club_id: parsed.data.clubId,
    p_policy: parsed.data.policy,
  });
  if (error) return clubCommandFailure(error, "join setting", requestId);
  refreshClub(parsed.data.clubSlug);
  return success({ policy: parsed.data.policy }, requestId);
}

/** Club admins set the club's email, Facebook page and phone (blank clears). */
export async function setClubContacts(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = clubContactsSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Check the highlighted contact details.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );
  const { clubId, clubSlug, email, facebook, phone } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_club_contacts", {
    p_club_id: clubId,
    p_email: email,
    p_facebook: facebook,
    p_phone: phone,
  });
  if (error) {
    const detail = `${error.details ?? ""} ${error.message ?? ""}`;
    const field = detail.includes("INVALID_EMAIL")
      ? "email"
      : detail.includes("INVALID_FACEBOOK")
        ? "facebook"
        : detail.includes("INVALID_PHONE")
          ? "phone"
          : null;
    if (field)
      return failure(
        "VALIDATION_FAILED",
        "Check the highlighted contact details.",
        requestId,
        { [field]: ["This doesn't look right. Check it and try again."] },
      );
    if (detail.includes("PERMISSION_DENIED"))
      return failure(
        "FORBIDDEN",
        "Only club owners, organizers and staff can change the contacts.",
        requestId,
      );
    return clubCommandFailure(error, "contacts", requestId);
  }
  refreshClub(clubSlug);
  return success({}, requestId);
}
