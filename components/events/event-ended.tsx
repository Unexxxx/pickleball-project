import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";

/**
 * Stands in for the live tools (check-in, queue, courts) once an event is
 * over, so an ended event shows nothing to run.
 */
export function EventEnded({
  status,
  href,
}: {
  status: "completed" | "canceled";
  href: string;
}) {
  return (
    <main className="event-ended">
      <Flag aria-hidden="true" size={28} />
      <h1>
        {status === "canceled"
          ? "This event was canceled"
          : "This event has ended"}
      </h1>
      <p>
        {status === "canceled"
          ? "There's nothing left to run."
          : "Check-in, the queue and courts are closed."}
      </p>
      <Link className="button button-secondary" href={href}>
        <ArrowLeft aria-hidden="true" size={17} /> Back to event
      </Link>
    </main>
  );
}
