"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { MemberRow } from "@/components/clubs/member-row";
import { ToastMessage } from "@/components/ui/toast-message";
import { reviewRegistration } from "@/lib/actions/events";

export type EventRequest = {
  id: string;
  playerId: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  requestedAt: string | null;
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

/**
 * Requests to join a public event. Approving gives a spot (or the waitlist
 * when full); the database re-checks the reviewer's club role.
 */
export function EventRequests({
  eventId,
  clubSlug,
  requests,
}: {
  eventId: string;
  clubSlug: string;
  requests: EventRequest[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const dismiss = useCallback(() => setMessage(""), []);

  async function review(id: string, approve: boolean) {
    setBusyId(id);
    const result = await reviewRegistration({
      registrationId: id,
      eventId,
      clubSlug,
      approve,
    });
    setBusyId(null);
    if (!result.ok) setMessage(result.error.message);
    else router.refresh();
  }

  return (
    <section
      className="ph-panel club-admin event-requests"
      aria-labelledby="event-requests-heading"
    >
      <header className="ph-panel__head">
        <h2 id="event-requests-heading">
          Requests to join{" "}
          <span className="count-badge">{requests.length}</span>
        </h2>
      </header>
      {requests.length ? (
        <ul className="ph-list club-admin__list">
          {requests.map((r) => (
            <li key={r.id} className="club-admin__row">
              <MemberRow
                member={{
                  playerId: r.playerId,
                  name: r.name,
                  slug: r.slug,
                  avatarUrl: r.avatarUrl,
                  role: "member",
                  joinedAt: r.requestedAt ?? "",
                }}
                detail={
                  r.requestedAt ? `Asked ${when(r.requestedAt)}` : "Asked"
                }
              />
              <div className="club-admin__actions">
                <button
                  type="button"
                  className="club-admin__approve"
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, true)}
                >
                  <Check aria-hidden="true" size={15} /> Approve
                </button>
                <button
                  type="button"
                  className="button-quiet club-admin__decline"
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, false)}
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
      <ToastMessage message={message} onDismiss={dismiss} />
    </section>
  );
}
