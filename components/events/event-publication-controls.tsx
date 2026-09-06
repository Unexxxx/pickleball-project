"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { transitionEvent } from "@/lib/actions/events";

export function EventPublicationControls({
  clubId,
  eventId,
  version,
}: {
  clubId: string;
  eventId: string;
  version: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="event-publication-controls">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("Publishing event…");
          const result = await transitionEvent({
            clubId,
            eventId,
            expectedVersion: version,
            transition: "published",
            idempotencyKey: crypto.randomUUID(),
          });
          setPending(false);
          if (!result.ok) {
            setMessage(result.error.message);
            return;
          }
          setMessage("Event published.");
          router.refresh();
        }}
      >
        <Send size={17} aria-hidden="true" />
        {pending ? "Publishing…" : "Publish event"}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
