import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Profiles live in one place: /players/[slug]. This route stays as the stable
// "my profile" link (header, login callback) and forwards there, opening the
// edit form when asked with ?edit=1.
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { data: playerId } = await supabase.rpc("current_player_id");
  if (!playerId) redirect("/dashboard");
  const { data: player } = await supabase
    .from("players")
    .select("public_slug")
    .eq("id", playerId)
    .single();
  if (!player?.public_slug) redirect("/dashboard");
  const { edit } = await searchParams;
  redirect(
    edit === "1"
      ? `/players/${player.public_slug}?edit=1`
      : `/players/${player.public_slug}`,
  );
}
