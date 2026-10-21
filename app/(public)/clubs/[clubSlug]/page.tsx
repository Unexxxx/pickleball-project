import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { ClubContact } from "@/components/clubs/club-contact";
import { MemberRow } from "@/components/clubs/member-row";
import { EventRow } from "@/components/dashboard/event-row";
import { formatEventTime } from "@/lib/format/event-time";
import {
  ROLE_LABEL,
  getClubDirectory,
  getClubEvents,
  getClubHome,
  getViewerRole,
  isClubAdmin,
  splitSchedule,
  type ClubScheduleEvent,
} from "@/lib/queries/club-home";
import { createClient } from "@/lib/supabase/server";

export default async function ClubOverview({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const role = await getViewerRole(club.id);
  const admin = isClubAdmin(role);
  const supabase = await createClient();
  const [events, directory, { count: rankedPlayers }] = await Promise.all([
    getClubEvents(club.id, admin),
    getClubDirectory(club.id),
    supabase
      .from("public_leaderboards")
      .select("player_id", { count: "exact", head: true })
      .eq("scope", "club")
      .eq("club_slug", club.slug),
  ]);
  const { live, upcoming } = splitSchedule(events);
  const focus = live[0] ?? upcoming[0] ?? null;
  const isLive = Boolean(live[0]);
  const next = upcoming.filter((e) => e.id !== focus?.id).slice(0, 4);
  const staff = (directory ?? []).filter((m) =>
    ["owner", "organizer", "staff"].includes(m.role),
  );
  const held = events.filter((e) => e.status === "completed").length;
  const eventHref = (event: ClubScheduleEvent) =>
    admin
      ? `/dashboard/clubs/${club.slug}/events/${event.id}`
      : `/join/${event.join_code}`;

  return (
    <>
      <div className="ph-top">
        <section
          className={isLive ? "ph-hero ph-hero--live" : "ph-hero"}
          aria-labelledby="club-focus-heading"
        >
          <div className="ph-hero__copy">
            {focus ? (
              <>
                <p className="ph-kicker">
                  {isLive && (
                    <span className="ph-live-dot" aria-hidden="true" />
                  )}
                  {isLive ? "Live now" : "Next event"}
                </p>
                <h2 id="club-focus-heading">{focus.name}</h2>
                <ul className="ph-meta">
                  <li>
                    <MapPin aria-hidden="true" size={16} />
                    {focus.venue}
                  </li>
                  {!isLive && (
                    <li>
                      <CalendarDays aria-hidden="true" size={16} />
                      <time dateTime={focus.starts_at}>
                        {formatEventTime(focus.starts_at, club.timezone)}
                      </time>
                    </li>
                  )}
                </ul>
                <div className="ph-actions">
                  {admin ? (
                    <Link
                      className="button"
                      href={
                        isLive
                          ? `/dashboard/clubs/${club.slug}/events/${focus.id}/queue`
                          : `/dashboard/clubs/${club.slug}/events/${focus.id}`
                      }
                    >
                      {isLive ? "Run live event" : "Manage event"}
                    </Link>
                  ) : null}
                  <Link
                    className={admin ? "button button-secondary" : "button"}
                    href={`/join/${focus.join_code}`}
                  >
                    {isLive ? "View event" : "View & join"}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="ph-kicker">Schedule</p>
                <h2 id="club-focus-heading">No events scheduled</h2>
                <p>
                  {admin
                    ? "Create the next session so players can join and get matched."
                    : "This club has nothing on the calendar yet. Check back soon."}
                </p>
                {admin ? (
                  <div className="ph-actions">
                    <Link
                      className="button"
                      href={`/dashboard/clubs/${club.slug}/events/new`}
                    >
                      <Plus aria-hidden="true" size={17} /> Create event
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className="ph-panel" aria-labelledby="club-contact-heading">
          <header className="ph-panel__head">
            <h2 id="club-contact-heading">Contact</h2>
            <Link href={`/clubs/${club.slug}/members`}>All members</Link>
          </header>
          <ClubContact
            clubId={club.id}
            clubSlug={club.slug}
            contact={club.contact_info}
            canEdit={role === "owner" || role === "organizer"}
          />
          {staff.length ? (
            <ul className="ph-list" aria-label="Club staff">
              {staff.slice(0, 4).map((member, index) => (
                <li key={member.playerId ?? `private-${index}`}>
                  <MemberRow member={member} detail={ROLE_LABEL[member.role]} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="ph-grid club-overview-grid">
        <section className="ph-panel" aria-labelledby="club-upcoming-heading">
          <header className="ph-panel__head">
            <h3 id="club-upcoming-heading">Coming up</h3>
            {/* The focus card already offers Create event when nothing is on. */}
            {admin && focus ? (
              <Link href={`/dashboard/clubs/${club.slug}/events/new`}>
                Create event
              </Link>
            ) : (
              <Link href={`/clubs/${club.slug}/schedule`}>Full schedule</Link>
            )}
          </header>
          {next.length ? (
            <ul className="ph-list">
              {next.map((event) => (
                <EventRow
                  key={event.id}
                  href={eventHref(event)}
                  name={event.name}
                  venue={event.venue}
                  startsAt={event.starts_at}
                  timezone={club.timezone}
                  badge={event.status === "draft" ? "Draft" : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="ph-empty">
              {focus
                ? "Nothing else on the calendar yet."
                : "No upcoming events."}
            </p>
          )}
        </section>

        <section className="ph-panel" aria-labelledby="club-glance-heading">
          <header className="ph-panel__head">
            <h3 id="club-glance-heading">At a glance</h3>
            <Link href={`/clubs/${club.slug}/rankings`}>Rankings</Link>
          </header>
          <dl className="club-stats">
            {directory ? (
              <div>
                <dt>Members</dt>
                <dd>{directory.length}</dd>
              </div>
            ) : null}
            <div>
              <dt>Events held</dt>
              <dd>{held}</dd>
            </div>
            <div>
              <dt>Ranked players</dt>
              <dd>{rankedPlayers ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
