import Link from "next/link";
import { Clock3, LockKeyhole, LogIn, UserCheck, Users } from "lucide-react";

export type EventParticipant = {
  id: string;
  playerId: string;
  displayName: string;
  publicSlug: string | null;
  avatarUrl: string | null;
  status: string;
  waitlistPosition: number | null;
  registeredAt: string | null;
};

const statusOrder: Record<string, number> = {
  confirmed: 0,
  waitlisted: 1,
  withdrawn: 2,
  canceled: 3,
};

export function ParticipantList({
  participants,
  capacity,
  viewerAuthenticated = true,
  loginHref = "/login",
}: {
  participants: EventParticipant[];
  capacity: number;
  viewerAuthenticated?: boolean;
  loginHref?: string;
}) {
  const ordered = [...participants].sort(
    (a, b) =>
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
      a.displayName.localeCompare(b.displayName),
  );
  const confirmed = participants.filter(
    (participant) => participant.status === "confirmed",
  ).length;
  const waitlisted = participants.filter(
    (participant) => participant.status === "waitlisted",
  ).length;

  return (
    <section
      className="participant-section"
      aria-labelledby="participants-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Users aria-hidden="true" size={15} /> Event roster
          </p>
          <h2 id="participants-heading">Participants</h2>
        </div>
        <div
          className="participant-counts"
          aria-label={
            viewerAuthenticated
              ? `${confirmed} confirmed out of ${capacity} capacity, ${waitlisted} waitlisted`
              : "Sign in required to view the event roster"
          }
        >
          {viewerAuthenticated ? (
            <>
              <span>
                <strong>{confirmed}</strong> / {capacity} confirmed
              </span>
              {waitlisted ? <span>{waitlisted} waitlisted</span> : null}
            </>
          ) : (
            <span className="participant-private-badge">
              <LockKeyhole aria-hidden="true" size={13} /> Players only
            </span>
          )}
        </div>
      </div>

      {!viewerAuthenticated ? (
        <div className="participant-login-gate">
          <span className="participant-login-gate__icon">
            <LockKeyhole aria-hidden="true" />
          </span>
          <div>
            <h3>Sign in to see who&apos;s playing</h3>
            <p>
              The participant list is available to verified players. Sign in to
              view confirmed participants and the waitlist.
            </p>
          </div>
          <Link
            className="button participant-login-gate__action"
            href={loginHref}
          >
            <LogIn aria-hidden="true" size={17} /> Sign in to view participants
          </Link>
        </div>
      ) : ordered.length ? (
        <ul className="participant-list">
          {ordered.map((participant) => (
            <li key={participant.id}>
              {participant.publicSlug ? (
                <Link
                  className="participant-identity"
                  href={`/players/${participant.publicSlug}`}
                >
                  <ParticipantIdentity participant={participant} />
                </Link>
              ) : (
                <span className="participant-identity">
                  <ParticipantIdentity participant={participant} />
                </span>
              )}
              <span
                className={`participant-status participant-status--${participant.status}`}
              >
                {participant.status === "confirmed" ? (
                  <UserCheck aria-hidden="true" size={14} />
                ) : null}
                {participant.status === "waitlisted" &&
                participant.waitlistPosition
                  ? `Waitlist #${participant.waitlistPosition}`
                  : participant.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="compact-empty">
          <Users aria-hidden="true" />
          <p>No participants have registered yet.</p>
        </div>
      )}
    </section>
  );
}

function ParticipantIdentity({
  participant,
}: {
  participant: EventParticipant;
}) {
  return (
    <>
      <span
        className="participant-avatar"
        role="img"
        aria-label={`${participant.displayName}'s profile photo`}
        style={
          participant.avatarUrl
            ? { backgroundImage: `url(${participant.avatarUrl})` }
            : undefined
        }
      >
        {!participant.avatarUrl
          ? participant.displayName.charAt(0).toUpperCase()
          : null}
      </span>
      <span>
        <strong>{participant.displayName}</strong>
        {participant.registeredAt ? (
          <small>
            <Clock3 aria-hidden="true" size={13} /> Joined{" "}
            {new Date(participant.registeredAt).toLocaleDateString()}
          </small>
        ) : null}
      </span>
    </>
  );
}
