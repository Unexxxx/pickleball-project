import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
for (const path of ["/", "/leaderboards"]) {
  test(`has no serious accessibility violations on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
}
