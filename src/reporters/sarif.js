import { RULES } from "../constants.js";

function artifactUri(file) {
  return file.replaceAll("\\", "/").split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function reportSarif(result) {
  const usedRules = [...new Set(result.findings.map((finding) => finding.ruleId))].sort();
  return JSON.stringify({
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "rtlume",
          version: result.version,
          informationUri: "https://github.com/KawtharAlg/rtlume",
          rules: usedRules.map((id) => ({ id, name: RULES[id].title.replaceAll(" ", "-"), shortDescription: { text: RULES[id].title }, help: { text: RULES[id].help } })),
        },
      },
      results: result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        level: finding.severity === "warning" ? "warning" : finding.severity === "info" ? "note" : "error",
        message: { text: `${finding.message}${finding.owner ? ` Owner: ${finding.owner}.` : ""}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: artifactUri(finding.file) }, region: { startLine: finding.line, startColumn: finding.column } } }],
        properties: { confidence: finding.confidence, owner: finding.owner },
      })),
    }],
  }, null, 2);
}
