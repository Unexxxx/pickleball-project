"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserMinus, X } from "lucide-react";
import { MemberRow } from "@/components/clubs/member-row";
import { ToastMessage } from "@/components/ui/toast-message";
import {
  removeMember,
  reviewMembership,
  setJoinPolicy,
} from "@/lib/actions/clubs";
import type { RosterEntry } from "@/lib/queries/club-home";

const STAFF = ["owner", "organizer", "staff"];
const ROLE: Record<string, string> = {
  owner: "Owner",
  organizer: "Organizer",
  staff: "Staff",
  score_official: "Score official",
  member: "Member",
};
const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/**
 * Staff tools on the Members tab: join setting (owners/organizers), pending
 * requests to approve or decline, and removing members. Every action is
 * re-checked by the database; hidden buttons are not the permission check.
 */
export function ClubMembershipAdmin({
  clubId,
  clubSlug,
  roster,
  joinPolicy,
  canSetPolicy,
  viewerIsOwner,
  viewerPlayerId,
}: {
  clubId: string;
  clubSlug: string;
  roster: RosterEntry[];
  joinPolicy: "open" | "approval";
  canSetPolicy: boolean;
  viewerIsOwner: boolean;
  viewerPlayerId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const dismiss = useCallback(() => setMessage(""), []);

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

  const requests = roster.filter((m) => m.status === "requested");
  const members = roster.filter(
    (m) => m.status !== "requested" && m.playerId !== viewerPlayerId,
  );
  const canRemove = (m: RosterEntry) =>
    viewerIsOwner || !STAFF.includes(m.role);

  return (
    <section
      className="ph-panel club-admin"
      aria-labelledby="club-admin-heading"
    >
      <header className="ph-panel__head">
        <h2 id="club-admin-heading">Manage members</h2>
      </header>

      {canSetPolicy ? (
        <div className="club-admin__policy">
          <div>
            <strong>Who can join</strong>
            <p className="ph-panel__hint">
              {joinPolicy === "open"
                ? "Anyone signed in joins instantly."
                : "Players send a request; you or your staff approve it here."}
            </p>
          </div>
          <div className="ph-tabs" role="group" aria-label="Who can join">
            {(
              [
                ["approval", "Approval required"],
                ["open", "Anyone can join"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={joinPolicy === value}
                disabled={busyId === "policy"}
                onClick={() =>
                  joinPolicy !== value &&
                  run("policy", () =>
                    setJoinPolicy({ clubId, clubSlug, policy: value }),
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="club-section-title">
          Join requests <span className="count-badge">{requests.length}</span>
        </h3>
        {requests.length ? (
          <ul className="ph-list club-admin__list">
            {requests.map((m) => (
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
                  detail={`Requested ${when(m.since)}`}
                />
                <div className="club-admin__actions">
                  <button
                    type="button"
                    className="club-admin__approve"
                    disabled={busyId === m.membershipId}
                    onClick={() =>
                      run(m.membershipId, () =>
                        reviewMembership({
                          clubId,
                          clubSlug,
                          membershipId: m.membershipId,
                          approve: true,
                        }),
                      )
                    }
                  >
                    <Check aria-hidden="true" size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    className="button-quiet club-admin__decline"
                    disabled={busyId === m.membershipId}
                    onClick={() =>
                      run(m.membershipId, () =>
                        reviewMembership({
                          clubId,
                          clubSlug,
                          membershipId: m.membershipId,
                          approve: false,
                        }),
                      )
                    }
                  >
                    <X aria-hidden="true" size={15} /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ph-empty">No pending requests.</p>
        )}
      </div>

      {members.length ? (
        <details className="club-admin__members">
          <summary>Remove members ({members.length})</summary>
          <ul className="ph-list club-admin__list">
            {members.map((m) => (
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
                  detail={`${ROLE[m.role] ?? m.role} · since ${when(m.since)}`}
                />
                {canRemove(m) ? (
                  <button
                    type="button"
                    className="button-quiet club-admin__remove"
                    disabled={busyId === m.membershipId}
                    onClick={() => {
                      if (!window.confirm(`Remove ${m.name} from the club?`))
                        return;
                      run(m.membershipId, () =>
                        removeMember({
                          clubId,
                          clubSlug,
                          membershipId: m.membershipId,
                        }),
                      );
                    }}
                  >
                    <UserMinus aria-hidden="true" size={15} /> Remove
                  </button>
                ) : (
                  <span className="ph-panel__hint">Owner only</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <ToastMessage message={message} onDismiss={dismiss} />
    </section>
  );
}
