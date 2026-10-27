import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EXIT, RULES, SEVERITY_RANK, VERSION } from "./constants.js";
import { loadConfig } from "./config.js";
import { scan } from "./engine.js";
import { reportText } from "./reporters/text.js";
import { reportSarif } from "./reporters/sarif.js";
import { safeText } from "./finding.js";

const HELP = `rtlume ${VERSION}\n\nUsage:\n  rtlume scan [paths...] [--config file] [--format text|json|sarif] [--output file]\n  rtlume rules\n  rtlume --version\n\nExit codes: 0 pass, 1 threshold exceeded, 2 usage/config, 3 scan failure, 4 internal error.\n`;

function parse(args) {
  const options = { command: args[0], inputs: [], format: "text", config: null, output: null };
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index];
    if (["--config", "--format", "--output"].includes(value) && (!args[index + 1] || args[index + 1].startsWith("--"))) {
      throw new Error(`Option ${value} requires a value.`);
    }
    if (value === "--config") options.config = args[++index];
    else if (value === "--format") options.format = args[++index];
    else if (value === "--output") options.output = args[++index];
    else if (value.startsWith("-")) throw new Error(`Unknown option: ${value}`);
    else options.inputs.push(value);
  }
  return options;
}

export async function main(args, io = { stdout: process.stdout, stderr: process.stderr }, cwd = process.cwd()) {
  if (!args.length || args.includes("--help") || args[0] === "help") {
    io.stdout.write(HELP);
    return EXIT.PASS;
  }
  if (args[0] === "--version") {
    io.stdout.write(`${VERSION}\n`);
    return EXIT.PASS;
  }
  if (args[0] === "rules") {
    io.stdout.write(`${Object.entries(RULES).map(([id, rule]) => `${id}: ${rule.title} (${rule.confidence})`).join("\n")}\n`);
    return EXIT.PASS;
  }
  if (args[0] !== "scan") {
    io.stderr.write(`Unknown command: ${safeText(args[0])}\n${HELP}`);
    return EXIT.USAGE;
  }

  let options;
  let config;
  try {
    options = parse(args);
    if (!new Set(["text", "json", "sarif"]).has(options.format)) throw new Error("Format must be text, json, or sarif.");
    config = loadConfig(options.config, cwd);
  } catch (error) {
    io.stderr.write(`Configuration error: ${safeText(error.message)}\n`);
    return EXIT.USAGE;
  }

  let result;
  try {
    result = scan({ inputs: options.inputs, config, cwd });
  } catch (error) {
    io.stderr.write(`Scan failed: ${safeText(error.message)}\n`);
    return EXIT.SCAN_FAILURE;
  }
  const rendered = options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : options.format === "sarif" ? `${reportSarif(result)}\n` : reportText(result);
  if (options.output) {
    let temporary;
    try {
    const absolute = path.resolve(cwd, options.output);
    const relative = path.relative(cwd, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      io.stderr.write("Output path must remain inside the workspace.\n");
      return EXIT.USAGE;
    }
    const parent = path.dirname(absolute);
    const realRoot = fs.realpathSync(cwd);
    const realParent = fs.realpathSync(parent);
    const parentRelative = path.relative(realRoot, realParent);
    if (parentRelative.startsWith("..") || path.isAbsolute(parentRelative)) {
      io.stderr.write("Output directory resolves outside the workspace.\n");
      return EXIT.USAGE;
    }
    let existing;
    try { existing = fs.lstatSync(absolute); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (existing?.isSymbolicLink()) {
      io.stderr.write("Output file must not be a symbolic link.\n");
      return EXIT.USAGE;
    }
    temporary = path.join(realParent, `.rtlume-${randomUUID()}.tmp`);
    fs.writeFileSync(temporary, rendered, { encoding: "utf8", mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, path.join(realParent, path.basename(absolute)));
    temporary = undefined;
    } catch (error) {
      io.stderr.write(`Could not write report: ${safeText(error.message)}\n`);
      return EXIT.SCAN_FAILURE;
    } finally {
      if (temporary) {
        try { fs.unlinkSync(temporary); } catch { /* A failed write may not have created the temporary file. */ }
      }
    }
  } else io.stdout.write(rendered);

  if (config.failOn === "never") return EXIT.PASS;
  const threshold = SEVERITY_RANK[config.failOn];
  return result.findings.some((finding) => SEVERITY_RANK[finding.severity] >= threshold) ? EXIT.FINDINGS : EXIT.PASS;
}
