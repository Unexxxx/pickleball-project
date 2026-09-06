import { expect, test } from "@playwright/test";

test("renders the application shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Play. Confirm. Climb." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});
