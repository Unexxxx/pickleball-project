import Link from "next/link";
import { CircleCheck, Gavel, ListOrdered, Map, Swords } from "lucide-react";
export function EventActionTray({
  clubSlug,
  eventId,
}: {
  clubSlug: string;
  eventId: string;
}) {
  const base = `/dashboard/clubs/${clubSlug}/events/${eventId}`;
  return (
    <nav aria-label="Event actions" className="event-nav overflow-x-auto">
      <ul>
        {[
          { label: "Check in", path: "check-in", icon: CircleCheck },
          { label: "Queue", path: "queue", icon: ListOrdered },
          { label: "Courts", path: "courts", icon: Map },
          { label: "Matches", path: "matches", icon: Swords },
          { label: "Disputes", path: "disputes", icon: Gavel },
        ].map(({ label, path, icon: Icon }) => (
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
