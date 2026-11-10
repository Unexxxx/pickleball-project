// Test helper: every player who isn't in a club sends a join request, so the
// club's Join requests list fills up for manual testing.
//
//   ALLOW_HOSTED_E2E_SETUP=1 TARGET_CLUB_SLUG=dink-a-boo \
//     node --env-file=.env scripts/request-hosted-club-membership.mjs
//
// Dry run by default; APPLY=1 writes. The players it added are saved to
// RECORD_FILE (default scripts/.club-requests-<slug>.json). UNDO=1 deletes
// those requests again (only ones still pending; approved or declined
// ones are left alone).
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_HOSTED_E2E_SETUP !== "1")
  throw new Error("Set ALLOW_HOSTED_E2E_SETUP=1 for hosted test mutations");
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_CLUB_SLUG",
]) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const slug = process.env.TARGET_CLUB_SLUG;
const apply = process.env.APPLY === "1";
const undo = process.env.UNDO === "1";
const recordFile =
  process.env.RECORD_FILE ?? `scripts/.club-requests-${slug}.json`;

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

const club = await one(
  client.from("clubs").select("id,name").eq("slug", slug).single(),
);

if (undo) {
  const record = JSON.parse(await readFile(recordFile, "utf8"));
  if (record.clubId !== club.id) throw new Error("Record is for another club");
  const pending = await one(
    client
      .from("club_memberships")
      .select("id")
      .eq("club_id", club.id)
      .eq("status", "requested")
      .in("player_id", record.playerIds),
  );
  console.log(
    `${club.name}: ${pending.length} of ${record.playerIds.length} recorded requests are still pending.`,
  );
  if (apply && pending.length) {
    await one(
      client
        .from("club_memberships")
        .delete()
        .in(
          "id",
          pending.map((row) => row.id),
        ),
    );
    console.log(`Deleted ${pending.length} pending requests.`);
  } else if (!apply) console.log("Dry run: set APPLY=1 to delete them.");
  process.exit(0);
}

const players = await one(
  client
    .from("players")
    .select("id,display_name")
    .is("merged_into_player_id", null),
);
const memberships = await one(
  client.from("club_memberships").select("player_id").eq("club_id", club.id),
);
// Anyone with any membership row (member, staff, pending, left…) is skipped.
const inClub = new Set(memberships.map((row) => row.player_id));
const toRequest = players.filter((player) => !inClub.has(player.id));

console.log(
  `${club.name}: ${toRequest.length} players will request to join (${inClub.size} already have a membership).`,
);
if (!apply) {
  console.log("Dry run: set APPLY=1 to send the requests.");
  process.exit(0);
}
if (!toRequest.length) process.exit(0);

// Same row request_to_join() creates when a club needs approval.
await one(
  client.from("club_memberships").insert(
    toRequest.map((player) => ({
      club_id: club.id,
      player_id: player.id,
      role: "member",
      status: "requested",
    })),
  ),
);
let previous = [];
try {
  const old = JSON.parse(await readFile(recordFile, "utf8"));
  if (old.clubId === club.id) previous = old.playerIds;
} catch {
  // No earlier record.
}
await writeFile(
  recordFile,
  JSON.stringify(
    {
      clubId: club.id,
      playerIds: [...new Set([...previous, ...toRequest.map((p) => p.id)])],
    },
    null,
    2,
  ),
);
console.log(`Sent ${toRequest.length} requests. Recorded in ${recordFile}.`);
