import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/config.js";

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-config-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeConfig(root, value) {
  fs.writeFileSync(path.join(root, "rtlume.config.json"), JSON.stringify(value));
  return "rtlume.config.json";
}

test("configuration accepts $schema and fully formed optional sections", (t) => {
  const root = workspace(t);
  const configPath = writeConfig(root, {
    $schema: "./schemas/config.schema.json",
    severity: { CSS001: "warning" },
    ownership: [{ pattern: "src/**", owner: "web" }],
    locales: {
      source: { locale: "en", path: "locales/en.json" },
      targets: [{ locale: "ar", path: "locales/ar.json" }],
    },
  });
  const config = loadConfig(configPath, root);
  assert.equal(config.severity.CSS001, "warning");
  assert.equal(config.locales.targets[0].locale, "ar");
});

test("configuration rejects unknown properties, rules, and severity values", (t) => {
  const root = workspace(t);
  for (const [value, pattern] of [
    [{ unexpected: true }, /unknown properties: unexpected/],
    [{ severity: { MADEUP: "error" } }, /unknown rule ID: MADEUP/],
    [{ severity: { CSS001: "off" } }, /severity\.CSS001 must be error, warning, or info/],
  ]) {
    const configPath = writeConfig(root, value);
    assert.throws(() => loadConfig(configPath, root), pattern);
  }
});

test("configuration rejects malformed arrays and locale definitions", (t) => {
  const root = workspace(t);
  for (const [value, pattern] of [
    [{ rtlLocales: "ar" }, /rtlLocales must be an array/],
    [{ excludeDirs: ["dist", ""] }, /excludeDirs must be an array of non-empty strings/],
    [{ ownership: {} }, /ownership must be an array/],
    [{ ownership: [{ pattern: "src/**" }] }, /ownership\[0\]\.owner must be a non-empty string/],
    [{ locales: [] }, /locales must be an object or null/],
    [{ locales: { source: { locale: "en", path: "en.json" }, targets: {} } }, /locales\.targets must be an array/],
    [{ locales: { source: { locale: "en", path: "en.json" }, targets: [{ locale: "ar" }] } }, /locales\.targets\[0\]\.path must be a non-empty string/],
  ]) {
    const configPath = writeConfig(root, value);
    assert.throws(() => loadConfig(configPath, root), pattern);
  }
});
