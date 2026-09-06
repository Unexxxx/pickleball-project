"use client";
import { useState } from "react";
import { createReport } from "@/lib/actions/reports";
export function ReportForm({
  subjectType,
  subjectId,
}: {
  subjectType: "player" | "club" | "match" | "content";
  subjectId: string;
}) {
  const [d, setD] = useState(""),
    [m, setM] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await createReport({
          subjectType,
          subjectId,
          reasonCode: "harmful_content",
          description: d,
          evidenceObjectIds: [],
          idempotencyKey: crypto.randomUUID(),
        });
        setM(r.ok ? "Report submitted" : r.error.message);
      }}
    >
      <label>
        Report details
        <textarea value={d} onChange={(e) => setD(e.target.value)} />
      </label>
      <button>Submit report</button>
      <p role="status">{m}</p>
    </form>
  );
}
