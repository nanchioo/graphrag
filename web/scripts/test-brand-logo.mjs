import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");

const [appSource, stylesSource] = await Promise.all([
  readFile(resolve(webRoot, "src", "App.tsx"), "utf8"),
  readFile(resolve(webRoot, "src", "styles.css"), "utf8"),
]);

assert.match(
  appSource,
  /M5 8\.3 12 4\.7l7 3\.6-7 3\.6-7-3\.6Z/,
  "brand logo should use the graph-core top layer path",
);

assert.match(
  appSource,
  /<circle cx="8\.7" cy="8\.4" r="1\.25" \/>/,
  "brand logo should include graph node circles",
);

assert.match(
  stylesSource,
  /linear-gradient\(135deg, #2563eb 0%, #0891b2 54%, #0f766e 100%\)/,
  "brand logo should use the approved blue-cyan-green gradient",
);

assert.doesNotMatch(
  stylesSource.match(/\.sidebar-logo \{[\s\S]*?\n\}/)?.[0] ?? "",
  /#d97706/,
  "brand logo gradient should not use the old orange stop",
);

assert.match(
  stylesSource,
  /\.sidebar-logo svg circle \{[\s\S]*?fill: currentColor;[\s\S]*?stroke: none;/,
  "brand logo node circles should render as filled points",
);
