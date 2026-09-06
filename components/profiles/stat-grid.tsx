export function StatGrid({
  stats,
}: {
  stats: {
    rating: number;
    wins: number;
    losses: number;
    win_rate: number;
    current_streak: number;
    longest_win_streak: number;
  };
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries({
        Rating: stats.rating,
        Wins: stats.wins,
        Losses: stats.losses,
        "Win rate": `${(stats.win_rate * 100).toFixed(1)}%`,
        "Current streak": stats.current_streak,
        "Longest streak": stats.longest_win_streak,
      }).map(([label, value]) => (
        <div key={label} className="stat-card">
          <dt>{label}</dt>
          <dd className="text-xl font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
