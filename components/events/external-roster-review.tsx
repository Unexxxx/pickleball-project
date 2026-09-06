import { ExternalLink, ShieldAlert } from "lucide-react";

type Entry = {
  id: string;
  displayName: string;
  status: string;
  waitlistPosition: number | null;
};

export function ExternalRosterReview({
  entries,
  sourceUrl,
}: {
  entries: Entry[];
  sourceUrl: string;
}) {
  if (!entries.length) return null;
  const ordered = [...entries].sort((a, b) =>
    a.status !== b.status
      ? a.status === "confirmed"
        ? -1
        : 1
      : (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0),
  );
  return (
    <section
      className="participant-section external-roster-section"
      aria-labelledby="external-roster-heading"
    >
      <div className="participant-section-header">
        <div>
          <p className="eyebrow">Imported roster</p>
          <h2 id="external-roster-heading">Identity matching required</h2>
        </div>
        <a
          className="button-secondary"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View source <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
      <p className="external-roster-note">
        <ShieldAlert size={18} aria-hidden="true" /> These names came from
        Reclub. They cannot enter ranked matches or leaderboards until matched
        to verified accounts.
      </p>
      <ul className="participant-list">
        {ordered.map((entry) => (
          <li key={entry.id}>
            <span className="participant-identity">
              <span className="participant-avatar" aria-hidden="true">
                {entry.displayName.charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{entry.displayName}</strong>
                <small>Pending verified-account match</small>
              </span>
            </span>
            <span
              className={`participant-status participant-status--${entry.status}`}
            >
              {entry.status === "waitlisted" && entry.waitlistPosition
                ? `Waitlist #${entry.waitlistPosition}`
                : "Confirmed"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
