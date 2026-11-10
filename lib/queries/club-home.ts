import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  currentPlayerId,
  viewerClubRole,
  type ClubRole,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

/** Roles that run a club (owners and admins): shown as "Club staff" and see
 * management tools. Admins are stored as "organizer"; staff is retired. */
export const CLUB_ADMIN_ROLES: ClubRole[] = ["owner", "organizer", "staff"];
/** Roles that may use the live event workspace. */
export const WORKSPACE_ROLES: ClubRole[] = [
  ...CLUB_ADMIN_ROLES,
  "score_official",
];

export const ROLE_LABEL: Record<ClubRole, string> = {
  owner: "Owner",
  organizer: "Admin",
  // Retired roles (the database no longer allows them).
  staff: "Admin",
  score_official: "Member",
  member: "Member",
};

export const isClubAdmin = (role: ClubRole | null) =>
  role !== null && CLUB_ADMIN_ROLES.includes(role);

export type ClubHome = NonNullable<Awaited<ReturnType<typeof getClubHome>>>;

/** Public club identity. Cached per request so layout and page share it. */
export const getClubHome = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id,name,slug,timezone,contact_info,profile_image_path,background_image_path",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!club) return null;
  const { data: policy } = await supabase
    .from("clubs")
    .select("join_policy")
    .eq("id", club.id)
    .maybeSingle();
  // Read separately so the page still renders where the structured-contacts
  // migration hasn't been applied yet (the legacy contact line shows then).
  const { data: contacts, error: contactsError } = await supabase
    .from("clubs")
    .select("contact_email,contact_facebook,contact_phone")
    .eq("id", club.id)
    .maybeSingle();
  const media = (path: string | null) =>
    path
      ? supabase.storage.from("club-media").getPublicUrl(path).data.publicUrl
      : null;
  return {
    ...club,
    joinPolicy: (policy?.join_policy ?? null) as "open" | "approval" | null,
    contacts:
      contactsError || !contacts
        ? null
        : {
            email: contacts.contact_email,
            facebook: contacts.contact_facebook,
            phone: contacts.contact_phone,
          },
    profileImageUrl: media(club.profile_image_path),
    backgroundImageUrl: media(club.background_image_path),
  };
});

export const getViewerRole = cache((clubId: string) => viewerClubRole(clubId));

export type ViewerMembership = {
  signedIn: boolean;
  status: "active" | "invited" | "requested" | "suspended" | "left" | null;
  role: ClubRole | null;
};

/** The viewer's own membership in any status (players may read their own). */
export const getViewerMembership = cache(
  async (clubId: string): Promise<ViewerMembership> => {
    const playerId = await currentPlayerId();
    if (!playerId) return { signedIn: false, status: null, role: null };
    const supabase = await createClient();
    const { data } = await supabase
      .from("club_memberships")
      .select("role,status")
      .eq("club_id", clubId)
      .eq("player_id", playerId)
      .maybeSingle();
    return {
      signedIn: true,
      status: (data?.status as ViewerMembership["status"]) ?? null,
      role: (data?.role as ClubRole | undefined) ?? null,
    };
  },
);

export type RosterEntry = {
  membershipId: string;
  playerId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: ClubRole;
  status: string;
  since: string;
};

/**
 * Server-side gate for club management pages. Hiding a button is never the
 * permission check; non-staff get a 404 so the page's existence isn't leaked.
 */
export async function requireClubAccess(
  slug: string,
  roles: ClubRole[] = CLUB_ADMIN_ROLES,
) {
  const club = await getClubHome(slug);
  if (!club) notFound();
  const role = await getViewerRole(club.id);
  if (!role || !roles.includes(role)) notFound();
  return { club, role };
}

export type DirectoryEntry = {
  playerId: string | null;
  name: string | null;
  slug: string | null;
  avatarUrl: string | null;
  role: ClubRole;
  joinedAt: string;
};

