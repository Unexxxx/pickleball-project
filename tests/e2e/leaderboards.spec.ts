import { expect, test } from "@playwright/test";
test("browses the overall leaderboard and rules", async ({ page }) => {
  await page.goto("/leaderboards");
  await expect(
    page.getByRole("heading", { name: "All-time leaderboard" }),
  ).toBeVisible();
  await expect(page.getByText("Ranking rules")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CSV" })).toBeVisible();
});
test("browses a source-club leaderboard", async ({ page }) => {
  await page.goto(
    `/clubs/${process.env.E2E_CLUB_SLUG ?? "northside-pickleball"}`,
  );
  await expect(
    page.getByRole("heading", { name: "Club leaderboard" }),
  ).toBeVisible();
});
