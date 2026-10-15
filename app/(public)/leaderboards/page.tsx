import type { Metadata } from "next";
import { getLeaderboard } from "@/lib/queries/leaderboards";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
export const metadata: Metadata = {
  title: "Pickleball Rankings — All-Time Leaderboard",
  description:
    "The all-time UNEX pickleball leaderboard: player ratings and rankings built from confirmed club match results.",
  alternates: { canonical: "/leaderboards" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1),
    rows = await getLeaderboard({ scope: "overall", page });
  return (
    <main>
      <h1>All-time leaderboard</h1>
      <p>One trusted overall ranking per canonical player.</p>
      <LeaderboardTable rows={rows} />
    </main>
  );
}
