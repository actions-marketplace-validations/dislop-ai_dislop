<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — Catch AI slop before you send it" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="https://dislop.com">Try it at dislop.com</a> ·
  <a href="./awesome/README.md">Awesome Anti-Slop</a> ·
  <a href="./ROADMAP.md">Roadmap</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

`dislop` gathers proven anti-slop writing habits, web and slide design rules, an offline zero-dependency checker, and 87 vetted tools in one place—so you and your AI agent can clear AI slop before shipping docs, Word/PowerPoint decks, or web pages.

Here is a short launch note straight from a model:

```text
Certainly! Here is the launch note. It's worth noting that exports are a game-changer, finishing in up to 12 minutes for workspaces above 500,000 rows.
```

`dislop check launch-note.md` flags three things:

```text
[ERROR]   launch-note.md:1:1   chatbot-artifact           "Certainly! Here is"
[WARNING] launch-note.md:1:37  en-throat-clearing-opener  "It's worth noting that"
[INFO]    launch-note.md:1:75  en-cliche-lexicon          "game-changer"
```

If you rewrite it into a second-order AI slogan (`This isn't just an upgrade — it's a new standard.`), running `dislop check` catches that too. Clean it up into plain prose and `dislop check` exits `0`.

That's it. It reads Markdown, plain text, HTML/CSS/JSX, Word (`.docx`), and PowerPoint (`.pptx`). Node.js (`npx`), Python (`uvx`), MCP, and the browser page at [dislop.com](https://dislop.com) run the same 25 rules offline with no external dependencies.

## Quick start

### Node.js 20+ (zero dependencies)

```bash
# Check the current folder (exits 1 on core AI artifact errors; prints cliché warnings)
npx --yes github:dislop-ai/dislop check .

# Check only lines changed against main and emit GitHub PR annotations
npx --yes github:dislop-ai/dislop check --changed origin/main --format github

# Explain a rule's check question and before / overcorrected / after examples
npx --yes github:dislop-ai/dislop explain negation-pivot-frame
```

### Python 3.10+ (zero dependencies)

```bash
# Run directly via uvx
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Or from a local checkout
git clone https://github.com/dislop-ai/dislop.git
cd dislop
PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning
```

## AI artifacts vs. style warnings

Auto-rewriters often trade one AI cliché for another or flatten your voice into a generic template. Flat banned-word lists also cause false alarms on ordinary nouns (`Delve` debugger, `wool tapestry`).

`dislop` splits its 25 rules into two layers:

1. **AI delivery artifacts (`packs/core/`, `severity: error`, always on)**: Clear leftovers from AI generation—stray chatbot greetings (`Certainly! Here is...`, `[oaicite:1]`), unfilled `[insert ...]` / `{{var}}` / `【待补充】` placeholders, raw Markdown asterisks pasted unrendered into `.docx`/`.pptx`, and dead `<a href="#">` placeholder buttons.
2. **Style & template packs (`warning` / `info`, advisory by default)**: Optional JSON packs (`business-brief`, `literary-essay`, `deck-and-ui`). Each rule includes a short check question, before / overcorrected / after examples, and automated hit/clean tests.

## What it reads

Both the Node.js CLI (`bin/dislop.mjs`) and the Python CLI (`src/dislop/`) run with zero external runtime dependencies and pass the same conformance suite (`tests/test_conformance.py`).

| What you bring | Extensions | What `dislop` catches | Known boundary |
|---|---|---|---|
| Drafts & docs | `.md`, `.mdx`, `.txt` | AI artifacts + throat-clearing openers, `"Not X, but Y"` pivots, staccato slogan runs, Chinese bureaucratic padding, 4-char triads, moralizing endings, unsourced claims, bold-lead bullet walls, em-dash overuse, half-width CJK punctuation | Code blocks, inline code, URLs, blockquotes, and `dislop-quote` blocks are masked for style rules |
| Web pages & components | `.html`, `.css`, `.jsx`, `.tsx` | Dead `<a href="#">` placeholder links, unexplained `<button disabled>`, purple-pink AI gradients, pill-badge walls, 3-level nested boxes, `AI-Powered` prompt-echo badges | Static per-file inspection; runtime DOM state still needs browser tests |
| Word | `.docx` | Joined `<w:t>` runs, raw Markdown asterisks pasted from chat, and prose slop rules (`para N`) | Reports paragraph number rather than rendered page number |
| PowerPoint | `.pptx` | Presentation slide order (`p:sldIdLst`), joined `<a:t>` runs, raw Markdown, slide word-walls (`> 120` words / `> 280` Han chars), bullet caps (`> 6`), `<a:normAutofit>` shrink (`< 80%`), generic titles (`Overview`, `Background`), and prose rules | Hidden slides (`show="0"`) are reported as `[SKIP]` for density checks |