/** Active members, leads first. Null when the directory can't be read. */
export const getClubDirectory = cache(
  async (clubId: string): Promise<DirectoryEntry[] | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("club_member_directory", {
      p_club_id: clubId,
    });
    if (error) return null;
    return (data ?? []).map((row) => ({
      playerId: row.player_id,
      name: row.display_name,
      slug: row.public_slug,
      avatarUrl: row.avatar_path
        ? supabase.storage.from("avatars").getPublicUrl(row.avatar_path).data
            .publicUrl
        : null,
      role: row.role as ClubRole,
      joinedAt: row.joined_at,
    }));
  },
);

export type ClubScheduleEvent = {
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

/**
 * The club's events. Visitors see published (private included — joining
 * those takes the passcode) and completed ones; club staff also see drafts
 * and canceled events.
 */
export const getClubEvents = cache(
  async (clubId: string, staff: boolean): Promise<ClubScheduleEvent[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("events")
      .select(
        "id,name,venue,starts_at,ends_at,status,record_class,join_code,is_private",
      )
      .eq("club_id", clubId)
      .order("starts_at", { ascending: true });
    if (!staff) query = query.not("status", "in", "(draft,canceled)");
    const { data } = await query;
    return data ?? [];
  },
);

export function splitSchedule(events: ClubScheduleEvent[]) {
  const now = Date.now();
  const live = events.filter((e) => e.status === "in_progress");
  const upcoming = events.filter(
    (e) =>
      e.status !== "in_progress" &&
      e.status !== "completed" &&
      e.status !== "canceled" &&
      Date.parse(e.ends_at) >= now,
  );
  const past = events
    .filter((e) => !live.includes(e) && !upcoming.includes(e))
    .reverse();
  return { live, upcoming, past };
}

/** Members load this many at a time ("Show more"). */
export const MEMBER_PAGE_SIZE = 30;

/** Where the next page starts: the last row's name and id. */
export type MemberCursor = { name: string; id: string };

export type MemberPage<T> = { items: T[]; total: number; hasMore: boolean };

/** How many are in the club, and how many regular members are private. */
export const getClubMemberCounts = cache(
  async (
    clubId: string,
  ): Promise<{ members: number; privateMembers: number } | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("club_member_counts", {
      p_club_id: clubId,
    });
    if (error?.code === MISSING_FUNCTION) return countsFallback(clubId);
    const row = data?.[0];
    if (error || !row) return null;
    return { members: row.members, privateMembers: row.private_members };
  },
);

type Supabase = Awaited<ReturnType<typeof createClient>>;
const avatarUrl = (supabase: Supabase, path: string | null) =>
  path
    ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
    : null;

/**
 * One page of the public member list. 'staff' is the owners and admins
 * (private ones unnamed); 'members' is everyone else with a public profile.
 * Asks for one extra row to know whether there's more.
 */
export async function getMemberPage(
  clubId: string,
  scope: "staff" | "members",
  query = "",
  after: MemberCursor | null = null,
): Promise<MemberPage<DirectoryEntry> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("club_member_page", {
    p_club_id: clubId,
    p_scope: scope,
    p_query: query || undefined,
    p_after_name: after?.name,
    p_after_id: after?.id,
    p_limit: MEMBER_PAGE_SIZE + 1,
  });
  if (error?.code === MISSING_FUNCTION)
    return memberPageFallback(clubId, scope, query, after);
  if (error || !data) return null;
  return {
    items: data.slice(0, MEMBER_PAGE_SIZE).map((row) => ({
      playerId: row.player_id,
      name: row.display_name,
      slug: row.public_slug,
      avatarUrl: avatarUrl(supabase, row.avatar_path),
      role: row.role as ClubRole,
      joinedAt: row.joined_at,
    })),
    total: Number(data[0]?.total ?? 0),
    hasMore: data.length > MEMBER_PAGE_SIZE,
  };
}

/**
 * One page of the owners' and admins' roster: 'staff', 'members' (private
 * profiles included) or 'requests'. Null when the viewer isn't allowed.
 */
