# RTLume

RTLume catches RTL and localization problems before they reach production. It scans CSS, HTML, locale files, and design tokens, then shows which team owns each finding.

The first release candidate detects physical CSS properties, incorrect document direction, unsafe bidirectional controls, locale and placeholder drift, incomplete Arabic ICU plurals, directional token names, and broken token aliases. Results are available as terminal output, JSON, or SARIF.

RTLume does not translate copy, inspect visual rendering, or certify WCAG or regulatory compliance. Findings marked `review` require a person to test realistic Arabic and mixed-script content.

## Why RTLume

A CSS linter will not notice a missing `{amount}` placeholder. A locale checker will not know that `spacing.left` creates a directional dependency in a design system. RTLume checks both and records the team responsible for the rule.

## Current status

`0.1.0-rc.1` is the first public release candidate. The CLI and fixtures run locally. There is no npm package or Claude Directory listing yet.

See [Testing](TESTING.md) for the regression suite and [GitHub Actions](https://github.com/KawtharAlg/rtlume/actions) for the current build result.

## Requirements

- Node.js 20 or newer
- No runtime dependencies
- No network access during a scan

## Run from the repository

```bash
npm run check:examples
npm run demo:json
npm run demo:sarif
npm test
```

Exit codes are stable: `0` passes the configured threshold, `1` means findings exceeded it, `2` indicates invalid usage or configuration, `3` means the scan could not produce a reliable result, and `4` is an internal error.

## Configuration

Start from [`rtlume.config.example.json`](rtlume.config.example.json). The example maps design-token files to `design-system` and locale files to `localization`. A finding includes the owner in text, JSON, and SARIF output.

Suppress a CSS finding only when the physical behavior is intentional. The scanner requires a reason and reports `CFG001` when it is missing. The CSS tests include examples of accepted and rejected suppressions.

## Rule families

| Family | Scope | Automated claim |
| --- | --- | --- |
| `CSS` | Directional CSS properties, positioning, and corners | Source pattern only |
| `DOC` | `lang`, `dir`, bidi controls, and mixed dynamic text | Metadata and source pattern |
| `I18N` | Key parity, placeholders, and Arabic ICU plural branches | Catalog structure |
| `TOK` | Directional token names and alias integrity | Token structure |
| `CFG` | Auditable suppressions | Policy integrity |

These are bounded source checks. Complex CSS and JSX expressions and unsupported ICU syntax need manual review. The Arabic plural rule suggests reviewing all six plural categories; it does not treat an omitted category as an invalid ICU message.

Locale checks apply only to target catalogs included in the requested paths. The source catalog may be read to compare those targets. JSON output lists those additional reads under `scope.auxiliaryFiles`. Skipped files are not covered by a clean result.

Each result has a confidence value:

- `certain`: the source or configured policy proves the condition.
- `probable`: the pattern is risky but can be intentional.
- `review`: automation cannot decide; a human must test it.

## Security and privacy

The scanner does not execute scanned files, follow symbolic links, call a remote service, or send telemetry. It rejects paths outside the workspace, caps file count and size, strips control characters from evidence, and redacts common secret assignments before printing a snippet. See [`SECURITY.md`](SECURITY.md) for the reporting policy and known limits.

## Roadmap boundary

The release candidate intentionally excludes visual comparison, translation generation, automatic rewrites, browser automation, mobile-native resources, and hosted analytics. The next release depends on developer feedback, not a fixed feature list.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening an issue or pull request. New rules need valid and invalid fixtures, precise claims, a confidence classification, and tests for false positives.

## License

MIT License. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
