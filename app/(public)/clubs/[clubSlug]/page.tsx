import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getLeaderboard,
  getLeaderboardRules,
} from "@/lib/queries/leaderboards";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { LeaderboardRules } from "@/components/leaderboards/leaderboard-rules";
import { ClubEventSections } from "@/components/clubs/club-event-sections";
import { ClubProfileHero } from "@/components/clubs/club-profile-hero";
export default async function Page({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params,
    s = await createClient(),
    { data: club } = await s
      .from("clubs")
      .select(
        "id,name,slug,timezone,subscription_status,profile_image_path,background_image_path",
      )
      .eq("slug", clubSlug)
      .single();
  if (!club) notFound();
  const [rows, rules, { data: events }] = await Promise.all([
    getLeaderboard({ scope: "club", clubSlug }),
    getLeaderboardRules(),
    s
      .from("events")
      .select(
        "id,name,venue,starts_at,ends_at,status,record_class,join_code,is_private",
      )
      .eq("club_id", club.id)
      .neq("status", "draft")
      .eq("is_private", false)
      .order("starts_at", { ascending: true }),
  ]);
  const version = Math.max(
    0,
    ...rows.map((row) => row.calculation_version ?? 0),
  );
  const profileImageUrl = club.profile_image_path
    ? s.storage.from("club-media").getPublicUrl(club.profile_image_path).data
        .publicUrl
    : null;
  const backgroundImageUrl = club.background_image_path
    ? s.storage.from("club-media").getPublicUrl(club.background_image_path).data
        .publicUrl
    : null;
  return (
    <main>
      <ClubProfileHero
        name={club.name}
        timezone={club.timezone}
        subscriptionStatus={club.subscription_status}
        profileImageUrl={profileImageUrl}
        backgroundImageUrl={backgroundImageUrl}
      />
      <ClubEventSections events={events ?? []} clubSlug={clubSlug} />
      <section aria-labelledby="club-ranking-heading">
        <h2 id="club-ranking-heading">Club leaderboard</h2>
        <LeaderboardTable rows={rows} />
        {rules ? (
          <LeaderboardRules
            description={rules.description}
            ordering={rules.ordering}
            version={version}
          />
        ) : null}
      </section>
    </main>
  );
}
