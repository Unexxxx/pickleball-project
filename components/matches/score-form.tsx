"use client";
import { useState } from "react";
import { submitMatchResult } from "@/lib/actions/results";
export function ScoreForm({
  clubId,
  eventId,
  matchId,
}: {
  clubId: string;
  eventId: string;
  matchId: string;
}) {
  const [a, setA] = useState(""),
    [b, setB] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="match-history-score-form">
      <label>
        Side A score
        <input
          type="number"
          min="0"
          max="99"
          inputMode="numeric"
          placeholder="0"
          value={a}
          onChange={(e) =>
            /^\d{0,2}$/.test(e.target.value) && setA(e.target.value)
          }
        />
      </label>
      <label>
        Side B score
        <input
          type="number"
          min="0"
          max="99"
          inputMode="numeric"
          placeholder="0"
          value={b}
          onChange={(e) =>
            /^\d{0,2}$/.test(e.target.value) && setB(e.target.value)
          }
        />
      </label>
      <button
        disabled={a === "" || b === "" || a === b}
        onClick={async () => {
          const result = await submitMatchResult({
            clubId,
            eventId,
            matchId,
            score: { games: [{ sideA: Number(a), sideB: Number(b) }] },
            idempotencyKey: crypto.randomUUID(),
          });
          setMessage(
            result.ok
              ? "Score submitted for confirmation"
              : result.error.message,
          );
        }}
      >
        Submit score
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
