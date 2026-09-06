"use client";
import { useState } from "react";
import { resolveResultDispute } from "@/lib/actions/disputes";
export function DisputeResolution({
  clubId,
  eventId,
  disputeId,
}: {
  clubId: string;
  eventId: string;
  disputeId: string;
}) {
  const [r, setR] = useState(""),
    [m, setM] = useState("");
  return (
    <div className="grid gap-3 sm:flex sm:flex-wrap">
      <label>
        Resolution reason
        <textarea value={r} onChange={(e) => setR(e.target.value)} />
      </label>
      {(["upheld", "voided"] as const).map((decision) => (
        <button
          key={decision}
          onClick={async () => {
            const x = await resolveResultDispute({
              clubId,
              eventId,
              disputeId,
              resolution: decision,
              reason: r,
              idempotencyKey: crypto.randomUUID(),
            });
            setM(x.ok ? "Dispute resolved" : x.error.message);
          }}
        >
          {decision}
        </button>
      ))}
      <p role="status">{m}</p>
    </div>
  );
}