## Awesome Anti-Slop

Looking for other tools, style guides, design rules, PR policies, and papers in this space? Browse **[awesome/README.md](./awesome/README.md)** ([简体中文](./awesome/README.zh-CN.md)) or filter all 87 checked entries offline at **[dislop.com/awesome/](https://dislop.com/awesome/)** (machine-readable [index.json](https://dislop.com/awesome/index.json) and [index.md](https://dislop.com/awesome/index.md)).

## Use it from an agent

- **Any AI chat (zero install)**: Paste one line into ChatGPT, Claude, or any web-capable agent:
  ```text
  Read https://dislop.com/llms.txt and follow its writing and design anti-slop rules and checks before delivering my next doc, slide deck, or web page.
  ```
- **Agent Skill (Claude Code, Codex, Cursor, Windsurf, Antigravity)**: Install [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) with `npx skills add dislop-ai/dislop` for the full `prevent -> check -> clean up -> re-check` loop (covers 1st-order clichés, 2nd-order slogans, and 3rd-order structural pitch habits plus UI/slide rules).
- **Claude Code Plugin (Skill + local MCP bundled)**:
  ```text
  /plugin marketplace add dislop-ai/dislop
  /plugin install dislop@dislop-ai
  ```
- **Static pages for agents**: Point any web-capable agent at [dislop.com/llms.txt](https://dislop.com/llms.txt) (~2.2 KB), [dislop.com/catalog.json](https://dislop.com/catalog.json), one task guide (`/tasks/*.md`), or any single rule page (`/rules/<id>.md`).

### MCP server (`Claude Code`, `Codex`, `Cursor`, `Windsurf`)

Attach `dislop` over stdio so coding and writing agents check drafts locally:

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}
```

Exposed MCP tools: `dislop_check`, `dislop_explain`, and `dislop_packs`.

## Configure it, or overrule it

Run `dislop init` to create `.dislop.json` (put private local bans in Git-ignored `.dislop.local.json`):

```json
{
  "failOn": "error",
  "ignore": ["vendor/**", "dist/**"],
  "overrides": [
    { "files": ["docs/**/*.md"], "pack": "business-brief" },
    { "files": ["essays/**/*.md"], "pack": "literary-essay" },
    { "files": ["site/**/*.{html,css,svg}"], "pack": "deck-and-ui" }
  ],
  "allow": ["Delve", "Bayeux Tapestry"],
  "rules": {
    "bold-lead-list-wall": "info"
  }
}
```

For a narrow one-off exception, add a reason above the line (`--report-unused` flags stale comments):

```markdown
<!-- dislop-ignore-next-line en-cliche-lexicon -- quoting vendor press release verbatim -->
```

### Open-Source Local (`Skill` + `CLI`) vs. Hosted Cloud (`dislop.com/mcp`)

- **Open Source (`dislop-ai/dislop`, Apache-2.0)**: `SKILL.md`, Node/Python CLI (`dislop check`, `dislop explain`, `dislop packs`, `dislop resources`), local stdio MCP (`--mcp`), 25 deterministic rules, `Awesome Anti-Slop`, and `dislop-bench`. Zero LLM calls, zero API keys, and 100% offline during `check` so private drafts never leave your machine.
- **Hosted Cloud Remote MCP & Web AI (`https://dislop.com/mcp`, `https://dislop.com/#pricing`)**: Optional closed-source cloud backend powered by a paid-tier zero-training model endpoint (no draft logging). Exposes `dislop_review` (1 credit, hybrid 3rd-order review), `dislop_deslop` (2 credits, self-healing rewrite with numeric fidelity guard and automatic repair), and `dislop_voice_extract` (2 credits, `dislop.voice/1`). Includes 5 free anonymous web demo credits/day, **30 free monthly credits** after 1-step email token signup, and Pro (`$12/mo`), PAYGO (`$10 / 1,000 credits`), and Team (`$29/seat/mo`) plans.

## Anti-slop benchmark (`dislop-bench v1`)

Run the full offline benchmark (`48` cross-modality detection samples across Node & Python + `12` end-to-end writing/design tasks comparing raw AI, naive humanizers, and `dislop`-guided revisions):

```bash
node scripts/run_benchmark.mjs --assert
```

Latest measured baseline ([benchmarks/REPORT.md](./benchmarks/REPORT.md)):

- **Detection (48 samples, 6 domains)**: Precision `100.0%` · Recall `100.0%` · Clean FPR `0.0%` · Adversarial Near-Miss FPR `0.0%` · 2nd-Order Trap Recall `100.0%` · Node/Python Parity `100.0%`.
- **End-to-end de-slop (12 tasks × 3 arms)**: `raw_ai` **61.4 / 100** → `naive_humanizer` **72.1 / 100** (doubles 3rd-order slop and drops/invents numbers) → `dislop_clean` **100.0 / 100** (`12/12` all-clear).
- **Live 5-model comparison ([benchmarks/MODEL-COMPARISON.md](./benchmarks/MODEL-COMPARISON.md))**: Across `Gemini 3.1/3.5 Flash-Lite`, `Gemini 3.5/3.8 Flash`, and `Qwen 3.8 Flash`, bare prompts averaged `76.0–84.2 / 100` (`2/10–4/10` all-clear), while the `dislop` self-healing cloud pipeline lifted every model by **+15.8 to +22.3 points** (`97.0–100.0 / 100`, `8/10–10/10` all-clear; `Gemini 3.1 Flash-Lite` reached `98.5 / 100` in `1.2s` at `~$0.09 / 1k calls`).

See [benchmarks/README.md](./benchmarks/README.md) to score your own model, Skill, or cloud endpoint (`--eval`) or export randomized blind human A/B review sheets (`--export-blind-sheet`).

## dislop checks dislop

GitHub Actions CI runs `dislop pack-test` (88 fixture assertions in both Node and Python), cross-runtime conformance tests (`tests/test_conformance.py`), and site checks (`tests/test_site.mjs`). It also runs `dislop check . --fail-on warning` across this repository's docs, `awesome/`, and `site/`.

## Docs & layout

- [Brand & Voice Guide](./docs/brand-and-voice-guide.md) ([中文](./docs/brand-and-voice-guide.zh-CN.md))
- [Architecture](./docs/architecture.md) ([中文](./docs/architecture.zh-CN.md)) · [Design System](./docs/design-system.md) ([中文](./docs/design-system.zh-CN.md))
- [Roadmap](./ROADMAP.md) ([中文](./ROADMAP.zh-CN.md)) · [Contributing](./CONTRIBUTING.md) · [Research Index](./docs/research/README.md) · [Changelog](./CHANGELOG.md)

```text
dislop/
├── .claude-plugin/    # Claude Code plugin & marketplace manifests (bundles Skill + MCP)
├── .mcp.json          # Standard stdio MCP server manifest
├── awesome/           # Awesome Anti-Slop (README.md & README.zh-CN.md, 87 entries)
├── benchmarks/        # Offline anti-slop benchmark datasets (CC0-1.0) & reproducible report
├── bin/               # Node.js CLI (dislop.mjs) & local stdio MCP launcher (dislop-mcp.mjs)
├── src/
│   ├── core.mjs       # Zero-dep ES module shared by Node CLI, MCP, and browser workbench
│   ├── binary-node.mjs# Zero-dep ZIP reader for Node.js (.docx / .pptx)
│   └── dislop/        # Zero-dep Python 3.10+ engine, CLI, and MCP server
├── packs/             # Declarative dislop.pack/2 manifests (core + 3 style packs, 25 rules)
├── skills/dislop/     # Cross-host Agent Skill (SKILL.md)
├── tests/             # Unit, Node/Python conformance, and site verification tests
├── scripts/           # Static site compiler (build_site.mjs) & v0.3 probe prototype
├── site/              # Compiled dislop.com workbench, /awesome/, and /llms.txt pages
├── assets/            # Logo mark, light/dark banners, and 1200x630 social preview card
└── docs/              # Brand guide, architecture, design system, roadmap, and research
```

## License

[Apache License 2.0](./LICENSE)
