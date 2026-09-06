import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1")
  throw new Error(
    "Set ALLOW_HOSTED_E2E_SETUP=1 to modify the hosted E2E project",
  );

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_USER_EMAIL",
  "E2E_CLUB_SLUG",
];
for (const name of required)
  if (!process.env[name]) throw new Error(`${name} is required`);

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const eventId = "50000000-0000-4000-8000-000000000001";
const courtIds = [
  "50000000-0000-4000-8000-000000000011",
  "50000000-0000-4000-8000-000000000012",
];

const one = async (promise) => {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
};

const club = await one(
  client
    .from("clubs")
    .select("id,slug")
    .eq("slug", process.env.E2E_CLUB_SLUG)
    .single(),
);
const users = await one(
  client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
);
const organizerUser = users.users.find(
  (user) =>
    user.email?.toLowerCase() === process.env.E2E_USER_EMAIL.toLowerCase(),
);
if (!organizerUser) throw new Error("E2E Auth user was not found");
const organizerAccount = await one(
  client
    .from("accounts")
    .select("player_id")
    .eq("auth_user_id", organizerUser.id)
    .single(),
);

await one(
  client.from("club_memberships").upsert(
    {
      club_id: club.id,
      player_id: organizerAccount.player_id,
      role: "owner",
      status: "active",
    },
    { onConflict: "club_id,player_id" },
  ),
);
await one(
  client.from("identity_attestations").upsert(
    {
      club_id: club.id,
      player_id: organizerAccount.player_id,
      attested_by_player_id: organizerAccount.player_id,
      attestation_type: "club_record",
      note: "Hosted E2E fixture",
    },
    { onConflict: "club_id,player_id,attestation_type" },
  ),
);

const fixturePlayers = [];
for (let index = 1; index <= 4; index += 1) {
  const email = `pickleball-e2e-player-${index}@example.test`;
  let user = users.users.find((candidate) => candidate.email === email);
  if (!user) {
    user = await one(
      client.auth.admin.createUser({
        email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
      }),
    ).then((result) => result.user);
  }
  const playerId = `51000000-0000-4000-8000-00000000000${index}`;
  await one(
    client.from("players").upsert({
      id: playerId,
      public_slug: `e2e-player-${index}`,
      display_name: `E2E Player ${index}`,
    }),
  );
  await one(
    client.from("accounts").upsert(
      {
        auth_user_id: user.id,
        player_id: playerId,
        contact_verified_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    ),
  );
  await one(
    client.from("club_memberships").upsert(
      {
        club_id: club.id,
        player_id: playerId,
        role: "member",
        status: "active",
      },
      { onConflict: "club_id,player_id" },
    ),
  );
  await one(
    client.from("identity_attestations").upsert(
      {
        club_id: club.id,
        player_id: playerId,
        attested_by_player_id: organizerAccount.player_id,
        attestation_type: "club_record",
        note: "Hosted E2E fixture",
      },
      { onConflict: "club_id,player_id,attestation_type" },
    ),
  );
  fixturePlayers.push(playerId);
}

const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const existingMatches = await one(
  client.from("matches").select("id").eq("event_id", eventId),
);
const existingMatchIds = existingMatches.map((match) => match.id);
if (existingMatchIds.length) {
  await one(
    client.from("match_participants").delete().in("match_id", existingMatchIds),
  );
  await one(
    client
      .from("event_queue_entries")
      .update({ assigned_match_id: null, state: "ready" })
      .eq("event_id", eventId)
      .not("assigned_match_id", "is", null),
  );
  await one(
    client
      .from("event_courts")
      .update({ current_match_id: null, status: "available" })
      .eq("event_id", eventId),
  );
  await one(
    client
      .from("match_proposals")
      .update({ match_id: null })
      .eq("event_id", eventId),
  );
  await one(client.from("matches").delete().eq("event_id", eventId));
}
await one(
  client
    .from("event_queue_entries")
    .update({ state: "left" })
    .eq("event_id", eventId)
    .eq("player_id", organizerAccount.player_id)
    .eq("state", "ready"),
);
await one(client.from("match_proposals").delete().eq("event_id", eventId));
await one(
  client.from("events").upsert({
    id: eventId,
    club_id: club.id,
    type: "open_play",
    name: "Hosted E2E Open Play",
    venue: "E2E Courts",
    starts_at: startsAt,
    ends_at: endsAt,
    capacity: 20,
    formats: ["singles", "doubles"],
    record_class: "ranked",
    status: "published",
    join_code: "HOSTED-E2E",
  }),
);
for (const [index, id] of courtIds.entries())
  await one(
    client
      .from("event_courts")
      .upsert({ id, event_id: eventId, label: `E2E Court ${index + 1}` }),
  );
await one(
  client.from("event_registrations").upsert({
    id: "53000000-0000-4000-8000-000000000009",
    event_id: eventId,
    player_id: organizerAccount.player_id,
    status: "confirmed",
    terms_version: "2026-09-01",
  }),
);
for (const [index, playerId] of fixturePlayers.entries()) {
  await one(
    client.from("event_registrations").upsert({
      id: `53000000-0000-4000-8000-00000000000${index + 1}`,
      event_id: eventId,
      player_id: playerId,
      status: "confirmed",
      terms_version: "2026-09-01",
    }),
  );
  await one(
    client.from("event_attendance").upsert(
      {
        event_id: eventId,
        player_id: playerId,
        state: "checked_in",
        checked_in_at: new Date().toISOString(),
        changed_by: organizerAccount.player_id,
      },
      { onConflict: "event_id,player_id" },
    ),
  );
  await one(
    client.from("event_queue_entries").upsert({
      id: `52000000-0000-4000-8000-00000000000${index + 1}`,
      club_id: club.id,
      event_id: eventId,
      player_id: playerId,
      state: "ready",
      position_sequence: index + 1,
      position_key: (index + 1) * 1024,
    }),
  );
}

console.log(
  JSON.stringify({ clubSlug: club.slug, eventId, playerSlug: "e2e-player-1" }),
);
