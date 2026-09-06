import { notFound } from "next/navigation";
import { ClubEventSections } from "@/components/clubs/club-event-sections";
import { ClubProfileHero } from "@/components/clubs/club-profile-hero";
import { getClub } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";
export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id,name,venue,starts_at,ends_at,status,record_class,join_code,is_private")
    .eq("club_id", club.id)
    .order("starts_at", { ascending: true });
  const profileImageUrl = club.profile_image_path
    ? supabase.storage.from("club-media").getPublicUrl(club.profile_image_path)
        .data.publicUrl
    : null;
  const backgroundImageUrl = club.background_image_path
    ? supabase.storage
        .from("club-media")
        .getPublicUrl(club.background_image_path).data.publicUrl
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
      <ClubEventSections events={events ?? []} clubSlug={clubSlug} management />
    </main>
  );
}
