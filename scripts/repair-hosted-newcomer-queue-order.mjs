import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1") {
  throw new Error(
    "Set ALLOW_HOSTED_E2E_SETUP=1 to repair hosted E2E queue order",
  );
}
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_EVENT_ID",
  "NEWCOMER_SLUGS",
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
const slugs = process.env.NEWCOMER_SLUGS.split(",").map((slug) => slug.trim());
const event = await one(
  client
    .from("events")
    .select("queue_version")
    .eq("id", process.env.TARGET_EVENT_ID)
    .single(),
);
const players = await one(
  client
    .from("players")
    .select("id,public_slug,display_name")
    .in("public_slug", slugs),
);
if (players.length !== slugs.length)
  throw new Error("A newcomer player was not found");

const playerBySlug = new Map(
  players.map((player) => [player.public_slug, player]),
);
const orderedPlayers = slugs.map((slug) => playerBySlug.get(slug));
const ready = await one(
  client
    .from("event_queue_entries")
    .select("id,player_id,position_key")
    .eq("event_id", process.env.TARGET_EVENT_ID)
    .eq("state", "ready"),
);
const entryByPlayer = new Map(ready.map((entry) => [entry.player_id, entry]));
if (orderedPlayers.some((player) => !player || !entryByPlayer.has(player.id))) {
  throw new Error(
    "A newcomer is no longer in the ready queue; no repair was applied",
  );
}

let nextPosition = Math.max(...ready.map((entry) => entry.position_key), 0);
const repaired = [];
for (const player of orderedPlayers) {
  nextPosition += 1000;
  const entry = entryByPlayer.get(player.id);
  await one(
    client
      .from("event_queue_entries")
      .update({ position_key: nextPosition })
      .eq("id", entry.id)
      .eq("state", "ready"),
  );
  repaired.push({ name: player.display_name, position: nextPosition });
}
await one(
  client
    .from("events")
    .update({ queue_version: event.queue_version + 1 })
    .eq("id", process.env.TARGET_EVENT_ID)
    .eq("queue_version", event.queue_version),
);

console.log(JSON.stringify({ eventId: process.env.TARGET_EVENT_ID, repaired }));
