---
name: dislop
description: Prevent, check, and clean up AI slop in drafts, docs, slide decks, and web pages before they ship. Works out of the box with plain writing and design rules, and routes smoothly to the open-source offline CLI or optional hosted Remote MCP.
---

# dislop

Use `dislop` in three progressive tiers depending on what the user has installed and how sensitive the document is:

- **Tier 1 (Zero-install Skill + free static guides)**: Apply the writing and design rules below right away; pull focused task cards or the 87-entry Awesome index from `https://dislop.com` when helpful (read-only GET, zero user text sent).
- **Tier 2 (Open-source offline CLI)**: When checking multiple files, `.docx` / `.pptx`, Git diffs, CI gates, or private/sensitive drafts, run the local zero-network `dislop` CLI.
- **Tier 3 (Optional hosted Cloud Remote MCP)**: When the user wants one-call self-healing LLM rewriting (`dislop_deslop`), 3rd-order review (`dislop_review`), or personal voice extraction (`dislop_voice_extract`) without local setup, attach `https://dislop.com/mcp` (free 30 credits/month after email sign-in at `https://dislop.com/#pricing`).

## When to use

- Writing or editing briefs, specs, READMEs, release notes, essays, or UI copy (English or Chinese).
- Building HTML, CSS, or JSX/TSX pages where AI template chrome slips in.
- Reviewing Word (`.docx`) or PowerPoint (`.pptx`) files before sharing.

Skip negative unit-test fixtures that store anti-pattern samples on purpose, vendored libraries, and general non-UI backend code.

## Step 1: Write plainly before you check (works with zero tools)

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

## Step 2: Check deterministically (local privacy & batch / Word / PPT)

Pick the matching pack (`core` is always on with `severity: error`):

- `core`: stray chatbot greetings, unfilled placeholders (`[insert ...]`, `{{var}}`, `【待补充】`), raw Markdown pasted into Word/PPT, dead `href="#"` controls.
- `business-brief`: technical specs, product briefs, PRDs, memos, and release notes.
- `literary-essay`: non-fiction essays, narrative reporting, and columns.
- `deck-and-ui`: HTML/CSS/JSX interfaces and `.pptx` slide decks.

Run the open-source offline CLI (zero network calls during `check`, zero uploads):

```bash
npx --yes github:dislop-ai/dislop check <path> --format json --lang <en|zh>
# or Python 3.10+
uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --format json --lang <en|zh>
# list bundled packs and optional read-only resource URLs
npx --yes github:dislop-ai/dislop resources
```

If a local `dislop` stdio MCP server is attached, call `dislop_check` directly.

## Step 3: Clean up and re-check

1. **Fix every `error` from `packs/core` first.**
2. **Edit only what needs fixing.** Answer each finding's check question directly (`dislop explain <rule-id>` or `https://dislop.com/rules/<rule-id>.md`). Do not invent facts or numbers that were not in the source.
3. **Preserve exact technical tokens.** Keep fenced code, inline code, URLs, and quoted primary sources intact.
4. **Re-run `dislop check <path>`** to confirm no 2nd-order slop slipped in during editing.
5. **Read the final text out loud once.** If a paragraph passes with `0 findings` but still sounds like a press release or a three-beat pitch, simplify it using Step 1.

## Optional: Hosted Cloud Remote MCP (`dislop-cloud`)

If the user has `https://dislop.com/mcp` configured with a Bearer `dslp_*` token (free 30 credits/month at `https://dislop.com/#pricing`) and the draft is non-confidential:

- `dislop_review` (1 credit): hybrid deterministic + 3rd-order structural + LLM review.
- `dislop_deslop` (2 credits): self-healing rewrite with deterministic post-check, numeric fidelity guard, and automatic repair pass.
- `dislop_voice_extract` (2 credits): extract a reusable `dislop.voice/1` style profile from 1–5 human samples.

For confidential or air-gapped files, stay on Tier 1 + Tier 2 (local offline CLI) and never send private drafts to any remote endpoint.

## Free read-only static resources (`dislop.com`)

Fetch the smallest matching static page when you want detailed rules or external references (GET-only, no user draft uploaded):

- Agent index: `https://dislop.com/llms.txt`
- Full catalog JSON (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- Task cards (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- Single rule card: `/rules/<rule-id>.md`
- Curated ecosystem index (87 vetted tools & guides): `https://dislop.com/awesome/index.json`