export async function getRosterPage(
  clubId: string,
  scope: "staff" | "members" | "requests",
  query = "",
  after: MemberCursor | null = null,
): Promise<MemberPage<RosterEntry> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("club_roster_page", {
    p_club_id: clubId,
    p_scope: scope,
    p_query: query || undefined,
    p_after_name: after?.name,
    p_after_id: after?.id,
    p_limit: MEMBER_PAGE_SIZE + 1,
  });
  if (error?.code === MISSING_FUNCTION)
    return rosterPageFallback(supabase, clubId, scope, query, after);
  if (error || !data) return null;
  return {
    items: data.slice(0, MEMBER_PAGE_SIZE).map((row) => ({
      membershipId: row.membership_id,
      playerId: row.player_id,
      name: row.display_name,
      slug: row.public_slug,
      avatarUrl: avatarUrl(supabase, row.avatar_path),
      role: row.role as ClubRole,
      status: row.status,
      since: row.since,
    })),
    total: Number(data[0]?.total ?? 0),
    hasMore: data.length > MEMBER_PAGE_SIZE,
  };
}

// Until the paged functions are deployed (local dev against the hosted
// database, or the moment between a deploy and its migration), page the
// older full lists here instead, with the same order and cursors.
const MISSING_FUNCTION = "PGRST202";

const byName = (a: MemberCursor, b: MemberCursor) => {
  const x = a.name.toLowerCase();
  const y = b.name.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

function pageOf<T>(
  rows: T[],
  key: (row: T) => MemberCursor,
  query: string,
  after: MemberCursor | null,
): MemberPage<T> {
  const q = query.toLowerCase();
  const matches = rows
    .filter((row) => !q || key(row).name.toLowerCase().includes(q))
    .sort((a, b) => byName(key(a), key(b)));
  const rest = after
    ? matches.filter((row) => byName(key(row), after) > 0)
    : matches;
  return {
    items: rest.slice(0, MEMBER_PAGE_SIZE),
    total: matches.length,
    hasMore: rest.length > MEMBER_PAGE_SIZE,
  };
}

async function countsFallback(clubId: string) {
  const directory = await getClubDirectory(clubId);
  if (!directory) return null;
  return {
    members: directory.length,
    privateMembers: directory.filter(
      (m) => !CLUB_ADMIN_ROLES.includes(m.role) && !m.playerId,
    ).length,
  };
}

async function memberPageFallback(
  clubId: string,
  scope: "staff" | "members",
  query: string,
  after: MemberCursor | null,
): Promise<MemberPage<DirectoryEntry> | null> {
  const directory = await getClubDirectory(clubId);
  if (!directory) return null;
  if (scope === "staff") {
    const staff = directory.filter((m) => CLUB_ADMIN_ROLES.includes(m.role));
    return { items: staff, total: staff.length, hasMore: false };
  }
  return pageOf(
    directory.filter((m) => !CLUB_ADMIN_ROLES.includes(m.role) && m.playerId),
    (m) => ({ name: m.name ?? "", id: m.playerId ?? "" }),
    query,
    after,
  );
}

async function rosterPageFallback(
  supabase: Supabase,
  clubId: string,
  scope: "staff" | "members" | "requests",
  query: string,
  after: MemberCursor | null,
): Promise<MemberPage<RosterEntry> | null> {
  const { data, error } = await supabase.rpc("club_staff_roster", {
    p_club_id: clubId,
  });
  if (error || !data) return null;
  const rows: RosterEntry[] = data.map((row) => ({
    membershipId: row.membership_id,
    playerId: row.player_id,
    name: row.display_name,
    slug: row.public_slug,
    avatarUrl: avatarUrl(supabase, row.avatar_path),
    role: row.role as ClubRole,
    status: row.status,
    since: row.since,
  }));
  const admin = (m: RosterEntry) => CLUB_ADMIN_ROLES.includes(m.role);
  if (scope === "staff") {
    const staff = rows
      .filter((m) => m.status === "active" && admin(m))
      .sort(
        (a, b) =>
          Number(b.role === "owner") - Number(a.role === "owner") ||
          byName(
            { name: a.name, id: a.membershipId },
            { name: b.name, id: b.membershipId },
          ),
      );
    return { items: staff, total: staff.length, hasMore: false };
  }
  return pageOf(
    rows.filter((m) =>
      scope === "requests"
        ? m.status === "requested"
        : m.status === "active" && !admin(m),
    ),
    (m) => ({ name: m.name, id: m.membershipId }),
    query,
    after,
  );
}
