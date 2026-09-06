export type LeaderboardExportRow = {
  rank: number;
  displayName: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
};
const csv = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
export function serializeLeaderboardCsv(rows: LeaderboardExportRow[]) {
  return (
    [
      ["Rank", "Player", "Rating", "Wins", "Losses", "Win rate"],
      ...rows.map((row) => [
        row.rank,
        row.displayName,
        row.rating,
        row.wins,
        row.losses,
        (row.winRate * 100).toFixed(1) + "%",
      ]),
    ]
      .map((values) => values.map(csv).join(","))
      .join("\r\n") + "\r\n"
  );
}
