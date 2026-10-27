import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const format of ["json", "sarif"]) {
  const result = spawnSync(process.execPath, ["bin/rtlume.js", "scan", "fixtures/invalid", "--format", format], { encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  if (format === "sarif") assert.equal(report.version, "2.1.0");
  else assert(report.findings.length > 0);
}
process.stdout.write("JSON and SARIF demos passed.\n");
