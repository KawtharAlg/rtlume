import fs from "node:fs";
import path from "node:path";
import { VERSION } from "./constants.js";
import { ownerFor } from "./config.js";
import { discover } from "./discovery.js";
import { sortFindings, summarize } from "./finding.js";
import { analyzeCss } from "./analyzers/css.js";
import { analyzeMarkup } from "./analyzers/markup.js";
import { analyzeLocales } from "./analyzers/locales.js";
import { analyzeTokens } from "./analyzers/tokens.js";

function localeScope(files, config, cwd) {
  const root = fs.realpathSync(cwd);
  const definition = config.locales;
  const discovered = new Set(files.map((file) => path.resolve(file.absolute)));
  const configuredPaths = new Set();
  if (definition?.source?.path) configuredPaths.add(path.resolve(root, definition.source.path));
  for (const target of definition?.targets || []) {
    if (target?.path) configuredPaths.add(path.resolve(root, target.path));
  }

  const targets = (definition?.targets || []).filter((target) =>
    target?.path && discovered.has(path.resolve(root, target.path))
  );
  const auxiliaryReads = [];
  let scopedConfig = null;
  if (definition?.source?.path && targets.length > 0) {
    const sourceAbsolute = path.resolve(root, definition.source.path);
    if (!discovered.has(sourceAbsolute)) {
      auxiliaryReads.push({
        file: path.relative(root, sourceAbsolute) || path.basename(sourceAbsolute),
        purpose: "locale-source",
      });
    }
    scopedConfig = {
      ...config,
      locales: { ...definition, targets },
    };
  }
  return { configuredPaths, auxiliaryReads, scopedConfig };
}

export function scan({ inputs, config, cwd = process.cwd() }) {
  const { files, skipped } = discover(inputs, config, cwd);
  const locale = localeScope(files, config, cwd);
  const findings = [];
  for (const file of files) {
    const content = fs.readFileSync(file.absolute, "utf8");
    const extension = path.extname(file.absolute).toLowerCase();
    const owner = ownerFor(file.relative, config);
    if ([".css", ".scss"].includes(extension)) findings.push(...analyzeCss(file.relative, content, config, owner));
    if ([".html", ".htm", ".jsx", ".tsx"].includes(extension)) findings.push(...analyzeMarkup(file.relative, content, config, owner));
    if (extension === ".json" && !locale.configuredPaths.has(path.resolve(file.absolute))) {
      findings.push(...analyzeTokens(file.relative, content, config, owner));
    }
  }
  if (locale.scopedConfig) {
    findings.push(...analyzeLocales(cwd, locale.scopedConfig, (file) => ownerFor(file, config)));
  }
  sortFindings(findings);
  return {
    tool: "rtlume",
    version: VERSION,
    filesScanned: files.length,
    scope: {
      discoveredFiles: files.length,
      auxiliaryFiles: locale.auxiliaryReads.length,
      auxiliaryReads: locale.auxiliaryReads,
      totalFilesRead: files.length + locale.auxiliaryReads.length,
    },
    skipped,
    findings,
    summary: summarize(findings),
    limitations: [
      "Static checks do not prove visual RTL correctness or WCAG conformance.",
      "Findings marked review require human validation with realistic content.",
      "The scanner does not execute source code or make network calls.",
    ],
  };
}
