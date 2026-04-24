import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/components/queryPanelState.ts");
const source = readFileSync(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputText).toString("base64")}`;
const { resolveQueryGraphId } = await import(moduleUrl);

const graphs = [
  { id: "alpha", name: "Alpha", status: "ready" },
  { id: "beta", name: "Beta", status: "ready" },
];

assert.equal(
  resolveQueryGraphId({ graphs, requestedGraphId: "beta" }),
  "beta",
  "uses the graph requested by URL when it exists",
);

assert.equal(
  resolveQueryGraphId({
    graphs,
    requestedGraphId: "missing",
    currentGraphId: "alpha",
  }),
  "alpha",
  "keeps the current graph when URL graph is invalid",
);

assert.equal(
  resolveQueryGraphId({ graphs }),
  "alpha",
  "falls back to the first graph when no graph is selected",
);

assert.equal(
  resolveQueryGraphId({ graphs: [], requestedGraphId: "beta" }),
  undefined,
  "returns undefined when no graphs are available",
);

console.log("queryPanelState tests passed");
