import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_CONFIG } from "../src/config.js";
import { discover } from "../src/discovery.js";

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtlume-discovery-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("exactly maxFiles supported files pass even when irrelevant entries follow", (t) => {
  const root = workspace(t);
  fs.writeFileSync(path.join(root, "a.css"), ".a {}");
  fs.writeFileSync(path.join(root, "z.txt"), "not supported");
  const result = discover(["."], { ...DEFAULT_CONFIG, maxFiles: 1 }, root);
  assert.deepEqual(result.files.map((file) => file.relative), ["a.css"]);
});

test("overlapping and repeated inputs do not duplicate discovered files", (t) => {
  const root = workspace(t);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.css"), ".a {}");
  fs.writeFileSync(path.join(root, "src", "b.html"), "<p>ok</p>");
  const result = discover(["src", "src/a.css", "src"], { ...DEFAULT_CONFIG }, root);
  assert.deepEqual(result.files.map((file) => file.relative), [path.join("src", "a.css"), path.join("src", "b.html")]);
});

test("a distinct supported file beyond maxFiles still fails", (t) => {
  const root = workspace(t);
  fs.writeFileSync(path.join(root, "a.css"), ".a {}");
  fs.writeFileSync(path.join(root, "b.css"), ".b {}");
  assert.throws(() => discover(["."], { ...DEFAULT_CONFIG, maxFiles: 1 }, root), /File limit exceeded \(1\)/);
});
