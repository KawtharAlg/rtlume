import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeLocales } from "../src/analyzers/locales.js";

test("locale parity, placeholders, and Arabic plurals are checked", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-locales-"));
  fs.writeFileSync(path.join(root, "en.json"), JSON.stringify({ hello: "Hi {name}", count: "{count, plural, one {one} other {many}}", removed: "x" }));
  fs.writeFileSync(path.join(root, "ar.json"), JSON.stringify({ hello: "مرحباً {user}", count: "{count, plural, one {واحد} other {أخرى}}", extra: "x" }));
  const config = { severity: {}, locales: { source: { locale: "en", path: "en.json" }, targets: [{ locale: "ar", path: "ar.json" }] } };
  const findings = analyzeLocales(root, config, () => "localization");
  const ids = findings.map((item) => item.ruleId);
  assert(ids.includes("I18N001"));
  assert(ids.includes("I18N002"));
  assert(ids.includes("I18N003"));
  assert(ids.includes("I18N004"));
});
