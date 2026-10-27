# Testing

Run `npm test` from the repository root. No dependency installation is needed for the test suite.

The 41 regression tests cover CSS and JSX patterns, locale keys and placeholders, token aliases, configuration validation, file limits, path boundaries, output files, secret redaction, and SARIF paths.

Run `npm run check:examples` for the bilingual example. It should report no findings. Run `npm run demo:json` or `npm run demo:sarif` to inspect the invalid fixture. Those demos return exit code 1 because the fixture intentionally contains problems.

`node scripts/check-demo.mjs` checks both machine-readable demos and their exit codes. `npm run validate:plugin` checks the local bundle structure. Anthropic's directory validation and review are separate steps.

CI runs the suite on Node.js 20, 22, and 24 for Linux, Windows, and macOS. Symlink tests can be skipped when the operating system does not grant the required privilege. Successful CI is a regression check, not an independent security audit.
