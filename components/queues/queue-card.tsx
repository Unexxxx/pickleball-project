"use client";

import { CheckCircle2, LogOut, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinQueue, leaveQueue } from "@/lib/actions/queues";

export type PlayerQueueState =
  | "queued"
  | "assigned"
  | "eligible"
  | "not_checked_in"
  | "not_registered"
  | "event_not_started";

const stateCopy: Record<PlayerQueueState, string> = {
  queued: "You are ready for matchmaking.",
  assigned: "You are currently assigned to a match.",
  eligible: "You are checked in and can join the queue.",
  not_checked_in: "Ask the club to check you in before joining the queue.",
  not_registered: "Only confirmed event participants can join this queue.",
  event_not_started: "The club has not started this event yet.",
};

export function QueueCard({
  eventId,
  position,
  state,
}: {
  eventId: string;
  position?: number;
  state: PlayerQueueState;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <section
      className="player-queue-card"
      aria-labelledby="player-queue-heading"
    >
      <div>
        <p className="eyebrow">Player controls</p>
        <h2 id="player-queue-heading">Your queue status</h2>
        <p>{stateCopy[state]}</p>
      </div>
      {state === "queued" && position ? (
        <div className="queue-position-badge">
          <CheckCircle2 aria-hidden="true" size={20} /> Position {position}
        </div>
      ) : null}
      {state === "eligible" ? (
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await joinQueue({
              eventId,
              idempotencyKey: crypto.randomUUID(),
            });
            setPending(false);
            setMessage(
              result.ok
                ? "You are now ready in the queue."
                : result.error.message,
            );
            if (result.ok) router.refresh();
          }}
        >
          <UserRoundCheck aria-hidden="true" size={17} />{" "}
          {pending ? "Joining…" : "Join queue"}
        </button>
      ) : null}
      {state === "queued" ? (
        <button
          className="button-secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await leaveQueue({
              eventId,
              reason: "player_left",
              idempotencyKey: crypto.randomUUID(),
            });
            setPending(false);
            setMessage(
              result.ok ? "You left the queue." : result.error.message,
            );
            if (result.ok) router.refresh();
          }}
        >
          <LogOut aria-hidden="true" size={17} />{" "}
          {pending ? "Leaving…" : "Leave queue"}
        </button>
      ) : null}
      <p className="queue-action-status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
