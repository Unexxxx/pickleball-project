import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Builds a fresh, in-progress singles event in the hosted E2E club so a run
// never depends on what an earlier run left behind.
export const LIVE_EVENT_NAME = "E2E live journey";
const FIXTURE_PLAYER_COUNT = 7;
const QUEUED_PLAYER_COUNT = 6;

export type LiveEventFixture = {
  clubSlug: string;
  eventId: string;
  walkInPlayerName: string;
  latestMatchId: () => Promise<string>;
};

export const liveEventFixtureConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.E2E_USER_EMAIL &&
    process.env.E2E_USER_PASSWORD &&
    process.env.E2E_CLUB_SLUG,
  );

async function write(promise: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await promise;
  if (error) throw error;
}

async function one<R extends { data: unknown; error: unknown }>(
  promise: PromiseLike<R>,
): Promise<NonNullable<R["data"]>> {
  const { data, error } = await promise;
  if (error) throw error;
  if (data == null) throw new Error("Supabase returned no data");
  return data as NonNullable<R["data"]>;
}

export async function createLiveEventFixture(): Promise<LiveEventFixture> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const club = await one(
    client
      .from("clubs")
      .select("id,slug")
      .eq("slug", process.env.E2E_CLUB_SLUG!)
      .single(),
  );
  const users = await one(
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  );
  const organizerUser = users.users.find(
    (user) =>
      user.email?.toLowerCase() === process.env.E2E_USER_EMAIL!.toLowerCase(),
  );
  if (!organizerUser) throw new Error("E2E Auth user was not found");
  const organizer = await one(
    client
      .from("accounts")
      .select("player_id")
      .eq("auth_user_id", organizerUser.id)
      .single(),
  );
  await write(
    client.from("club_memberships").upsert(
      {
        club_id: club.id,
        player_id: organizer.player_id,
        role: "owner",
        status: "active",
      },
      { onConflict: "club_id,player_id" },
    ),
  );

  const playerIds: string[] = [];
  for (let index = 1; index <= FIXTURE_PLAYER_COUNT; index += 1) {
    const email = `pickleball-e2e-player-${index}@example.test`;
    const user =
      users.users.find((candidate) => candidate.email === email) ??
      (
        await one(
          client.auth.admin.createUser({
            email,
            password: `${randomUUID()}Aa1!`,
            email_confirm: true,
          }),
        )
      ).user;
    if (!user) throw new Error(`Could not create ${email}`);
    const playerId = `51000000-0000-4000-8000-00000000000${index}`;
    await write(
      client.from("players").upsert({
        id: playerId,
        public_slug: `e2e-player-${index}`,
        display_name: `E2E Player ${index}`,
      }),
    );
    await write(
      client.from("accounts").upsert(
        {
          auth_user_id: user.id,
          player_id: playerId,
          contact_verified_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" },
      ),
    );
    await write(
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
    playerIds.push(playerId);
  }

  // Retire journeys left running by earlier attempts.
  await write(
    client
      .from("events")
      .update({ status: "canceled" })
      .eq("club_id", club.id)
      .eq("name", LIVE_EVENT_NAME)
      .eq("status", "in_progress"),
  );

  const eventId = randomUUID();
  const hour = 60 * 60 * 1000;
  await write(
    client.from("events").insert({
      id: eventId,
      club_id: club.id,
      type: "open_play",
      name: LIVE_EVENT_NAME,
      venue: "E2E Courts",
      starts_at: new Date(Date.now() + hour).toISOString(),
      ends_at: new Date(Date.now() + 24 * hour).toISOString(),
      capacity: 20,
      formats: ["singles"],
      record_class: "unranked",
      status: "published",
      join_code: `E2E-${eventId.slice(0, 8).toUpperCase()}`,
    }),
  );
  await write(
    client.from("event_courts").insert(
      [1, 2].map((number) => ({
        event_id: eventId,
        label: `E2E Court ${number}`,
      })),
    ),
  );
  await write(
    client.from("event_registrations").insert(
      [organizer.player_id, ...playerIds].map((playerId) => ({
        event_id: eventId,
        player_id: playerId,
        status: "confirmed",
        terms_version: "2026-09-01",
      })),
    ),
  );
  const queued = playerIds.slice(0, QUEUED_PLAYER_COUNT);
  await write(
    client.from("event_attendance").insert(
      queued.map((playerId) => ({
        event_id: eventId,
        player_id: playerId,
        state: "checked_in",
        checked_in_at: new Date().toISOString(),
        changed_by: organizer.player_id,
      })),
    ),
  );
  await write(
    client.from("event_queue_entries").insert(
      queued.map((playerId, index) => ({
        club_id: club.id,
        event_id: eventId,
        player_id: playerId,
        state: "ready",
        position_sequence: index + 1,
        position_key: (index + 1) * 1024,
      })),
    ),
  );
  await write(
    client.from("events").update({ status: "in_progress" }).eq("id", eventId),
  );

  return {
    clubSlug: club.slug,
    eventId,
    walkInPlayerName: `E2E Player ${FIXTURE_PLAYER_COUNT}`,
    latestMatchId: async () =>
      (
        await one(
          client
            .from("matches")
            .select("id")
            .eq("event_id", eventId)
            .order("assigned_at", { ascending: false })
            .limit(1)
            .single(),
        )
      ).id,
  };
}
