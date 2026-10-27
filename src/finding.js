import { RULES } from "./constants.js";

const ANSI_OR_CONTROL = /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const SECRET = /((?:["']?(?:api[_-]?key|(?:access[_-]?)?token|secret|password)["']?)\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}]+)/gi;

export function safeText(value) {
  return String(value)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, "<redacted private key>")
    .replace(/\bBearer\s+[^\s"',;]+/gi, "Bearer <redacted>")
    .replace(SECRET, "$1<redacted>")
    .replace(ANSI_OR_CONTROL, "�");
}

export function safeEvidence(value) {
  return safeText(value).slice(0, 240);
}

export function makeFinding({
  ruleId,
  file,
  line = 1,
  column = 1,
  message,
  evidence = "",
  suggestion = "",
  config = {},
  owner = null,
}) {
  const rule = RULES[ruleId];
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  return {
    ruleId,
    severity: config.severity?.[ruleId] || rule.defaultSeverity,
    confidence: rule.confidence,
    message,
    file,
    line,
    column,
    evidence: safeEvidence(evidence),
    suggestion,
    owner,
    help: rule.help,
  };
}

export function sortFindings(findings) {
  return findings.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.column - b.column ||
    a.ruleId.localeCompare(b.ruleId),
  );
}

export function summarize(findings) {
  return findings.reduce(
    (summary, finding) => {
      summary[`${finding.severity}s`] += 1;
      if (finding.confidence === "review") summary.reviews += 1;
      return summary;
    },
    { errors: 0, warnings: 0, infos: 0, reviews: 0 },
  );
}
