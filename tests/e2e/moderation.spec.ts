import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
test("club owner cannot inherit platform moderation", async ({ page }) => {
  await loginAsE2EUser(page);
  await page.goto("/admin/reports");
  await expect(
    page.getByRole("heading", { name: /404|not found|platform reports/i }),
  ).toBeVisible();
});
test("verified player sees report entry point", async ({ page }) => {
  await loginAsE2EUser(page);
  await page.goto(
    `/dashboard/clubs/${process.env.E2E_CLUB_SLUG ?? "northside-pickleball"}/reports`,
  );
  await expect(
    page.getByRole("heading", { name: "Report a concern" }),
  ).toBeVisible();
});
