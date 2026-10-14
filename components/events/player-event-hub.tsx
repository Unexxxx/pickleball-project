import Link from "next/link";

export type JoinedEvent = {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  status: string;
  join_code: string;
  clubSlug: string;
  clubName: string;
  timezone: string;
  registration: string;
};
export function PlayerEventHub({
  events,
  failed = false,
}: {
  events: JoinedEvent[];
  failed?: boolean;
}) {
  return (
    <section className="player-hub" aria-labelledby="joined-heading">
      <h2 id="joined-heading" className="sr-only">
        Your joined events
      </h2>
      {failed ? (
        <p role="alert">
          Your events could not be loaded. Please refresh and try again.
        </p>
      ) : events.length ? (
        <div className="player-hub-grid">
          {events.map((event) => (
            <article className="player-hub-card" key={event.id}>
              <div className="player-hub-badges">
                <span>
                  {event.status === "in_progress" ? "In progress" : "Upcoming"}
                </span>
                <span>
                  {event.registration === "waitlisted"
                    ? "Waitlisted"
                    : "Joined"}
                </span>
              </div>
              <h3>{event.name}</h3>
              <p>
                {event.clubName} · {event.venue}
              </p>
              <time dateTime={event.starts_at}>
                {new Date(event.starts_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: event.timezone,
                })}
              </time>
              <div className="player-hub-actions">
                <Link
                  className="button button-secondary"
                  href={`/join/${event.join_code}`}
                >
                  View event
                </Link>
                {event.status === "in_progress" &&
                  event.registration === "confirmed" && (
                    <Link
                      className="button"
                      href={`/dashboard/clubs/${event.clubSlug}/events/${event.id}/queue`}
                    >
                      View live queue
                    </Link>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="ph-empty">
          No joined events yet. Confirmed and waitlisted events appear here.{" "}
          <Link href="/dashboard/events?tab=discover">Discover events</Link>
        </p>
      )}
    </section>
  );
}
