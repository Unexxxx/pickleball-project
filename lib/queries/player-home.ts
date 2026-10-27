import "server-only";
import type { JoinedEvent } from "@/components/events/player-event-hub";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The player's current situation, most urgent first. Only real data. */
export type PlayStatus =
  | { kind: "on_court"; event: JoinedEvent; court: string | null }
  | { kind: "queued"; event: JoinedEvent; position: number }
  | { kind: "checked_in"; event: JoinedEvent }
  | { kind: "live_event"; event: JoinedEvent }
  | { kind: "upcoming"; event: JoinedEvent }
  | { kind: "idle" };

export type ListedEvent = {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  status: string;
  join_code: string;
  clubName: string;
  clubSlug: string;
  timezone: string;
};

const HOST_ROLES = ["owner", "organizer", "staff"] as const;

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export async function getJoinedEvents(supabase: Supabase, playerId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      "status,events!inner(id,name,venue,starts_at,ends_at,status,join_code,clubs(name,slug,timezone))",
    )
    .eq("player_id", playerId)
    .in("status", ["confirmed", "waitlisted"])
    .in("events.status", ["published", "registration_closed", "in_progress"]);
  const now = Date.now();
  const events: JoinedEvent[] = (data ?? [])
    .flatMap((row) => {
      const event = row.events;
      const club = one(event?.clubs);
      if (
        !event ||
        !club ||
        (event.status !== "in_progress" && Date.parse(event.ends_at) < now)
      )
        return [];
      return [
        {
          id: event.id,
          name: event.name,
          venue: event.venue,
          starts_at: event.starts_at,
          status: event.status,
          join_code: event.join_code,
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
  return { events, failed: Boolean(error) };
}

/**
 * Works out what the player can do right now from their registrations,
 * check-in, queue entry and match assignment. Queue position is the number of
 * ready entries ahead of the player plus one — the same figure the live queue
 * page shows. No wait estimate exists in the data, so none is returned.
 */
export async function getPlayStatus(
  supabase: Supabase,
  playerId: string,
  joined: JoinedEvent[],
): Promise<PlayStatus> {
  const live = joined.filter(
    (e) => e.status === "in_progress" && e.registration === "confirmed",
  );
  if (live.length) {
    const ids = live.map((e) => e.id);
    const [{ data: matches }, { data: entries }, { data: attendance }] =
      await Promise.all([
        supabase
          .from("matches")
          .select("event_id,court_id,match_participants!inner(player_id)")
          .eq("match_participants.player_id", playerId)
          .in("event_id", ids)
          .in("status", ["assigned", "playing"])
          .limit(1),
        supabase
          .from("event_queue_entries")
          .select("event_id,position_key")
          .eq("player_id", playerId)
          .eq("state", "ready")
          .in("event_id", ids)
          .limit(1),
        supabase
          .from("event_attendance")
          .select("event_id")
          .eq("player_id", playerId)
          .eq("state", "checked_in")
          .in("event_id", ids),
      ]);
    const byId = (id: string) => live.find((e) => e.id === id)!;
    const match = matches?.[0];
    if (match) {
      const { data: court } = await supabase
        .from("event_courts")
        .select("label")
        .eq("id", match.court_id)
        .maybeSingle();
      return {
        kind: "on_court",
        event: byId(match.event_id),
        court: court?.label ?? null,
      };
    }
    const entry = entries?.[0];
    if (entry) {
      const { count } = await supabase
        .from("event_queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("event_id", entry.event_id)
        .eq("state", "ready")
        .lt("position_key", entry.position_key);
      if (count !== null)
        return {
          kind: "queued",
          event: byId(entry.event_id),
          position: count + 1,
        };
    }
    const checkedIn = attendance?.[0];
    if (checkedIn)
      return { kind: "checked_in", event: byId(checkedIn.event_id) };
    return { kind: "live_event", event: live[0]! };
  }
  const next = joined.find((e) => e.status !== "in_progress");
  return next ? { kind: "upcoming", event: next } : { kind: "idle" };
}

/** Public URL of a club's profile picture (club-media bucket), or null. */
function clubImageUrl(supabase: Supabase, path: string | null) {
  return path
    ? supabase.storage.from("club-media").getPublicUrl(path).data.publicUrl
    : null;
}

export async function getMyClubs(supabase: Supabase, playerId: string) {
  const { data } = await supabase
    .from("club_memberships")
    .select("role,clubs(id,name,slug,profile_image_path)")
    .eq("player_id", playerId)
    .eq("status", "active");
  return (data ?? []).flatMap((row) => {
    const club = one(row.clubs);
    return club
      ? [
          {
            id: club.id,
            name: club.name,
            slug: club.slug,
            imageUrl: clubImageUrl(supabase, club.profile_image_path),
            role: row.role as string,
          },
        ]
      : [];
  });
}

export function hostedClubIds(clubs: { id: string; role: string }[]) {
  return clubs
    .filter((c) => (HOST_ROLES as readonly string[]).includes(c.role))
    .map((c) => c.id);
}

const LISTED_EVENT_COLUMNS =
  "id,name,venue,starts_at,ends_at,status,join_code,clubs(name,slug,timezone)";

function toListed(
  rows:
    | {
        id: string;
        name: string;
        venue: string;
        starts_at: string;
        ends_at: string;
        status: string;
        join_code: string;
        clubs: unknown;
      }[]
    | null,
): ListedEvent[] {
  return (rows ?? []).flatMap((row) => {
    const club = one(
      row.clubs as
        | { name: string; slug: string; timezone: string }
        | { name: string; slug: string; timezone: string }[]
        | null,
    );
    return club
      ? [
          {
            id: row.id,
            name: row.name,
            venue: row.venue,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            status: row.status,
            join_code: row.join_code,
            clubName: club.name,
            clubSlug: club.slug,
            timezone: club.timezone,
          },
        ]
      : [];
  });
}

export async function getUpcomingPublicEvents(supabase: Supabase, limit = 24) {
  const { data, error } = await supabase
    .from("events")
    .select(LISTED_EVENT_COLUMNS)
    .eq("status", "published")
    .eq("is_private", false)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  return { events: toListed(data), failed: Boolean(error) };
}

export async function getLivePublicEvents(supabase: Supabase, limit = 6) {
  const { data, error } = await supabase
    .from("events")
    .select(LISTED_EVENT_COLUMNS)
    .eq("status", "in_progress")
    .eq("is_private", false)
    .order("starts_at", { ascending: true })
    .limit(limit);
  return { events: toListed(data), failed: Boolean(error) };
}

export async function getHostedEvents(supabase: Supabase, clubIds: string[]) {
  if (!clubIds.length) return { events: [], failed: false };
  const { data, error } = await supabase
    .from("events")
    .select(LISTED_EVENT_COLUMNS)
    .in("club_id", clubIds)
    .in("status", ["draft", "published", "registration_closed", "in_progress"])
    .order("starts_at", { ascending: true })
    .limit(24);
  const now = Date.now();
  return {
    events: toListed(data).filter(
      (e) =>
        e.status === "in_progress" ||
        e.status === "draft" ||
        Date.parse(e.ends_at) >= now,
    ),
    failed: Boolean(error),
  };
}

export async function getClubsToDiscover(
  supabase: Supabase,
  excludeIds: string[],
  limit = 4,
) {
  let query = supabase
    .from("clubs")
    .select("id,name,slug,profile_image_path")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (excludeIds.length)
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  const { data } = await query;
  return (data ?? []).map((club) => ({
    id: club.id,
    name: club.name,
    slug: club.slug,
    imageUrl: clubImageUrl(supabase, club.profile_image_path),
  }));
}
