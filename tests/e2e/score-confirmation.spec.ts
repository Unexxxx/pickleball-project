import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
const club = process.env.E2E_CLUB_SLUG ?? "northside-pickleball";
const event =
  process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ page }) => loginAsE2EUser(page));
test("submits a score and shows confirmation quorum", async ({ page }) => {
  await page.goto(`/dashboard/clubs/${club}/events/${event}/matches`);
  const match = page.getByTestId("assigned-match").first();
  await match.getByLabel("Side A score").fill("11");
  await match.getByLabel("Side B score").fill("7");
  await match.getByRole("button", { name: "Submit score" }).click();
  await expect(page.getByText(/confirmation/i)).toBeVisible();
});
