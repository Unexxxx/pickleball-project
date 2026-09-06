export function ResultCard({
  score,
  status,
  calculationVersion,
}: {
  score: { games: { sideA: number; sideB: number }[] };
  status: string;
  calculationVersion?: number | null;
}) {
  return (
    <section className="rounded-lg bg-slate-50 p-3">
      <h4>Result · {status}</h4>
      {score.games.map((game, index) => (
        <p key={index}>
          Game {index + 1}: {game.sideA}–{game.sideB}
        </p>
      ))}
      {calculationVersion ? (
        <p>Calculation version {calculationVersion}</p>
      ) : null}
    </section>
  );
}
