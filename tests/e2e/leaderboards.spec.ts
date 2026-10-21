import { expect, test } from "@playwright/test";
import { FIXTURES_REQUIRED, fixturesEnabled } from "./helpers/fixtures";
test("browses the overall leaderboard", async ({ page }) => {
  await page.goto("/leaderboards");
  await expect(
    page.getByRole("heading", { name: "All-time leaderboard" }),
  ).toBeVisible();
});
test("browses a source-club leaderboard", async ({ page }) => {
  test.skip(!fixturesEnabled, FIXTURES_REQUIRED);
  await page.goto(
    `/clubs/${process.env.E2E_CLUB_SLUG ?? "northside-pickleball"}/rankings`,
  );
  await expect(
    page.getByRole("heading", { name: "Club leaderboard" }),
  ).toBeVisible();
});
