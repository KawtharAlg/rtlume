import fs from "node:fs";
import path from "node:path";
import { makeFinding } from "../finding.js";

function flatten(value, prefix = "", output = Object.create(null)) {
  const pending = [{ value, prefix, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    if (current.depth > 100) throw new Error("Locale JSON exceeds the maximum nesting depth of 100.");
    visited += 1;
    if (visited > 100000) throw new Error("Locale JSON exceeds the maximum node count of 100000.");
    if (current.value && typeof current.value === "object" && !Array.isArray(current.value)) {
      for (const [key, child] of Object.entries(current.value)) pending.push({ value: child, prefix: current.prefix ? `${current.prefix}.${key}` : key, depth: current.depth + 1 });
    } else output[current.prefix] = current.value;
  }
  return output;
}

const PLACEHOLDER_NAME = /^[\p{L}_][\p{L}\p{N}_.-]*$/u;
const MAX_MESSAGE_DEPTH = 20;
const MAX_PLACEHOLDERS = 10000;

function addPlaceholder(state, identity) {
  state.count += 1;
  if (state.count > MAX_PLACEHOLDERS) {
    state.unsupported = "message exceeds the placeholder limit";
    return;
  }
  state.items.set(identity, (state.items.get(identity) || 0) + 1);
}

function matchingBrace(value, opening) {
  let depth = 0;
  for (let index = opening; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    else if (value[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function topLevelCommas(value) {
  const commas = [];
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    else if (value[index] === "}") depth -= 1;
    else if (value[index] === "," && depth === 0) commas.push(index);
  }
  return commas;
}

function parseIcuBranches(value, offset, state, depth) {
  let cursor = offset;
  let branches = 0;
  while (cursor < value.length) {
    while (/\s/u.test(value[cursor] || "")) cursor += 1;
    const offsetMatch = value.slice(cursor).match(/^offset\s*:\s*\d+/u);
    if (offsetMatch) {
      cursor += offsetMatch[0].length;
      continue;
    }
    const selector = value.slice(cursor).match(/^(?:=[+-]?\d+|[\p{L}_][\p{L}\p{N}_-]*)/u);
    if (!selector) {
      state.unsupported ||= "unsupported ICU branch syntax";
      return;
    }
    cursor += selector[0].length;
    while (/\s/u.test(value[cursor] || "")) cursor += 1;
    if (value[cursor] !== "{") {
      state.unsupported ||= "unsupported ICU branch syntax";
      return;
    }
    const closing = matchingBrace(value, cursor);
    if (closing < 0) {
      state.unsupported ||= "unbalanced ICU branch";
      return;
    }
    parseBraces(value.slice(cursor + 1, closing), state, depth + 1);
    branches += 1;
    cursor = closing + 1;
  }
  if (branches === 0) state.unsupported ||= "ICU selector has no branches";
}

function parseBraces(value, state, depth = 0) {
  if (depth > MAX_MESSAGE_DEPTH) {
    state.unsupported ||= "ICU message exceeds the nesting limit";
    return;
  }
  for (let index = 0; index < value.length && !state.unsupported; index += 1) {
    if (value[index] !== "{") continue;
    if (value[index + 1] === "{") {
      const closing = value.indexOf("}}", index + 2);
      if (closing < 0) {
        state.unsupported ||= "unbalanced mustache placeholder";
        return;
      }
      const name = value.slice(index + 2, closing).trim();
      if (PLACEHOLDER_NAME.test(name)) addPlaceholder(state, `named:${name}`);
      else state.unsupported ||= "unsupported mustache placeholder";
      index = closing + 1;
      continue;
    }

    const closing = matchingBrace(value, index);
    if (closing < 0) {
      state.unsupported ||= "unbalanced ICU placeholder";
      return;
    }
    const expression = value.slice(index + 1, closing);
    const commas = topLevelCommas(expression);
    const name = expression.slice(0, commas[0] ?? expression.length).trim();
    if (!PLACEHOLDER_NAME.test(name)) {
      state.unsupported ||= "unsupported ICU argument name";
      return;
    }
    if (commas.length === 0) {
      addPlaceholder(state, `named:${name}`);
    } else {
      const typeEnd = commas[1] ?? expression.length;
      const type = expression.slice(commas[0] + 1, typeEnd).trim().toLowerCase();
      if (!PLACEHOLDER_NAME.test(type)) {
        state.unsupported ||= "unsupported ICU argument type";
        return;
      }
      if (["plural", "select", "selectordinal"].includes(type)) {
        addPlaceholder(state, `icu-selector:${name}:${type}`);
        if (commas.length < 2) state.unsupported ||= "ICU selector is missing its branches";
        else parseIcuBranches(expression, commas[1] + 1, state, depth);
      } else {
        addPlaceholder(state, `icu-argument:${name}:${type}`);
      }
    }
    index = closing;
  }
}

function parsePrintf(value, state) {
  let implicitPosition = 0;
  let sawExplicit = false;
  let sawImplicit = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "%") continue;
    if (value[index + 1] === "%") {
      index += 1;
      continue;
    }
    const match = value.slice(index).match(/^%(?:(\d+)\$)?[-+0 #'I]*(?:\d+)?(?:\.\d+)?([sdif])/u);
    if (!match) continue;
    const explicitPosition = match[1] ? Number(match[1]) : null;
    if (explicitPosition === null) {
      sawImplicit = true;
      implicitPosition += 1;
    } else sawExplicit = true;
    const position = explicitPosition ?? implicitPosition;
    addPlaceholder(state, `printf:${position}:${match[2]}`);
    index += match[0].length - 1;
  }
  if (sawExplicit && sawImplicit) state.unsupported ||= "mixed positional and sequential printf placeholders";
}

function placeholders(value) {
  const state = { items: new Map(), count: 0, unsupported: null };
  if (typeof value !== "string") return state;
  parseBraces(value, state);
  if (!state.unsupported) parsePrintf(value, state);
  return state;
}

function placeholderList(inventory) {
  return [...inventory.items.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([identity, count]) => `${identity}${count > 1 ? ` x${count}` : ""}`);
}

function samePlaceholders(left, right) {
  return JSON.stringify(placeholderList(left)) === JSON.stringify(placeholderList(right));
}

function makeReviewFinding(options) {
  return { ...makeFinding(options), severity: "info", confidence: "review" };
}

function lineFor(content, key) {
  const index = content.search(new RegExp(`["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*:`));
  return index < 0 ? 1 : content.slice(0, index).split(/\r?\n/).length;
}

function readJson(root, configuredPath, maxFileBytes) {
  const absolute = path.resolve(root, configuredPath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Locale path escapes workspace: ${configuredPath}`);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Locale must be a regular file: ${configuredPath}`);
  if (stat.size > maxFileBytes) throw new Error(`Locale exceeds the file size limit: ${configuredPath}`);
  const real = fs.realpathSync(absolute);
  const realRelative = path.relative(fs.realpathSync(root), real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new Error(`Locale resolves outside workspace: ${configuredPath}`);
  const content = fs.readFileSync(absolute, "utf8");
  return { relative, content, values: flatten(JSON.parse(content)) };
}

export function analyzeLocales(root, config, ownerForPath) {
  const definition = config.locales;
  if (!definition?.source?.path || !Array.isArray(definition.targets)) return [];
  const findings = [];
  const source = readJson(root, definition.source.path, config.maxFileBytes || 1024 * 1024);
  const sourceKeys = new Set(Object.keys(source.values));

  for (const targetConfig of definition.targets) {
    const target = readJson(root, targetConfig.path, config.maxFileBytes || 1024 * 1024);
    const targetKeys = new Set(Object.keys(target.values));
    const owner = ownerForPath(target.relative);
    for (const key of sourceKeys) {
      if (!targetKeys.has(key)) {
        findings.push(makeFinding({ ruleId: "I18N001", file: target.relative, line: 1, column: 1, message: `Missing ${targetConfig.locale} locale key: ${key}.`, evidence: key, suggestion: `Add ${key} with a reviewed ${targetConfig.locale} translation.`, config, owner }));
        continue;
      }
      const sourcePlaceholders = placeholders(source.values[key]);
      const targetPlaceholders = placeholders(target.values[key]);
      if (sourcePlaceholders.unsupported || targetPlaceholders.unsupported) {
        if (source.values[key] !== target.values[key]) {
          const reason = sourcePlaceholders.unsupported || targetPlaceholders.unsupported;
          findings.push(makeReviewFinding({ ruleId: "I18N003", file: target.relative, line: lineFor(target.content, key.split(".").at(-1)), column: 1, message: `Placeholder integrity for ${key} needs human review: ${reason}.`, evidence: String(target.values[key]), suggestion: "Review the unsupported message syntax without assuming a certain placeholder mismatch.", config, owner }));
        }
      } else if (!samePlaceholders(sourcePlaceholders, targetPlaceholders)) {
        const expected = placeholderList(sourcePlaceholders);
        const actual = placeholderList(targetPlaceholders);
        findings.push(makeFinding({ ruleId: "I18N003", file: target.relative, line: lineFor(target.content, key.split(".").at(-1)), column: 1, message: `Placeholder mismatch for ${key}. Expected [${expected.join(", ")}], found [${actual.join(", ")}].`, evidence: String(target.values[key]), suggestion: "Preserve the source placeholder names, counts, positions, and types exactly.", config, owner }));
      }
      if (targetConfig.locale.split("-")[0] === "ar" && typeof target.values[key] === "string" && /,\s*plural\s*,/.test(target.values[key])) {
        const required = ["zero", "one", "two", "few", "many", "other"];
        const missing = required.filter((branch) => !new RegExp(`\\b${branch}\\s*\\{`).test(target.values[key]));
        if (missing.length) findings.push(makeReviewFinding({ ruleId: "I18N004", file: target.relative, line: lineFor(target.content, key.split(".").at(-1)), column: 1, message: `Arabic plural message ${key} uses fewer than the six CLDR categories. Review project policy; missing: ${missing.join(", ")}.`, evidence: String(target.values[key]), suggestion: "Confirm the intended plural coverage with an Arabic reviewer. ICU permits valid messages with fewer explicit categories.", config, owner }));
      }
    }
    for (const key of targetKeys) {
      if (!sourceKeys.has(key)) findings.push(makeFinding({ ruleId: "I18N002", file: target.relative, line: lineFor(target.content, key.split(".").at(-1)), column: 1, message: `Unexpected ${targetConfig.locale} locale key: ${key}.`, evidence: key, suggestion: "Remove the obsolete key or add the corresponding source key.", config, owner }));
    }
  }
  return findings;
}
