"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { endMatchWithScore } from "@/lib/actions/results";

export function EndMatchScore({
  clubSlug,
  eventId,
  matchId,
  onCompleted,
}: {
  clubSlug: string;
  eventId: string;
  matchId: string;
  onCompleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="end-match-control">
      {!open ? (
        <button onClick={() => setOpen(true)}>
          <Flag aria-hidden="true" size={16} /> Finish &amp; Enter Score
        </button>
      ) : (
        <div className="end-match-score-form">
          <p>
            <strong>Final score</strong>
            <span>Submitting releases this court for the next match.</span>
          </p>
          <div>
            <label>
              Side A
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                step="1"
                placeholder="0"
                value={sideA}
                onChange={(event) => {
                  if (/^\d{0,2}$/.test(event.target.value))
                    setSideA(event.target.value);
                }}
              />
            </label>
            <span aria-hidden="true">–</span>
            <label>
              Side B
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="99"
                step="1"
                placeholder="0"
                value={sideB}
                onChange={(event) => {
                  if (/^\d{0,2}$/.test(event.target.value))
                    setSideB(event.target.value);
                }}
              />
            </label>
          </div>
          <div className="end-match-actions">
            <button
              className="button-ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              disabled={
                pending || sideA === "" || sideB === "" || sideA === sideB
              }
              onClick={async () => {
                setPending(true);
                setMessage("");
                const result = await endMatchWithScore({
                  clubSlug,
                  eventId,
                  matchId,
                  score: {
                    games: [{ sideA: Number(sideA), sideB: Number(sideB) }],
                  },
                  idempotencyKey: crypto.randomUUID(),
                });
                setPending(false);
                setMessage(
                  result.ok
                    ? "Match ended. Court is now available."
                    : result.error.message,
                );
                if (result.ok) {
                  onCompleted?.();
                  router.refresh();
                }
              }}
            >
              {pending ? "Ending…" : "Submit score & release court"}
            </button>
          </div>
        </div>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
