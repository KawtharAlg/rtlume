import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_CONFIG } from "../src/config.js";
import { scan } from "../src/engine.js";

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-engine-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function config(locales = null) {
  return { ...DEFAULT_CONFIG, locales };
}

test("malformed token JSON fails the scan with the file name", (t) => {
  const root = workspace(t);
  fs.writeFileSync(path.join(root, "tokens.json"), '{ "spacing.left": ');

  assert.throws(
    () => scan({ inputs: ["tokens.json"], config: config(), cwd: root }),
    /Invalid JSON in tokens\.json:/,
  );
});

test("configured locale keys are not classified as design tokens", (t) => {
  const root = workspace(t);
  fs.mkdirSync(path.join(root, "locales"));
  fs.writeFileSync(path.join(root, "locales", "en.json"), JSON.stringify({ layout: { left: "Left" } }));
  fs.writeFileSync(path.join(root, "locales", "ar.json"), JSON.stringify({ layout: { left: "يسار" } }));
  const locales = {
    source: { locale: "en", path: "locales/en.json" },
    targets: [{ locale: "ar", path: "locales/ar.json" }],
  };

  const result = scan({ inputs: ["locales/ar.json"], config: config(locales), cwd: root });
  assert.equal(result.findings.some((finding) => finding.ruleId === "TOK001"), false);
});

test("an unrelated input does not authorize configured locale targets", (t) => {
  const root = workspace(t);
  fs.mkdirSync(path.join(root, "locales"));
  fs.writeFileSync(path.join(root, "unrelated.css"), ".card { margin-inline-start: 1rem; }");
  fs.writeFileSync(path.join(root, "locales", "en.json"), JSON.stringify({ required: "value" }));
  fs.writeFileSync(path.join(root, "locales", "ar.json"), JSON.stringify({}));
  const locales = {
    source: { locale: "en", path: "locales/en.json" },
    targets: [{ locale: "ar", path: "locales/ar.json" }],
  };

  const result = scan({ inputs: ["unrelated.css"], config: config(locales), cwd: root });
  assert.equal(result.findings.some((finding) => finding.ruleId.startsWith("I18N")), false);
  assert.equal(result.scope.auxiliaryFiles, 0);
  assert.deepEqual(result.scope.auxiliaryReads, []);
});

test("scope metadata counts an explicit auxiliary locale-source read", (t) => {
  const root = workspace(t);
  fs.mkdirSync(path.join(root, "locales"));
  fs.writeFileSync(path.join(root, "locales", "en.json"), JSON.stringify({ hello: "Hello" }));
  fs.writeFileSync(path.join(root, "locales", "ar.json"), JSON.stringify({ hello: "مرحباً" }));
  const locales = {
    source: { locale: "en", path: "locales/en.json" },
    targets: [{ locale: "ar", path: "locales/ar.json" }],
  };

  const result = scan({ inputs: ["locales/ar.json"], config: config(locales), cwd: root });
  assert.equal(result.filesScanned, 1);
  assert.equal(result.scope.discoveredFiles, 1);
  assert.equal(result.scope.auxiliaryFiles, 1);
  assert.equal(result.scope.totalFilesRead, 2);
  assert.deepEqual(result.scope.auxiliaryReads, [
    { file: path.join("locales", "en.json"), purpose: "locale-source" },
  ]);
});
