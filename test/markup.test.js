import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMarkup } from "../src/analyzers/markup.js";

test("literal JSX and unquoted HTML direction attributes are recognized", () => {
  const config = { rtlLocales: ["ar"], severity: {} };
  for (const source of ['<html lang="ar" dir={"rtl"}>', '<html lang=ar dir=rtl>']) {
    assert.equal(analyzeMarkup("page.tsx", source, config, null).some(f => f.ruleId === "DOC001"), false);
  }
  const finding = analyzeMarkup("page.tsx", '<html lang="ar" dir={direction}>', config, null).find(f => f.ruleId === "DOC001");
  assert.equal(finding.confidence, "review");
  assert.equal(finding.severity, "info");
});

const config = { severity: {}, rtlLocales: ["ar"] };

test("Arabic document with LTR direction fails", () => {
  const findings = analyzeMarkup("index.html", '<html lang="ar" dir="ltr"><p>{{name}}</p></html>', config, null);
  assert.deepEqual(findings.map((item) => item.ruleId), ["DOC001", "DOC004"]);
});

test("isolated mixed-direction content is accepted", () => {
  const findings = analyzeMarkup("index.html", '<html lang="ar" dir="rtl"><bdi>{{name}}</bdi></html>', config, null);
  assert.equal(findings.length, 0);
});

test("raw bidi controls are reported", () => {
  const findings = analyzeMarkup("index.html", '<html lang="en" dir="ltr"><p>abc\u202Etxt</p></html>', config, null);
  assert.equal(findings[0].ruleId, "DOC003");
});
