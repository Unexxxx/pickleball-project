// Read-only preview. Node 22+ with native TypeScript support.
// node --env-file=.env scripts/preview-team-ratings.mjs EVENT_ID
import { createClient } from "@supabase/supabase-js";
import { updateTeamSkills } from "../lib/domain/team-bayes.ts";
const eventId = process.argv[2];
if (!eventId) throw new Error("Event ID required");
const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data: matches, error } = await s
  .from("matches")
  .select(
    "id,played_at,assigned_at,record_class,status,match_participants(player_id,side,position,players(display_name)),match_results(current_revision_id,result_revisions!result_revisions_result_id_fkey(id,score,winner_side))",
  )
  .eq("event_id", eventId);
if (error) throw error;
const ratings = new Map();
let count = 0;
for (const m of matches.sort(
  (a, b) =>
    (a.played_at ?? a.assigned_at).localeCompare(
      b.played_at ?? b.assigned_at,
    ) || a.id.localeCompare(b.id),
)) {
  if (
    m.record_class !== "ranked" ||
    !["score_pending", "finalized"].includes(m.status)
  )
    continue;
  const result = Array.isArray(m.match_results)
    ? m.match_results[0]
    : m.match_results;
  const revision = result?.result_revisions.find(
    (r) => r.id === result.current_revision_id,
  );
  if (!revision) throw new Error(`Missing current score: ${m.id}`);
  const input = m.match_participants
    .sort((a, b) => a.side - b.side || a.position - b.position)
    .map((p) => {
      const previous = ratings.get(p.player_id) ?? {
        mu: 1500,
        sigma: 350,
        wins: 0,
        losses: 0,
        name: p.players.display_name,
      };
      ratings.set(p.player_id, previous);
      return {
        id: p.player_id,
        side: p.side,
        mu: previous.mu,
        sigma: previous.sigma,
      };
    });
  for (const p of updateTeamSkills(input, revision.winner_side)) {
    const previous = ratings.get(p.id);
    ratings.set(p.id, {
      ...previous,
      mu: Number(p.mu.toFixed(2)),
      sigma: Number(p.sigma.toFixed(6)),
      wins: previous.wins + (p.side === revision.winner_side ? 1 : 0),
      losses: previous.losses + (p.side !== revision.winner_side ? 1 : 0),
    });
  }
  count++;
}
if (process.argv.includes("--verify")) {
  const { data: stored, error: storedError } = await s
    .from("player_statistics")
    .select("player_id,rating,rating_deviation,rating_model,wins,losses")
    .in("player_id", [...ratings.keys()]);
  if (storedError) throw storedError;
  if (stored.length !== ratings.size)
    throw new Error("Stored player count differs from preview");
  for (const row of stored) {
    const expected = ratings.get(row.player_id);
    if (
      row.rating_model !== "team-bayes-v1" ||
      Math.abs(row.rating - expected.mu) > 0.011 ||
      Math.abs(row.rating_deviation - expected.sigma) > 0.00001 ||
      row.wins !== expected.wins ||
      row.losses !== expected.losses
    ) {
      throw new Error(`Stored rating differs from preview: ${row.player_id}`);
    }
  }
  console.log(
    "PASS: all stored ratings, uncertainties, wins and losses match the preview.",
  );
}
console.log(
  JSON.stringify(
    {
      model: "team-bayes-v1",
      matches: count,
      players: ratings.size,
      minRating: Math.min(...[...ratings.values()].map((p) => p.mu)),
      maxRating: Math.max(...[...ratings.values()].map((p) => p.mu)),
      provisionalPlayers: [...ratings.values()].filter((p) => p.sigma > 175)
        .length,
      ratings: process.argv.includes("--summary")
        ? undefined
        : [...ratings]
            .map(([playerId, p]) => ({
              playerId,
              ...p,
              provisional: p.sigma > 175,
            }))
            .sort((a, b) => b.mu - a.mu),
    },
    null,
    2,
  ),
);
