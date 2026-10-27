import fs from "node:fs";
import path from "node:path";

const SUPPORTED = new Set([".css", ".scss", ".html", ".htm", ".jsx", ".tsx", ".json"]);

export function discover(inputs, config, cwd = process.cwd()) {
  const root = fs.realpathSync(cwd);
  const files = [];
  const skipped = [];
  const visitedDirectories = new Set();
  const visitedFiles = new Set();

  function visit(candidate) {
    const absolute = path.resolve(root, candidate);
    const relative = path.relative(root, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Path escapes workspace root: ${candidate}`);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      skipped.push({ file: relative, reason: "symlink" });
      return;
    }
    const real = fs.realpathSync(absolute);
    const realRelative = path.relative(root, real);
    if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
      throw new Error(`Resolved path escapes workspace root: ${candidate}`);
    }
    if (stat.isDirectory()) {
      if (config.excludeDirs.includes(path.basename(absolute))) return;
      if (visitedDirectories.has(real)) return;
      visitedDirectories.add(real);
      for (const child of fs.readdirSync(absolute).sort()) visit(path.join(relative, child));
      return;
    }
    if (!stat.isFile() || !SUPPORTED.has(path.extname(absolute).toLowerCase())) return;
    if (visitedFiles.has(real)) return;
    if (stat.size > config.maxFileBytes) {
      skipped.push({ file: relative, reason: "size-limit" });
      return;
    }
    if (files.length >= config.maxFiles) throw new Error(`File limit exceeded (${config.maxFiles}).`);
    visitedFiles.add(real);
    files.push({ absolute, relative: relative || path.basename(absolute), size: stat.size });
  }

  for (const input of inputs.length ? inputs : ["."]) visit(input);
  return { files, skipped };
}
