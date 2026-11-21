---
name: dislop
description: Prevent, check, and clean up AI slop in drafts, docs, slide decks, and web pages before they ship. Use when writing, editing, or reviewing Markdown or text, HTML/CSS/JSX, Word (.docx), or PowerPoint (.pptx) files in English or Chinese.
---

# dislop

Use `dislop` as a full anti-slop workflow: write plainly first, run the local deterministic checker (`dislop_check` MCP or CLI), clean up flagged spans, and do a quick structural pass for AI habits that regex cannot catch.

## When to use

- Writing or editing briefs, specs, READMEs, release notes, essays, or UI copy (English or Chinese).
- Building HTML, CSS, or JSX/TSX pages where AI template chrome slips in.
- Reviewing Word (`.docx`) or PowerPoint (`.pptx`) files before sharing.

Skip negative unit-test fixtures that store anti-pattern samples on purpose, vendored libraries, and general non-UI backend code.

## Step 1: Write plainly before you check (prevent 1st-, 2nd-, and 3rd-order slop)

A `0 findings` check only proves you avoided obvious triggers. Follow these habits while drafting so you do not have to rewrite everything later:

### Prose (English and Chinese)

- **Start with something concrete.** Open with an example, a file, a number, or a command rather than throat-clearing setup.
- **Avoid 3-part semicolon pitches.** Do not string three balanced clauses together with semicolons to sell a tool or idea.
- **Cut pull-quote closers and moralizing endings.** Stop on the last concrete detail instead of adding a neat slogan at the end of a paragraph.
- **Drop cute roleplay personas.** Use ordinary words (`error`, `warning`, `pass`, `fail`) instead of stage metaphors or editorial costumes.
- **Skip 2nd-order AI slogans.** Do not trade stock buzzwords for `"It's not X — it's Y"` frames, three-word staccato chains, or Chinese four-character slogan triads.
- **Keep one plain name per concept.** Do not cycle synonyms across the same page just to look varied.
- **Keep languages separate.** Do not mix English examples into Chinese copy or Chinese notes into English copy unless the document is explicitly a bilingual glossary.

### Web UI and slide decks

- **No default AI chrome.** Skip purple-pink neon gradients, `"AI-Powered"` / `"Zero Hallucination"` badges, pill walls (`> 6` rounded pills per view), and 3-level nested bordered boxes.
- **No dead controls.** Every `<a href>` and `<button>` must work or explain why it is disabled; delete unbuilt buttons.
- **Keep slides readable.** Cap each slide at `<= 120` English words (`<= 280` Chinese characters), `<= 6` bullets, `100%` font scale (no autofit shrink), and a conclusion title instead of `"Overview"` or `"Background"`.

## Step 2: Check deterministically

Pick the matching pack (`core` is always on with `severity: error`):

- `core`: stray chatbot greetings, unfilled placeholders (`[insert ...]`, `{{var}}`, `【待补充】`), raw Markdown pasted into Word/PPT, dead `href="#"` controls.
- `business-brief`: technical specs, product briefs, PRDs, memos, and release notes.
- `literary-essay`: non-fiction essays, narrative reporting, and columns.
- `deck-and-ui`: HTML/CSS/JSX interfaces and `.pptx` slide decks.

Run the local checker:

- Prefer MCP tool `dislop_check` when the `dislop` MCP server is attached.
- Otherwise run the zero-dependency CLI:
  ```bash
  npx --yes github:dislop-ai/dislop check <path> --format json --lang <en|zh>
  # or Python 3.10+
  uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --format json --lang <en|zh>
  ```

## Step 3: Clean up and re-check

1. **Fix every `error` from `packs/core` first.**
2. **Edit only what needs fixing.** Answer each finding's check question directly (call `dislop_explain` or read `https://dislop.com/rules/<rule-id>.md` when needed). Do not invent facts or numbers that were not in the source.
3. **Preserve exact technical tokens.** Keep fenced code, inline code, URLs, and quoted primary sources intact.
4. **Re-run `dislop_check` (or `dislop check <path>`)** to confirm no 2nd-order slop slipped in during editing.
5. **Read the final text out loud once.** If a paragraph passes with `0 findings` but still sounds like a press release or a three-beat pitch, simplify it using Step 1.

## No shell and no MCP

Fetch the smallest matching page from `https://dislop.com` (plain Markdown/JSON, no setup):

- Start here: `https://dislop.com/llms.txt`
- Everything, as JSON (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- One page per task (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- One page per rule: `/rules/<rule-id>.md`
- Curated ecosystem index (87 tools & guides): `https://dislop.com/awesome/index.json`
