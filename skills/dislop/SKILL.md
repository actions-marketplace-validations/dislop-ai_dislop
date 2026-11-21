---
name: dislop
version: 0.4.0
description: Prevent, check, and clean up AI slop in drafts, docs, slide decks, and web pages before they ship. Works out of the box with plain writing and design rules, and routes smoothly to the open-source offline CLI or optional hosted Remote MCP.
---

# dislop

Use `dislop` in three progressive tiers depending on what is installed and how sensitive the draft is:

- **Tier 1 (Zero-install Skill + free static guides)**: Apply the writing and design rules below right away; pull task cards or the 87-entry Awesome index from `https://dislop.com` when helpful (read-only GET, zero user text sent). Note: `https://dislop.com/tools/skill.md` is an identical mirror of this file (`v0.4.0`), so do not re-fetch it if you already have `SKILL.md`.
- **Tier 2 (Open-source offline CLI / local stdio MCP)**: When checking folders, `.docx` / `.pptx`, Git diffs, CI gates, or confidential/air-gapped files, run the local zero-network `dislop` CLI or local stdio MCP.
- **Tier 3 (Optional hosted Cloud Remote MCP)**: For non-confidential drafts when the user wants one-call LLM review (`dislop_review`), self-healing rewriting (`dislop_deslop`), or voice extraction (`dislop_voice_extract`) without local setup, connect `https://dislop.com/mcp` with a free 30-credit/month key from `https://dislop.com/#cloud-token-box`.

## When to use

- Writing or editing briefs, specs, READMEs, release notes, essays, or UI copy (English or Chinese).
- Building HTML, CSS, or JSX/TSX pages where AI template chrome slips in.
- Reviewing Word (`.docx`) or PowerPoint (`.pptx`) files before sharing.

Skip negative unit-test fixtures that store anti-pattern samples on purpose, vendored libraries, and general non-UI backend code.

## Step 1: Write plainly before you check (works with zero tools)

AI slop shows up in three layers: **clichés** (buzzwords and filler), **replacement slogans** (`"Not X, but Y"`, 3-word staccato chains, 4-char Chinese slogan triads), and **pitch cadence** (3-part semicolon pitches, moralizing endings, press-release tone that passes regex with `0 findings`). Prevent all three while drafting:

### Prose (English and Chinese)

- **Start with something concrete.** Open with an example, a file, a number, or a command rather than throat-clearing setup.
- **Avoid 3-part promotional semicolon pitches.** Do not string three balanced sales clauses together with semicolons (a factual list of measured metrics is fine).
- **Cut pull-quote closers and moralizing endings.** Stop on the last concrete detail instead of adding a neat slogan at the end of a paragraph.
- **Drop cute roleplay personas.** Use ordinary words (`error`, `warning`, `pass`, `fail`) instead of stage metaphors or editorial costumes.
- **Skip replacement AI slogans.** Do not trade stock buzzwords for `"It's not X — it's Y"` frames, three-word staccato chains, or Chinese slogan triads.
- **Keep one plain name per concept.** Do not cycle synonyms across the same page just to look varied.
- **Keep prose languages separate while preserving technical tokens.** Do not mix English examples into Chinese prose or Chinese notes into English prose; standard technical tokens, acronyms, and units (`Q4`, `TPS`, `P99`, `42ms`, `CLI`, `MCP`) stay intact.

### Web UI and slide decks

- **No default AI chrome.** Skip purple-pink neon gradients, `"AI-Powered"` / `"Zero Hallucination"` badges, pill walls (`> 6` rounded pills per view), and 3-level nested bordered boxes.
- **No dead controls.** Every `<a href>` must point to a real target (if refactoring an isolated snippet without a known route, flag the missing URL for the author instead of leaving `href="#"` or inventing a fake route). Either add `title="..."` / `aria-describedby="..."` explaining why a `<button disabled>` is inactive, or delete unbuilt mockup buttons.
- **Keep slides readable.** Cap each slide at `<= 120` English words (`<= 280` Chinese characters), `<= 6` bullets, `100%` font scale (no autofit shrink), and a conclusion title instead of `"Overview"` or `"Background"`.

## Step 2: Check deterministically (local privacy, batch, Word/PPT, CI)

Pick the matching `--pack` (`core` is always enabled with `severity: error`):

