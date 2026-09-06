"use client";

import { useState, useTransition } from "react";
import { setAttendance } from "@/lib/actions/queues";

export function CheckInButton({
  clubId,
  eventId,
  playerId,
}: {
  clubId: string;
  eventId: string;
  playerId: string;
}) {
  const [message, setMessage] = useState("Ready to check in");
  const [pending, startTransition] = useTransition();
  return (
    <section>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setAttendance({
              clubId,
              eventId,
              playerId,
              state: "checked_in",
              reason: "Player arrived",
              idempotencyKey: crypto.randomUUID(),
            });
            setMessage(result.ok ? "Checked in" : result.error.message);
          })
        }
      >
        {pending ? "Checking in…" : "Check in"}
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
