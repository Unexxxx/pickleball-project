import Link from "next/link";
export type HistoryRow = {
  match_id: string;
  format: string;
  record_class: string;
  played_at: string;
  result_status: string;
  won: boolean;
  has_revision_history: boolean;
};
export function MatchHistory({
  rows,
  filter,
  slug,
  page,
}: {
  rows: HistoryRow[];
  filter?: string;
  slug: string;
  page: number;
}) {
  return (
    <section>
      <div className="flex gap-3">
        <Link href={`/players/${slug}`}>All</Link>
        <Link href={`/players/${slug}?class=ranked`}>Ranked</Link>
        <Link href={`/players/${slug}?class=unranked`}>Unranked</Link>
      </div>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.match_id} className="border-b py-3">
              <Link href={`/matches/${row.match_id}`}>
                {row.won ? "Win" : "Loss"} · {row.format} · {row.record_class}
              </Link>
              {row.has_revision_history ? <span> · Corrected</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No {filter ?? ""} matches yet.</p>
      )}
      <nav aria-label="Match history pages">
        <Link
          href={`/players/${slug}?${filter ? `class=${filter}&` : ""}page=${Math.max(1, page - 1)}`}
        >
          Previous
        </Link>{" "}
        <Link
          href={`/players/${slug}?${filter ? `class=${filter}&` : ""}page=${page + 1}`}
        >
          Next
        </Link>
      </nav>
    </section>
  );
}
