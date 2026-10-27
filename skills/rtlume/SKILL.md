---
name: rtlume
description: Run and interpret RTLume checks when a user asks to audit RTL, Arabic localization, bidirectional text, locale catalogs, directional design tokens, or bilingual design-system policy in a local repository.
license: MIT
metadata:
  version: "0.1.0-rc.1"
---

# RTLume repository audit

Use RTLume as the deterministic source of findings. Do not infer that a clean scan proves visual RTL quality, Arabic language quality, WCAG conformance, or regulatory compliance.

1. Confirm the current working directory is the repository the user wants checked.
2. Review `rtlume.config.json` when present. If absent, explain which default checks will run before scanning.
3. From that working directory, run the CLI bundled at `${CLAUDE_PLUGIN_ROOT}/bin/rtlume.js` against the authorized paths. Select JSON output using the CLI help. The working directory, rather than the plugin installation folder, defines the workspace boundary. Pass an existing configuration file explicitly; the CLI does not load it automatically.
4. Group results by rule, owner, and confidence. Lead with `certain` errors, then probable warnings, then human-review items.
5. For every suggested change, preserve the design intent. Do not automatically mirror icons, change reading order, rewrite Arabic copy, or replace physical positioning when the physical side is intentional.
6. After edits, rerun the same command and report the exit code and exact remaining findings.
7. Never upload repository content, credentials, or diagnostic evidence to a remote service unless the user explicitly authorizes that destination and data.

Use realistic Arabic and Latin samples for manual review. Treat account numbers, phone numbers, prices, email addresses, URLs, and ticker symbols as mixed-direction content that needs focused testing.
