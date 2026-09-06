import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

const clubSlug = process.env.E2E_CLUB_SLUG ?? "northside-pickleball";
const otherClubSlug = process.env.E2E_OTHER_CLUB_SLUG ?? "southside-pickleball";
const eventId =
  process.env.E2E_EVENT_ID ?? "50000000-0000-4000-8000-000000000001";

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => loginAsE2EUser(page));

test.describe("mobile player queue journey", () => {
  test("checks in, joins once, and leaves without losing history", async ({
    page,
  }) => {
    await page.goto(`/dashboard/clubs/${clubSlug}/events/${eventId}/check-in`);

    await expect(
      page.getByRole("heading", { name: "Event check-in" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible();

    await page.goto(`/dashboard/clubs/${clubSlug}/events/${eventId}/queue`);
    await page.getByRole("button", { name: "Join queue" }).click();
    await expect(
      page.getByText("Ready in queue", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/position/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Leave queue" }).click();
    await expect(page.getByText("Left queue", { exact: true })).toBeVisible();
  });

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

test.describe("mobile organizer queue journey", () => {
  test("reorders with a required reason and exposes the new version", async ({
    page,
  }) => {
    await page.goto(`/dashboard/clubs/${clubSlug}/events/${eventId}/queue`);
    const row = page.getByTestId("queue-entry").last();
    await row.getByRole("button", { name: "Move up" }).click();
    await page.getByLabel("Reason").fill("Correcting arrival order");
    await page.getByRole("button", { name: "Confirm reorder" }).click();

    await expect(
      page.getByText("Queue updated", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("queue-version")).toHaveAttribute(
      "data-version",
      /\d+/,
    );
  });

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
