"use client";

import { LogOut, ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  organizerCheckInAndQueue,
  organizerCheckout,
} from "@/lib/actions/queues";

type CheckInPlayer = {
  id: string;
  displayName: string;
  checkedIn: boolean;
  queueState: "ready" | "assigned" | null;
};

export function OrganizerCheckInList({
  clubId,
  eventId,
  players,
  enabled,
}: {
  clubId: string;
  eventId: string;
  players: CheckInPlayer[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <section
      className="organizer-check-in"
      aria-labelledby="check-in-roster-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Arrival roster</p>
          <h2 id="check-in-roster-heading">Confirmed players</h2>
        </div>
        <span>
          {players.filter((player) => player.checkedIn).length} /{" "}
          {players.length} checked in
        </span>
      </div>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            <div>
              <strong>{player.displayName}</strong>
              <small>
                {player.queueState === "ready"
                  ? "In the bench queue"
                  : player.queueState === "assigned"
                    ? "Standby, upcoming, or playing"
                  : player.checkedIn
                    ? "Checked in"
                    : "Not checked in"}
              </small>
            </div>
            {player.queueState === "ready" ? (
              <button
                className="checkout-player-button"
                disabled={!enabled || pendingId !== null}
                onClick={async () => {
                  setPendingId(player.id);
                  const result = await organizerCheckout({
                    clubId,
                    eventId,
                    playerId: player.id,
                    idempotencyKey: crypto.randomUUID(),
                  });
                  setPendingId(null);
                  setMessage(
                    result.ok
                      ? `${player.displayName} checked out and removed from the queue.`
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                }}
              >
                <LogOut aria-hidden="true" size={17} />
                {pendingId === player.id ? "Checking out…" : "Check out"}
              </button>
            ) : player.queueState === "assigned" ? (
              <span className="check-in-complete">Assigned to a match</span>
            ) : (
              <button
                disabled={!enabled || pendingId !== null}
                onClick={async () => {
                  setPendingId(player.id);
                  const result = await organizerCheckInAndQueue({
                    clubId,
                    eventId,
                    playerId: player.id,
                    state: "checked_in",
                    reason: "Organizer check-in and queue placement",
                    idempotencyKey: crypto.randomUUID(),
                  });
                  setPendingId(null);
                  setMessage(
                    result.ok
                      ? `${player.displayName} checked in and added to the queue.`
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                }}
              >
                <ListPlus aria-hidden="true" size={17} />{" "}
                {pendingId === player.id
                  ? "Adding…"
                  : enabled
                    ? "Check in & queue"
                    : "Start event first"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {!players.length ? (
        <p className="compact-empty">No confirmed players to check in.</p>
      ) : null}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
