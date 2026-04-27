import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const styles = await readFile(resolve(webRoot, "src", "styles.css"), "utf8");

function cssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Expected to find CSS rule for ${selector}`);
  return match[1];
}

function mediaRule(query, selector) {
  const queryIndex = styles.indexOf(query);
  assert.notEqual(queryIndex, -1, `Expected to find media query ${query}`);

  const nextMediaIndex = styles.indexOf("@media", queryIndex + query.length);
  const mediaSource = styles.slice(
    queryIndex,
    nextMediaIndex === -1 ? styles.length : nextMediaIndex,
  );
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = mediaSource.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  assert.ok(match, `Expected ${selector} override inside ${query}`);
  return match[1];
}

assert.match(
  cssRule(".analysis-layout--query"),
  /align-items:\s*stretch;/,
  "query layout should stretch both columns so the right stack can align to the left panel height",
);

assert.match(
  cssRule(".analysis-query-results"),
  /height:\s*100%;/,
  "query results stack should fill the stretched grid row",
);

assert.match(
  cssRule(".query-context-card.ant-card"),
  /flex:\s*1 1 auto;/,
  "context card should grow to fill the remaining right-column height",
);

assert.match(
  cssRule(".query-context-card .ant-card-body"),
  /flex:\s*1 1 auto;/,
  "context card body should grow with the card instead of leaving blank lower space",
);

assert.match(
  mediaRule("@media (max-width: 1180px)", ".analysis-query-results"),
  /height:\s*auto;/,
  "single-column query layout should return to natural height",
);

console.log("query layout alignment tests passed");
