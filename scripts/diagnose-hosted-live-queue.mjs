import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_EVENT_ID",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const one = async (promise) => {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
};

const event = await one(
  client
    .from("events")
    .select(
      "id,name,club_id,status,record_class,formats,clubs(name,subscription_status,subscription_valid_until)",
    )
    .eq("id", process.env.TARGET_EVENT_ID)
    .single(),
);
const courts = await one(
  client
    .from("event_courts")
    .select("id,label,status,current_match_id")
    .eq("event_id", event.id)
    .order("label"),
);
const ready = await one(
  client
    .from("event_queue_entries")
    .select("id,player_id,position_key,joined_at,players(display_name)")
    .eq("event_id", event.id)
    .eq("state", "ready")
    .order("position_key"),
);
const playerIds = ready.map((entry) => entry.player_id);
const accounts = playerIds.length
  ? await one(
      client
        .from("accounts")
        .select("player_id,contact_verified_at")
        .in("player_id", playerIds),
    )
  : [];
const attestations = playerIds.length
  ? await one(
      client
        .from("identity_attestations")
        .select("player_id,revoked_at")
        .eq("club_id", event.club_id)
        .in("player_id", playerIds),
    )
  : [];
const accountByPlayer = new Map(accounts.map((row) => [row.player_id, row]));
const attestationByPlayer = new Map(
  attestations.map((row) => [row.player_id, row]),
);

console.log(
  JSON.stringify({
    event,
    courts,
    readyQueue: ready.map((entry) => ({
      playerId: entry.player_id,
      displayName: entry.players?.display_name,
      position: entry.position_key,
      joinedAt: entry.joined_at,
      contactVerified: Boolean(
        accountByPlayer.get(entry.player_id)?.contact_verified_at,
      ),
      identityAttested: Boolean(
        attestationByPlayer.has(entry.player_id) &&
        !attestationByPlayer.get(entry.player_id)?.revoked_at,
      ),
    })),
  }),
);
