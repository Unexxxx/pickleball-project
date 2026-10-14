import { expect, test, type Page } from "@playwright/test";
import { loginAsE2EUser } from "./helpers/auth";
import {
  createLiveEventFixture,
  explainEndMatchFailure,
  liveEventFixtureConfigured,
} from "./helpers/live-event-fixture";

const benchNames = (page: Page) =>
  page
    .getByRole("region", { name: "Bench list" })
    .getByTestId("queue-entry")
    .locator("strong")
    .allTextContents();

// One organizer journey through a live event. It writes to the hosted
// project, so it runs once (desktop) on its own freshly created event.
test("organizer runs a live event from check-in to final score", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Runs once per suite because it changes hosted data",
  );
  test.skip(
    !liveEventFixtureConfigured(),
    "Hosted E2E credentials and service-role key are not configured",
  );
  test.setTimeout(180_000);

  const fixture = await createLiveEventFixture();
  const eventPath = `/dashboard/clubs/${fixture.clubSlug}/events/${fixture.eventId}`;
  await loginAsE2EUser(page);

  await test.step("organizer checks in a walk-in player", async () => {
    await page.goto(`${eventPath}/check-in`);
    await expect(
      page.getByRole("heading", { name: "Check in players" }),
    ).toBeVisible();
    await page
      .getByRole("listitem")
      .filter({ hasText: fixture.walkInPlayerName })
      .getByRole("button", { name: "Check in & queue" })
      .click();
    await expect(
      page.getByText(
        `${fixture.walkInPlayerName} checked in and added to the queue.`,
      ),
    ).toBeVisible();
  });

  await page.goto(`${eventPath}/queue`);
  await expect(page.getByRole("heading", { name: "Live queue" })).toBeVisible();

  await test.step("organizer reorders the bench without a reason", async () => {
    const before = await benchNames(page);
    expect(before.length).toBeGreaterThanOrEqual(2);
    const moved = before.at(-1)!;
    await page.getByRole("button", { name: `Move ${moved} up` }).click();
    await expect(page.getByText("Queue order updated.")).toBeVisible();
    await expect
      .poll(() => benchNames(page))
      .toEqual([...before.slice(0, -2), moved, before.at(-2)!]);
  });

  await test.step("organizer reorders the bench with a reason", async () => {
    const before = await benchNames(page);
    const moved = before.at(-1)!;
    await page
      .getByLabel("Reason for the next move (optional)")
      .fill("Arrived before the others");
    await page.getByRole("button", { name: `Move ${moved} up` }).click();
    await expect
      .poll(() => benchNames(page))
      .toEqual([...before.slice(0, -2), moved, before.at(-2)!]);
    await expect(
      page.getByLabel("Reason for the next move (optional)"),
    ).toHaveValue("");
  });

  await test.step("the system assigns the standby lineup to a free court", async () => {
    await page
      .getByRole("button", { name: "Send to next court" })
      .first()
      .click();
    await expect(
      page.getByText("Players assigned. The next lineup is now on standby."),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Active matches" })
        .getByRole("button", { name: "Finish & Enter Score" }),
    ).toBeVisible();
  });

  await test.step("organizer finishes the match with a score", async () => {
    const activeMatches = page.getByRole("region", { name: "Active matches" });
    await activeMatches
      .getByRole("button", { name: "Finish & Enter Score" })
      .click();
    await activeMatches.getByRole("spinbutton", { name: "Side A" }).fill("11");
    await activeMatches.getByRole("spinbutton", { name: "Side B" }).fill("7");
    await page
      .getByRole("button", { name: "Submit score & release court" })
      .click();
    // A finished match leaves the board and the court handoff opens; a
    // failed submit leaves its message in the score form instead.
    const handoff = page.getByRole("dialog", { name: /^Proceed to E2E Court/ });
    const scoreError = activeMatches
      .locator(".end-match-control [role=status]:not(:empty)")
      .filter({ hasNotText: "Match ended." });
    await expect(handoff.or(scoreError)).toBeVisible({ timeout: 20_000 });
    if (await scoreError.count())
      throw new Error(
        `${await scoreError.innerText()} Database: ${await explainEndMatchFailure(
          await fixture.latestMatchId(),
        )}`,
      );
    await expect(handoff).toBeVisible();
    await expect(
      activeMatches.getByRole("button", { name: "Finish & Enter Score" }),
    ).toHaveCount(0);
  });

  await test.step("the finished match has a public result", async () => {
    await page.goto(`/matches/${await fixture.latestMatchId()}`);
    await expect(
      page.getByRole("heading", { name: "Match result" }),
    ).toBeVisible();
  });
});
