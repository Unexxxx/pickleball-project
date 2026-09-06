import Link from "next/link";
import {
  getLeaderboard,
  getLeaderboardRules,
} from "@/lib/queries/leaderboards";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { LeaderboardRules } from "@/components/leaderboards/leaderboard-rules";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1),
    [rows, rules] = await Promise.all([
      getLeaderboard({ scope: "overall", page }),
      getLeaderboardRules(),
    ]),
    version = Math.max(0, ...rows.map((r) => r.calculation_version ?? 0));
  return (
    <main>
      <h1>All-time leaderboard</h1>
      <p>One trusted overall ranking per canonical player.</p>
      <LeaderboardTable rows={rows} />
      {rules ? (
        <LeaderboardRules
          description={rules.description}
          ordering={rules.ordering}
          version={version}
        />
      ) : null}
      <Link href={`/api/exports/leaderboard?scope=overall&page=${page}`}>
        Download CSV
      </Link>
    </main>
  );
}
