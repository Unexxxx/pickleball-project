import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

test("login page exposes account and recovery paths", async ({ page }) => {
  await page.goto("/login?next=%2Fdashboard");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
});

test("invalid credentials return a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("missing-player@example.test");
  await page.getByLabel("Password").fill("invalid-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("disposable hosted account reaches its dashboard", async ({ page }) => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Hosted E2E credentials are not configured",
  );
  await loginAsE2EUser(page);
  await expect(
    page.getByRole("heading", { name: "Your next game starts here." }),
  ).toBeVisible();
  await page.goto("/login?next=%2Fdashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
});
