---
content-type: reference-data
task: pre-release-gate
version: 0.2.0
---

# Task Bundle: Pre-Release Objective Gate & CI

Use this bundle when gating pull requests, release docs, or agent-produced Office/PDF deliverables with zero subjective style noise.

## 1. Objective Invariants (`packs/core`, `error`)

### Pack `core`
- [`local-path-leak`](../rules/local-path-leak.md) (`error`): Leaked local filesystem path or file:/// link.
- [`unfilled-placeholder`](../rules/unfilled-placeholder.md) (`error`): Unfilled template placeholder, broken Word reference field, or dummy copy.
- [`chatbot-artifact`](../rules/chatbot-artifact.md) (`error`): Unstripped chatbot wrapper sentence or AI search citation token.
- [`markdown-leak`](../rules/markdown-leak.md) (`error`): Raw Markdown syntax (`**bold**` or `## heading`) left unrendered inside an Office document.
- [`ui-dead-control`](../rules/ui-dead-control.md) (`error`): Anchor with dead `href="#"` / empty target, unlabeled button, or unexplained static `<button disabled>`.
- [`ui-contrast-and-dark-inversion`](../rules/ui-contrast-and-dark-inversion.md) (`error`): Resolvable foreground/background contrast fails WCAG AA (< 4.5:1), or dark-theme canvas is brighter than raised surface tokens.
- [`office-pdf-hygiene`](../rules/office-pdf-hygiene.md) (`error`): Off-slide text box in PPTX, unaccepted tracked changes/comments in Office docs, or PDF metadata/font/URI defect.

## 2. Incremental CI & Local Verification

```bash
# Gate only git-changed lines against main (exit 1 on core error)
npx --yes github:dislop-ai/dislop check --changed origin/main --fail-on error --format github

# Emit SARIF 2.1.0 for GitHub Code Scanning
npx --yes github:dislop-ai/dislop check . --fail-on error --format sarif > dislop.sarif

# Verify revision preserved numbers, qualifiers, units, dates, URLs, code, and citations
npx --yes github:dislop-ai/dislop verify before.md after.md
```

Deep dives: [Pack `core`](../packs/core.md) · [CLI & Hooks](../tools/cli-and-hooks.md) · [MCP & SDK](../tools/mcp-sdk-api.md)