- `core`: stray chatbot greetings, unfilled placeholders (`[insert ...]`, `{{var}}`, `【待补充】`), raw Markdown pasted into Word/PPT, dead `href="#"` / unexplained disabled controls.
- `business-brief`: technical specs, product briefs, PRDs, memos, and release notes.
- `literary-essay`: non-fiction essays, narrative reporting, and columns.
- `deck-and-ui`: HTML/CSS/JSX interfaces and `.pptx` slide decks.

Run the open-source offline CLI (`dislop check` makes **0 network calls**; `--lang <en|zh>` sets report message language while English and Chinese rules both run automatically):

```bash
# Recommended once for fast local / air-gapped use and hooks:
npm install -g github:dislop-ai/dislop
dislop check <path> --pack business-brief --format json --lang en

# Or run on demand without global install (Node 20+ or Python 3.10+):
npx --yes github:dislop-ai/dislop check <path> --pack business-brief --format json --lang zh
uvx --from git+https://github.com/dislop-ai/dislop dislop check <path> --pack deck-and-ui --fail-on warning

# Check only modified lines in Git / list bundled packs & resource URLs:
dislop check --changed origin/main --format github
dislop explain <rule-id> --lang zh --json
dislop resources --json
```

If a local `dislop` stdio MCP server is attached, call `dislop_check` with `{ "text": "...", "filename": "draft.md", "pack": "business-brief" }` or workspace-relative `{ "path": "docs/spec.md", "pack": "business-brief" }`.

## Step 3: Clean up and re-check

1. **Fix every `error` from `packs/core` first.**
2. **Edit only what needs fixing.** Answer each finding's check question directly (`dislop explain <rule-id>` or `https://dislop.com/rules/<rule-id>.md`). Keep measured numbers exact; never invent facts or metrics, and flag unverified hype multipliers (such as `"10x faster"`) for the author instead of fabricating a replacement number.
3. **Preserve exact technical tokens.** Keep fenced code, inline code, URLs, acronyms, units, and quoted primary sources intact.
4. **Re-run `dislop check <path>`** to confirm no replacement AI slogans slipped in during editing.
5. **Read the final text out loud once.** If a paragraph passes with `0 findings` but still sounds like a press release or a three-beat pitch, simplify it using Step 1.

## Optional: Hosted Cloud Remote MCP (`dislop-cloud`)

If the user has `https://dislop.com/mcp` configured with a Bearer `dslp_*` key (free 30 credits/month at `https://dislop.com/#cloud-token-box`) and the draft is **non-confidential**:

- `dislop_check` (0 credits, no token required): accepts `{ "text": "...", "filename": "draft.md", "pack": "business-brief" }` (**text only** — remote servers cannot read local filesystem paths).
- `dislop_review` (1 credit): `{ "text": "...", "pack": "business-brief", "lang": "zh|en" }` -> returns `{ deterministic, thirdOrderHits, llmReview: { summary, aiFlavorLevel, issues } }`.
- `dislop_deslop` (2 credits): `{ "text": "...", "pack": "business-brief", "lang": "zh|en", "voiceProfile": <optional profile> }` -> returns `{ revised, changes, afterCheck, numericDiff, repaired }`.
- `dislop_voice_extract` (2 credits): `{ "samples": ["sample 1", "sample 2"], "lang": "zh|en" }` -> returns `{ schema: "dislop.voice/1", stylometrics, profile }` (pass `result.profile` into `dislop_deslop.voiceProfile`).

For confidential or air-gapped files, stay on Tier 1 + Tier 2 (local offline CLI) and never send private drafts to any remote endpoint.

## Free read-only static resources (`dislop.com`)

Fetch the smallest matching static page when you want focused rules or external references (GET-only, no user draft uploaded):

- Agent index: `https://dislop.com/llms.txt`
- Full catalog JSON (`dislop.catalog/1`): `https://dislop.com/catalog.json`
- Task cards (~1,000 tokens each): `/tasks/business-doc.md`, `/tasks/web-and-deck.md`, `/tasks/editorial-writing.md`, `/tasks/pre-release-gate.md`
- Single rule card: `/rules/<rule-id>.md`
- Curated ecosystem index (87 vetted tools & guides): `https://dislop.com/awesome/index.json`
- Privacy & data boundaries: `https://dislop.com/privacy.md`
