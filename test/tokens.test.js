import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTokens } from "../src/analyzers/tokens.js";

test("token direction, missing aliases, and cycles are reported", () => {
  const content = JSON.stringify({ spacing: { left: { $value: "1rem" }, bad: { $value: "{spacing.nope}" }, a: { $value: "{spacing.b}" }, b: { $value: "{spacing.a}" } } });
  const findings = analyzeTokens("tokens.json", content, { severity: {} }, "design-system");
  const ids = findings.map((item) => item.ruleId);
  assert(ids.includes("TOK001"));
  assert(ids.includes("TOK002"));
  assert(ids.includes("TOK003"));
});
