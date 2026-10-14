import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { formatEventTime } from "@/lib/format/event-time";
import type { PlayStatus } from "@/lib/queries/player-home";

/**
 * Answers "How do I play now?" with one focus per situation. Every figure
 * shown comes from the database; there is no wait-time estimate, so none is
 * displayed.
 */
export function PlayHero({
  status,
  hasLiveSessions,
}: {
  status: PlayStatus;
  hasLiveSessions: boolean;
}) {
  if (status.kind === "idle")
    return (
      <section className="ph-hero" aria-labelledby="play-heading">
        <div className="ph-hero__copy">
          <p className="ph-kicker">Play</p>
          <h2 id="play-heading">Ready to play?</h2>
          <p>
            Join an open event to get matched, or jump into a session that is
            running now.
          </p>
          <div className="ph-actions">
            <Link className="button" href="/dashboard/events?tab=discover">
              Find a match
            </Link>
            <Link className="button button-secondary" href="#live-now">
              {hasLiveSessions ? "Join a live queue" : "See live sessions"}
            </Link>
          </div>
        </div>
      </section>
    );

  const { event } = status;
  const queueHref = `/dashboard/clubs/${event.clubSlug}/events/${event.id}/queue`;
  const eventHref = `/join/${event.join_code}`;
  const where = (
    <ul className="ph-meta">
      <li>
        <MapPin aria-hidden="true" size={16} />
        {event.clubName} · {event.venue}
      </li>
      {status.kind === "upcoming" && (
        <li>
          <CalendarDays aria-hidden="true" size={16} />
          <time dateTime={event.starts_at}>
            {formatEventTime(event.starts_at, event.timezone)}
          </time>
        </li>
      )}
    </ul>
  );

  const content = {
    on_court: {
      kicker: "Live · You're up",
      title:
        status.kind === "on_court" && status.court
          ? `Head to ${status.court}`
          : "Your match is assigned",
      body: `You're in a match at ${event.name}.`,
      primary: { label: "View live queue", href: queueHref },
    },
    queued: {
      kicker: "Live · In the queue",
      title:
        status.kind === "queued" ? `#${status.position} in line` : "In line",
      body:
        status.kind === "queued" && status.position > 1
          ? `${status.position - 1} ${status.position === 2 ? "player is" : "players are"} ahead of you at ${event.name}.`
          : `You're next up at ${event.name}.`,
      primary: { label: "Follow the queue", href: queueHref },
    },
    checked_in: {
      kicker: "Live · Checked in",
      title: "Join the queue",
      body: `You're checked in at ${event.name}. Enter the queue to get matched.`,
      primary: { label: "Open live queue", href: queueHref },
    },
    live_event: {
      kicker: "Live now",
      title: event.name,
      body: "Play has started. Check in with the organizer to join the queue.",
      primary: { label: "View live queue", href: queueHref },
    },
    upcoming: {
      kicker:
        event.registration === "waitlisted" ? "Waitlisted" : "Your next match",
      title: event.name,
      body:
        event.registration === "waitlisted"
          ? "You'll move into the event automatically if a spot opens."
          : "You're registered. Check in at the venue when play starts.",
      primary: { label: "View event", href: eventHref },
    },
  }[status.kind];

  const isLive = status.kind !== "upcoming";
  return (
    <section
      className={isLive ? "ph-hero ph-hero--live" : "ph-hero"}
      aria-labelledby="play-heading"
    >
      <div className="ph-hero__copy">
        <p className="ph-kicker">
          {isLive && <span className="ph-live-dot" aria-hidden="true" />}
          {content.kicker}
        </p>
        <h2 id="play-heading">{content.title}</h2>
        <p>{content.body}</p>
        {where}
        <div className="ph-actions">
          <Link className="button" href={content.primary.href}>
            {content.primary.label}
          </Link>
          {isLive && (
            <Link className="button button-secondary" href={eventHref}>
              Event details
            </Link>
          )}
        </div>
      </div>
      {status.kind === "on_court" && (
        // The court only appears when it communicates live play.
        <div className="ph-court" aria-hidden="true">
          <span className="ph-court__label">{status.court ?? "Court"}</span>
        </div>
      )}
    </section>
  );
}
