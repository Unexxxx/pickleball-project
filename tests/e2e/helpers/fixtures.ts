// Some journeys need a seeded test club, event and players (E2E_CLUB_SLUG,
// E2E_EVENT_ID, E2E_PLAYER_SLUG). Production is live and holds no such
// fixtures, so these tests run only when E2E_FIXTURES=1 is set against a
// non-production database. Everything else stays safe to run against live.
export const fixturesEnabled = process.env.E2E_FIXTURES === "1";

export const FIXTURES_REQUIRED =
  "Needs seeded test data: set E2E_FIXTURES=1 against a non-production database";
