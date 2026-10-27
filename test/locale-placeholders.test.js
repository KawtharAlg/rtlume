import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeLocales } from "../src/analyzers/locales.js";

function scan(sourceValue, targetValue, locale = "ar") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-placeholder-"));
  try {
    fs.writeFileSync(path.join(root, "en.json"), JSON.stringify({ message: sourceValue }));
    fs.writeFileSync(path.join(root, "target.json"), JSON.stringify({ message: targetValue }));
    const config = {
      severity: {},
      locales: {
        source: { locale: "en", path: "en.json" },
        targets: [{ locale, path: "target.json" }],
      },
    };
    return analyzeLocales(root, config, () => "localization");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("repeated sequential printf placeholders preserve count and type", () => {
  const findings = scan("%s sent %s", "%s sent", "fr");
  assert(findings.some((finding) => finding.ruleId === "I18N003" && finding.severity === "error"));
});

test("positional printf placeholders may be reordered without a mismatch", () => {
  const findings = scan("%1$s has %2$d items", "%2$d عناصر لدى %1$s");
  assert.equal(findings.some((finding) => finding.ruleId === "I18N003"), false);
});

test("ICU selector variable names must match", () => {
  const findings = scan(
    "{count, plural, one {One item} other {Many items}}",
    "{total, plural, one {عنصر} other {عناصر}}",
  );
  assert(findings.some((finding) => finding.ruleId === "I18N003" && finding.severity === "error"));
});

test("plain words inside ICU branches are not placeholders", () => {
  const findings = scan(
    "{count, plural, one {one item} other {many items}}",
    "{count, plural, one {عنصر واحد} other {عناصر كثيرة}}",
  );
  assert.equal(findings.some((finding) => finding.ruleId === "I18N003"), false);
});

test("a valid Arabic other-only plural is advisory rather than an error", () => {
  const findings = scan(
    "{count, plural, other {# items}}",
    "{count, plural, other {# عنصر}}",
  );
  const advisory = findings.find((finding) => finding.ruleId === "I18N004");
  assert(advisory);
  assert.equal(advisory.severity, "info");
  assert.equal(advisory.confidence, "review");
  assert.equal(findings.some((finding) => finding.ruleId === "I18N003"), false);
});
