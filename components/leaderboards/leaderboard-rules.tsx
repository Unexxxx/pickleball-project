export function LeaderboardRules({
  description,
  ordering,
  version,
}: {
  description: string;
  ordering: string[];
  version: number;
}) {
  return (
    <aside className="rules-card">
      <h2>Ranking rules</h2>
      <p>{description}</p>
      <p>Order: {ordering.join(", ")}</p>
      <p data-testid="calculation-version">Calculation version {version}</p>
    </aside>
  );
}
