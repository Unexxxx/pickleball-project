import { expect, test } from "@playwright/test";

test.describe("preview critical-path smoke", () => {
  test("health and public leaderboard are available", async ({
    page,
    request,
  }) => {
    const health = await request.get("/api/health");
    expect([200, 503]).toContain(health.status());
    await expect(health.json()).resolves.toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
    });
    await page.goto("/leaderboards");
    await expect(
      page.getByRole("heading", { name: /leaderboard/i }),
    ).toBeVisible();
  });

  test("authentication and private workflows fail closed", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(login|register)/);
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/(login|register|admin\/reports)/);
    await expect(page.locator("body")).not.toContainText(
      /reporter email|evidence_object_id/i,
    );
  });

  test("event join, scoring, disputes, and Trust Score require identity", async ({
    request,
  }) => {
    for (const path of [
      "/dashboard/events/demo/queue",
      "/dashboard/matches/demo",
      "/dashboard/disputes/demo",
      "/dashboard/profile/trust-score",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308, 401, 404]).toContain(response.status());
    }
  });
});
