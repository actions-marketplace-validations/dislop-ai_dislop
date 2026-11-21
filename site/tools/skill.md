---
name: dislop
description: De-slop AI outputs across writing, Markdown, HTML/CSS/JSX/SVG, Word (.docx), PowerPoint (.pptx), and PDF deliverables. Runs deterministic checks, applies localized Deletion Tests, and verifies edits kept every number, qualifier, date, URL, code span, and citation intact without second-order slogan drift.
---

# dislop — Multi-Modal De-Slop & Revision Verification

Use `dislop` before delivering, publishing, or committing AI-assisted drafts, docs, slide decks, web interfaces, or Office/PDF deliverables.

## When to Run

- Markdown/text briefs, technical proposals, release notes, READMEs, or longform essays (English or Chinese).
- HTML, CSS, JSX/TSX, or SVG pages and components where contrast, dark-mode elevation, dead controls, or AI template chrome matter.
- Word (`.docx`), PowerPoint (`.pptx`), or PDF files before external handoff.
- Any revision where numbers, qualifiers (`up to`, `at least`, `最多`, `至少`), units, dates, URLs, code spans, or citations must survive verbatim.

## When NOT to Run

- Negative unit-test fixtures that intentionally store anti-pattern examples.
- Vendored third-party libraries or general non-UI backend application code.

## Pack Selection

- `core` (`severity: error`, always inherited): objective delivery bugs (leaked local paths, unfilled placeholders, chatbot residue, raw Markdown in Office docs, dead `href="#"` controls, WCAG AA contrast `< 4.5:1`, dark-mode Z-elevation inversions, off-slide PPTX frames, PDF URI/title/font hygiene).
- `business-brief`: technical specs, product briefs, PRDs, memos, executive summaries.
- `literary-essay`: non-fiction essays, narrative reporting, columns.
- `deck-and-ui`: HTML/CSS/JSX/SVG interfaces and `.pptx` slide decks.

## Three-Step Execution Loop

1. **Inspect (Deterministic Check)**
   - Prefer MCP tool `dislop_check` when `dislop` is attached over stdio.
   - Otherwise run the zero-dependency CLI:
     ```bash
     npx --yes github:dislop-ai/dislop check <path> --format json --lang <en|zh>
     # or Python 3.10+
     uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --format json --lang <en|zh>
     ```
   - Fix every `error` (`packs/core`) first. Treat `warning` and `info` findings as localized editorial queries.

2. **Targeted Edit (Deletion Test, Not Synonym Swapping)**
   - Edit only the flagged spans. Apply each finding's `deletionTest` question directly (call `dislop_explain` or read `https://dislop.com/rules/<rule-id>.md` for `bad -> trap -> good` contrasts).
   - Keep code blocks, inline code, URLs, and quoted primary sources intact.
   - Preserve every protected fact: numbers with qualifiers (`up to`, `at least`, `最多`, `至少`) and units, dates, links, code spans, and citation markers.
   - Never trade stock words for second-order slogans (`"It's not X — it's Y"`, three-word staccato chains, 4-char Chinese slogan triads, or moralizing endings).

3. **Verify (Stage-3 Fact & Displacement Guard)**
   - Call MCP `dislop_verify` (`before`, `after`) or run:
     ```bash
     npx --yes github:dislop-ai/dislop verify <before-file> <after-file> --json
     ```
   - Confirm `"ok": true` in the JSON verdict (exit code `0`) before handoff. If rejected, restore dropped facts or rewrite second-order slogan frames and re-verify.

## Zero-Install Fallback (No Shell / No MCP)

Fetch the smallest matching Level 0 static resource from `https://dislop.com`:

- Routing index: `https://dislop.com/llms.txt`
- Machine catalog (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- Task bundles (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- Atomic rule cards: `/rules/<rule-id>.md`
