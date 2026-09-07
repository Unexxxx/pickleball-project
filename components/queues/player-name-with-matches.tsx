import Image from "next/image";

export function MatchCountBadge({ totalMatches }: { totalMatches: number }) {
  if (totalMatches <= 0) return null;

  return (
    <span
      className="queue-player-match-count"
      aria-label={`${totalMatches} ${totalMatches === 1 ? "match" : "matches"}`}
    >
      <span aria-hidden="true">{totalMatches}</span>
      <Image
        src="/icons/match-sword.png"
        alt=""
        width={14}
        height={14}
        aria-hidden="true"
      />
    </span>
  );
}

export function PlayerNameWithMatches({
  displayName,
  totalMatches = 0,
}: {
  displayName: string;
  totalMatches?: number;
}) {
  return (
    <span className="queue-player-name">
      <span className="queue-player-name__text" title={displayName}>
        {displayName}
      </span>
      <MatchCountBadge totalMatches={totalMatches} />
    </span>
  );
}
