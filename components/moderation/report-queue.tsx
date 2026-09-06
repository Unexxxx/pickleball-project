"use client";
import { useState } from "react";
import { reviewReport } from "@/lib/actions/moderation";
export function ReportQueue({
  reports,
}: {
  reports: {
    id: string;
    description: string;
    status: string;
    version: number;
  }[];
}) {
  const [reason, setReason] = useState("");
  return (
    <section>
      <h2>Moderation queue</h2>
      {reports.map((r) => (
        <article key={r.id}>
          <p>{r.description}</p>
          <label>
            Decision reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            onClick={() =>
              reviewReport({
                reportId: r.id,
                expectedVersion: r.version,
                decision: "dismissed",
                reason,
                idempotencyKey: crypto.randomUUID(),
              })
            }
          >
            Dismiss
          </button>
        </article>
      ))}
    </section>
  );
}
