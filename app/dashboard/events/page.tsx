import Link from "next/link";
import type { Metadata } from "next";
import { EventRow } from "@/components/dashboard/event-row";
import { PlayerEventHub } from "@/components/events/player-event-hub";
import { currentPlayerId } from "@/lib/auth/authorization";
import { requireUser } from "@/lib/auth/session";
import {
  getHostedEvents,
  getJoinedEvents,
  getMyClubs,
  getUpcomingPublicEvents,
  hostedClubIds,
} from "@/lib/queries/player-home";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Events" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Open",
  registration_closed: "Closed",
  in_progress: "Live",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const { tab: requested } = await searchParams;
  const supabase = await createClient();
  const playerId = await currentPlayerId();
  const myClubs = playerId ? await getMyClubs(supabase, playerId) : [];
  const hostIds = hostedClubIds(myClubs);
  const tabs = [
    ["joined", "Joined"],
    ...(hostIds.length ? [["hosting", "Hosting"]] : []),
    ["discover", "Discover"],
  ];
  const tab = tabs.some(([key]) => key === requested) ? requested : "joined";

  return (
    <main className="ph">
      <header className="ph-page-head">
        <h1>Events</h1>
        <nav className="ph-tabs" aria-label="Event lists">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              href={`/dashboard/events?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {tab === "joined" && <JoinedTab playerId={playerId} />}
      {tab === "hosting" && <HostingTab clubIds={hostIds} />}
      {tab === "discover" && <DiscoverTab />}
    </main>
  );
}

async function JoinedTab({ playerId }: { playerId: string | null }) {
  const supabase = await createClient();
  const joined = playerId
    ? await getJoinedEvents(supabase, playerId)
    : { events: [], failed: true };
  return <PlayerEventHub events={joined.events} failed={joined.failed} />;
}

async function HostingTab({ clubIds }: { clubIds: string[] }) {
  const supabase = await createClient();
  const { events, failed } = await getHostedEvents(supabase, clubIds);
  return (
    <section aria-label="Events you host">
      {failed ? (
        <p role="alert">Your hosted events could not be loaded.</p>
      ) : events.length ? (
        <ul className="ph-list ph-list--page">
          {events.map((event) => (
            <EventRow
              key={event.id}
              href={`/dashboard/clubs/${event.clubSlug}/events/${event.id}`}
              name={event.name}
              clubName={event.clubName}
              venue={event.venue}
              startsAt={event.starts_at}
              timezone={event.timezone}
              live={event.status === "in_progress"}
              badge={STATUS_LABEL[event.status]}
            />
          ))}
        </ul>
      ) : (
        <p className="ph-empty">
          No upcoming events in the clubs you run. Create one from a club page.
        </p>
      )}
    </section>
  );
}

async function DiscoverTab() {
  const supabase = await createClient();
  const { events, failed } = await getUpcomingPublicEvents(supabase, 24);
  return (
    <section aria-label="Upcoming public events">
      <p className="ph-panel__hint">
        Public events from every club, soonest first. Looking for something
        specific? <Link href="/dashboard/search">Search by name</Link>.
      </p>
      {failed ? (
        <p role="alert">Events could not be loaded.</p>
      ) : events.length ? (
        <ul className="ph-list ph-list--page">
          {events.map((event) => (
            <EventRow
              key={event.id}
              href={`/join/${event.join_code}`}
              name={event.name}
              clubName={event.clubName}
              venue={event.venue}
              startsAt={event.starts_at}
              timezone={event.timezone}
            />
          ))}
        </ul>
      ) : (
        <p className="ph-empty">
          No public events are scheduled. Check back soon or open an invitation
          from a club.
        </p>
      )}
    </section>
  );
}
