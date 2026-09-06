"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignNextQueuedMatch } from "@/lib/actions/matchmaking";

export function AssignStandbyButton({
  clubSlug,
  eventId,
  format,
  ready,
  courtAvailable,
}: {
  clubSlug: string;
  eventId: string;
  format: "singles" | "doubles";
  ready: boolean;
  courtAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="standby-action">
      <button
        disabled={!ready || !courtAvailable || pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          const result = await assignNextQueuedMatch({
            clubSlug,
            eventId,
            format,
            idempotencyKey: crypto.randomUUID(),
          });
          setPending(false);
          setMessage(
            result.ok
              ? "Players assigned. The next lineup is now on standby."
              : result.error.message,
          );
          if (result.ok) router.refresh();
        }}
      >
        <Send aria-hidden="true" size={17} />
        {pending ? "Assigning…" : "Send to next court"}
      </button>
      {!ready ? <small>A complete lineup is required.</small> : null}
      {ready && !courtAvailable ? <small>All courts are currently occupied.</small> : null}
      <p role="status" aria-live="polite">{message}</p>
    </div>
  );
}
