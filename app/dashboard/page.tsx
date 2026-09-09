import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Trophy,
  UserRound,
  Users,
  History,
  Radio,
  Search,
} from "lucide-react";
import { ClubForm } from "@/components/clubs/club-form";
import { ClubSwitcher } from "@/components/clubs/club-switcher";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { currentPlayerId } from "@/lib/auth/authorization";
import {
  PlayerEventHub,
  type JoinedEvent,
} from "@/components/events/player-event-hub";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; view?: string }>;
}) {
  await requireUser();
  const supabase = await createClient();
  const params = await searchParams;
  const input = params.q;
  const view = ["live", "discover", "clubs", "search"].includes(
    params.view ?? "",
  )
    ? params.view
    : "joined";
  const q = (typeof input === "string" ? input : "").trim().slice(0, 80);
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const playerId = await currentPlayerId();
  const { data: profile } = playerId
    ? await supabase
        .from("players")
        .select("display_name,public_slug")
        .eq("id", playerId)
        .maybeSingle()
    : { data: null };
  const joined = playerId
    ? await supabase
        .from("event_registrations")
        .select(
          "status,events!inner(id,name,venue,starts_at,ends_at,status,join_code,clubs(name,slug,timezone))",
        )
        .eq("player_id", playerId)
        .in("status", ["confirmed", "waitlisted"])
        .in("events.status", [
          "published",
          "registration_closed",
          "in_progress",
        ])
    : null;
  const joinedEvents: JoinedEvent[] = (joined?.data ?? [])
    .flatMap((row) => {
      const event = row.events;
      const club = event?.clubs;
      if (
        !event ||
        !club ||
        (event.status !== "in_progress" &&
          new Date(event.ends_at).getTime() < new Date().getTime())
      )
        return [];
      return [
        {
          ...event,
          clubSlug: club.slug,
          clubName: club.name,
          timezone: club.timezone,
          registration: row.status,
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.status === "in_progress") -
          Number(a.status === "in_progress") ||
        Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
  const results =
    q.length >= 2
      ? await Promise.all([
          supabase
            .from("public_player_profiles")
            .select("player_id,display_name,public_slug")
            .ilike("display_name", pattern)
            .order("display_name")
            .limit(12),
          supabase
            .from("clubs")
            .select("id,name,slug")
            .ilike("name", pattern)
            .order("name")
            .limit(12),
          supabase
            .from("events")
            .select("id,name,join_code,status")
            .eq("is_private", false)
            .in("status", ["published", "registration_closed", "in_progress"])
            .ilike("name", pattern)
            .order("starts_at")
            .limit(12),
        ])
      : null;
  const { data: events } = await supabase
    .from("events")
    .select(
      "id,club_id,name,venue,starts_at,status,record_class,join_code,is_private,clubs(name,slug)",
    )
    .eq("status", "published")
    .eq("is_private", false)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(24);

  return (
    <main className="player-dashboard courtside-dashboard">
      <header className="player-dashboard-welcome">
        <Link
          className="dashboard-avatar"
          href="/dashboard/profile"
          aria-label="My profile"
        >
          {profile?.display_name?.slice(0, 1).toUpperCase() || (
            <UserRound size={24} />
          )}
        </Link>
        <div>
          <p className="eyebrow">Your player hub</p>
          <h1>Hi, {profile?.display_name?.split(" ")[0] || "player"}</h1>
          <p>Play together. Find your next match.</p>
        </div>
        <Link
          className="dashboard-search-shortcut"
          href="/dashboard?view=search#search-heading"
          aria-label="Search people, clubs and events"
        >
          <Search size={22} />
        </Link>
      </header>
      {!q && view === "joined" && (
        <section className="courtside-focus" aria-labelledby="focus-heading">
          <div className="courtside-focus-copy">
            <p className="courtside-kicker">
              {joinedEvents[0]?.status === "in_progress"
                ? "The courts are live"
                : joinedEvents.length
                  ? "Coming up for you"
                  : "Your next chapter"}
            </p>
            <h2 id="focus-heading">
              {joinedEvents[0]?.name ?? "Good games start with showing up."}
            </h2>
            <p>
              {joinedEvents[0]
                ? `${joinedEvents[0].clubName} · ${joinedEvents[0].venue}`
                : "Find your people, join an event, and let your game do the talking."}
            </p>
            <Link
              className="button"
              href={
                joinedEvents[0]
                  ? joinedEvents[0].status === "in_progress" &&
                    joinedEvents[0].registration === "confirmed"
                    ? `/dashboard/clubs/${joinedEvents[0].clubSlug}/events/${joinedEvents[0].id}/queue`
                    : `/join/${joinedEvents[0].join_code}`
                  : "/dashboard?view=discover"
              }
            >
              {joinedEvents[0]
                ? joinedEvents[0].status === "in_progress" &&
                  joinedEvents[0].registration === "confirmed"
                  ? "Follow the live queue"
                  : "View your event"
                : "Find a game"}
            </Link>
          </div>
          <div className="courtside-court" aria-hidden="true">
            <span />
          </div>
        </section>
      )}
      <nav className="courtside-links" aria-label="Quick access">
        {[
          { label: "My events", href: "/dashboard", icon: CalendarDays },
          { label: "Live queue", href: "/dashboard?view=live", icon: Radio },
          { label: "Rankings", href: "/leaderboards", icon: Trophy },
          { label: "My clubs", href: "/dashboard?view=clubs", icon: Users },
          {
            label: "My history",
            href: profile?.public_slug
              ? `/players/${profile.public_slug}#recent-matches-title`
              : "/dashboard/profile",
            icon: History,
          },
          { label: "My profile", href: "/dashboard/profile", icon: UserRound },
        ].map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Icon size={24} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <nav className="dashboard-sections" aria-label="Dashboard sections">
        {[
          ["joined", "Joined"],
          ["live", "Live now"],
          ["discover", "Discover"],
          ["clubs", "My clubs"],
          ["search", "Search"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/dashboard?view=${key}`}
            aria-current={view === key && !q ? "page" : undefined}
          >
            {label}
            {key === "live" &&
            joinedEvents.some((e) => e.status === "in_progress") ? (
              <span className="dashboard-live-count">
                {joinedEvents.filter((e) => e.status === "in_progress").length}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {(view === "search" || q) && (
        <section className="player-hub" aria-labelledby="search-heading">
          <h2 id="search-heading">Find your community</h2>
          <form
            action="/dashboard"
            method="get"
            className="hub-search"
            role="search"
          >
            <input type="hidden" name="view" value="search" />
            <label htmlFor="hub-query">
              Search people, clubs, and events by name
            </label>
            <div>
              <input
                id="hub-query"
                name="q"
                type="search"
                defaultValue={q}
                minLength={2}
                maxLength={80}
                placeholder="Enter a name…"
              />
              <button type="submit">Search</button>
              {q && <Link href="/dashboard?view=search">Clear</Link>}
            </div>
          </form>
          {q && q.length < 2 && <p>Enter at least two characters to search.</p>}
          {results && (
            <div className="hub-search-results" aria-label="Search results">
              {[
                {
                  title: "People",
                  error: results[0].error,
                  items: (results[0].data ?? [])
                    .filter((p) => p.public_slug)
                    .map((p) => ({
                      id: p.player_id!,
                      name: p.display_name!,
                      href: `/players/${p.public_slug}`,
                    })),
                },
                {
                  title: "Clubs",
                  error: results[1].error,
                  items: (results[1].data ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    href: `/clubs/${c.slug}`,
                  })),
                },
                {
                  title: "Events",
                  error: results[2].error,
                  items: (results[2].data ?? []).map((e) => ({
                    id: e.id,
                    name: e.name,
                    href: `/join/${e.join_code}`,
                  })),
                },
              ].map((group) => (
                <section key={group.title}>
                  <h3>{group.title}</h3>
                  {group.error ? (
                    <p role="alert">Unable to load results. Try again.</p>
                  ) : group.items.length ? (
                    <ul>
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <Link href={item.href}>{item.name}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No matching {group.title.toLowerCase()}.</p>
                  )}
                  {group.items.length === 12 && (
                    <p>
                      Showing the first 12 results. Refine your search for more
                      specific results.
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>
      )}
      {!q && (view === "joined" || view === "live") && (
        <PlayerEventHub
          events={
            view === "live"
              ? joinedEvents.filter((e) => e.status === "in_progress")
              : joinedEvents
          }
          liveOnly={view === "live"}
          failed={Boolean(joined?.error) || !playerId}
        />
      )}

      {!q && view === "discover" && (
        <section aria-labelledby="events-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Open to all players</p>
              <h2 id="events-heading">Upcoming public events</h2>
            </div>
          </div>
          {events?.length ? (
            <div className="event-grid">
              {events.map((event) => {
                const club = Array.isArray(event.clubs)
                  ? event.clubs[0]
                  : event.clubs;
                const start = new Date(event.starts_at);
                return club ? (
                  <article className="event-card" key={event.id}>
                    <div className="event-card__date">
                      <span>
                        {start.toLocaleDateString(undefined, {
                          month: "short",
                        })}
                      </span>
                      <strong>{start.getDate()}</strong>
                    </div>
                    <div className="event-card__content">
                      <div className="event-card__badges">
                        <span>{club.name}</span>
                        <span>{event.record_class}</span>
                      </div>
                      <h2>
                        <Link href={`/join/${event.join_code}`}>
                          {event.name}
                        </Link>
                      </h2>
                      <p>{event.venue}</p>
                      <p>
                        {start.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </article>
                ) : null;
              })}
            </div>
          ) : (
            <div className="empty-state">
              <CalendarDays aria-hidden="true" size={30} />
              <h3>No public events coming up</h3>
              <p>Check back soon or open an invitation from a club.</p>
            </div>
          )}
        </section>
      )}

      {!q && view === "clubs" && (
        <section className="dashboard-clubs" aria-labelledby="clubs-heading">
          <div>
            <p className="eyebrow">Your organizations</p>
            <h2 id="clubs-heading">Clubs</h2>
            <ClubSwitcher />
            <details className="create-club-panel">
              <summary>
                <Plus aria-hidden="true" size={16} /> Create a club
              </summary>
              <div>
                <ClubForm />
              </div>
            </details>
          </div>
        </section>
      )}
    </main>
  );
}
