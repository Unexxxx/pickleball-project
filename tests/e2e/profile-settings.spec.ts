import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

test("player can access profile editing and ranked summary", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Hosted E2E credentials are not configured",
  );
  await loginAsE2EUser(page);
  await page.goto("/dashboard/profile");

  await expect(
    page.getByRole("heading", { name: "Your player profile" }),
  ).toBeVisible();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Change photo")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile" }),
  ).toBeVisible();
  await expect(page.getByText(/Rank #|Not ranked yet/)).toBeVisible();
  await expect(
    page.getByText("Club identity attestation required"),
  ).toHaveCount(0);
});
