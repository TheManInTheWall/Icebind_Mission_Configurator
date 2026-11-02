import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  createDemoState,
  DEFAULT_SCORES,
  SHEET_CSV_URL,
  STORAGE_KEY,
} from "../../src/lib/planner";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("preview downloads a truly self-contained HTML file", async ({ page }) => {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download HTML", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("index.html");
  const filename = await download.path();
  expect(filename).toBeTruthy();
  const html = await readFile(filename!, "utf8");
  expect(html).not.toMatch(/<script\b[^>]*\bsrc=/i);
  expect(html).toContain("data:image/jpeg;base64,");
  expect(html).toContain("data:font/woff2;base64,");
  expect(html).toContain("Embedded font licenses");
});

test("invalid imports show feedback inside the active dialog and preserve the squad", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json"),
  });
  await expect(dialog.locator(".toast")).toContainText(
    "Choose a valid Voidline squad JSON file.",
  );
  await expect(dialog.locator(".manage-player")).toHaveCount(6);
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".squad-player")).toHaveCount(6);
});

test("mission tabs support arrow-key navigation", async ({ page }) => {
  await page.getByRole("tab", { name: "All missions 12" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Ranked runs 6" })).toBeFocused();
  await expect(page.locator(".run-row")).toHaveCount(6);
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "All missions 12" }),
  ).toBeFocused();
  await expect(page.locator(".mission-row")).toHaveCount(4);
});

test("matching missions show all owners, with search, filters, and sorting", async ({
  page,
}) => {
  const disruption = page.getByRole("button", {
    name: "Show Disruption missions for Voidwalker, Nova, Ash",
  });
  await expect(disruption).toBeVisible();
  await disruption.click();
  await expect(page.locator(".mission-detail-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Sort base score ascending" }).click();
  await expect(page.locator(".mission-row").first()).toContainText(
    "Mobile Defence",
  );
  await page.getByLabel("Search missions or players").fill("surv");
  await expect(page.locator(".mission-row")).toHaveCount(1);
  await expect(page.locator(".owner-names")).toHaveText("Nova, Wisp, Volt");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByLabel("Filter missions by player").selectOption("player-1");
  await expect(page.locator(".mission-row")).toHaveCount(2);
  await expect(page.locator(".owner-names")).toHaveText([
    "Voidwalker",
    "Voidwalker",
  ]);
});

test("add, duplicate prevention, edit, delete, and browser persistence", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Add mission", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Add mission", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("already has");
  await dialog.getByRole("button", { name: "Survival 3.666" }).click();
  await dialog
    .getByRole("button", { name: "Add mission", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "All missions 13" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "All missions 13" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Show Survival missions/ }).click();
  await page
    .getByRole("button", { name: "Edit Survival for Voidwalker" })
    .click();
  await dialog.getByRole("button", { name: "Mobile Defence 1.333" }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("button", { name: /^Show Mobile Defence missions/ })
    .click();
  await page
    .getByRole("button", { name: "Delete Mobile Defence for Voidwalker" })
    .click();
  await dialog.getByRole("button", { name: "Remove mission" }).click();
  await expect(
    page.getByRole("tab", { name: "All missions 12" }),
  ).toBeVisible();
});

test("the priority gets their maximum, other five get their minimum, and runs can be selected", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Generate best run" }).click();
  await expect(page.locator(".run-row")).toHaveCount(6);
  await expect(page.locator(".priority-pick")).toContainText("Voidwalker");
  await expect(page.locator(".priority-pick")).toContainText("5.000");
  await expect(page.locator(".run-score")).toHaveText([
    "5.000",
    "1.333",
    "1.333",
    "1.333",
    "3.000",
    "3.666",
  ]);
  await page.getByRole("button", { name: "Compare priorities" }).click();
  await expect(page.locator(".comparison-row").first()).toContainText("Nova");
  await page.locator(".comparison-row").first().click();
  await expect(page.locator(".priority-pick")).toContainText("Nova");
  await page.getByRole("button", { name: "Select this run" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".selected-run-list > div")).toHaveCount(6);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download plan" }).click();
  await expect((await download).suggestedFilename()).toBe("voidline-run.txt");
  await dialog.getByRole("button", { name: "Confirm this run" }).click();
  await expect(page.getByText("Run selected", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: /^Ranked runs/ }).click();
  await expect(page.getByText("Run selected", { exact: true })).toBeVisible();
});

