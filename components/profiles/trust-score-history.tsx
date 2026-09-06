"use client";
import { useState } from "react";
import { requestTrustScoreReview } from "@/lib/actions/trust-score";
export function TrustScoreHistory({
  entries,
}: {
  entries: {
    id: string;
    reason_code: string;
    delta: number;
    current_score: number;
    created_at: string;
  }[];
}) {
  const [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section>
      <h2>Private Trust Score history</h2>
      {entries.map((entry) => (
        <article key={entry.id} className="border-b py-3">
          <p>
            {entry.reason_code}: {entry.delta > 0 ? "+" : ""}
            {entry.delta} → {entry.current_score}
          </p>
          <label>
            Review reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            onClick={async () => {
              const r = await requestTrustScoreReview(entry.id, reason);
              setMessage(r.ok ? "Review requested" : r.error.message);
            }}
          >
            Request review
          </button>
        </article>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
