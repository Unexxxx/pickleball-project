import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy } from "lucide-react";
import { ClubAvatar } from "@/components/clubs/club-avatar";
import { EventRow } from "@/components/dashboard/event-row";
import { PlayHero } from "@/components/dashboard/play-hero";
import { currentPlayerId } from "@/lib/auth/authorization";
import { requireUser } from "@/lib/auth/session";
import {
  getClubsToDiscover,
  getHostedEvents,
  getJoinedEvents,
  getLivePublicEvents,
  getMyClubs,
  getPlayStatus,
  getUpcomingPublicEvents,
  hostedClubIds,
} from "@/lib/queries/player-home";
import { createClient } from "@/lib/supabase/server";

// Links from before the navigation overhaul pointed at ?view=… tabs here.
const LEGACY_VIEWS: Record<string, string> = {
  live: "/dashboard#live-now",
  discover: "/dashboard/events?tab=discover",
  clubs: "/dashboard/clubs",
  search: "/dashboard/search",
  joined: "/dashboard/events",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  if (params.q) redirect(`/dashboard/search?q=${encodeURIComponent(params.q)}`);
  const legacy = params.view ? LEGACY_VIEWS[params.view] : undefined;
  if (legacy) redirect(legacy);

  const supabase = await createClient();
  const playerId = await currentPlayerId();
  if (!playerId)
    return (
      <main className="ph">
        <p role="alert">
          Your player profile could not be loaded. Please refresh and try again.
        </p>
      </main>
    );

  const [
    { data: profile },
    joined,
    myClubs,
    live,
    upcoming,
    { data: stats },
    { data: ranking },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("display_name,public_slug")
      .eq("id", playerId)
      .maybeSingle(),
    getJoinedEvents(supabase, playerId),
    getMyClubs(supabase, playerId),
    getLivePublicEvents(supabase, 4),
    getUpcomingPublicEvents(supabase, 8),
    supabase
      .from("public_player_statistics")
      .select("rating,wins,losses")
      .eq("player_id", playerId)
      .maybeSingle(),
    supabase
      .from("public_leaderboards")
      .select("rank,rating")
      .eq("scope", "overall")
      .eq("player_id", playerId)
      .maybeSingle(),
  ]);
  const [status, hosted, discoverClubs] = await Promise.all([
    getPlayStatus(supabase, playerId, joined.events),
    getHostedEvents(supabase, hostedClubIds(myClubs)),
    getClubsToDiscover(
      supabase,
      myClubs.map((c) => c.id),
      3,
    ),
  ]);

  const heroEventId = status.kind === "idle" ? null : status.event.id;
  const comingUp = joined.events.filter((e) => e.id !== heroEventId);
  const joinedIds = new Set(joined.events.map((e) => e.id));
  const openEvents = upcoming.events
    .filter((e) => !joinedIds.has(e.id))
    .slice(0, 4);
  const firstName = profile?.display_name?.split(" ")[0] || "player";

  return (
    <main className="ph">
      <h1 className="ph-greeting">Hi, {firstName}</h1>

      <div className="ph-top">
        <PlayHero status={status} hasLiveSessions={live.events.length > 0} />

        <section className="ph-panel" aria-labelledby="coming-up-heading">
          <header className="ph-panel__head">
            <h2 id="coming-up-heading">Coming up</h2>
            <Link href="/dashboard/events">All events</Link>
          </header>
          {joined.failed ? (
            <p role="alert">Your events could not be loaded.</p>
          ) : comingUp.length ? (
            <ul className="ph-list">
              {comingUp.slice(0, 4).map((event) => (
                <EventRow
                  key={event.id}
                  href={`/join/${event.join_code}`}
                  name={event.name}
                  clubName={event.clubName}
                  venue={event.venue}
                  startsAt={event.starts_at}
                  timezone={event.timezone}
                  live={event.status === "in_progress"}
                  badge={
                    event.registration === "waitlisted" ? "Waitlist" : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="ph-empty">
              {heroEventId
                ? "Nothing else booked yet."
                : "Nothing booked yet. Events you join appear here."}
            </p>
          )}
          {hosted.events.length > 0 && (
            <Link className="ph-hosting" href="/dashboard/events?tab=hosting">
              <span>
                Hosting{" "}
                <strong>
                  {hosted.events.length}{" "}
                  {hosted.events.length === 1 ? "event" : "events"}
                </strong>
              </span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          )}
        </section>
      </div>

      <section className="ph-connect" aria-labelledby="connect-heading">
        <header className="ph-section-head">
          <div>
            <h2 id="connect-heading">Connect &amp; compete</h2>
            <p>Sessions, events and clubs open to every player.</p>
          </div>
          <Link className="ph-standing" href="/dashboard/profile">
            <Trophy aria-hidden="true" size={18} />
            <span>
              <strong>{ranking?.rank ? `#${ranking.rank}` : "Unranked"}</strong>
              <small>
                {Number(ranking?.rating ?? stats?.rating ?? 1500).toFixed(0)}{" "}
                rating · {stats?.wins ?? 0}–{stats?.losses ?? 0}
              </small>
            </span>
          </Link>
        </header>

        <div className="ph-grid">
          <section
            className="ph-panel"
            id="live-now"
            aria-labelledby="live-heading"
          >
            <header className="ph-panel__head">
              <h3 id="live-heading">Live now</h3>
            </header>
            <p className="ph-panel__hint">
              Public sessions playing right now. Open one to watch or join.
            </p>
            {live.failed ? (
              <p role="alert">Live sessions could not be loaded.</p>
            ) : live.events.length ? (
              <ul className="ph-list">
                {live.events.map((event) => (
                  <EventRow
                    key={event.id}
                    href={`/join/${event.join_code}`}
                    name={event.name}
                    clubName={event.clubName}
                    venue={event.venue}
                    startsAt={event.starts_at}
                    timezone={event.timezone}
                    live
                  />
                ))}
              </ul>
            ) : (
              <p className="ph-empty">No public sessions are live right now.</p>
            )}
          </section>

          <section className="ph-panel" aria-labelledby="open-heading">
            <header className="ph-panel__head">
              <h3 id="open-heading">Upcoming events</h3>
              <Link href="/dashboard/events?tab=discover">Browse</Link>
            </header>
            <p className="ph-panel__hint">
              Public events from every club, soonest first.
            </p>
            {upcoming.failed ? (
              <p role="alert">Events could not be loaded.</p>
            ) : openEvents.length ? (
              <ul className="ph-list">
                {openEvents.map((event) => (
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
              <p className="ph-empty">No public events are scheduled yet.</p>
            )}
          </section>

          <section className="ph-panel" aria-labelledby="clubs-heading">
            <header className="ph-panel__head">
              <h3 id="clubs-heading">Clubs</h3>
              <Link href="/dashboard/clubs">All clubs</Link>
            </header>
            {myClubs.length > 0 && (
              <ul className="ph-chips" aria-label="Your clubs">
                {myClubs.slice(0, 4).map((club) => (
                  <li key={club.id}>
                    <Link href={`/clubs/${club.slug}`}>{club.name}</Link>
                  </li>
                ))}
              </ul>
            )}
            {discoverClubs.length ? (
              <p className="ph-panel__hint">
                {myClubs.length
                  ? "More clubs to explore"
                  : "Join a club to play its events and climb its rankings."}
              </p>
            ) : null}
            {discoverClubs.length ? (
              <ul className="ph-list">
                {discoverClubs.map((club) => (
                  <li key={club.id}>
                    <Link
                      className="ph-row ph-row--club"
                      href={`/clubs/${club.slug}`}
                    >
                      <ClubAvatar name={club.name} imageUrl={club.imageUrl} />
                      <span className="ph-row__body">
                        <strong>{club.name}</strong>
                        <span>View club</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ph-panel__hint">
                You&apos;re a member of every club on UNEX so far.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