test("additional settings are optional and correctly affect live rankings", async ({
  page,
}) => {
  await expect(page.getByRole("switch")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Add mission", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Additional settings Optional" })
    .click();
  await dialog.getByLabel("Setting 1").selectOption("Stone Soldiers");
  await dialog.getByLabel("Setting 2").selectOption("Archaic Armor");
  await expect(dialog.locator(".score-preview")).toContainText("5.000");
  await dialog
    .getByRole("button", { name: "Add mission", exact: true })
    .click();
  await page.getByRole("switch").click();
  await page.getByRole("button", { name: "Generate best run" }).click();
  await expect(page.locator(".priority-pick")).toContainText("13.666");
  await expect(page.locator(".priority-pick")).toContainText(
    "Stone Soldiers / Archaic Armor",
  );
  await page.getByRole("switch").click();
  await expect(page.locator(".priority-pick")).toContainText("5.000");
  await expect(page.getByLabel("Tied missions for Voidwalker")).toBeVisible();
});

test("manage players, enforce six selections, and handle missing missions", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Player name", { exact: true }).fill("nova");
  await dialog.getByRole("button", { name: "Add player" }).click();
  await expect(dialog.getByRole("alert")).toContainText("already a player");
  await dialog.getByLabel("Player name", { exact: true }).fill("Zephyr");
  await dialog.getByRole("button", { name: "Add player" }).click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByLabel("Include Zephyr in squad").click();
  await expect(
    page.getByText("Your squad is full. Deselect a player first."),
  ).toBeVisible();
  await expect(page.getByLabel("Include Zephyr in squad")).not.toBeChecked();
  await page.getByLabel("Include Ash in squad").uncheck();
  await page.getByLabel("Include Zephyr in squad").check();
  await expect(
    page.getByRole("button", { name: "Generate best run" }),
  ).toBeDisabled();
  await expect(page.getByText("Add a mission for Zephyr.")).toBeVisible();
  await page
    .getByRole("button", { name: "Add mission", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Assign to player").selectOption({ label: "Zephyr" });
  await dialog
    .getByRole("button", { name: "Add mission", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Generate best run" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  await dialog.getByLabel("Name for Zephyr").fill("ZephyrPrime");
  await dialog.getByRole("button", { name: "Save name for Zephyr" }).click();
  await expect(dialog.getByLabel("Name for ZephyrPrime")).toBeVisible();
  await dialog.getByRole("button", { name: "Remove ZephyrPrime" }).click();
  await dialog
    .getByRole("button", { name: "Remove player", exact: true })
    .click();
  await expect(dialog.getByLabel("Name for ZephyrPrime")).toHaveCount(0);
});

test("JSON export, validated import, and reset support a real squad", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  let dialog = page.getByRole("dialog");
  const exported = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export squad" }).click();
  expect((await exported).suggestedFilename()).toBe("voidline-squad.json");
  const next = createDemoState();
  next.players[0].name = "ImportedTenno";
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "squad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(next)),
  });
  await expect(page.getByLabel("Include ImportedTenno in squad")).toBeVisible();
  await page.getByRole("button", { name: "Manage squad", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Start a new squad" }).click();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Your squad is a blank canvas."),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel("Player name", { exact: true })
    .fill("MyTenno");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("Include MyTenno in squad")).toBeChecked();
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(data.missions).toHaveLength(0);
  expect(data.scores.missions).toEqual(DEFAULT_SCORES.missions);
});

test("Google Sheets refresh reads correct ranges, while private-sheet failure preserves scores", async ({
  page,
}) => {
  const csv = Array.from({ length: 14 }, (_, index) => {
    const mission = DEFAULT_SCORES.missions[index],
      first = DEFAULT_SCORES.setting1[index],
      second = DEFAULT_SCORES.setting2[index];
    return [
      mission?.name ?? "",
      mission ? mission.score + 1 : "",
      "",
      first?.name ?? "",
      first?.score ?? "",
      "",
      second.name,
      second.score,
    ]
      .map((value) => JSON.stringify(String(value)))
      .join(",");
  }).join("\n");
  await page.route(SHEET_CSV_URL, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: csv }),
  );
  await page
    .getByRole("button", { name: "Score reference", exact: true })
    .click();
  await expect(page.locator(".reference-row")).toHaveCount(23);
  await page.getByRole("button", { name: "Refresh from Sheets" }).click();
  await expect(
    page.getByText("Scores refreshed from Google Sheets", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reference-row").first()).toContainText("6.000");
  await page.unroute(SHEET_CSV_URL);
  await page.route(SHEET_CSV_URL, (route) =>
    route.fulfill({ status: 403, body: "Private spreadsheet" }),
  );
  await page.getByRole("button", { name: "Refresh from Sheets" }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn't refresh");
  await expect(page.locator(".reference-row").first()).toContainText("6.000");
  await page.getByRole("button", { name: "Restore provided scores" }).click();
  await expect(page.locator(".reference-row").first()).toContainText("5.000");
});

test("mobile stays within viewport and dialogs support keyboard dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Add mission", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Generate best run" }).click();
  await expect(page.locator(".run-row")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
