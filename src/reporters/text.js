export function reportText(result) {
  const lines = [];
  for (const finding of result.findings) {
    const owner = finding.owner ? ` owner=${safeText(finding.owner)}` : "";
    lines.push(`${safeText(finding.file)}:${finding.line}:${finding.column} ${finding.severity.toUpperCase()} ${finding.ruleId} [${finding.confidence}]${owner}`);
    lines.push(`  ${safeText(finding.message)}`);
    if (finding.evidence) lines.push(`  Evidence: ${safeText(finding.evidence)}`);
    if (finding.suggestion) lines.push(`  Next: ${safeText(finding.suggestion)}`);
  }
  if (!result.findings.length) lines.push("No findings.");
  lines.push("");
  lines.push(`Scanned ${result.filesScanned} files: ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.infos} info (${result.summary.reviews} human-review items).`);
  if (result.skipped.length) lines.push(`Skipped ${result.skipped.length} files by safety policy.`);
  return `${lines.join("\n")}\n`;
}
import { safeText } from "../finding.js";

