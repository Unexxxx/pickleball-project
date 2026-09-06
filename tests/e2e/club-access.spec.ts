import { expect, test } from "@playwright/test";
test("unauthenticated Club dashboard access redirects to login", async ({
  page,
}) => {
  await page.goto("/dashboard/clubs/example");
  await expect(page).toHaveURL(/\/login\?next=/);
});
