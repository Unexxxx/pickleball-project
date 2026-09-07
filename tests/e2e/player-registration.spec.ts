import { expect, test } from "@playwright/test";
test("registration exposes verification and recovery paths", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Create your player account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Recover account" }),
  ).toBeVisible();
});
test("guest identities are prohibited", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill("guest@example.com");
  await page.getByLabel("Password").fill("not-a-real-secret");
  await page.getByLabel("Display name").fill("Guest");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Enter a valid real player identity."),
  ).toBeVisible();
});
