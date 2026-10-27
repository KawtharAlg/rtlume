# Contributing to RTLume

Thank you for improving RTLume. Keep contributions narrow enough to review and reproduce.

## Before coding

1. Search existing issues and pull requests.
2. Describe the defect with a minimal Arabic/English fixture.
3. State what automation can prove and what still needs human review.
4. Avoid employer code, screenshots, data, or design assets unless you have explicit publication rights.

## Rule requirements

A new rule must include:

- a stable rule ID;
- a specific message and safe suggestion;
- a `certain`, `probable`, or `review` confidence level;
- one valid fixture and one invalid fixture;
- unit tests for location, evidence, and severity;
- documentation of false positives and suppressions;
- no compliance claim beyond the implemented check.

Run the full suite before opening a pull request:

```bash
node --test
node ./bin/rtlume.js scan examples --config rtlume.config.example.json
```

Pull requests should explain the user problem, the chosen scope, tests, security impact, and any change to machine-readable output. User-facing changes need before/after evidence when appropriate.
