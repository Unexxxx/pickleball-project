import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClub } from "@/lib/queries/clubs";
import {
  AssignmentBoard,
  type AssignmentView,
} from "@/components/matches/assignment-board";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const supabase = await createClient();
  const [
    { data: event },
    { data: matches },
    { data: courts },
    { data: results },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("club_id", club.id)
      .single(),
    supabase
      .from("matches")
      .select(
        "id,court_id,format,status,match_participants(player_id,side,players(display_name,avatar_path))",
      )
      .eq("event_id", eventId)
      .order("assigned_at", { ascending: false }),
    supabase.from("event_courts").select("id,label").eq("event_id", eventId),
    supabase
      .from("match_results")
      .select(
        "match_id,result_revisions!match_results_current_revision_fkey(score,winner_side)",
      )
      .eq("event_id", eventId),
  ]);
  if (!event) notFound();
  const labels = new Map(
    (courts ?? []).map((court) => [court.id, court.label]),
  );
  const resultByMatch = new Map(
    (results ?? []).map((result) => {
      const revision = result.result_revisions;
      return [
        result.match_id,
        {
          score: (revision?.score ?? { games: [] }) as {
            games: { sideA: number; sideB: number }[];
          },
          winnerSide: revision?.winner_side ?? null,
        },
      ];
    }),
  );
  const assignmentViews = (matches ?? []).map((match) => ({
    id: match.id,
    courtLabel: labels.get(match.court_id) ?? "Court",
    format: match.format,
    status: match.status,
    players: match.match_participants.map((participant) => ({
      playerId: participant.player_id,
      side: participant.side,
      displayName: participant.players?.display_name ?? "Player",
      avatarUrl: participant.players?.avatar_path
        ? supabase.storage
            .from("avatars")
            .getPublicUrl(participant.players.avatar_path).data.publicUrl
        : null,
    })),
    result: resultByMatch.get(match.id),
  })) satisfies AssignmentView[];
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Matches</h1>
        <p>Review active assignments, submitted scores, and event results.</p>
      </header>
      <AssignmentBoard
        clubId={club.id}
        eventId={eventId}
        assignments={assignmentViews}
      />
    </main>
  );
}
