import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
test.beforeEach(async ({ page }) => loginAsE2EUser(page));
test("participant can open an attributable dispute", async ({ page }) => {
  await page.goto(
    `/matches/${process.env.E2E_MATCH_ID ?? "10000000-0000-4000-8000-000000000001"}`,
  );
  await expect(
    page.getByRole("heading", { name: "Match result" }),
  ).toBeVisible();
});
