#!/usr/bin/env node
import { main } from "../src/cli.js";

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(`rtlume internal error: ${error?.message || String(error)}\n`);
    process.exitCode = 4;
  },
);
