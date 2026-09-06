import { expect, type Page } from "@playwright/test";

export async function loginAsE2EUser(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password)
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
