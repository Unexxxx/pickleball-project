import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
import { FIXTURES_REQUIRED, fixturesEnabled } from "./helpers/fixtures";

// Every test in this file needs seeded fixtures.
test.skip(!fixturesEnabled, FIXTURES_REQUIRED);

const club = process.env.E2E_CLUB_SLUG ?? "northside-pickleball";
const event =
  process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";

test.describe("matchmaking", () => {
  test.beforeEach(async ({ page }) => loginAsE2EUser(page));
  test("player sees the court and side assignment", async ({ page }) => {
    await page.goto(`/dashboard/clubs/${club}/events/${event}/courts`);
    await expect(page.getByRole("heading", { name: "Courts" })).toBeVisible();
  });
});
