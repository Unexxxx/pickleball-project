import { expect, test } from "@playwright/test";
test("unknown join code has a safe not-found state", async ({ page }) => {
  await page.goto("/join/not-a-real-event");
  await expect(
    page.getByRole("heading", { name: "Event not found" }),
  ).toBeVisible();
});
