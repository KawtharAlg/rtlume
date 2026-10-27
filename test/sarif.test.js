import test from "node:test";
import assert from "node:assert/strict";
import { reportSarif } from "../src/reporters/sarif.js";

test("SARIF artifact locations use portable encoded URIs", () => {
  const report = JSON.parse(reportSarif({
    version: "0.1.0-test",
    findings: [{
      ruleId: "CSS001",
      severity: "error",
      confidence: "certain",
      message: "Physical property.",
      owner: null,
      file: "src\\Arabic files\\بطاقة.css",
      line: 2,
      column: 3,
    }],
  }));
  assert.equal(
    report.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri,
    "src/Arabic%20files/%D8%A8%D8%B7%D8%A7%D9%82%D8%A9.css",
  );
});
