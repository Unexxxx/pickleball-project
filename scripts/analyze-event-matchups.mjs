import { createClient } from "@supabase/supabase-js";
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const eventId = process.argv[2];
if (!eventId) throw new Error("Event ID required");
const { data: matches, error } = await client
  .from("matches")
  .select(
    "id,status,policy_version,assigned_at,completed_at,match_participants(player_id,side,players(display_name)),match_results(status,current_revision_id,result_revisions!result_revisions_result_id_fkey(id,winner_side,score))",
  )
  .eq("event_id", eventId)
  .order("assigned_at")
  .order("id");
if (error) throw error;
const pair = (a, b) => [a, b].sort().join("|");
const teammates = new Map(),
  opponents = new Map(),
  groups = new Map(),
  players = new Map();
const rows = [];
for (const m of matches) {
  if (["canceled", "voided"].includes(m.status)) continue;
  const ps = m.match_participants;
  const a = ps.filter((p) => p.side === 1),
    b = ps.filter((p) => p.side === 2);
  const repeatedTeams = [],
    repeatedOpponents = [];
  for (const p of ps) {
    if (!players.has(p.player_id))
      players.set(p.player_id, {
        name: p.players?.display_name,
        games: 0,
        partners: new Set(),
        opponents: new Set(),
        timeline: [],
      });
  }
  for (const side of [a, b])
    for (let i = 0; i < side.length; i++)
      for (let j = i + 1; j < side.length; j++) {
        const x = side[i],
          y = side[j],
          key = pair(x.player_id, y.player_id),
          previous = teammates.get(key) ?? [];
        if (previous.length)
          repeatedTeams.push({
            pair: [x.players?.display_name, y.players?.display_name],
            previous: [...previous],
          });
        teammates.set(key, [...previous, rows.length + 1]);
        players.get(x.player_id).partners.add(y.player_id);
        players.get(y.player_id).partners.add(x.player_id);
      }
  for (const x of a)
    for (const y of b) {
      const key = pair(x.player_id, y.player_id),
        previous = opponents.get(key) ?? [];
      if (previous.length) repeatedOpponents.push(key);
      opponents.set(key, [...previous, rows.length + 1]);
      players.get(x.player_id).opponents.add(y.player_id);
      players.get(y.player_id).opponents.add(x.player_id);
    }
  for (const p of ps) {
    const item = players.get(p.player_id);
    item.games++;
    item.timeline.push({
      match: rows.length + 1,
      partners: ps
        .filter((q) => q.side === p.side && q.player_id !== p.player_id)
        .map((q) => q.players?.display_name),
    });
  }
  const key = ps
    .map((p) => p.player_id)
    .sort()
    .join("|");
  groups.set(key, [...(groups.get(key) ?? []), rows.length + 1]);
  const result = Array.isArray(m.match_results)
      ? m.match_results[0]
      : m.match_results,
    revision = result?.result_revisions?.find(
      (r) => r.id === result.current_revision_id,
    );
  rows.push({
    number: rows.length + 1,
    id: m.id,
    status: m.status,
    policy: m.policy_version,
    at: m.assigned_at,
    a: a.map((p) => p.players?.display_name),
    b: b.map((p) => p.players?.display_name),
    score: revision?.score,
    repeatedTeams,
    repeatedOpponentPairs: repeatedOpponents.length,
  });
}
const { data: stats, error: statsError } = await client
  .from("player_statistics")
  .select("player_id,rating,wins,losses")
  .in("player_id", [...players.keys()]);
if (statsError) throw statsError;
const { data: proposals, error: proposalError } = await client
  .from("match_proposals")
  .select("policy_version,snapshot")
  .eq("event_id", eventId);
if (proposalError) throw proposalError;
console.log(
  JSON.stringify({
    rawCount: matches.length,
    statuses: matches.reduce(
      (a, m) => ((a[m.status] = (a[m.status] ?? 0) + 1), a),
      {},
    ),
    policies: matches.reduce(
      (a, m) => ((a[m.policy_version] = (a[m.policy_version] ?? 0) + 1), a),
      {},
    ),
    uniquePlayers: players.size,
    uniqueTeammatePairs: teammates.size,
    uniqueOpponentPairs: opponents.size,
    repeatedTeamOccurrences: [...teammates.values()].reduce(
      (a, v) => a + v.length - 1,
      0,
    ),
    repeatedOpponentOccurrences: [...opponents.values()].reduce(
      (a, v) => a + v.length - 1,
      0,
    ),
    repeatedGroups: [...groups.values()].filter((v) => v.length > 1),
    players: [...players.values()].map((p) => ({
      name: p.name,
      games: p.games,
      partners: p.partners.size,
      opponents: p.opponents.size,
    })),
    statisticsRows: stats,
    proposalMetrics: proposals
      ?.filter((p) => p.policy_version === "matchmaking-v2")
      .map((p) => p.snapshot),
    matches: rows.map((r) => ({
      n: r.number,
      a: r.a,
      b: r.b,
      score: r.score,
      repeatPartners: r.repeatedTeams.length,
      repeatOpponents: r.repeatedOpponentPairs,
    })),
  }),
);
