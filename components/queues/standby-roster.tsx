"use client";

import { RefreshCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { replaceStandbyPlayer } from "@/lib/actions/queues";
import type { QueueItem } from "@/lib/realtime/event-operations";
import { PlayerNameWithMatches } from "@/components/queues/player-name-with-matches";

export function StandbyRoster({
  players,
  candidates,
  clubSlug,
  eventId,
  format,
  queueVersion,
  stage = "standby",
}: {
  players: QueueItem[];
  candidates: QueueItem[];
  clubSlug: string;
  eventId: string;
  format: "singles" | "doubles";
  queueVersion: number;
  stage?: "standby" | "upcoming";
}) {
  const router = useRouter();
  const [outgoing, setOutgoing] = useState<QueueItem | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const close = () => {
    setOutgoing(null);
    setReplacementId("");
    setMessage("");
  };
  const stageLabel = stage === "standby" ? "Standby" : "Upcoming";

  return (
    <>
      <div className="standby-sides">
        {[
          players.slice(0, format === "singles" ? 1 : 2),
          players.slice(format === "singles" ? 1 : 2),
        ].map((sidePlayers, sideIndex) => (
          <section
            key={sideIndex}
            aria-labelledby={`${stage}-side-${sideIndex + 1}`}
          >
            <p id={`${stage}-side-${sideIndex + 1}`}>
              Side {sideIndex === 0 ? "A" : "B"}
            </p>
            <ul className="live-player-list standby-player-list">
              {sidePlayers.map((player) => (
                <li key={player.id}>
                  <strong>
                    <PlayerNameWithMatches
                      displayName={player.displayName ?? "Player"}
                      totalMatches={player.totalMatches}
                    />
                  </strong>
                  <button
                    className="standby-replace-button"
                    disabled={candidates.length === 0}
                    onClick={() => {
                      setOutgoing(player);
                      setReplacementId(candidates[0]?.id ?? "");
                      setMessage("");
                    }}
                    aria-label={`Replace ${player.displayName ?? "player"}`}
                  >
                    <RefreshCcw aria-hidden="true" size={14} /> Replace
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {outgoing ? (
        <div
          className="standby-replace-panel"
          role="dialog"
          aria-labelledby="replace-player-heading"
        >
          <div className="standby-replace-heading">
            <div>
              <p className="eyebrow">Emergency change</p>
              <h4 id="replace-player-heading">
                Replace {outgoing.displayName ?? "player"}
              </h4>
            </div>
            <button
              className="icon-button"
              onClick={close}
              aria-label="Close replacement"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <label>
            Player from {stage === "standby" ? "upcoming or bench" : "bench"}
            <select
              value={replacementId}
              onChange={(event) => setReplacementId(event.target.value)}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.displayName ?? "Player"}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={pending || !replacementId}
            onClick={async () => {
              setPending(true);
              const result = await replaceStandbyPlayer({
                clubSlug,
                eventId,
                format,
                outgoingEntryId: outgoing.id,
                replacementEntryId: replacementId,
                expectedQueueVersion: queueVersion,
                reason: `${stageLabel} player emergency replacement`,
                idempotencyKey: crypto.randomUUID(),
              });
              setPending(false);
              setMessage(
                result.ok
                  ? `${stageLabel} player replaced.`
                  : result.error.message,
              );
              if (result.ok) {
                close();
                router.refresh();
              }
            }}
          >
            {pending ? "Replacing…" : "Confirm replacement"}
          </button>
          <p role="status" aria-live="polite">
            {message}
          </p>
        </div>
      ) : null}
    </>
  );
}
