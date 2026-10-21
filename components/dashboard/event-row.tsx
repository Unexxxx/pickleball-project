import Link from "next/link";
import type { ReactNode } from "react";
import { eventDay, formatEventTime } from "@/lib/format/event-time";

/** One compact, fully clickable event line used across the player home. */
export function EventRow({
  href,
  name,
  clubName,
  venue,
  startsAt,
  timezone,
  badge,
  live = false,
}: {
  href: string;
  name: string;
  /** Omitted on a club's own page, where the club is already known. */
  clubName?: string;
  venue: string;
  startsAt: string;
  timezone: string;
  badge?: ReactNode;
  live?: boolean;
}) {
  const { month, day } = eventDay(startsAt, timezone);
  return (
    <li>
      <Link className="ph-row" href={href}>
        <span className="ph-row__date" aria-hidden="true">
          {live ? (
            <span className="ph-live-dot" />
          ) : (
            <>
              <small>{month}</small>
              <strong>{day}</strong>
            </>
          )}
        </span>
        <span className="ph-row__body">
          <strong>{name}</strong>
          <span>{clubName ? `${clubName} · ${venue}` : venue}</span>
          <time dateTime={startsAt}>
            {live ? "Playing now" : formatEventTime(startsAt, timezone)}
          </time>
        </span>
        {badge ? <span className="ph-badge">{badge}</span> : null}
      </Link>
    </li>
  );
}
