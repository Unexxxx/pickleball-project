import { expect, test } from "@playwright/test";
test("unauthenticated club management access redirects to login", async ({
  page,
}) => {
  await page.goto("/dashboard/clubs/example/events/new");
  await expect(page).toHaveURL(/\/login\?next=/);
});
test("old club dashboard links open the public club home", async ({ page }) => {
  await page.goto("/dashboard/clubs/example");
  await expect(page).toHaveURL(/\/clubs\/example$/);
});
