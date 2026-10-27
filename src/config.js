import fs from "node:fs";
import path from "node:path";
import { RULES } from "./constants.js";

export const DEFAULT_CONFIG = Object.freeze({
  rtlLocales: ["ar", "fa", "he", "ur"],
  failOn: "error",
  maxFileBytes: 1024 * 1024,
  maxFiles: 5000,
  excludeDirs: [".git", "node_modules", "dist", "build", "coverage", "vendor"],
  severity: {},
  ownership: [],
  locales: null,
});

const TOP_LEVEL_KEYS = new Set(["$schema", ...Object.keys(DEFAULT_CONFIG)]);
const SEVERITIES = new Set(["error", "warning", "info"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertOnlyKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`${label} contains unknown properties: ${unknown.join(", ")}.`);
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry.trim())) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
}

function validateLocaleFile(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);
  assertOnlyKeys(value, new Set(["locale", "path"]), label);
  for (const field of ["locale", "path"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new Error(`${label}.${field} must be a non-empty string.`);
    }
  }
}

function validateConfig(config) {
  if (config.$schema !== undefined && (typeof config.$schema !== "string" || !config.$schema.trim())) {
    throw new Error("$schema must be a non-empty string when provided.");
  }
  if (!["error", "warning", "info", "never"].includes(config.failOn)) {
    throw new Error("failOn must be error, warning, info, or never.");
  }
  assertStringArray(config.rtlLocales, "rtlLocales");
  assertStringArray(config.excludeDirs, "excludeDirs");
  if (!Number.isSafeInteger(config.maxFiles) || config.maxFiles < 1) {
    throw new Error("maxFiles must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(config.maxFileBytes) || config.maxFileBytes < 1) {
    throw new Error("maxFileBytes must be a positive safe integer.");
  }
  if (!isObject(config.severity)) throw new Error("severity must be an object.");
  for (const [ruleId, severity] of Object.entries(config.severity)) {
    if (!(ruleId in RULES)) throw new Error(`severity contains unknown rule ID: ${ruleId}.`);
    if (!SEVERITIES.has(severity)) throw new Error(`severity.${ruleId} must be error, warning, or info.`);
  }
  if (!Array.isArray(config.ownership)) throw new Error("ownership must be an array.");
  config.ownership.forEach((entry, index) => {
    const label = `ownership[${index}]`;
    if (!isObject(entry)) throw new Error(`${label} must be an object.`);
    assertOnlyKeys(entry, new Set(["pattern", "owner"]), label);
    for (const field of ["pattern", "owner"]) {
      if (typeof entry[field] !== "string" || !entry[field].trim()) {
        throw new Error(`${label}.${field} must be a non-empty string.`);
      }
    }
  });
  if (config.locales !== null) {
    if (!isObject(config.locales)) throw new Error("locales must be an object or null.");
    assertOnlyKeys(config.locales, new Set(["source", "targets"]), "locales");
    validateLocaleFile(config.locales.source, "locales.source");
    if (!Array.isArray(config.locales.targets)) throw new Error("locales.targets must be an array.");
    config.locales.targets.forEach((target, index) => validateLocaleFile(target, `locales.targets[${index}]`));
  }
}

export function loadConfig(configPath, cwd = process.cwd()) {
  if (!configPath) return { ...DEFAULT_CONFIG };
  const absolute = path.resolve(cwd, configPath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Config must be a regular file.");
  const root = fs.realpathSync(cwd);
  const real = fs.realpathSync(absolute);
  const relative = path.relative(root, real);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Config resolves outside the workspace.");
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (!isObject(parsed)) throw new Error("Configuration root must be an object.");
  assertOnlyKeys(parsed, TOP_LEVEL_KEYS, "Configuration");
  const config = { ...DEFAULT_CONFIG, ...parsed };
  validateConfig(config);
  return config;
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**", "§§").replaceAll("*", "[^/]*").replaceAll("§§", ".*");
  return new RegExp(`^${escaped}$`);
}

export function ownerFor(relativePath, config) {
  const normalized = relativePath.split(path.sep).join("/");
  for (const entry of config.ownership || []) {
    if (entry?.pattern && entry?.owner && wildcardToRegex(entry.pattern).test(normalized)) return entry.owner;
  }
  return null;
}
