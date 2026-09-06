import Link from "next/link";
export type LeaderboardRow = {
  rank: number | null;
  public_slug: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  win_rate: number | null;
  calculation_version: number | null;
};
export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <caption className="sr-only">Pickleball rankings</caption>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Rating</th>
            <th>W–L</th>
            <th>Win rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.public_slug}>
              <td>
                <span className="rank-chip">{row.rank}</span>
              </td>
              <td>
                <Link href={`/players/${row.public_slug}`}>
                  {row.display_name}
                </Link>
              </td>
              <td>{row.rating}</td>
              <td>
                {row.wins}–{row.losses}
              </td>
              <td>{(Number(row.win_rate) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p>No eligible ranked players yet.</p> : null}
    </div>
  );
}
