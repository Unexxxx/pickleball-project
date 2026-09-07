"use client";
import { ChevronDown, ChevronUp, ListRestart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustQueue } from "@/lib/actions/queues";
import type { QueueItem } from "@/lib/realtime/event-operations";
import { PlayerNameWithMatches } from "@/components/queues/player-name-with-matches";
export function QueueBoard({
  clubId,
  eventId,
  entries,
}: {
  clubId: string;
  eventId: string;
  entries: QueueItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  return (
    <details className="organizer-queue-board">
      <summary>
        <span>
          <ListRestart aria-hidden="true" size={18} />
          <strong>Bench list</strong>
        </span>
        <small>Adjust queue order</small>
      </summary>
      {entries.length ? (
        <ol className="organizer-queue-list">
          {entries.map((entry, index) => (
            <li data-testid="queue-entry" key={entry.id}>
              <span className="queue-list-number" aria-hidden="true">
                {index + 1}
              </span>
              <strong>
                <PlayerNameWithMatches
                  displayName={entry.displayName ?? "Player"}
                  totalMatches={entry.totalMatches}
                />
              </strong>
              <span className="queue-order-actions">
                <button
                  className="queue-move-button"
                  disabled={index === 0 || busyId !== null}
                  aria-label={`Move ${entry.displayName ?? "player"} up`}
                  onClick={async () => {
                    setBusyId(entry.id);
                    const result = await adjustQueue({
                      clubId,
                      eventId,
                      queueEntryId: entry.id,
                      expectedVersion: entry.version ?? 1,
                      beforeEntryId: entries[index - 1]?.id ?? null,
                      reason: "Organizer moved player up",
                      idempotencyKey: crypto.randomUUID(),
                    });
                    setMsg(
                      result.ok ? "Queue order updated." : result.error.message,
                    );
                    setBusyId(null);
                    if (result.ok) router.refresh();
                  }}
                >
                  <ChevronUp aria-hidden="true" size={17} />
                </button>
                <button
                  className="queue-move-button"
                  disabled={index === entries.length - 1 || busyId !== null}
                  aria-label={`Move ${entry.displayName ?? "player"} down`}
                  onClick={async () => {
                    const next = entries[index + 1];
                    if (!next) return;
                    setBusyId(entry.id);
                    const result = await adjustQueue({
                      clubId,
                      eventId,
                      queueEntryId: next.id,
                      expectedVersion: next.version ?? 1,
                      beforeEntryId: entry.id,
                      reason: "Organizer moved player down",
                      idempotencyKey: crypto.randomUUID(),
                    });
                    setMsg(
                      result.ok ? "Queue order updated." : result.error.message,
                    );
                    setBusyId(null);
                    if (result.ok) router.refresh();
                  }}
                >
                  <ChevronDown aria-hidden="true" size={17} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="bench-empty">No players are on the bench.</p>
      )}
      <p role="status" aria-live="polite">
        {msg}
      </p>
    </details>
  );
}
