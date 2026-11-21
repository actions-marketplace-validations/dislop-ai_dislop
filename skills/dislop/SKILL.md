---
name: dislop
description: Check AI-written drafts, docs, slide decks, and web pages for slop before they ship, then confirm an edit kept every number, qualifier, date, URL, code span, and citation. Use before delivering, publishing, or committing Markdown or text, HTML/CSS/JSX/SVG, Word (.docx), PowerPoint (.pptx), or PDF files, in English or Chinese.
---

# dislop

Run `dislop` on anything AI-assisted before you hand it over: a draft, a doc, a slide deck, a web page, or an Office/PDF file. It marks the problems. You make the edits, and it checks them against the original.

## When to run

- Markdown or text briefs, technical proposals, release notes, READMEs, or essays (English or Chinese).
- HTML, CSS, JSX/TSX, or SVG pages where contrast, dark-mode surface order, dead controls, or template chrome matter.
- Word (`.docx`), PowerPoint (`.pptx`), or PDF files before sharing.
- Any revision where numbers, qualifiers (`up to`, `at least`, `最多`, `至少`), units, dates, URLs, code spans, or citations must survive intact.

## When to skip it

- Negative unit-test fixtures that intentionally store anti-pattern examples.
- Vendored third-party libraries or general non-UI backend application code.

## Pick a pack

- `core` (`severity: error`, always on): objective delivery defects—leaked local paths, unfilled placeholders, stray chatbot greetings, raw Markdown inside Office docs, dead `href="#"` controls, WCAG AA contrast `< 4.5:1`, dark-mode elevation inversions, off-slide PPTX frames, and PDF URI/title/font hygiene.
- `business-brief`: technical specs, product briefs, PRDs, memos, and release notes.
- `literary-essay`: non-fiction essays, narrative reporting, and columns.
- `deck-and-ui`: HTML/CSS/JSX/SVG interfaces and `.pptx` slide decks.

## The loop: check, edit, verify

1. **Check.**
   - Prefer MCP tool `dislop_check` when `dislop` is attached over stdio.
   - Otherwise run the zero-dependency CLI:
     ```bash
     npx --yes github:dislop-ai/dislop check <path> --format json --lang <en|zh>
     # or Python 3.10+
     uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --format json --lang <en|zh>
     ```
   - Fix every `error` from `packs/core` first. Read each `warning` or `info` as a question about one passage: answer it, or leave the passage as it is.

2. **Edit only what was marked.**
   - Answer each finding's `deletionTest` question directly (call `dislop_explain` or read `https://dislop.com/rules/<rule-id>.md` when a suggested cut is unclear). Reaching for a synonym does not answer it.
   - Keep fenced code, inline code, URLs, and quoted primary sources intact.
   - Keep every protected detail: numbers with qualifiers (`up to`, `at least`, `最多`, `至少`) and units, dates, links, code spans, and citations.
   - Do not trade stock phrases for dramatic slogans (`"It's not X — it's Y"`, three-word staccato chains, 4-char Chinese slogan triads, or moralizing endings).

3. **Verify.**
   - Call MCP `dislop_verify` (`before`, `after`) or run:
     ```bash
     npx --yes github:dislop-ai/dislop verify <before-file> <after-file> --json
     ```
   - Hand off only after the JSON verdict says `"ok": true` (exit code `0`). If rejected, put back the dropped facts or revise the flagged slogan, then verify again.

## No shell and no MCP

Read the smallest matching page from `https://dislop.com` (plain Markdown/JSON, no setup):

- Start here: `https://dislop.com/llms.txt`
- Everything, as JSON (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- One page per task (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- One page per rule: `/rules/<rule-id>.md`
