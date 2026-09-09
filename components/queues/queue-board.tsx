"use client";
import { ChevronDown, ChevronUp, ListRestart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustQueue } from "@/lib/actions/queues";
import type { QueueItem } from "@/lib/realtime/event-operations";
export function QueueBoard({
  clubId,
  eventId,
  entries,
  canManage = false,
}: {
  clubId: string;
  eventId: string;
  entries: QueueItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  return (
    <section
      className="organizer-queue-board bench-board"
      aria-label="Bench list"
    >
      <header className="bench-board-heading">
        <span>
          <ListRestart aria-hidden="true" size={18} />
          <strong>Bench list · {entries.length}</strong>
        </span>
        <small>
          {canManage ? "Adjust queue order" : "Waiting players · view only"}
        </small>
      </header>
      <p className="bench-board-note">
        Wins, losses and win rate are for finalized results in this event.
        Rating is your current overall rating.
      </p>
      {entries.length ? (
        <div
          className="bench-scroll"
          tabIndex={0}
          role="region"
          aria-label="Bench players and statistics; scroll horizontally to see all columns"
        >
          <ol className="organizer-queue-list">
            {entries.map((entry, index) => (
              <li data-testid="queue-entry" key={entry.id}>
                <span className="queue-list-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="bench-player-info">
                  <strong>{entry.displayName ?? "Player"}</strong>
                  <dl className="bench-player-stats">
                    <div>
                      <dt>
                        <abbr title="Event wins–losses">W–L</abbr>
                      </dt>
                      <dd>
                        {entry.eventWins === undefined
                          ? "—"
                          : `${entry.eventWins}–${entry.eventLosses ?? 0}`}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <abbr title="Event win rate">WR</abbr>
                      </dt>
                      <dd>
                        {entry.eventWins === undefined ||
                        !((entry.eventWins ?? 0) + (entry.eventLosses ?? 0))
                          ? "—"
                          : `${Math.round((entry.eventWins / (entry.eventWins + (entry.eventLosses ?? 0))) * 100)}%`}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <abbr title="Event matches">MP</abbr>
                      </dt>
                      <dd>{entry.totalMatches ?? 0}</dd>
                    </div>
                    <div>
                      <dt>
                        <abbr title="Current rating">RTG</abbr>
                      </dt>
                      <dd>
                        {entry.rating == null ? "—" : Math.round(entry.rating)}
                      </dd>
                    </div>
                  </dl>
                </div>
                {canManage && (
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
                          result.ok
                            ? "Queue order updated."
                            : result.error.message,
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
                          result.ok
                            ? "Queue order updated."
                            : result.error.message,
                        );
                        setBusyId(null);
                        if (result.ok) router.refresh();
                      }}
                    >
                      <ChevronDown aria-hidden="true" size={17} />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="bench-empty">No players are on the bench.</p>
      )}
      <p role="status" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
