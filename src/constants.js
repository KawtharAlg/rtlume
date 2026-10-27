export const VERSION = "0.1.0-rc.1";

export const EXIT = Object.freeze({
  PASS: 0,
  FINDINGS: 1,
  USAGE: 2,
  SCAN_FAILURE: 3,
  INTERNAL: 4,
});

export const SEVERITY_RANK = Object.freeze({ info: 1, warning: 2, error: 3 });

export const RULES = Object.freeze({
  CSS001: {
    title: "Physical directional CSS property",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Use CSS logical properties when the intent follows reading direction.",
  },
  CSS002: {
    title: "Direction-sensitive CSS positioning or value",
    confidence: "probable",
    defaultSeverity: "warning",
    help: "Confirm whether this value is semantic or intentionally physical.",
  },
  CSS003: {
    title: "Physical corner radius",
    confidence: "probable",
    defaultSeverity: "warning",
    help: "Use logical corner radii when the shape should mirror.",
  },
  DOC001: {
    title: "RTL language without RTL direction",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Set dir=\"rtl\" on the document root for configured RTL languages.",
  },
  DOC002: {
    title: "Invalid or contradictory direction metadata",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Use dir=\"ltr\", dir=\"rtl\", or dir=\"auto\" consistently with the content.",
  },
  DOC003: {
    title: "Raw bidirectional control character",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Replace raw controls with explicit markup or an escaped, reviewed representation.",
  },
  DOC004: {
    title: "Dynamic mixed-direction content needs review",
    confidence: "review",
    defaultSeverity: "info",
    help: "Consider bdi or dir=\"auto\" for user-generated or mixed-script values.",
  },
  I18N001: {
    title: "Missing locale key",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Add the missing key or explicitly document the fallback policy.",
  },
  I18N002: {
    title: "Unexpected locale key",
    confidence: "certain",
    defaultSeverity: "warning",
    help: "Remove obsolete keys or restore the source-locale entry.",
  },
  I18N003: {
    title: "Placeholder mismatch",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Preserve the exact placeholder names required by the source message.",
  },
  I18N004: {
    title: "Arabic plural policy branches incomplete",
    confidence: "certain",
    defaultSeverity: "error",
    help: "This project checks for zero, one, two, few, many, and other. ICU validity alone does not require every branch.",
  },
  TOK001: {
    title: "Physical direction in design-token name",
    confidence: "probable",
    defaultSeverity: "warning",
    help: "Prefer inline-start/inline-end or block-start/block-end token semantics.",
  },
  TOK002: {
    title: "Unresolved design-token alias",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Point the alias to an existing token path.",
  },
  TOK003: {
    title: "Circular design-token alias",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Break the alias cycle so the token resolves deterministically.",
  },
  CFG001: {
    title: "Suppression missing rationale",
    confidence: "certain",
    defaultSeverity: "error",
    help: "Every suppression must include -- followed by a concrete reason.",
  },
});
