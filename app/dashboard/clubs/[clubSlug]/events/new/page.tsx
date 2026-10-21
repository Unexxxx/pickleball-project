import { EventForm } from "@/components/events/event-form";
import { getClub } from "@/lib/queries/clubs";
import { notFound } from "next/navigation";
import { CLUB_ADMIN_ROLES, requireClubAccess } from "@/lib/queries/club-home";
export default async function NewEventPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/new">) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  // Server-side role gate (hidden buttons are not a permission check).
  await requireClubAccess(club.slug, CLUB_ADMIN_ROLES);
  return (
    <main>
      <h1>Create event</h1>
      <EventForm clubId={club.id} clubSlug={club.slug} />
    </main>
  );
}
