import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Plus } from "lucide-react";
import { getClub } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
export default async function EventsPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events">) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id,name,venue,starts_at,ends_at,status,type,record_class")
    .eq("club_id", club.id)
    .order("starts_at", { ascending: false });

  return (
    <main>
      <header className="page-header">
        <div>
          <p className="eyebrow">Club calendar</p>
          <h1>{club.name} events</h1>
          <p>
            Manage upcoming sessions and revisit completed competition records.
          </p>
        </div>
        <Link
          className="button"
          href={`/dashboard/clubs/${clubSlug}/events/new`}
        >
          <Plus aria-hidden="true" size={18} /> Create event
        </Link>
      </header>

      {events?.length ? (
        <section className="event-grid" aria-label="Club events">
          {events.map((event) => {
            const startsAt = new Date(event.starts_at);
            return (
              <article className="event-card" key={event.id}>
                <div
                  className="event-card__date"
                  aria-label={startsAt.toLocaleDateString()}
                >
                  <span>
                    {startsAt.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <strong>{startsAt.getDate()}</strong>
                </div>
                <div className="event-card__content">
                  <div className="event-card__badges">
                    <span>{event.status.replaceAll("_", " ")}</span>
                    <span>{event.record_class}</span>
                  </div>
                  <h2>
                    <Link
                      href={`/dashboard/clubs/${clubSlug}/events/${event.id}`}
                    >
                      {event.name}
                    </Link>
                  </h2>
                  <p>
                    <MapPin aria-hidden="true" size={16} /> {event.venue}
                  </p>
                  <p>
                    <Clock3 aria-hidden="true" size={16} />{" "}
                    {startsAt.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state" role="status">
          <CalendarDays aria-hidden="true" size={30} />
          <h2>No events yet</h2>
          <p>
            Create your first event to begin registration, check-in, queues, and
            matchmaking.
          </p>
          <Link
            className="button"
            href={`/dashboard/clubs/${clubSlug}/events/new`}
          >
            Create first event
          </Link>
        </section>
      )}
    </main>
  );
}
