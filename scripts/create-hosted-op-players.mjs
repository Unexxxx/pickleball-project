import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1") {
  throw new Error("Set ALLOW_HOSTED_E2E_SETUP=1 to create hosted E2E fixtures");
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_USER_EMAIL",
  "E2E_CLUB_SLUG",
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

const fixtureId = (index) =>
  `51000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

const club = await one(
  client
    .from("clubs")
    .select("id,slug")
    .eq("slug", process.env.E2E_CLUB_SLUG)
    .single(),
);
const listedUsers = await one(
  client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
);
const organizer = listedUsers.users.find(
  (user) =>
    user.email?.toLowerCase() === process.env.E2E_USER_EMAIL.toLowerCase(),
);
if (!organizer) throw new Error("E2E organizer Auth user was not found");

const organizerAccount = await one(
  client
    .from("accounts")
    .select("player_id")
    .eq("auth_user_id", organizer.id)
    .single(),
);

const created = [];
for (let index = 5; index <= 39; index += 1) {
  const email = `pickleball-op-player-${index}@example.test`;
  let user = listedUsers.users.find((candidate) => candidate.email === email);
  if (!user) {
    user = await one(
      client.auth.admin.createUser({
        email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: {
          fixture: "hosted-e2e",
          display_name: `OP Player ${index}`,
        },
      }),
    ).then((result) => result.user);
  }

  const playerId = fixtureId(index);
  await one(
    client.from("players").upsert({
      id: playerId,
      public_slug: `op-player-${index}`,
      display_name: `OP Player ${index}`,
      visibility: "public",
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
        note: "Hosted E2E fixture — synthetic OP capacity test player",
      },
      { onConflict: "club_id,player_id,attestation_type" },
    ),
  );
  created.push({
    playerId,
    slug: `op-player-${index}`,
    name: `OP Player ${index}`,
  });
}

console.log(
  JSON.stringify({
    clubSlug: club.slug,
    count: created.length,
    players: created,
  }),
);
