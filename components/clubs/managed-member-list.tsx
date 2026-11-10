"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { MemberMenu, type MenuRole } from "@/components/clubs/member-menu";
import { MemberRow } from "@/components/clubs/member-row";
import { ToastMessage } from "@/components/ui/toast-message";
import { changeMemberRole, removeMember } from "@/lib/actions/clubs";
import type { ClubRole } from "@/lib/auth/authorization";
import type { RosterEntry } from "@/lib/queries/club-home";

const ADMINS: ClubRole[] = ["owner", "organizer", "staff"];
const ROLE: Record<ClubRole, string> = {
  owner: "Owner",
  organizer: "Admin",
  // Retired roles (the database no longer allows them).
  staff: "Admin",
  score_official: "Member",
  member: "Member",
};
const joined = (iso: string) =>
  `Joined ${new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

/**
 * The owner/admin view of a member list (Club staff or Members): each row
 * has a menu to make the member an admin or a member, or remove them.
 * Players see MemberList.
 */
export function ManagedMemberList({
  clubId,
  clubSlug,
  members,
  viewerRole,
  viewerPlayerId,
  detail,
}: {
  clubId: string;
  clubSlug: string;
  members: RosterEntry[];
  viewerRole: ClubRole;
  viewerPlayerId: string | null;
  detail: "role" | "joined";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const dismiss = useCallback(() => setMessage(""), []);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? members.filter((m) => m.name.toLowerCase().includes(q))
      : members;
  }, [members, query]);

  async function run(
    id: string,
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    setBusyId(id);
    const result = await action();
    setBusyId(null);
    if (!result.ok) setMessage(result.error?.message ?? "Please try again.");
    else router.refresh();
  }

  const isOwner = viewerRole === "owner";
  return (
    <>
      {members.length > 6 ? (
        <label className="member-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search members</span>
          <input
            type="search"
            placeholder="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}
      {shown.length ? (
        <ul className="ph-list member-grid">
          {shown.map((m) => {
            const self = m.playerId === viewerPlayerId;
            // Owners make members admins and back; removing an admin takes
            // an owner. Nobody manages themselves or an owner here.
            const canChangeRole = !self && isOwner && m.role !== "owner";
            const canRemove =
              !self &&
              m.role !== "owner" &&
              (isOwner || !ADMINS.includes(m.role));
            return (
              <li key={m.membershipId} className="club-admin__row">
                <MemberRow
                  member={{
                    playerId: m.playerId,
                    name: m.name,
                    slug: m.slug,
                    avatarUrl: m.avatarUrl,
                    role: m.role,
                    joinedAt: m.since,
                  }}
                  detail={detail === "role" ? ROLE[m.role] : joined(m.since)}
                />
                {canChangeRole || canRemove ? (
                  <MemberMenu
                    name={m.name}
                    role={m.role}
                    canChangeRole={canChangeRole}
                    canRemove={canRemove}
                    busy={busyId === m.membershipId}
                    onChangeRole={(role: MenuRole) =>
                      run(m.membershipId, () =>
                        changeMemberRole({
                          clubId,
                          clubSlug,
                          membershipId: m.membershipId,
                          role,
                        }),
                      )
                    }
                    onRemove={() =>
                      run(m.membershipId, () =>
                        removeMember({
                          clubId,
                          clubSlug,
                          membershipId: m.membershipId,
                        }),
                      )
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ph-empty">
          {query ? `No members match “${query}”.` : "No members yet."}
        </p>
      )}
      <ToastMessage message={message} onDismiss={dismiss} />
    </>
  );
}
