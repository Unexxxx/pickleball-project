import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { getClub } from "@/lib/queries/clubs";
import { CLUB_ADMIN_ROLES, requireClubAccess } from "@/lib/queries/club-home";
import { createClient } from "@/lib/supabase/server";
import { templateSettingsSchema } from "@/lib/validation/events";
export default async function NewEventPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/new">) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  // Server-side role gate (hidden buttons are not a permission check).
  await requireClubAccess(club.slug, CLUB_ADMIN_ROLES);
  const supabase = await createClient();
  const clubImageUrl = club.profile_image_path
    ? supabase.storage.from("club-media").getPublicUrl(club.profile_image_path)
        .data.publicUrl
    : null;
  // The club's saved templates; anything that no longer fits the form is skipped.
  const { data: rows } = await supabase
    .from("event_templates")
    .select("id,name,settings")
    .eq("club_id", club.id)
    .order("name");
  const templates = (rows ?? []).flatMap((row) => {
    const settings = templateSettingsSchema.safeParse(row.settings);
    return settings.success
      ? [{ id: row.id, name: row.name, settings: settings.data }]
      : [];
  });
  return (
    <main className="eb-page">
      <header className="eb-page__head">
        <h1>Create event</h1>
        <p>Four quick steps. The preview shows what players will see.</p>
      </header>
      <EventForm
        clubId={club.id}
        clubSlug={club.slug}
        clubName={club.name}
        clubImageUrl={clubImageUrl}
        templates={templates}
      />
    </main>
  );
}
