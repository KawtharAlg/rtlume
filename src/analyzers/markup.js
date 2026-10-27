import { makeFinding } from "../finding.js";

const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:\\{\\s*["']([^"']+)["']\\s*\\}|["']([^"']+)["']|([^\\s>"'{}]+))`, "i"));
  return match?.[1] || match?.[2] || match?.[3] || null;
}

export function analyzeMarkup(file, content, config, owner) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  const html = content.match(/<html\b[^>]*>/i);
  if (html) {
    const lang = (attr(html[0], "lang") || "").toLowerCase();
    const dir = (attr(html[0], "dir") || "").toLowerCase();
    const base = lang.split("-")[0];
    const rtl = config.rtlLocales.includes(base) || config.rtlLocales.includes(lang);
    const line = content.slice(0, html.index).split(/\r?\n/).length;
    if (rtl && dir !== "rtl") {
      const dynamic = /\bdir\s*=\s*\{/.test(html[0]) && !dir;
      const finding = makeFinding({ ruleId: "DOC001", file, line, column: 1, message: dynamic ? "Document direction is computed at runtime and needs review with Arabic content." : `Document language ${lang || "(missing)"} requires dir=\"rtl\" under the configured policy.`, evidence: html[0], suggestion: dynamic ? "Verify that the runtime value is rtl for this document." : `Set <html lang=\"${lang}\" dir=\"rtl\">.`, config, owner });
      if (dynamic) { finding.confidence = "review"; finding.severity = "info"; }
      findings.push(finding);
    }
    if (dir && !["ltr", "rtl", "auto"].includes(dir)) {
      findings.push(makeFinding({ ruleId: "DOC002", file, line, column: 1, message: `Invalid dir value: ${dir}.`, evidence: html[0], suggestion: "Use ltr, rtl, or auto.", config, owner }));
    }
  }

  lines.forEach((line, index) => {
    let match;
    BIDI_CONTROLS.lastIndex = 0;
    while ((match = BIDI_CONTROLS.exec(line))) {
      findings.push(makeFinding({ ruleId: "DOC003", file, line: index + 1, column: match.index + 1, message: `Raw Unicode bidi control U+${match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} found.`, evidence: line, suggestion: "Use explicit semantic markup or an escaped and reviewed representation.", config, owner }));
    }
    const dynamic = /(?:{{\s*[\w.]+\s*}}|\{\s*[\w.]+\s*\})/.test(line);
    const isolated = /<bdi\b|\bdir\s*=\s*["']auto["']/i.test(line);
    if (dynamic && !isolated && /[<>]/.test(line)) {
      findings.push(makeFinding({ ruleId: "DOC004", file, line: index + 1, column: 1, message: "Dynamic inline content may mix scripts or directions.", evidence: line.trim(), suggestion: "Review with realistic Arabic/Latin data; use <bdi> or dir=\"auto\" when isolation is appropriate.", config, owner }));
    }
  });
  return findings;
}
