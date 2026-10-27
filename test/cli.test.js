import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function capture() {
  let stdout = "";
  let stderr = "";
  return { io: { stdout: { write: (value) => { stdout += value; } }, stderr: { write: (value) => { stderr += value; } } }, read: () => ({ stdout, stderr }) };
}

test("CLI returns finding exit code and deterministic JSON", async () => {
  const output = capture();
  const code = await main(["scan", "fixtures/invalid", "--format", "json"], output.io, root);
  const result = JSON.parse(output.read().stdout);
  assert.equal(code, 1);
  assert(result.findings.length >= 6);
  assert.equal(result.tool, "rtlume");
});

test("CLI passes valid fixture", async () => {
  const output = capture();
  const code = await main(["scan", "fixtures/valid"], output.io, root);
  assert.equal(code, 0);
  assert.match(output.read().stdout, /No findings/);
});

test("CLI blocks path traversal", async () => {
  const output = capture();
  const code = await main(["scan", "../"], output.io, root);
  assert.equal(code, 3);
  assert.match(output.read().stderr, /escapes workspace root/);
});

test("CLI does not follow a symlink outside the workspace", async (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const link = path.join(root, "test-symlink");
  try {
    fs.symlinkSync(outside, link, "dir");
  } catch (error) {
    t.skip(`Symlink unavailable: ${error.message}`);
    return;
  }
  t.after(() => fs.unlinkSync(link));
  const output = capture();
  const code = await main(["scan", "test-symlink"], output.io, root);
  assert.equal(code, 0);
  assert.match(output.read().stdout, /Skipped 1 files/);
});

test("CLI rejects options without values", async () => {
  for (const option of ["--config", "--format", "--output"]) {
    const output = capture();
    assert.equal(await main(["scan", "fixtures/valid", option], output.io, root), 2);
    assert.match(output.read().stderr, /requires a value/);
  }
});

test("CLI lists the available rules", async () => {
  const output = capture();
  assert.equal(await main(["rules"], output.io, root), 0);
  assert.match(output.read().stdout, /CSS001/);
  assert.match(output.read().stdout, /I18N004/);
});

test("CLI writes valid JSON in a fresh workspace", async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-report-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const output = capture();
  assert.equal(await main(["scan", ".", "--format", "json", "--output", "report.json"], output.io, workspace), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(workspace, "report.json"), "utf8")).tool, "rtlume");
});

test("CLI returns a scan failure for a missing output directory", async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-missing-output-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const output = capture();
  assert.equal(await main(["scan", ".", "--output", "missing/report.json"], output.io, workspace), 3);
  assert.match(output.read().stderr, /Could not write report/);
});

test("CLI rejects a dangling output symlink", async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-symlink-report-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-report-outside-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const target = path.join(outside, "must-not-exist.json");
  try { fs.symlinkSync(target, path.join(workspace, "report.json")); }
  catch (error) { t.skip(`Symlink unavailable: ${error.message}`); return; }
  const output = capture();
  assert.equal(await main(["scan", ".", "--output", "report.json"], output.io, workspace), 2);
  assert.equal(fs.existsSync(target), false);
});

test("CLI replaces an output hardlink without changing its outside target", async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-hardlink-report-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-hardlink-outside-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const target = path.join(outside, "original.json");
  fs.writeFileSync(target, "original");
  fs.linkSync(target, path.join(workspace, "report.json"));
  const output = capture();
  assert.equal(await main(["scan", ".", "--format", "json", "--output", "report.json"], output.io, workspace), 0);
  assert.equal(fs.readFileSync(target, "utf8"), "original");
});
