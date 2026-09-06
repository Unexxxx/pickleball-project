import { EventForm } from "@/components/events/event-form";
import { getClub } from "@/lib/queries/clubs";
import { notFound } from "next/navigation";
export default async function NewEventPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/new">) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  return (
    <main>
      <h1>Create event</h1>
      <EventForm clubId={club.id} clubSlug={club.slug} />
    </main>
  );
}
