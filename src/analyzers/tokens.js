import { makeFinding } from "../finding.js";

function flatten(value, prefix = "", output = {}) {
  const pending = [{ value, prefix, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    if (current.depth > 100) throw new Error("Token JSON exceeds the maximum nesting depth of 100.");
    visited += 1;
    if (visited > 100000) throw new Error("Token JSON exceeds the maximum node count of 100000.");
    if (current.value && typeof current.value === "object" && !Array.isArray(current.value) && !("$value" in current.value)) {
      for (const [key, child] of Object.entries(current.value)) pending.push({ value: child, prefix: current.prefix ? `${current.prefix}.${key}` : key, depth: current.depth + 1 });
    } else output[current.prefix] = current.value?.$value ?? current.value;
  }
  return output;
}

function aliasOf(value) {
  return typeof value === "string" ? value.match(/^\{([^}]+)}$/)?.[1] || null : null;
}

export function analyzeTokens(file, content, config, owner) {
  const findings = [];
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const tokenCandidate = /token/i.test(file)
      || /"\$value"\s*:/.test(content)
      || /"[^"]*(?:spacing|border|position|layout)(?:\.|\")/i.test(content);
    if (!tokenCandidate) return findings;
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${file}: ${detail}`, { cause: error });
  }
  const values = flatten(parsed);
  const tokenFile = /token/i.test(file) || Object.keys(values).some((key) => /(?:^|\.)(?:spacing|border|position|layout)(?:\.|$)/i.test(key));
  if (!tokenFile) return findings;

  for (const [key, value] of Object.entries(values)) {
    if (/(?:^|[._-])(left|right)(?:$|[._-])/i.test(key)) {
      findings.push(makeFinding({ ruleId: "TOK001", file, line: 1, column: 1, message: `Token ${key} uses a physical direction term.`, evidence: `${key}: ${JSON.stringify(value)}`, suggestion: "Prefer inline-start/inline-end naming if the token follows reading direction; document intentional physical positioning.", config, owner }));
    }
    const alias = aliasOf(value);
    if (alias && !(alias in values)) findings.push(makeFinding({ ruleId: "TOK002", file, line: 1, column: 1, message: `Token ${key} points to missing alias ${alias}.`, evidence: `${key}: {${alias}}`, suggestion: "Create the referenced token or correct the alias path.", config, owner }));
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(key, trail = []) {
    if (visiting.has(key)) {
      const cycle = [...trail, key].join(" -> ");
      findings.push(makeFinding({ ruleId: "TOK003", file, line: 1, column: 1, message: `Circular token alias: ${cycle}.`, evidence: cycle, suggestion: "Replace one alias with a concrete or acyclic semantic reference.", config, owner }));
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    const alias = aliasOf(values[key]);
    if (alias && alias in values) visit(alias, [...trail, key]);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of Object.keys(values)) visit(key);
  return findings;
}
