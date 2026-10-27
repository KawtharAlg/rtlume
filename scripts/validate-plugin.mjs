#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

const manifestPath = path.join(root, ".claude-plugin", "plugin.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`Cannot parse .claude-plugin/plugin.json: ${error.message}`);
}

if (manifest) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(manifest.name || "")) fail("Plugin name must use lowercase letters, digits, and hyphens, up to 64 characters.");
  for (const field of ["displayName", "version", "description", "license"]) if (!manifest[field]) fail(`Manifest is missing ${field}.`);
  if (!manifest.author?.name) fail("Manifest is missing author.name.");
}

const readmePath = path.join(root, "README.md");
if (!fs.existsSync(readmePath)) fail("README.md is missing.");
else {
  const words = fs.readFileSync(readmePath, "utf8").replace(/```[\s\S]*?```/g, " ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 40) fail(`README has ${words} prose words; at least 40 are required.`);
}

if (!fs.existsSync(path.join(root, "LICENSE")) && !manifest?.license) fail("A license is required.");

const skillPath = path.join(root, "skills", "rtlume", "SKILL.md");
if (!fs.existsSync(skillPath)) fail("skills/rtlume/SKILL.md is missing.");
else {
  const skill = fs.readFileSync(skillPath, "utf8");
  if (!/^---\n[\s\S]+?\n---\n/.test(skill)) fail("SKILL.md frontmatter is missing or malformed.");
  if (!/^name:\s*rtlume\s*$/m.test(skill)) fail("SKILL.md name must be rtlume.");
  if (!/^description:\s*\S.+$/m.test(skill)) fail("SKILL.md requires a description.");
}

const blockedNames = new Set([".DS_Store", "Thumbs.db", "desktop.ini", "__MACOSX"]);
let count = 0;
function walk(directory) {
  for (const name of fs.readdirSync(directory)) {
    if (name === ".git") continue;
    const full = path.join(directory, name);
    const relative = path.relative(root, full);
    const stat = fs.lstatSync(full);
    count += 1;
    if (blockedNames.has(name)) fail(`Blocked system file: ${relative}`);
    if (stat.isSymbolicLink()) fail(`Symbolic link is not allowed in plugin content: ${relative}`);
    else if (stat.isDirectory()) walk(full);
    else if (stat.size > 256 * 1024) warn(`File exceeds 256 KiB reviewer threshold: ${relative}`);
  }
}
walk(root);
if (count > 512) warn(`Plugin contains ${count} entries; the reviewer threshold is 512.`);

for (const warning of warnings) process.stdout.write(`WARNING ${warning}\n`);
for (const error of errors) process.stderr.write(`ERROR ${error}\n`);
if (errors.length) process.exitCode = 1;
else process.stdout.write(`Local plugin checks passed (${count} entries, ${warnings.length} warnings). Official Claude validation is still required.\n`);
