"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerForEvent, withdrawFromEvent } from "@/lib/actions/events";
export function RegistrationStatus({
  eventId,
  isPrivate = false,
  initialRegistered = false,
}: {
  eventId: string;
  isPrivate?: boolean;
  initialRegistered?: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [registered, setRegistered] = useState(initialRegistered);
  const [pending, setPending] = useState(false);
  return (
    <section className="registration-actions" aria-label="Event registration">
      {isPrivate && !registered ? (
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
      {!registered ? (
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
              setRegistered(true);
              setMsg(
                r.data?.status === "waitlisted"
                  ? "Added to the waitlist."
                  : "Registration confirmed.",
              );
              router.refresh();
            } else setMsg(r.error.message);
          }}
        >
          {pending ? "Joining…" : "Join event"}
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
              setRegistered(false);
              setMsg("Registration withdrawn.");
              router.refresh();
            } else setMsg(r.error.message);
          }}
        >
          {pending ? "Withdrawing…" : "Withdraw registration"}
        </button>
      )}
      <p role="status" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
