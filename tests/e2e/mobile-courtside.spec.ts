import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
test.use({ viewport: { width: 390, height: 844 } });
const club = process.env.E2E_CLUB_SLUG ?? "northside-pickleball",
  event = process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ page }) => loginAsE2EUser(page));
test("mobile player can reach every courtside action without page overflow", async ({
  page,
}) => {
  await page.goto(`/dashboard/clubs/${club}/events/${event}/queue`);
  await expect(
    page.getByRole("navigation", { name: "Event actions" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
test("mobile organizer sees assignments", async ({ page }) => {
  await page.goto(`/dashboard/clubs/${club}/events/${event}/matches`);
  await expect(
    page.getByRole("heading", { name: "Match assignments" }),
  ).toBeVisible();
});
