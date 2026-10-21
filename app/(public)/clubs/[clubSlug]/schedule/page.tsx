import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { EventRow } from "@/components/dashboard/event-row";
import {
  getClubEvents,
  getClubHome,
  getViewerRole,
  isClubAdmin,
  splitSchedule,
  type ClubScheduleEvent,
} from "@/lib/queries/club-home";

export const metadata: Metadata = { title: "Schedule" };

const STATUS_BADGE: Record<string, string> = {
  draft: "Draft",
  registration_closed: "Full",
  canceled: "Canceled",
};

export default async function ClubSchedule({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const admin = isClubAdmin(await getViewerRole(club.id));
  const { live, upcoming, past } = splitSchedule(
    await getClubEvents(club.id, admin),
  );
  const row = (event: ClubScheduleEvent) => (
    <EventRow
      key={event.id}
      href={
        admin
          ? `/dashboard/clubs/${club.slug}/events/${event.id}`
          : `/join/${event.join_code}`
      }
      name={event.name}
      venue={event.venue}
      startsAt={event.starts_at}
      timezone={club.timezone}
      live={event.status === "in_progress"}
      badge={
        STATUS_BADGE[event.status] ??
        (event.is_private ? "Private" : undefined) ??
        (event.record_class === "ranked" ? "Ranked" : undefined)
      }
    />
  );

  return (
    <div className="club-schedule">
      {admin ? (
        <div className="club-schedule__staff">
          <p className="ph-panel__hint">
            You also see drafts, private and canceled events because you help
            run this club. Players only see published events.
          </p>
          <Link
            className="button"
            href={`/dashboard/clubs/${club.slug}/events/new`}
          >
            <Plus aria-hidden="true" size={17} /> Create event
          </Link>
        </div>
      ) : null}
      {live.length ? (
        <section aria-labelledby="schedule-live">
          <h2 id="schedule-live" className="club-section-title">
            Live now
          </h2>
          <ul className="ph-list ph-list--page">{live.map(row)}</ul>
        </section>
      ) : null}
      <section aria-labelledby="schedule-upcoming">
        <h2 id="schedule-upcoming" className="club-section-title">
          Upcoming
        </h2>
        {upcoming.length ? (
          <ul className="ph-list ph-list--page">{upcoming.map(row)}</ul>
        ) : (
          <p className="ph-empty">No upcoming events.</p>
        )}
      </section>
      <section aria-labelledby="schedule-past">
        <h2 id="schedule-past" className="club-section-title">
          Past events
        </h2>
        {past.length ? (
          <ul className="ph-list ph-list--page">{past.map(row)}</ul>
        ) : (
          <p className="ph-empty">No past events yet.</p>
        )}
      </section>
    </div>
  );
}
