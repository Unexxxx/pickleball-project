import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

const clubSlug = process.env.E2E_CLUB_SLUG ?? "northside-pickleball";
const otherClubSlug = process.env.E2E_OTHER_CLUB_SLUG ?? "southside-pickleball";
const eventId =
  process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => loginAsE2EUser(page));

test.describe("mobile player queue journey", () => {
  test("reconciles to the authoritative snapshot after disconnect", async ({
    context,
    page,
  }) => {
    await page.goto(`/dashboard/clubs/${clubSlug}/events/${eventId}/queue`);
    const versionBefore = await page
      .getByTestId("queue-version")
      .getAttribute("data-version");

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByText(/offline|stale/i)).toBeVisible();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.reload();

    await expect(page.getByText(/offline|stale/i)).toHaveCount(0);
    const versionAfter = await page
      .getByTestId("queue-version")
      .getAttribute("data-version");
    expect(Number(versionAfter)).toBeGreaterThanOrEqual(Number(versionBefore));
  });
});

test.describe("mobile queue access", () => {
  test("cannot inspect another Club's private queue", async ({ page }) => {
    await page.goto(
      `/dashboard/clubs/${otherClubSlug}/events/${eventId}/queue`,
    );
    await expect(
      page.getByRole("heading", { name: /404|not found|access denied/i }),
    ).toBeVisible();
    await expect(page.getByTestId("queue-entry")).toHaveCount(0);
  });
});
