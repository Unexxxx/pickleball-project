import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  googleAvatarExtension,
  googleAvatarUrl,
} from "@/lib/auth/google-profile";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard/profile";

  if (!code)
    return NextResponse.redirect(
      new URL("/verify?error=callback", request.url),
    );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user)
    return NextResponse.redirect(
      new URL("/verify?error=callback", request.url),
    );

  const metadata = data.user.user_metadata as {
    displayName?: string;
    publicSlug?: string;
    termsVersion?: string;
    full_name?: string;
    name?: string;
    picture?: string;
  };
  const emailStem = data.user.email?.split("@")[0] ?? "player";
  const providerName = metadata.full_name?.trim() || metadata.name?.trim();
  const displayName =
    metadata.displayName ??
    providerName ??
    emailStem.replace(/[._-]+/g, " ").trim();
  const generatedSlug = `${emailStem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${data.user.id.slice(0, 8)}`;
  const { error: provisionError } = await supabase.rpc(
    "provision_player_account",
    {
      p_display_name: displayName.slice(0, 80),
      p_public_slug: (metadata.publicSlug ?? generatedSlug).slice(0, 40),
      p_terms_version: metadata.termsVersion ?? "2026-09-01",
    },
  );

  if (provisionError) {
    return NextResponse.redirect(
      new URL("/verify?error=provision", request.url),
    );
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("players(display_name,avatar_path,version)")
    .eq("auth_user_id", data.user.id)
    .single();
  const player = account?.players;
  const pictureUrl = googleAvatarUrl(metadata.picture);

  if (player && !player.avatar_path && pictureUrl) {
    let uploadedPath: string | null = null;
    try {
      const response = await fetch(pictureUrl, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
      });
      const finalUrl = googleAvatarUrl(response.url);
      const extension = googleAvatarExtension(
        response.headers.get("content-type"),
      );
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (
        response.ok &&
        finalUrl &&
        extension &&
        declaredSize > 0 &&
        declaredSize <= 5 * 1024 * 1024
      ) {
        const avatar = await response.arrayBuffer();
        if (avatar.byteLength <= 5 * 1024 * 1024) {
          uploadedPath = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(uploadedPath, avatar, {
              contentType: response.headers.get("content-type") ?? undefined,
            });
          if (uploadError) uploadedPath = null;
        }
      }
    } catch {
      uploadedPath = null;
    }

    if (uploadedPath) {
      const { error: profileError } = await supabase.rpc(
        "update_my_player_profile",
        {
          p_display_name: player.display_name,
          p_avatar_path: uploadedPath,
          p_expected_version: player.version,
          p_idempotency_key: crypto.randomUUID(),
        },
      );
      if (profileError)
        await supabase.storage.from("avatars").remove([uploadedPath]);
    }
  }
  return NextResponse.redirect(new URL(next, request.url));
}
