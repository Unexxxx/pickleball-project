import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { OrganizerCheckInList } from "@/components/queues/organizer-check-in-list";
import { getClub } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";

export default async function CheckInPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/[eventId]/check-in">) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const s = await createClient();
  const [
    { data: event },
    { data: registrations },
    { data: attendance },
    { data: queue },
  ] = await Promise.all([
    s
      .from("events")
      .select("id,name,status")
      .eq("id", eventId)
      .eq("club_id", club.id)
      .single(),
    s
      .from("event_registrations")
      .select("player_id,players(display_name)")
      .eq("event_id", eventId)
      .eq("status", "confirmed"),
    s
      .from("event_attendance")
      .select("player_id,state")
      .eq("event_id", eventId),
    s
      .from("event_queue_entries")
      .select("player_id,state")
      .eq("event_id", eventId)
      .in("state", ["ready", "assigned"]),
  ]);
  if (!event) notFound();
  const checkedIn = new Set(
    (attendance ?? [])
      .filter((entry) => entry.state === "checked_in")
      .map((entry) => entry.player_id),
  );
  const queueStates = new Map(
    (queue ?? []).map((entry) => [entry.player_id, entry.state] as const),
  );
  const players = (registrations ?? [])
    .map((registration) => ({
      id: registration.player_id,
      displayName: registration.players?.display_name ?? "Player",
      checkedIn: checkedIn.has(registration.player_id),
      queueState:
        queueStates.get(registration.player_id) === "ready"
          ? ("ready" as const)
          : queueStates.get(registration.player_id) === "assigned"
            ? ("assigned" as const)
            : null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <main className="event-operations-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <CircleCheck aria-hidden="true" size={16} /> Live operations
          </p>
          <h1>Check in players</h1>
          <p>
            {event.name} · {event.status.replaceAll("_", " ")}
          </p>
        </div>
        <Link
          className="button-link"
          href={`/dashboard/clubs/${clubSlug}/events/${eventId}/queue`}
        >
          Open live queue <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </header>
      {event.status !== "in_progress" ? (
        <p className="private-event-notice">
          Start the event from its overview before checking players into the
          queue.
        </p>
      ) : null}
      <OrganizerCheckInList
        clubId={club.id}
        eventId={eventId}
        players={players}
        enabled={event.status === "in_progress"}
      />
    </main>
  );
}
