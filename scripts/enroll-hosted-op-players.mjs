import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1") {
  throw new Error("Set ALLOW_HOSTED_E2E_SETUP=1 to enroll hosted E2E fixtures");
}

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
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
  (() => {
    let query = client.from("events").select("id,name,capacity,status");
    if (process.env.TARGET_EVENT_ID) {
      query = query.eq("id", process.env.TARGET_EVENT_ID);
    } else if (process.env.TARGET_EVENT_JOIN_CODE) {
      query = query.eq("join_code", process.env.TARGET_EVENT_JOIN_CODE);
    } else {
      throw new Error("TARGET_EVENT_ID or TARGET_EVENT_JOIN_CODE is required");
    }
    return query.single();
  })(),
);
if (
  !["published", "registration_closed", "in_progress"].includes(event.status)
) {
  throw new Error(
    `Event status ${event.status} does not accept fixture enrollment`,
  );
}

const registrations = await one(
  client
    .from("event_registrations")
    .select("player_id,status")
    .eq("event_id", event.id)
    .in("status", ["confirmed", "waitlisted"]),
);
const confirmedCount = registrations.filter(
  (registration) => registration.status === "confirmed",
).length;
const remaining = Math.max(0, event.capacity - confirmedCount);
const registeredIds = new Set(
  registrations.map((registration) => registration.player_id),
);

const candidates = await one(
  client
    .from("players")
    .select("id,display_name,public_slug")
    .like("public_slug", "op-player-%")
    .is("merged_into_player_id", null),
);
const selected = candidates
  .filter((player) => !registeredIds.has(player.id))
  .sort((a, b) => {
    const aNumber = Number(a.public_slug.replace("op-player-", ""));
    const bNumber = Number(b.public_slug.replace("op-player-", ""));
    return aNumber - bNumber;
  })
  .slice(0, remaining);

if (selected.length) {
  await one(
    client.from("event_registrations").insert(
      selected.map((player) => ({
        event_id: event.id,
        player_id: player.id,
        status: "confirmed",
        terms_version: "hosted-e2e-capacity-2026-09-05",
      })),
    ),
  );
}

console.log(
  JSON.stringify({
    eventId: event.id,
    eventName: event.name,
    capacity: event.capacity,
    confirmedBefore: confirmedCount,
    enrolled: selected.length,
    confirmedAfter: confirmedCount + selected.length,
    players: selected.map((player) => player.display_name),
  }),
);
