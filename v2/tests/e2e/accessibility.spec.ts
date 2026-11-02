import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

test("main planner and interactive surfaces pass automated WCAG A/AA checks", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1600);
  const check = async (view: string) => {
    await page.waitForTimeout(650);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      violations,
      `${view}: ${violations.map((issue) => issue.id).join(", ")}`,
    ).toEqual([]);
  };
  await check("Planner");
  await page.getByRole("button", { name: /^Show Disruption missions/ }).click();
  await check("Expanded mission owners");
  await page.getByRole("button", { name: "Generate best run" }).click();
  await page.getByText("One squad. Six smart picks.").waitFor();
  await check("Ranked run");
  await page.getByRole("button", { name: "Compare priorities" }).click();
  await check("Comparison");
  await page
    .getByRole("button", { name: "Add mission", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Additional settings Optional" })
    .click();
  await check("Mission editor");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  await check("Squad manager");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "How it works", exact: true }).click();
  await check("Help");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Score reference", exact: true })
    .click();
  await check("Score reference");
});
