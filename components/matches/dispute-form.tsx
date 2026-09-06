"use client";
import { useState } from "react";
import { openResultDispute } from "@/lib/actions/disputes";
export function DisputeForm({
  clubId,
  eventId,
  resultId,
}: {
  clubId: string;
  eventId: string;
  resultId: string;
}) {
  const [d, setD] = useState(""),
    [m, setM] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await openResultDispute({
          clubId,
          eventId,
          resultId,
          reasonCode: "score_incorrect",
          description: d,
          evidenceObjectIds: [],
          idempotencyKey: crypto.randomUUID(),
        });
        setM(r.ok ? "Dispute opened" : r.error.message);
      }}
    >
      <label>
        Dispute details
        <textarea value={d} onChange={(e) => setD(e.target.value)} />
      </label>
      <button>Open dispute</button>
      <p role="status">{m}</p>
    </form>
  );
}
