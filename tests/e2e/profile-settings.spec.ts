import { expect, test } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";

test("player edits their profile on the single profile page", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Hosted E2E credentials are not configured",
  );
  await loginAsE2EUser(page);
  // /dashboard/profile forwards to the one profile page, /players/[slug],
  // where the owner edits the header in place.
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/players\/[^/?#]+$/);
  await expect(page.getByText(/Rank #|Not ranked yet/)).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Change photo")).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Save profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "Edit profile" }),
  ).toBeVisible();
  await expect(
    page.getByText("Club identity attestation required"),
  ).toHaveCount(0);
});
