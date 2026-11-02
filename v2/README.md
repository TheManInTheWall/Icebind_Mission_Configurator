# Voidline Mission Planner

A complete, browser-only mission planner for six players. The standalone HTML includes its JavaScript, CSS, fonts, artwork, and all 23 supplied spreadsheet scores. No server, account, API key, or installation is needed to use it.

## Upload To GitHub Pages

1. Download the file using **Download HTML** in the app footer, or use `mission-planner.html` from this project.
2. Rename the file to `index.html` and upload it to the root of a GitHub repository.
3. Open the repository's **Settings > Pages**.
4. Choose **Deploy from a branch**, select your branch and **/ (root)**, then save.
5. Open the Pages address after GitHub finishes deploying.

Only that one HTML file is required. `dist/index.html` is the same deployable application. You can also open the standalone file directly in a modern browser; local saving on `file:` URLs depends on the browser's privacy settings.

## Use The Planner

- The first visit loads a clearly marked demo squad. Choose **Make it yours** to clear the demo and add your real players.
- Use **My squad** to add, rename, or remove players. You can keep more than six players in your roster, but exactly six must be selected for a run.
- Use **Add mission** to attach a mission to a player. Additional settings are optional and are excluded from ranking by default.
- The board groups matching mission types and lists every owner. Expand a mission to edit or delete individual entries.
- Star a player, then choose **Generate best run**. The starred player receives their highest-scoring available mission. Each of the other five receives their lowest-scoring available mission.
- **Compare priorities** ranks the six possible priority players by `priority player's maximum - average of the other five players' minimums`. Larger differences rank first. This is a transparent comparison heuristic, not a game difficulty claim.
- All tied best or lowest entries remain available in a mission dropdown. Choose one, then **Select this run** and confirm. Copy or download the six-player plan.
- Turn on **Include additional settings** to score missions as `base score + setting 1 + setting 2`. Unset settings add zero.

## Spreadsheet Access

The source is [the supplied spreadsheet](https://docs.google.com/spreadsheets/d/1rrzniKaPt38JsWPeIIGPZ0avNQdol_1_v86V82t03cc/edit?gid=730193451#gid=730193451).

The spreadsheet required sign-in during implementation, so the exact supplied scores are bundled as the initial reference. The app never claims it is connected when it is using those scores.

Open **Score reference > Refresh from Sheets** to read the live sheet. Set the spreadsheet's sharing to **Anyone with the link > Viewer** first. The app uses Google's documented Visualization CSV endpoint with `gid=730193451`, `range=D1:K14`, and `headers=0`, and reads only D1:E4, G1:H5, and J1:K14. A refresh validates all 23 entries before updating anything. If the request is blocked, private, malformed, or offline, the existing scores remain unchanged.

No Google credentials are collected. The application reads score values only; player and mission data are not written to the spreadsheet.

## Storage And Sharing

Squads and confirmed runs are automatically stored in this browser's local storage, when available. There is no shared backend or automatic synchronization between devices. Use **Export squad** and **Import squad** to back up or share a JSON file. **Download HTML** exports a fresh copy of the application, not your personal squad; export the squad separately if needed.

## Development

```sh
npm install
npm run dev
```

Build and regenerate the downloadable standalone HTML:

```sh
npm run build
node scripts/export-standalone.mjs
```

Verification:

```sh
npx tsc --noEmit
npx tsx --test tests/planner.test.ts
npx playwright install --with-deps chromium
npx playwright test
```

`src/App.tsx` is the React entry component. Mission scoring, CSV parsing, data validation, and ranking are in `src/lib/planner.ts`. User interface components are in `src/components/`.

The artwork is an original generated sci-fi illustration. Manrope and Space Grotesk are distributed under the SIL Open Font License; licenses are included in `public/licenses/`. This is an unofficial fan-made planning tool, not affiliated with Warframe or Digital Extremes.
