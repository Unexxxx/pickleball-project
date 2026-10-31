"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerForEvent, withdrawFromEvent } from "@/lib/actions/events";

type Status = "confirmed" | "waitlisted" | "requested";

/**
 * Public events: players ask and an organizer approves.
 * Private events: the passcode lets a player straight in.
 */
export function RegistrationStatus({
  eventId,
  isPrivate = false,
  initialRegistered = false,
  initialStatus,
}: {
  eventId: string;
  isPrivate?: boolean;
  initialRegistered?: boolean;
  initialStatus?: Status | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState<Status | null>(
    initialStatus ?? (initialRegistered ? "confirmed" : null),
  );
  const [pending, setPending] = useState(false);
  return (
    <section className="registration-actions" aria-label="Event registration">
      {isPrivate && !status ? (
        <label>
          Event passcode
          <input
            type="password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            autoComplete="one-time-code"
          />
        </label>
      ) : null}
      {status === "requested" ? (
        <p className="registration-pending">
          Request sent. The organizer will let you know.
        </p>
      ) : null}
      {!status ? (
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const r = await registerForEvent({
              eventId,
              termsVersion: "2026-09-01",
              idempotencyKey: crypto.randomUUID(),
              accessCode: isPrivate ? accessCode : null,
            });
            setPending(false);
            if (r.ok) {
              const next = (r.data?.status ?? "confirmed") as Status;
              setStatus(next);
              setMsg(
                next === "requested"
                  ? ""
                  : next === "waitlisted"
                    ? "Added to the waitlist."
                    : "Registration confirmed.",
              );
              router.refresh();
            } else setMsg(r.error.message);
          }}
        >
          {pending
            ? isPrivate
              ? "Joining…"
              : "Sending…"
            : isPrivate
              ? "Join event"
              : "Request to join"}
        </button>
      ) : (
        <button
          className="button-secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const r = await withdrawFromEvent(eventId);
            setPending(false);
            if (r.ok) {
              setMsg(
                status === "requested"
                  ? "Request canceled."
                  : "Registration withdrawn.",
              );
              setStatus(null);
              router.refresh();
            } else setMsg(r.error.message);
          }}
        >
          {pending
            ? "Withdrawing…"
            : status === "requested"
              ? "Cancel request"
              : "Withdraw registration"}
        </button>
      )}
      <p role="status" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
