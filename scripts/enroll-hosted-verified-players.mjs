import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1")
  throw new Error("Set ALLOW_HOSTED_E2E_SETUP=1 for hosted test mutations");

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_EVENT_JOIN_CODE",
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
    .select("id,name,capacity,status")
    .eq("join_code", process.env.TARGET_EVENT_JOIN_CODE)
    .single(),
);
if (!["published", "registration_closed", "in_progress"].includes(event.status))
  throw new Error(`Event status ${event.status} does not accept enrollment`);

const registrations = await one(
  client
    .from("event_registrations")
    .select("player_id,status,waitlist_position")
    .eq("event_id", event.id)
    .in("status", ["confirmed", "waitlisted"]),
);
const registeredIds = new Set(registrations.map(({ player_id }) => player_id));
const confirmedBefore = registrations.filter(
  ({ status }) => status === "confirmed",
).length;
const waitlistMax = registrations.reduce(
  (maximum, registration) =>
    Math.max(maximum, Number(registration.waitlist_position ?? 0)),
  0,
);

const accounts = await one(
  client
    .from("accounts")
    .select("player_id,contact_verified_at")
    .not("contact_verified_at", "is", null),
);
const verifiedIds = accounts
  .map(({ player_id }) => player_id)
  .filter((playerId) => !registeredIds.has(playerId));
const players = verifiedIds.length
  ? await one(
      client
        .from("players")
        .select("id,display_name,created_at")
        .in("id", verifiedIds)
        .is("merged_into_player_id", null)
        .order("created_at", { ascending: true }),
    )
  : [];

const openConfirmedSlots = Math.max(0, event.capacity - confirmedBefore);
const rows = players.map((player, index) => {
  const confirmed = index < openConfirmedSlots;
  return {
    event_id: event.id,
    player_id: player.id,
    status: confirmed ? "confirmed" : "waitlisted",
    waitlist_position: confirmed
      ? null
      : waitlistMax + index - openConfirmedSlots + 1,
    terms_version: "hosted-test-bulk-enrollment-2026-09-08",
  };
});

const summary = {
  eventId: event.id,
  eventName: event.name,
  eventStatus: event.status,
  capacity: event.capacity,
  confirmedBefore,
  verifiedPlayersToAdd: rows.length,
  confirmedToAdd: rows.filter(({ status }) => status === "confirmed").length,
  waitlistedToAdd: rows.filter(({ status }) => status === "waitlisted").length,
  players: players.map(({ display_name }) => display_name),
};

if (process.env.APPLY_HOSTED_MUTATION === "1" && rows.length) {
  await one(client.from("event_registrations").insert(rows));
  summary.applied = true;
} else {
  summary.applied = false;
}

console.log(JSON.stringify(summary));
