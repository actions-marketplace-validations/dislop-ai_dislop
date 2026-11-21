---
name: dislop
description: Check AI-written drafts, docs, slide decks, and web pages for AI slop before they ship. Use before delivering, publishing, or committing Markdown or text, HTML/CSS/JSX, Word (.docx), or PowerPoint (.pptx) files, in English or Chinese.
---

# dislop

Run `dislop` on anything AI-assisted before you send it: a draft, a Word doc, a PowerPoint deck, or a web page. It marks AI artifacts, clichés, and template slop without rewriting your text.

## When to run

- Markdown or text briefs, technical proposals, release notes, READMEs, or essays (English or Chinese).
- HTML, CSS, or JSX/TSX pages where AI template chrome (purple-pink gradients, pill walls, 3-level nested cards, `AI-Powered` badges, dead `href="#"` placeholder links) might slip in.
- Word (`.docx`) or PowerPoint (`.pptx`) files before sharing.

## When to skip it

- Negative unit-test fixtures that intentionally store anti-pattern examples.
- Vendored third-party libraries or general non-UI backend code.

## Pick a pack

- `core` (`severity: error`, always on): stray chatbot greetings, unfilled placeholders (`[insert ...]`, `{{var}}`, `【待补充】`), raw Markdown pasted into Word/PPT, and dead `href="#"` placeholder controls.
- `business-brief`: technical specs, product briefs, PRDs, memos, and release notes.
- `literary-essay`: non-fiction essays, narrative reporting, and columns.
- `deck-and-ui`: HTML/CSS/JSX interfaces and `.pptx` slide decks.

## The loop: check, edit, re-check

1. **Check.**
   - Prefer MCP tool `dislop_check` when `dislop` is attached over stdio.
   - Otherwise run the zero-dependency CLI:
     ```bash
     npx --yes github:dislop-ai/dislop check <path> --format json --lang <en|zh>
     # or Python 3.10+
     uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --format json --lang <en|zh>
     ```
   - Fix every `error` from `packs/core` first. Review each `warning` or `info` finding locally: edit it or leave it alone.

2. **Edit only what was marked.**
   - Answer each finding's check question directly (call `dislop_explain` or read `https://dislop.com/rules/<rule-id>.md` when needed). Swapping synonyms does not fix fluff.
   - Keep fenced code, inline code, URLs, and quoted primary sources intact.
   - Do not trade 1st-order clichés for 2nd-order slogans (`"It's not X — it's Y"`, three-word staccato chains, 4-char Chinese slogan triads, or moralizing endings).

3. **Re-check.**
   - Run `dislop_check` (or `dislop check <path>`) again to confirm the AI artifacts and clichés are gone and no new 2nd-order slop was introduced.

## No shell and no MCP

Read the smallest matching page from `https://dislop.com` (plain Markdown/JSON, no setup):

- Start here: `https://dislop.com/llms.txt`
- Everything, as JSON (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- One page per task (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- One page per rule: `/rules/<rule-id>.md`
