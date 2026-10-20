import { expect, test } from "@playwright/test";
import { FIXTURES_REQUIRED, fixturesEnabled } from "./helpers/fixtures";

// Every test in this file needs seeded fixtures.
test.skip(!fixturesEnabled, FIXTURES_REQUIRED);
const slug = process.env.E2E_PLAYER_SLUG ?? "e2e-player-1";
test("anonymous visitor discovers a privacy-safe player record", async ({
  page,
}) => {
  await page.goto(`/players/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/rating/i)).toBeVisible();
  await expect(page.getByText(/email|phone|trust score/i)).toHaveCount(0);
});
test("filters ranked match history", async ({ page }) => {
  await page.goto(`/players/${slug}?class=ranked`);
  await expect(
    page.getByRole("link", { name: "Ranked", exact: true }),
  ).toBeVisible();
});
