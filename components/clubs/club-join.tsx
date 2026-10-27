"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, UserPlus } from "lucide-react";
import { joinClub, leaveClub } from "@/lib/actions/clubs";
import { ToastMessage } from "@/components/ui/toast-message";
import type { ViewerMembership } from "@/lib/queries/club-home";

/**
 * The club header's membership action, all in one place: Join / Request to
 * join, a pending request with Cancel, or Leave club for members.
 * Signed-out visitors are sent to log in and back. The database re-checks
 * everything (e.g. the last owner can't leave); this only picks what to offer.
 */
export function ClubJoin({
  clubId,
  clubSlug,
  clubName,
  joinPolicy,
  membership,
}: {
  clubId: string;
  clubSlug: string;
  clubName: string;
  joinPolicy: "open" | "approval";
  membership: ViewerMembership;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dismiss = useCallback(() => setMessage(""), []);
  const joinLabel = joinPolicy === "open" ? "Join club" : "Request to join";

  if (!membership.signedIn)
    return (
      <Link
        className="button club-join"
        href={`/login?next=${encodeURIComponent(`/clubs/${clubSlug}`)}`}
      >
        <UserPlus aria-hidden="true" size={17} /> {joinLabel}
      </Link>
    );

  const { status } = membership;
  if (status === "suspended") return null;

  if (status === "active" || status === "invited")
    return (
      <>
        <button
          type="button"
          className="button button-secondary club-join club-leave"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm(`Leave ${clubName}?`)) return;
            setBusy(true);
            const result = await leaveClub({ clubId, clubSlug });
            setBusy(false);
            if (!result.ok) setMessage(result.error.message);
            else router.refresh();
          }}
        >
          <LogOut aria-hidden="true" size={16} />
          {busy ? "Leaving…" : "Leave club"}
        </button>
        <ToastMessage message={message} onDismiss={dismiss} />
      </>
    );

  if (status === "requested")
    return (
      <div className="club-join-pending">
        <span className="club-role-chip">
          <Clock3 aria-hidden="true" size={14} /> Request sent
        </span>
        <button
          type="button"
          className="profile-link-button club-join-cancel"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await leaveClub({ clubId, clubSlug });
            setBusy(false);
            if (!result.ok) setMessage(result.error.message);
            else router.refresh();
          }}
        >
          Cancel request
        </button>
        <ToastMessage message={message} onDismiss={dismiss} />
      </div>
    );

  return (
    <>
      <button
        type="button"
        className="button club-join"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await joinClub({ clubId, clubSlug });
          setBusy(false);
          if (!result.ok) setMessage(result.error.message);
          else router.refresh();
        }}
      >
        <UserPlus aria-hidden="true" size={17} />
        {busy ? "Joining…" : joinLabel}
      </button>
      <ToastMessage message={message} onDismiss={dismiss} />
    </>
  );
}
