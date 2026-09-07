import Link from "next/link";
import type { Json } from "@/lib/supabase/database.types";
export type HistoryRow = {
  match_id: string;
  format: string;
  record_class: string;
  played_at: string;
  result_status: string;
  won: boolean;
  has_revision_history: boolean;
  side?: number;
  score?: Json | null;
  participants?: Json | null;
};
function players(value: HistoryRow["participants"], side: number) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) =>
    p && typeof p === "object" && !Array.isArray(p) && p.side === side
      ? [
          {
            name: typeof p.name === "string" ? p.name : "Private player",
            slug: typeof p.slug === "string" ? p.slug : null,
          },
        ]
      : [],
  );
}
function scores(value: HistoryRow["score"], side: number) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Array.isArray(value.games)
  )
    return [];
  return value.games.flatMap((g) =>
    g &&
    typeof g === "object" &&
    !Array.isArray(g) &&
    typeof g.sideA === "number" &&
    typeof g.sideB === "number"
      ? [
          {
            own: side === 1 ? g.sideA : g.sideB,
            opponent: side === 1 ? g.sideB : g.sideA,
          },
        ]
      : [],
  );
}
function Team({ members }: { members: ReturnType<typeof players> }) {
  return (
    <ul className="profile-match-players">
      {members.length ? (
        members.map((p, i) => (
          <li key={i}>
            {p.slug ? (
              <Link href={`/players/${encodeURIComponent(p.slug)}`}>
                {p.name}
              </Link>
            ) : (
              <span>{p.name}</span>
            )}
          </li>
        ))
      ) : (
        <li>Players unavailable</li>
      )}
    </ul>
  );
}
function Match({ row }: { row: HistoryRow }) {
  const side = row.side ?? 1;
  const games = scores(row.score, side);
  const final = row.result_status === "finalized";
  const label = final
    ? row.won
      ? "Win"
      : "Loss"
    : row.result_status === "disputed"
      ? "Under review"
      : "Voided";
  const date = new Date(row.played_at);
  return (
    <li className="profile-match-card">
      <div className="profile-match-meta">
        <span
          className={`profile-match-result ${final && row.won ? "is-win" : ""}`}
        >
          {label}
        </span>
        <time dateTime={row.played_at}>
          {Number.isNaN(date.getTime())
            ? "Date unavailable"
            : date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              })}
        </time>
        {row.has_revision_history && <span>Corrected</span>}
      </div>
      <div className="profile-match-teams">
        <div>
          <p className="profile-match-label">Player’s side</p>
          <Team members={players(row.participants, side)} />
        </div>
        <div
          className="profile-match-scores"
          aria-label="Score, player’s side first"
        >
          {games.length ? (
            games.map((g, i) => (
              <div
                key={i}
                aria-label={`Game ${i + 1}: ${g.own} to ${g.opponent}`}
              >
                <strong>{g.own}</strong>
                <span>–</span>
                <strong>{g.opponent}</strong>
              </div>
            ))
          ) : (
            <span>Score unavailable</span>
          )}
          <small>VS</small>
        </div>
        <div>
          <p className="profile-match-label">
            {row.format === "singles" ? "Opponent" : "Opponents"}
          </p>
          <Team members={players(row.participants, side === 1 ? 2 : 1)} />
        </div>
      </div>
    </li>
  );
}
export function MatchHistory({
  rows,
  filter,
  slug,
  page,
  hasNext = false,
}: {
  rows: HistoryRow[];
  filter?: string;
  slug: string;
  page: number;
  hasNext?: boolean;
}) {
  const href = (kind?: string, target = 1) =>
    `/players/${encodeURIComponent(slug)}?${kind ? `class=${kind}&` : ""}page=${target}`;
  const visible = rows.slice(0, 20);
  return (
    <section
      className="profile-recent-matches"
      aria-labelledby="recent-matches-title"
    >
      <div className="profile-history-heading">
        <h2 id="recent-matches-title">Recent matches</h2>
        <p>Scores, teammates and opponents · newest first in each group.</p>
      </div>
      <nav className="profile-history-filters" aria-label="Match categories">
        {[
          [undefined, "All"],
          ["ranked", "Ranked"],
          ["unranked", "Unranked"],
        ].map(([kind, label]) => (
          <Link
            key={label}
            href={href(kind)}
            aria-current={filter === kind ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!visible.length ? (
        <p className="profile-history-empty">
          No {filter ?? ""} matches yet. Completed official results will appear
          here.
        </p>
      ) : (
        ["ranked", "unranked"]
          .filter((kind) => !filter || filter === kind)
          .map((kind) => {
            const group = visible.filter((row) => row.record_class === kind);
            if (!group.length) return null;
            return (
              <section
                className="profile-history-category"
                key={kind}
                aria-label={`${kind} matches`}
              >
                <h3>{kind === "ranked" ? "Ranked" : "Unranked"}</h3>
                <div className="profile-history-formats">
                  {["doubles", "singles"].map((format) => {
                    const matches = group.filter(
                      (row) => row.format === format,
                    );
                    return (
                      <section key={format} aria-label={`${kind} ${format}`}>
                        <h4>
                          {format === "doubles" ? "Doubles" : "Singles"}{" "}
                          <span>{matches.length}</span>
                        </h4>
                        {matches.length ? (
                          <ol className="profile-match-list">
                            {matches.map((row) => (
                              <Match row={row} key={row.match_id} />
                            ))}
                          </ol>
                        ) : (
                          <p className="profile-history-empty">
                            No {format} matches on this page.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })
      )}
      {(page > 1 || hasNext) && (
        <nav
          className="profile-history-pagination"
          aria-label="Match history pages"
        >
          {page > 1 ? (
            <Link href={href(filter, page - 1)}>Previous</Link>
          ) : (
            <span />
          )}
          <span>Page {page}</span>
          {hasNext ? <Link href={href(filter, page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
