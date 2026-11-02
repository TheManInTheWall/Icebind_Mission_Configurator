import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const licenses = await Promise.all(
  ["Manrope-OFL.txt", "Space-Grotesk-OFL.txt"].map((filename) =>
    readFile(
      new URL(`../public/licenses/${filename}`, import.meta.url),
      "utf8",
    ),
  ),
);
const html = source
  .replace(/<!-- Embedded font licenses[\s\S]*?-->/, "")
  .replace(
    "</head>",
    `<!-- Embedded font licenses\n${licenses.join("\n\n").replaceAll("-->", "-- >")}\n-->\n</head>`,
  );
if (
  /<script\b[^>]*\bsrc=/i.test(html) ||
  /<link\b[^>]*rel="stylesheet"/i.test(html)
) {
  throw new Error(
    "The build still references external application scripts or styles.",
  );
}
if (
  !html.includes("data:image/jpeg;base64,") ||
  !html.includes("data:font/woff2;base64,")
) {
  throw new Error("The standalone artwork and fonts were not embedded.");
}
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
for (const filename of [
  "../mission-planner.html",
  "../public/mission-planner.html",
  "../dist/mission-planner.html",
  "../dist/index.html",
]) {
  await writeFile(new URL(filename, import.meta.url), html);
}
console.log(
  `Standalone planner exported (${Math.round(Buffer.byteLength(html) / 1024)} KB). Upload mission-planner.html as index.html to GitHub Pages.`,
);
