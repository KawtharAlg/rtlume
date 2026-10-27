import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("plugin validation accepts LF and CRLF frontmatter and rejects a missing delimiter", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-plugin-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.mkdirSync(path.join(root, "skills", "rtlume"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude-plugin", "plugin.json"), JSON.stringify({
    name: "rtlume", displayName: "RTLume", version: "0.1.0-rc.1",
    description: "Check local RTL diagnostics.", license: "MIT", author: { name: "Test maintainer" },
  }));
  fs.writeFileSync(path.join(root, "README.md"), "Example documentation for a local plugin. ".repeat(10));
  const skillPath = path.join(root, "skills", "rtlume", "SKILL.md");
  const script = fileURLToPath(new URL("../scripts/validate-plugin.mjs", import.meta.url));
  const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  const skill = "---\nname: rtlume\ndescription: Read local RTL diagnostics.\n---\n\nReview findings.\n";
  for (const content of [skill, skill.replace(/\n/g, "\r\n")]) {
    fs.writeFileSync(skillPath, content);
    const result = run();
    assert.equal(result.status, 0, result.stderr);
  }
  fs.writeFileSync(skillPath, skill.replace("\n---\n", "\n"));
  const invalid = run();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /frontmatter is missing or malformed/);
});
