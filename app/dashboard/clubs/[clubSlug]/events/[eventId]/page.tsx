import { notFound } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { CourtEditor } from "@/components/events/court-editor";
import { EventManagementControls } from "@/components/events/event-management-controls";
import { EventPublicationControls } from "@/components/events/event-publication-controls";
import { ExternalRosterReview } from "@/components/events/external-roster-review";
import { ParticipantList } from "@/components/events/participant-list";
import { ShareEventLink } from "@/components/events/share-event-link";
import { getClub } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function EventPage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/[eventId]">) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const s = await createClient();
  const { data } = await s
    .from("events")
    .select(
      "id,name,venue,map_url,notes,starts_at,ends_at,status,type,formats,record_class,is_private,join_code,version,capacity,event_courts(id),event_registrations(id,player_id,status,waitlist_position,registered_at,players(display_name,public_slug,avatar_path))",
    )
    .eq("id", eventId)
    .eq("club_id", club.id)
    .single();
  if (!data) notFound();
  const { data: externalEntries } = await s
    .from("external_event_roster_entries")
    .select(
      "id,display_name,status,waitlist_position,source_url,matched_player_id",
    )
    .eq("event_id", eventId)
    .eq("club_id", club.id)
    .is("matched_player_id", null)
    .order("status")
    .order("waitlist_position");
  const participants = data.event_registrations.flatMap((registration) => {
    const player = registration.players;
    if (!player) return [];
    const avatarUrl = player.avatar_path
      ? s.storage.from("avatars").getPublicUrl(player.avatar_path).data
          .publicUrl
      : null;
    return [
      {
        id: registration.id,
        playerId: registration.player_id,
        displayName: player.display_name,
        publicSlug: player.public_slug,
        avatarUrl,
        status: registration.status,
        waitlistPosition: registration.waitlist_position,
        registeredAt: registration.registered_at,
      },
    ];
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: club.timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: club.timezone,
    timeZoneName: "short",
  });
  const startDate = dateFormatter.format(new Date(data.starts_at));
  const endDate = dateFormatter.format(new Date(data.ends_at));
  const date = startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  const schedule = `${timeFormatter.format(new Date(data.starts_at))}–${timeFormatter.format(new Date(data.ends_at))}`;
  const confirmedCount = participants.filter(
    (participant) => participant.status === "confirmed",
  ).length;
  const shareUrl = new URL(
    `/join/${data.join_code}`,
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ).toString();

  return (
    <main className="public-event-page organizer-event-page">
      <header className="public-event-hero">
        <div className="public-event-hero__copy">
          <p className="event-host">Hosted by {club.name}</p>
          <div
            className="event-badges"
            aria-label="Event status and classifications"
          >
            <span>{titleCase(data.type)}</span>
            <span>{titleCase(data.record_class)}</span>
            <span>{data.is_private ? "Private" : "Public"}</span>
            <span
              className={`event-status-badge event-status-badge--${data.status}`}
            >
              {titleCase(data.status)}
            </span>
          </div>
          <h1>{data.name}</h1>
          <p>
            <MapPin aria-hidden="true" size={19} /> {data.venue}
          </p>
        </div>
        <div className="event-schedule-card" aria-label="Event schedule">
          <CalendarDays aria-hidden="true" size={28} />
          <div>
            <strong>{date}</strong>
            <time dateTime={data.starts_at}>{schedule}</time>
          </div>
        </div>
      </header>

      {data.status === "canceled" ? (
        <div className="event-canceled-banner">
          <strong>Event canceled</strong>
          <span>
            Registration is closed. Players opening the shared link will see
            this cancellation.
          </span>
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
              <dd>{data.formats.map(titleCase).join(" · ")}</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck aria-hidden="true" /> Competition record
              </dt>
              <dd>
                {data.record_class === "ranked"
                  ? "Results update ratings and leaderboards."
                  : "Results remain separate from ranked records."}
              </dd>
            </div>
          </dl>
          {data.map_url ? (
            <a
              className="event-map-link"
              href={data.map_url}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin aria-hidden="true" size={17} /> Open saved map location{" "}
              <ExternalLink aria-hidden="true" size={15} />
            </a>
          ) : null}
        </section>
        <aside className="event-join-card organizer-event-summary">
          <div className="event-availability">
            <Users aria-hidden="true" size={22} />
            <div>
              <h2>Registration</h2>
              <p>
                {confirmedCount} of {data.capacity} confirmed
              </p>
            </div>
          </div>
          {data.status === "draft" ? (
            <EventPublicationControls
              clubId={club.id}
              eventId={eventId}
              version={data.version}
            />
          ) : null}
          {data.status === "published" ? (
            <ShareEventLink shareUrl={shareUrl} />
          ) : (
            <p className="event-share-unavailable">
              The player link is unavailable while this event is{" "}
              {data.status.replaceAll("_", " ")}.
            </p>
          )}
        </aside>
      </div>

      {data.notes ? (
        <section
          className="event-notes-card"
          aria-labelledby="event-notes-heading"
        >
          <p className="eyebrow">From the organizer</p>
          <h2 id="event-notes-heading">What players should know</h2>
          <div className="event-notes-content">{data.notes}</div>
        </section>
      ) : null}

      <EventManagementControls
        clubId={club.id}
        clubSlug={club.slug}
        event={{
          id: data.id,
          name: data.name,
          venue: data.venue,
          mapUrl: data.map_url,
          notes: data.notes,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          capacity: data.capacity,
          status: data.status,
          version: data.version,
        }}
      />
      <CourtEditor count={data.event_courts.length} />
      <ParticipantList participants={participants} capacity={data.capacity} />
      <ExternalRosterReview
        entries={(externalEntries ?? []).map((entry) => ({
          id: entry.id,
          displayName: entry.display_name,
          status: entry.status,
          waitlistPosition: entry.waitlist_position,
        }))}
        sourceUrl={externalEntries?.[0]?.source_url ?? ""}
      />
    </main>
  );
}
