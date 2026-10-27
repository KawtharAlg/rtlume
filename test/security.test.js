import test from "node:test";
import assert from "node:assert/strict";
import { safeEvidence } from "../src/finding.js";
import { reportText } from "../src/reporters/text.js";
import { analyzeTokens } from "../src/analyzers/tokens.js";
import { analyzeLocales } from "../src/analyzers/locales.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

test("diagnostic evidence redacts common secrets and terminal controls", () => {
  const result = safeEvidence('api_key="super-secret"\u001b[31m');
  assert.equal(result.includes("super-secret"), false);
  assert.equal(result.includes("\u001b"), false);
});

test("deep token JSON is rejected before recursive exhaustion", () => {
  let value = { $value: "1rem" };
  for (let index = 0; index < 102; index += 1) value = { nested: value };
  assert.throws(() => analyzeTokens("tokens.json", JSON.stringify(value), { severity: {} }, null), /nesting depth/);
});

test("configured locale catalogs respect the file size limit", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-locale-limit-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  fs.writeFileSync(path.join(workspace, "en.json"), JSON.stringify({ text: "x".repeat(100) }));
  const config = { maxFileBytes: 50, locales: { source: { path: "en.json" }, targets: [] } };
  assert.throws(() => analyzeLocales(workspace, config, () => null), /file size limit/);
});

test("JSON secrets and bearer credentials are redacted", () => {
  assert.equal(safeEvidence('{"api_key":"secret-value"}').includes("secret-value"), false);
  assert.equal(safeEvidence("Authorization: Bearer private-value").includes("private-value"), false);
});

test("every terminal field strips control characters", () => {
  const text = reportText({ findings: [{ file: "file\u001b[31m.css", line: 1, column: 1, severity: "error", ruleId: "CSS001", confidence: "certain", owner: "team\rname", message: "key\u001b[2J", suggestion: "test\u202E", evidence: "text" }], filesScanned: 1, skipped: [], summary: { errors: 1, warnings: 0, infos: 0, reviews: 0 } });
  assert.equal(/[\u001b\r\u202E]/.test(text), false);
});
