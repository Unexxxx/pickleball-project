"use client";
import { mergeDuplicatePlayers } from "@/lib/actions/moderation";
export function DuplicateReview({
  reviewId,
  candidates,
}: {
  reviewId: string;
  candidates: string[];
}) {
  return (
    <section>
      <h2>Duplicate identity review</h2>
      {candidates.map((id) => (
        <button
          key={id}
          onClick={() =>
            mergeDuplicatePlayers({
              reviewId,
              survivingPlayerId: id,
              reason: "Verified canonical identity selected",
              idempotencyKey: crypto.randomUUID(),
            })
          }
        >
          Keep {id}
        </button>
      ))}
    </section>
  );
}
