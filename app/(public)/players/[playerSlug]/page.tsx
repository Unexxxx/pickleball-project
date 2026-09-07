import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicPlayer,
  getPublicPlayerStatistics,
} from "@/lib/queries/players";
import { getPublicMatchHistory } from "@/lib/queries/matches";
import { ProfileHeader } from "@/components/profiles/profile-header";
import { StatGrid } from "@/components/profiles/stat-grid";
import { MatchHistory } from "@/components/profiles/match-history";
type Props = {
  params: Promise<{ playerSlug: string }>;
  searchParams: Promise<{ class?: string; page?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublicPlayer((await params).playerSlug);
  return {
    title: p ? `${p.display_name} · Pickleball record` : "Player not found",
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { playerSlug } = await params,
    q = await searchParams,
    player = await getPublicPlayer(playerSlug);
  if (!player) notFound();
  const stats = await getPublicPlayerStatistics(playerSlug),
    filter =
      q.class === "ranked" || q.class === "unranked" ? q.class : undefined,
    page = /^\d+$/.test(q.page ?? "")
      ? Math.min(10000, Math.max(1, Number(q.page)))
      : 1,
    history = await getPublicMatchHistory(player.player_id!, {
      recordClass: filter,
      page,
    }),
    safeHistory = history.flatMap((row) =>
      row.match_id &&
      row.format &&
      row.record_class &&
      row.played_at &&
      row.result_status
        ? [
            {
              match_id: row.match_id,
              format: row.format,
              record_class: row.record_class,
              played_at: row.played_at,
              result_status: row.result_status,
              won: row.won ?? false,
              has_revision_history: row.has_revision_history ?? false,
              side: row.side ?? 1,
              score: row.score,
              participants: row.participants,
            },
          ]
        : [],
    );
  const avatarUrl = player.avatar_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${player.avatar_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : null;
  return (
    <main className="space-y-6">
      <ProfileHeader
        name={player.display_name!}
        slug={player.public_slug!}
        avatarUrl={avatarUrl}
      />
      {stats ? (
        <StatGrid
          stats={{
            rating: stats.rating ?? 1500,
            wins: stats.wins ?? 0,
            losses: stats.losses ?? 0,
            win_rate: stats.win_rate ?? 0,
            current_streak: stats.current_streak ?? 0,
            longest_win_streak: stats.longest_win_streak ?? 0,
          }}
        />
      ) : null}
      <MatchHistory
        rows={safeHistory}
        filter={filter}
        slug={playerSlug}
        page={page}
        hasNext={safeHistory.length > 20}
      />
    </main>
  );
}
