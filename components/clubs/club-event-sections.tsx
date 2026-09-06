import Link from "next/link";
import { CalendarCheck, CalendarClock, History, MapPin } from "lucide-react";

export type ClubEvent = {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  status: string;
  record_class: string;
  join_code: string;
  is_private: boolean;
};

function EventList({
  events,
  clubSlug,
  management,
}: {
  events: ClubEvent[];
  clubSlug: string;
  management: boolean;
}) {
  return (
    <div className="club-event-list">
      {events.map((event) => {
        const start = new Date(event.starts_at);
        const href = management
          ? `/dashboard/clubs/${clubSlug}/events/${event.id}`
          : `/join/${event.join_code}`;
        return (
          <article className="club-event-row" key={event.id}>
            <div className="event-card__date">
              <span>
                {start.toLocaleDateString(undefined, { month: "short" })}
              </span>
              <strong>{start.getDate()}</strong>
            </div>
            <div>
              <div className="event-card__badges">
                <span>{event.status.replaceAll("_", " ")}</span>
                <span>{event.record_class}</span>
              </div>
              <h3>
                <Link href={href}>{event.name}</Link>
              </h3>
              <p>
                <MapPin aria-hidden="true" size={15} /> {event.venue}
              </p>
              <p>
                <CalendarClock aria-hidden="true" size={15} />{" "}
                {start.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ClubEventSections({
  events,
  clubSlug,
  management = false,
}: {
  events: ClubEvent[];
  clubSlug: string;
  management?: boolean;
}) {
  const active = events.filter(
    (event) => !["completed", "canceled"].includes(event.status),
  );
  const past = events.filter((event) => !active.includes(event));

  return (
    <div className="club-events-stack">
      <section aria-labelledby="active-events-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <CalendarCheck aria-hidden="true" size={15} /> Play next
            </p>
            <h2 id="active-events-heading">Active events</h2>
          </div>
          <span className="count-badge">{active.length}</span>
        </div>
        {active.length ? (
          <EventList
            events={active}
            clubSlug={clubSlug}
            management={management}
          />
        ) : (
          <div className="compact-empty">
            <CalendarCheck aria-hidden="true" />
            <p>No active events right now.</p>
          </div>
        )}
      </section>
      <section aria-labelledby="past-events-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <History aria-hidden="true" size={15} /> Club history
            </p>
            <h2 id="past-events-heading">Past events</h2>
          </div>
          <span className="count-badge count-badge--muted">{past.length}</span>
        </div>
        {past.length ? (
          <EventList
            events={past}
            clubSlug={clubSlug}
            management={management}
          />
        ) : (
          <div className="compact-empty">
            <History aria-hidden="true" />
            <p>No past events yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
