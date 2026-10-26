import Link from "next/link";
export type LeaderboardRow = {
  player_id?: string | null;
  rank: number | null;
  public_slug: string | null;
  display_name: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  win_rate: number | null;
  calculation_version: number | null;
};
export function LeaderboardTable({
  rows,
  memberIds,
}: {
  rows: LeaderboardRow[];
  /** On a club leaderboard, marks which players are club members. */
  memberIds?: Set<string>;
}) {
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
                {memberIds && row.player_id && memberIds.has(row.player_id) ? (
                  <span className="ph-badge leaderboard-member">Member</span>
                ) : null}
              </td>
              <td>{row.rating == null ? "—" : Math.round(row.rating)}</td>
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
