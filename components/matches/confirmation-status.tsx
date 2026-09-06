"use client";
import { useState } from "react";
import { confirmMatchResult } from "@/lib/actions/results";
export function ConfirmationStatus({
  clubId,
  eventId,
  resultId,
  revisionId,
  sideA,
  sideB,
}: {
  clubId: string;
  eventId: string;
  resultId: string;
  revisionId: string;
  sideA: boolean;
  sideB: boolean;
}) {
  const [msg, setMsg] = useState("");
  return (
    <section aria-label="Result confirmation">
      <p>
        Confirmation: Side A {sideA ? "confirmed" : "waiting"} · Side B{" "}
        {sideB ? "confirmed" : "waiting"}
      </p>
      <button
        onClick={async () => {
          const result = await confirmMatchResult({
            clubId,
            eventId,
            resultId,
            revisionId,
            idempotencyKey: crypto.randomUUID(),
          });
          setMsg(
            result.ok
              ? result.data?.status === "finalized"
                ? "Result finalized"
                : "Confirmation recorded"
              : result.error.message,
          );
        }}
      >
        Confirm score
      </button>
      <p role="status">{msg}</p>
    </section>
  );
}
