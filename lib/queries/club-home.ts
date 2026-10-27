import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  currentPlayerId,
  viewerClubRole,
  type ClubRole,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

/** Roles that run a club: shown as "Club staff" and see management tools. */
export const CLUB_ADMIN_ROLES: ClubRole[] = ["owner", "organizer", "staff"];
/** Roles that may use the live event workspace (score officials score). */
export const WORKSPACE_ROLES: ClubRole[] = [
  ...CLUB_ADMIN_ROLES,
  "score_official",
];

export const ROLE_LABEL: Record<ClubRole, string> = {
  owner: "Owner",
  organizer: "Organizer",
  staff: "Staff",
  score_official: "Score official",
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

/** Staff-only roster (pending requests + members). Null if not allowed. */
export const getStaffRoster = cache(
  async (clubId: string): Promise<RosterEntry[] | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("club_staff_roster", {
      p_club_id: clubId,
    });
    if (error) return null;
    return (data ?? []).map((row) => ({
      membershipId: row.membership_id,
      playerId: row.player_id,
      name: row.display_name,
      slug: row.public_slug,
      avatarUrl: row.avatar_path
        ? supabase.storage.from("avatars").getPublicUrl(row.avatar_path).data
            .publicUrl
        : null,
      role: row.role as ClubRole,
      status: row.status,
      since: row.since,
    }));
  },
);

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
 * The club's events. Visitors see published, non-private events and
 * completed ones; club staff also see drafts, private and canceled events.
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
    if (!staff)
      query = query
        .eq("is_private", false)
        .not("status", "in", "(draft,canceled)");
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
