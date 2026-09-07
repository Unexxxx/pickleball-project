import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Navigation,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { getEventJoinRoster, resolveEventJoin } from "@/lib/queries/event-join";
import { RegistrationStatus } from "@/components/events/registration-status";
import { ParticipantList } from "@/components/events/participant-list";
import { ShareEventLink } from "@/components/events/share-event-link";
import { createClient } from "@/lib/supabase/server";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(startsAt: string, endsAt: string) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
    ),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} hr` : "", remainder ? `${remainder} min` : ""]
    .filter(Boolean)
    .join(" ");
}

export default async function JoinPage({
  params,
}: PageProps<"/join/[eventCode]">) {
  const { eventCode } = await params;
  const event = await resolveEventJoin(eventCode);
  if (!event)
    return (
      <main>
        <h1>Event not found</h1>
        <p>This link is invalid, expired, or unavailable.</p>
      </main>
    );
  const supabase = await createClient();
  const [
    { roster, ownRegistration },
    {
      data: { user },
    },
  ] = await Promise.all([
    getEventJoinRoster(eventCode, event.id),
    supabase.auth.getUser(),
  ]);
  const participants = roster.map((registration) => ({
    id: `${registration.public_slug}-${registration.registration_status}`,
    playerId: "",
    displayName: registration.display_name,
    publicSlug: registration.public_slug,
    avatarUrl: registration.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(registration.avatar_path)
          .data.publicUrl
      : null,
    status: registration.registration_status,
    waitlistPosition: registration.waitlist_position,
    registeredAt: null,
  }));
  const confirmedCount = participants.filter(
    (participant) => participant.status === "confirmed",
  ).length;
  const availableSpots = Math.max(event.capacity - confirmedCount, 0);
  const timezone = event.club_timezone || "UTC";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
  const startDate = dateFormatter.format(new Date(event.starts_at));
  const endDate = dateFormatter.format(new Date(event.ends_at));
  const date = startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
  const endTimeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
  const schedule = `${timeFormatter.format(
    new Date(event.starts_at),
  )}–${endTimeFormatter.format(new Date(event.ends_at))}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shareUrl = new URL(`/join/${eventCode}`, siteUrl).toString();
  const mapQuery = encodeURIComponent(event.venue);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${mapQuery}&dirflg=d`;
  const eventPath = `/join/${eventCode}`;
  const loginHref = `/login?next=${encodeURIComponent(eventPath)}`;

  return (
    <main className="public-event-page">
      <header className="public-event-hero">
        <div className="public-event-hero__copy">
          <Link className="event-host" href={`/clubs/${event.club_slug}`}>
            Hosted by {event.club_name}
          </Link>
          <div className="event-badges" aria-label="Event classifications">
            <span>{titleCase(event.event_type)}</span>
            <span>
              {event.record_class === "ranked" ? "Ranked" : "Unranked"}
            </span>
            <span>{event.is_private ? "Private" : "Public"}</span>
            {event.status === "canceled" ? (
              <span className="event-status-badge event-status-badge--canceled">
                Canceled
              </span>
            ) : null}
          </div>
          <h1>{event.name}</h1>
          <p>
            <MapPin aria-hidden="true" size={19} /> {event.venue}
          </p>
        </div>
        <div className="event-schedule-card" aria-label="Event schedule">
          <CalendarDays aria-hidden="true" size={28} />
          <div>
            <strong>{date}</strong>
            <time dateTime={event.starts_at}>{schedule}</time>
            <span>
              <Clock3 aria-hidden="true" size={15} />{" "}
              {formatDuration(event.starts_at, event.ends_at)}
            </span>
          </div>
        </div>
      </header>

      {event.status === "canceled" ? (
        <div className="event-canceled-banner">
          <strong>This event was canceled</strong>
          <span>The club has closed registration for this event.</span>
        </div>
      ) : null}

      <div className="public-event-grid">
        <section
          className="event-details-card"
          aria-labelledby="event-details-heading"
        >
          <p className="eyebrow">Competition setup</p>
          <h2 id="event-details-heading">Play details</h2>
          <dl className="event-facts">
            <div>
              <dt>
                <Trophy aria-hidden="true" /> Play format
              </dt>
              <dd>{event.formats.map(titleCase).join(" · ")}</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck aria-hidden="true" /> Competition record
              </dt>
              <dd>
                {event.record_class === "ranked"
                  ? "Results count toward player ratings and leaderboards."
                  : "Results stay separate from ranked records."}
              </dd>
            </div>
          </dl>
          <div
            className="event-directions"
            aria-labelledby="directions-heading"
          >
            <div>
              <h3 id="directions-heading">Get directions</h3>
              <p>Choose the map service you want to open.</p>
            </div>
            <div className="event-directions__actions">
              {event.map_url ? (
                <a href={event.map_url} target="_blank" rel="noreferrer">
                  <MapPin aria-hidden="true" size={17} /> Saved map location
                </a>
              ) : null}
              <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                <Navigation aria-hidden="true" size={17} /> Google Maps
              </a>
              <a href={appleMapsUrl} target="_blank" rel="noreferrer">
                <Navigation aria-hidden="true" size={17} /> Apple Maps
              </a>
            </div>
          </div>
          {event.is_private ? (
            <p className="private-event-notice">
              Private event — club members may join directly. Other invited
              players need the event passcode.
            </p>
          ) : null}
        </section>

        <aside className="event-join-card" aria-labelledby="join-event-heading">
          <div className="event-availability">
            <Users aria-hidden="true" size={22} />
            <div>
              <h2 id="join-event-heading">Join this event</h2>
              <p>
                {event.status === "canceled"
                  ? "Registration closed"
                  : !user
                    ? "Sign in to view availability and join"
                    : availableSpots
                      ? `${availableSpots} ${availableSpots === 1 ? "spot" : "spots"} available`
                      : "Event is full — new registrations join the waitlist"}
              </p>
            </div>
          </div>
          {event.status === "published" && user ? (
            <RegistrationStatus
              eventId={event.id}
              isPrivate={event.is_private}
              initialRegistered={Boolean(ownRegistration)}
            />
          ) : event.status === "published" ? (
            <Link className="button" href={loginHref}>
              Sign in to join
            </Link>
          ) : (
            <p className="event-registration-closed">
              Registration is closed because this event was canceled.
            </p>
          )}
          <ShareEventLink shareUrl={shareUrl} />
        </aside>
      </div>

      {event.notes ? (
        <section
          className="event-notes-card"
          aria-labelledby="event-notes-heading"
        >
          <p className="eyebrow">From the organizer</p>
          <h2 id="event-notes-heading">What players should know</h2>
          <div className="event-notes-content">{event.notes}</div>
        </section>
      ) : null}

      <ParticipantList
        participants={participants}
        capacity={event.capacity}
        viewerAuthenticated={Boolean(user)}
        loginHref={loginHref}
      />
    </main>
  );
}
