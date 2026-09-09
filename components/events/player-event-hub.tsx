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
  liveOnly = false,
}: {
  events: JoinedEvent[];
  failed?: boolean;
  liveOnly?: boolean;
}) {
  return (
    <section className="player-hub" aria-labelledby="joined-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your schedule</p>
          <h2 id="joined-heading">
            {liveOnly ? "Your live events" : "My joined events"}
          </h2>
          <p>Open your event or follow the live queue when play starts.</p>
        </div>
      </div>
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
        <div className="empty-state">
          <h3>
            {liveOnly
              ? "No joined events live right now"
              : "No current joined events"}
          </h3>
          <p>
            Discover an event to join. Your confirmed registrations and waitlist
            places will appear here.
          </p>
          <Link className="button" href="/dashboard?view=discover">
            Discover events
          </Link>
        </div>
      )}
    </section>
  );
}
