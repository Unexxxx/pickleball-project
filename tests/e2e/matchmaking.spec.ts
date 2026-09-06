import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

const club = process.env.E2E_CLUB_SLUG ?? "northside-pickleball";
const event =
  process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";

test.describe("matchmaking", () => {
  test.beforeEach(async ({ page }) => loginAsE2EUser(page));
  test("organizer generates and assigns a proposal once", async ({ page }) => {
    await page.goto(`/dashboard/clubs/${club}/events/${event}/matches`);
    await page.getByLabel("Match format").selectOption("doubles");
    await page.getByRole("button", { name: "Generate proposal" }).click();
    await expect(page.getByTestId("match-proposal")).toBeVisible();
    await page.getByRole("button", { name: "Assign match" }).click();
    await expect(
      page.getByTestId("match-proposal").getByRole("status"),
    ).toContainText("Match assigned");
    await page.reload();
    await expect(page.getByTestId("assigned-match")).toHaveCount(1);
  });

  test("player sees the court and side assignment", async ({ page }) => {
    await page.goto(`/dashboard/clubs/${club}/events/${event}/courts`);
    await expect(page.getByRole("heading", { name: "Courts" })).toBeVisible();
  });
});
