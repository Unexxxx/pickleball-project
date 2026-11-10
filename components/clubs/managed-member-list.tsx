"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberMenu, type MenuRole } from "@/components/clubs/member-menu";
import { MemberRow } from "@/components/clubs/member-row";
import {
  MemberPagerFooter,
  MemberSearch,
  useMemberPages,
} from "@/components/clubs/member-pages";
import { ToastMessage } from "@/components/ui/toast-message";
import {
  changeMemberRole,
  loadRosterPage,
  removeMember,
  transferClubOwnership,
} from "@/lib/actions/clubs";
import type { ClubRole } from "@/lib/auth/authorization";
import type { MemberPage, RosterEntry } from "@/lib/queries/club-home";

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
  emptyText = "No members yet.",
}: {
  clubId: string;
  clubSlug: string;
  members: RosterEntry[];
  viewerRole: ClubRole;
  viewerPlayerId: string | null;
  detail: "role" | "joined";
  emptyText?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<"error" | "success">("error");
  const dismiss = useCallback(() => setMessage(""), []);

  async function run(
    id: string,
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    done?: string,
  ) {
    setBusyId(id);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setToast("error");
      setMessage(result.error?.message ?? "Please try again.");
      return;
    }
    if (done) {
      setToast("success");
      setMessage(done);
    }
    router.refresh();
  }

  const isOwner = viewerRole === "owner";
  return (
    <>
      {members.length ? (
        <ul className="ph-list member-grid">
          {members.map((m) => {
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
                    canTransfer={canChangeRole}
                    onTransfer={() =>
                      run(
                        m.membershipId,
                        () =>
                          transferClubOwnership({
                            clubId,
                            clubSlug,
                            membershipId: m.membershipId,
                          }),
                        `${m.name} is now the club owner.`,
                      )
                    }
                    busy={busyId === m.membershipId}
                    onChangeRole={(role: MenuRole) =>
                      run(
                        m.membershipId,
                        () =>
                          changeMemberRole({
                            clubId,
                            clubSlug,
                            membershipId: m.membershipId,
                            role,
                          }),
                        role === "organizer"
                          ? `${m.name} is now an admin.`
                          : `${m.name} is no longer an admin.`,
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
        <p className="ph-empty">{emptyText}</p>
      )}
      <ToastMessage message={message} onDismiss={dismiss} tone={toast} />
    </>
  );
}

/**
 * The owners' and admins' Members list for clubs of any size: 30 at a time
 * with Show more, and a search that covers the whole club.
 */
export function PagedManagedMemberList({
  initial,
  ...props
}: Omit<Parameters<typeof ManagedMemberList>[0], "members" | "emptyText"> & {
  initial: MemberPage<RosterEntry>;
}) {
  const pages = useMemberPages({
    initial,
    load: (query, after) =>
      loadRosterPage({ clubId: props.clubId, scope: "members", query, after }),
    cursorOf: (m) => ({ name: m.name, id: m.membershipId }),
  });
  return (
    <>
      {initial.total > 6 ? (
        <MemberSearch value={pages.query} onChange={pages.setQuery} />
      ) : null}
      <ManagedMemberList
        {...props}
        members={pages.items}
        emptyText={
          pages.searched
            ? `No members match “${pages.searched}”.`
            : "No members yet."
        }
      />
      <MemberPagerFooter
        shown={pages.items.length}
        total={pages.total}
        hasMore={pages.hasMore}
        loading={pages.loading}
        error={pages.error}
        onMore={pages.showMore}
      />
    </>
  );
}
