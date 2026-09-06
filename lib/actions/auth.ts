"use server";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  attestationSchema,
  loginSchema,
  profileSchema,
  profileUpdateSchema,
  recoverySchema,
} from "@/lib/validation/auth";
import { failure, success, type CommandResult } from "@/lib/actions/result";

const safeNextPath = (value: FormDataEntryValue | null) => {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
};

export async function signIn(
  _: unknown,
  formData: FormData,
): Promise<CommandResult<{ signedIn: boolean }>> {
  const requestId = crypto.randomUUID();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Enter a valid email and password.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user)
    return failure("UNAUTHENTICATED", "Invalid email or password.", requestId);

  const { data: account } = await supabase
    .from("accounts")
    .select("player_id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!account) {
    const metadata = data.user.user_metadata as {
      displayName?: string;
      publicSlug?: string;
      termsVersion?: string;
    };
    const emailStem = parsed.data.email.split("@")[0] ?? "player";
    const displayName =
      metadata.displayName ?? emailStem.replace(/[._-]+/g, " ");
    const publicSlug =
      metadata.publicSlug ??
      `${emailStem
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${data.user.id.slice(0, 8)}`;
    const { error: provisionError } = await supabase.rpc(
      "provision_player_account",
      {
        p_display_name: displayName.slice(0, 80),
        p_public_slug: publicSlug.slice(0, 40),
        p_terms_version: metadata.termsVersion ?? "2026-09-01",
      },
    );
    if (provisionError) {
      await supabase.auth.signOut();
      return failure(
        "INTERNAL_ERROR",
        "Your player profile could not be prepared.",
        requestId,
      );
    }
  }

  redirect(safeNextPath(formData.get("next")), RedirectType.replace);
}

export async function signUp(
  _: unknown,
  formData: FormData,
): Promise<CommandResult<{ verificationRequired: boolean }>> {
  const requestId = crypto.randomUUID();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    publicSlug: formData.get("publicSlug"),
    termsVersion: formData.get("termsVersion"),
  });
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Enter a valid real player identity.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: parsed.data,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/auth/callback`,
    },
  });
  if (error)
    return failure("CONFLICT", "Unable to create that account.", requestId);
  return success({ verificationRequired: true }, requestId);
}
export async function sendRecovery(
  _: unknown,
  formData: FormData,
): Promise<CommandResult<{ sent: boolean }>> {
  const requestId = crypto.randomUUID();
  const parsed = recoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Enter a valid email.", requestId);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email);
  return success({ sent: true }, requestId);
}
export async function updateMyPlayerProfile(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Check your profile details.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_my_player_profile", {
    p_display_name: parsed.data.displayName,
    p_avatar_path: parsed.data.avatarPath,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      error.message.includes("STALE_VERSION") ? "STALE_VERSION" : "FORBIDDEN",
      error.message.includes("STALE_VERSION")
        ? "Your profile changed in another session. Refresh and try again."
        : "Unable to update your profile.",
      requestId,
    );

  const updated = data?.[0];
  if (!updated)
    return failure(
      "INTERNAL_ERROR",
      "Unable to update your profile.",
      requestId,
    );

  revalidatePath("/dashboard/profile");
  revalidatePath("/players/[playerSlug]", "page");
  return success(updated, requestId, Number(updated.version));
}
export async function attestIdentity(input: unknown) {
  const parsed = attestationSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Invalid attestation.",
      crypto.randomUUID(),
    );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("attest_player_identity", {
    p_club_id: parsed.data.clubId,
    p_player_id: parsed.data.playerId,
    p_attestation_type: parsed.data.attestationType,
    p_note: parsed.data.note ?? "",
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      "FORBIDDEN",
      "You cannot attest this player.",
      crypto.randomUUID(),
    );
  return success({ attestationId: data }, crypto.randomUUID());
}
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
