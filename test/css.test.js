import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCss } from "../src/analyzers/css.js";

const config = { severity: {} };

test("CSS physical properties produce classified findings", () => {
  const findings = analyzeCss("card.css", ".x {\n margin-left: 1rem;\n right: 0;\n border-top-left-radius: 4px;\n}", config, "web-platform");
  assert.deepEqual(findings.map((item) => item.ruleId), ["CSS001", "CSS002", "CSS003"]);
  assert.equal(findings[0].owner, "web-platform");
  assert.match(findings[0].suggestion, /margin-inline-start/);
});

test("suppression requires a rationale", () => {
  const findings = analyzeCss("card.css", "/* rtlume-disable-next-line CSS001 */\nmargin-left: 1rem;", config, null);
  assert.equal(findings[0].ruleId, "CFG001");
});

test("suppression with rationale is honored", () => {
  const findings = analyzeCss("card.css", "/* rtlume-disable-next-line CSS001 -- physical viewport anchor */\nmargin-left: 1rem;", config, null);
  assert.equal(findings.length, 0);
});

test("CSS does not treat strings, comments, or URLs as declarations", () => {
  for (const source of [
    '.x { content: "x; margin-left: 1rem"; }',
    '/* .x { margin-left: 1rem; } */',
    '.x { background: url(data:text/plain;x; margin-left:1rem); }',
    '.x { content: "escaped \\\"; margin-right: 1rem"; }',
  ]) assert.equal(analyzeCss("card.css", source, config, null).length, 0);
  assert.equal(analyzeCss("card.css", '/* ignored */ .x { margin-left: 1rem; }', config, null)[0].ruleId, "CSS001");
});
