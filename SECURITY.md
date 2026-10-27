# Security policy

## Supported version

Only the newest release candidate is supported during the pre-release phase.

## Report a vulnerability

Do not open a public issue for a vulnerability that could expose source code, credentials, user data, or unsafe execution. The private reporting channel will be added before the repository becomes public. Until then, keep the report private and include the affected version, a minimal reproduction, impact, and suggested mitigation.

## Security properties

RTLume does not execute scanned source code, follow symbolic links, call remote services, or collect telemetry. Workspace paths are normalized. Files outside the workspace are rejected. File count and file size are capped. Diagnostic snippets remove terminal control characters and redact common key, token, secret, and password assignments.

## Known limits

The scanner uses bounded static parsing. It does not provide a sandbox for hostile repositories, validate every Unicode security property, or prove that a repository contains no secret. Run it with the same operating-system permissions you would grant another local developer tool.
