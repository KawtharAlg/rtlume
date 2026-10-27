# Security policy

## Supported version

Only the newest release candidate is supported during the pre-release phase.

## Report a vulnerability

Keep vulnerability details private. If GitHub shows a private reporting option on the Security tab, use it and include the affected version, a minimal reproduction, and the impact. If that option is unavailable, open an issue asking the maintainer to arrange a private channel, without including the vulnerability or personal data. A dedicated reporting channel is not yet configured.

## Security properties

RTLume does not execute scanned source code, follow symbolic links, call remote services, or collect telemetry. Workspace paths are normalized. Files outside the workspace are rejected. File count and file size are capped. Diagnostic snippets remove terminal control characters and redact common key, token, secret, and password assignments.

## Known limits

The scanner uses bounded static parsing. It does not provide a sandbox for hostile repositories, validate every Unicode security property, or prove that a repository contains no secret. Run it with the same operating-system permissions you would grant another local developer tool.
