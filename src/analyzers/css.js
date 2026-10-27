import { makeFinding } from "../finding.js";

const CERTAIN = new Map([
  ["margin-left", "margin-inline-start"],
  ["margin-right", "margin-inline-end"],
  ["padding-left", "padding-inline-start"],
  ["padding-right", "padding-inline-end"],
  ["border-left", "border-inline-start"],
  ["border-right", "border-inline-end"],
  ["border-left-width", "border-inline-start-width"],
  ["border-right-width", "border-inline-end-width"],
  ["border-left-color", "border-inline-start-color"],
  ["border-right-color", "border-inline-end-color"],
  ["border-left-style", "border-inline-start-style"],
  ["border-right-style", "border-inline-end-style"],
]);

const PROBABLE_PROPERTIES = new Set(["left", "right"]);
const PHYSICAL_CORNERS = new Map([
  ["border-top-left-radius", "border-start-start-radius"],
  ["border-top-right-radius", "border-start-end-radius"],
  ["border-bottom-left-radius", "border-end-start-radius"],
  ["border-bottom-right-radius", "border-end-end-radius"],
]);

function suppression(lines, index, ruleId) {
  const previous = lines[index - 1] || "";
  const match = previous.match(/^\s*\/\*\s*rtlume-disable-next-line\s+(.+?)\s*\*\/\s*$/);
  if (!match) return { suppressed: false };
  const [ruleList, reason = ""] = match[1].trim().split(/\s+--\s+/, 2);
  if (!ruleList.split(/[, ]+/).includes(ruleId)) return { suppressed: false };
  return { suppressed: Boolean(reason.trim()), missingReason: !reason.trim(), evidence: previous.trim() };
}

function maskNonDeclarations(content, scss) {
  const chars = content.split("");
  let quote = null;
  let comment = false;
  let lineComment = false;
  let parentheses = 0;
  for (let i = 0; i < content.length; i += 1) {
    const c = content[i];
    const next = content[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      else chars[i] = " ";
    } else if (comment) {
      if (c !== "\n" && c !== "\r") chars[i] = " ";
      if (c === "*" && next === "/") { chars[++i] = " "; comment = false; }
    } else if (quote) {
      if (c !== "\n" && c !== "\r") chars[i] = " ";
      if (c === "\\" && next) { if (next !== "\n" && next !== "\r") chars[i + 1] = " "; i += 1; }
      else if (c === quote) quote = null;
    } else if (c === "/" && next === "*") {
      chars[i] = chars[++i] = " "; comment = true;
    } else if (scss && c === "/" && next === "/" && !parentheses) {
      chars[i] = chars[++i] = " "; lineComment = true;
    } else if (c === '"' || c === "'") { quote = c; chars[i] = " "; }
    else if (c === "(") { parentheses += 1; }
    else if (c === ")") { parentheses = Math.max(0, parentheses - 1); }
    else if (parentheses && c !== "\n" && c !== "\r") chars[i] = " ";
  }
  return chars.join("");
}

export function analyzeCss(file, content, config, owner) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  const masked = maskNonDeclarations(content, /\.scss$/i.test(file)).split(/\r?\n/);
  masked.forEach((line, index) => {
    const declaration = /(^|[{;])\s*([\w-]+)\s*:\s*([^;}]+)/g;
    let match;
    while ((match = declaration.exec(line))) {
      const property = match[2].toLowerCase();
      const value = match[3].trim();
      let ruleId = null;
      let suggestion = "";
      let message = "";

      if (CERTAIN.has(property)) {
        ruleId = "CSS001";
        suggestion = `Use ${CERTAIN.get(property)}: ${value}.`;
        message = `${property} encodes a physical side and may not adapt to RTL.`;
      } else if (PROBABLE_PROPERTIES.has(property) || (["float", "clear", "text-align"].includes(property) && /^(left|right)$/.test(value))) {
        ruleId = "CSS002";
        message = `${property}: ${value} is direction-sensitive and needs an explicit design decision.`;
        suggestion = "Use a logical equivalent when the intent follows reading direction; otherwise document the physical intent.";
      } else if (PHYSICAL_CORNERS.has(property)) {
        ruleId = "CSS003";
        message = `${property} names a physical corner that may not mirror.`;
        suggestion = `Consider ${PHYSICAL_CORNERS.get(property)}: ${value}.`;
      }
      if (!ruleId) continue;

      const state = suppression(lines, index, ruleId);
      if (state.suppressed) continue;
      if (state.missingReason) {
        findings.push(makeFinding({ ruleId: "CFG001", file, line: Math.max(1, index), column: 1, message: `Suppression for ${ruleId} has no rationale.`, evidence: state.evidence, config, owner }));
        continue;
      }
      findings.push(makeFinding({ ruleId, file, line: index + 1, column: match.index + match[1].length + 1, message, evidence: lines[index].trim(), suggestion, config, owner }));
    }
  });
  return findings;
}
