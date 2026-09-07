import { createClient } from "@/lib/supabase/server";
import { getClub } from "@/lib/queries/clubs";
import { notFound } from "next/navigation";
import { RealtimeQueue } from "@/components/queues/realtime-queue";
import { QueueCard } from "@/components/queues/queue-card";
import { QueueBoard } from "@/components/queues/queue-board";
import type { QueueItem, QueueSnapshot } from "@/lib/realtime/event-operations";
import { currentPlayerId } from "@/lib/auth/authorization";
import type { PlayerQueueState } from "@/components/queues/queue-card";
import {
  LiveEventBoard,
  type LiveCourtMatch,
} from "@/components/queues/live-event-board";
export default async function QueuePage({
  params,
}: PageProps<"/dashboard/clubs/[clubSlug]/events/[eventId]/queue">) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const s = await createClient();
  const playerId = await currentPlayerId();
  const [
    { data },
    { data: matches },
    { data: completedMatches },
    { data: courts },
    { data: membership },
  ] = await Promise.all([
    s
      .from("events")
      .select(
        "status,formats,eligibility,queue_version,event_queue_entries(id,player_id,state,position_key,version,players(display_name,public_slug,avatar_path)),event_attendance(player_id,state),event_registrations(player_id,status)",
      )
      .eq("id", eventId)
      .eq("club_id", club.id)
      .single(),
    s
      .from("matches")
      .select(
        "id,court_id,format,status,assigned_at,match_participants(player_id,side,players(display_name,public_slug,avatar_path))",
      )
      .eq("event_id", eventId)
      .in("status", ["assigned", "playing"])
      .order("assigned_at", { ascending: true }),
    s
      .from("matches")
      .select("id,completed_at,match_participants(player_id,side)")
      .eq("event_id", eventId)
      .in("status", ["score_pending", "finalized", "disputed"])
      .order("completed_at", { ascending: false }),
    s
      .from("event_courts")
      .select("id,label,status,current_match_id")
      .eq("event_id", eventId),
    s
      .from("club_memberships")
      .select("role")
      .eq("club_id", club.id)
      .eq("player_id", playerId ?? "")
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (!data) notFound();
  const competitionPlayerIds = [
    ...new Set([
      ...data.event_queue_entries.map((entry) => entry.player_id),
      ...(matches ?? []).flatMap((match) =>
        match.match_participants.map((participant) => participant.player_id),
      ),
    ]),
  ];
  const [{ data: playerStatistics }, { data: leaderboardRows }] =
    competitionPlayerIds.length
      ? await Promise.all([
          s
            .from("public_player_statistics")
            .select("player_id,rating,wins,losses,rating_deviation,provisional")
            .in("player_id", competitionPlayerIds),
          s
            .from("public_leaderboards")
            .select("player_id,rank")
            .eq("scope", "overall")
            .in("player_id", competitionPlayerIds),
        ])
      : [{ data: [] }, { data: [] }];
  const ranks = new Map(
    (leaderboardRows ?? []).map((row) => [row.player_id, row.rank]),
  );
  const playerCompetition = new Map(
    (playerStatistics ?? []).map((row) => [
      row.player_id,
      {
        rating: Number(row.rating),
        provisional: row.provisional ?? true,
        ratingDeviation: row.rating_deviation ?? 350,
        wins: row.wins,
        losses: row.losses,
        rank: ranks.get(row.player_id) ?? null,
      },
    ]),
  );
  const eventMatchCounts = new Map<string, number>();
  for (const match of completedMatches ?? []) {
    for (const participant of match.match_participants) {
      eventMatchCounts.set(
        participant.player_id,
        (eventMatchCounts.get(participant.player_id) ?? 0) + 1,
      );
    }
  }
  const queue = data.event_queue_entries
    .filter((q) => q.state === "ready")
    .map((q) => ({
      id: q.id,
      playerId: q.player_id,
      state: q.state,
      position: q.position_key,
      version: q.version,
      displayName: q.players?.display_name,
      avatarUrl: q.players?.avatar_path
        ? s.storage.from("avatars").getPublicUrl(q.players.avatar_path).data
            .publicUrl
        : null,
      totalMatches: eventMatchCounts.get(q.player_id) ?? 0,
    }))
    .sort((a, b) => a.position - b.position) satisfies QueueItem[];
  const format =
    data.formats.includes("singles") && !data.formats.includes("doubles")
      ? "singles"
      : "doubles";
  const ownReadyIndex = queue.findIndex((entry) => entry.playerId === playerId);
  const ownAssigned = data.event_queue_entries.some(
    (entry) => entry.player_id === playerId && entry.state === "assigned",
  );
  const isConfirmed = data.event_registrations.some(
    (registration) =>
      registration.player_id === playerId &&
      registration.status === "confirmed",
  );
  const isCheckedIn = data.event_attendance.some(
    (attendance) =>
      attendance.player_id === playerId && attendance.state === "checked_in",
  );
  const playerQueueState: PlayerQueueState =
    data.status !== "in_progress"
      ? "event_not_started"
      : ownAssigned
        ? "assigned"
        : ownReadyIndex >= 0
          ? "queued"
          : !isConfirmed
            ? "not_registered"
            : !isCheckedIn
              ? "not_checked_in"
              : "eligible";
  const snapshot: QueueSnapshot = {
    eventId,
    eventVersion: data.queue_version,
    queue,
    courts: [],
    assignments: [],
    participantStatus: "unknown",
  };
  const courtLabels = new Map(
    (courts ?? []).map((court) => [court.id, court.label]),
  );
  const liveMatches = (matches ?? []).map((match) => ({
    id: match.id,
    courtLabel: courtLabels.get(match.court_id) ?? "Court",
    format: match.format,
    status: match.status,
    assignedAt: match.assigned_at,
    players: match.match_participants.map((participant) => ({
      playerId: participant.player_id,
      side: participant.side,
      displayName: participant.players?.display_name ?? "Player",
      publicSlug: participant.players?.public_slug ?? null,
      avatarUrl: participant.players?.avatar_path
        ? s.storage
            .from("avatars")
            .getPublicUrl(participant.players.avatar_path).data.publicUrl
        : null,
      rating: playerCompetition.get(participant.player_id)?.rating ?? 1500,
      provisional:
        playerCompetition.get(participant.player_id)?.provisional ?? true,
      ratingDeviation:
        playerCompetition.get(participant.player_id)?.ratingDeviation ?? 350,
      totalMatches: eventMatchCounts.get(participant.player_id) ?? 0,
    })),
  })) satisfies LiveCourtMatch[];
  const configuredDuration =
    data.eligibility &&
    typeof data.eligibility === "object" &&
    !Array.isArray(data.eligibility) &&
    typeof data.eligibility.matchDurationMinutes === "number"
      ? data.eligibility.matchDurationMinutes
      : 15;
  return (
    <main className="event-operations-page queue-page">
      <header className="queue-page-header">
        <div>
          <p className="eyebrow">Event operations</p>
          <h1>Live queue</h1>
          <p>Follow the current courts, next lineup, and upcoming rotation.</p>
        </div>
        <RealtimeQueue clubId={club.id} initial={snapshot} />
      </header>
      <LiveEventBoard
        matches={liveMatches}
        queue={queue}
        format={format}
        matchesHref={`/dashboard/clubs/${clubSlug}/events/${eventId}/matches`}
        clubSlug={clubSlug}
        eventId={eventId}
        canManage={
          membership?.role === "owner" || membership?.role === "organizer"
        }
        viewerPlayerId={playerId}
        courtAvailable={(courts ?? []).some(
          (court) => court.status === "available" && !court.current_match_id,
        )}
        queueVersion={data.queue_version}
        matchDurationMinutes={configuredDuration}
      />
      <QueueCard
        eventId={eventId}
        state={playerQueueState}
        position={ownReadyIndex >= 0 ? ownReadyIndex + 1 : undefined}
      />
      {membership?.role === "owner" || membership?.role === "organizer" ? (
        <QueueBoard
          clubId={club.id}
          eventId={eventId}
          entries={queue.slice(format === "singles" ? 4 : 8)}
        />
      ) : null}
    </main>
  );
}
