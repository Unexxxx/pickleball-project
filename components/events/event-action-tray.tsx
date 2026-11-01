import Link from "next/link";
import { CircleCheck, Gavel, ListOrdered, Map, Swords } from "lucide-react";
const ACTIONS = [
  { label: "Check in", path: "check-in", icon: CircleCheck, live: true },
  { label: "Queue", path: "queue", icon: ListOrdered, live: true },
  { label: "Courts", path: "courts", icon: Map, live: true },
  { label: "Matches", path: "matches", icon: Swords, live: false },
  { label: "Disputes", path: "disputes", icon: Gavel, live: false },
];

/**
 * The tools for running an event. All of them while it's in progress; once
 * it's over, only Matches and Disputes for reviewing results.
 */
export function EventActionTray({
  clubSlug,
  eventId,
  status,
}: {
  clubSlug: string;
  eventId: string;
  status: "in_progress" | "completed";
}) {
  const base = `/dashboard/clubs/${clubSlug}/events/${eventId}`;
  return (
    <nav aria-label="Event actions" className="event-nav overflow-x-auto">
      <ul>
        {ACTIONS.filter(
          (action) => status === "in_progress" || !action.live,
        ).map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <Link href={`${base}/${path}`}>
              <Icon aria-hidden="true" size={17} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
