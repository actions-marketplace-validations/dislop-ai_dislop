<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — Catch AI slop before you send it" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="https://dislop.com/?lang=en">Try it at dislop.com</a> ·
  <a href="https://www.npmjs.com/package/dislop">npm</a> ·
  <a href="https://pypi.org/project/dislop/">PyPI</a> ·
  <a href="./awesome/README.md">Awesome Anti-Slop</a> ·
  <a href="./ROADMAP.md">Roadmap</a> ·
  <a href="https://x.com/dislop_ai">X (@dislop_ai)</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

`dislop` gathers proven anti-slop writing habits, web and slide design rules, an offline zero-dependency checker, and 87 vetted tools in one repository. You and your AI agent can clear AI slop before shipping docs, Word or PowerPoint files, or web pages.

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

That's it. It reads Markdown, plain text, HTML/CSS/JSX, Word (`.docx`), and PowerPoint (`.pptx`). The browser workbench at [dislop.com](https://dislop.com/?lang=en) and the Node.js, Python, and local stdio MCP runtimes all run the same **7 built-in packs (`42` rules)**, 5-axis rhythm telemetry, and offline voice extraction 100% locally with zero uploads; the CLI and local MCP also add extended pattern-bank probes (`--patterns`), the bundled `14.6 KB` Pocket ML ensemble (`--ml`), and hardware-aware optional local model setup (`dislop model`). When you want zero-local-setup connectors or one-click self-healing LLM rewriting, the optional hosted cloud MCP (`https://dislop.com/mcp`) is one click away.

## Quick start

### Node.js 20+ (published on npm, zero dependencies, all 7 packs bundled offline)

```bash
# Check the current folder (exits 1 on core AI artifact errors; prints cliché warnings)
npx --yes dislop check .

# Auto-route domain pack and enable 5-axis telemetry, 14.6 KB Pocket ML, and extended pattern probes
npx --yes dislop check draft.md --pack auto --profile --ml --patterns

# Extract a deterministic personal voice profile offline or inspect hardware for optional local models
npx --yes dislop voice my-notes.md
npx --yes dislop model

# Check only lines changed against main and emit GitHub PR annotations
npx --yes dislop check --changed origin/main --format github

# Explain a rule's check question and before / overcorrected / after examples
npx --yes dislop explain negation-pivot-frame
```

### Python 3.10+ (published on PyPI, zero dependencies)

```bash
# Run directly via uvx (zero install) or install via pip
uvx dislop check quarterly-review.pptx
pip install dislop && dislop check .
```

## AI artifacts vs. style warnings

Auto-rewriters often trade one AI cliché for another or flatten your voice into a generic template. Flat banned-word lists also cause false alarms on ordinary nouns (`Delve` debugger, `wool tapestry`).

`dislop` splits its 42 rules across 7 bundled packs into two layers:

1. **AI delivery artifacts (`packs/core/`, `severity: error`, always on)**: Clear leftovers from AI generation—stray chatbot greetings (`Certainly! Here is...`, `[oaicite:1]`), unfilled `[insert ...]` / `{{var}}` / `[TBD]` placeholders, raw Markdown asterisks pasted unrendered into `.docx`/`.pptx`, and dead `<a href="#">` placeholder buttons.
2. **Built-in scenario & vertical packs (`warning` / `info`, advisory by default, 0 network downloads)**: `business-brief`, `engineering-spec` (PR diff parrots, shallow root causes, unowned action items), `regulated-comms` (unsubstantiated superlatives, unanchored `"10x faster"` multipliers), `literary-essay`, `deck-and-ui`, and `executive-deck` (process-only slide titles, 4+ consecutive identical slide skeletons). Each rule includes a check question, before / overcorrected / after examples, and automated hit/clean tests.

## What it reads

Both the Node.js CLI (`bin/dislop.mjs`) and the Python CLI (`src/dislop/`) run with zero external runtime dependencies and pass the same conformance suite (`tests/test_conformance.py`).

| What you bring | Extensions | What `dislop` catches | Known boundary |
|---|---|---|---|
| Drafts & docs | `.md`, `.mdx`, `.txt` | AI artifacts + throat-clearing openers, `"Not X, but Y"` pivots, staccato slogan runs, bureaucratic padding, four-character triads, moralizing endings, unsourced claims, bold-lead bullet walls, em-dash overuse, half-width CJK punctuation | Code blocks, inline code, URLs, blockquotes, and `dislop-quote` blocks are masked for style rules |
| Web pages & components | `.html`, `.css`, `.jsx`, `.tsx` | Dead `<a href="#">` placeholder links, unexplained `<button disabled>`, purple-pink AI gradients, pill-badge walls, 3-level nested boxes, `AI-Powered` prompt-echo badges | Static per-file inspection; runtime DOM state still needs browser tests |
| Word | `.docx` | Joined `<w:t>` runs, raw Markdown asterisks pasted from chat, and prose slop rules (`para N`) | Reports paragraph number rather than rendered page number |
| PowerPoint | `.pptx` | Presentation slide order (`p:sldIdLst`), joined `<a:t>` runs, raw Markdown, slide word-walls (`> 120` words / `> 280` Han chars), bullet caps (`> 6`), `<a:normAutofit>` shrink (`< 80%`), generic titles (`Overview`, `Background`), layout monotony, and prose rules | Hidden slides (`show="0"`) are reported as `[SKIP]` for density checks |

## Awesome Anti-Slop

Looking for other tools, style guides, design rules, PR policies, and papers in this space? Browse **[awesome/README.md](./awesome/README.md)** ([Chinese edition](./awesome/README.zh-CN.md)) or filter all 87 checked entries offline at **[dislop.com/awesome/](https://dislop.com/awesome/?lang=en)** (machine-readable [index.json](https://dislop.com/awesome/index.json) and [index.md](https://dislop.com/awesome/index.md)).

## Use it across agents, editors, and CI

| Surface | One-liner or 1-click install | What you get |
|---|---|---|
| **Any AI chat** | Paste: `Read https://dislop.com/llms.txt and apply its anti-slop rules and checks before delivering my next draft.` | Zero install; reads the `~2.4 KB` index, task guides (`/tasks/*.md`), or atomic rule cards (`/rules/<id>.md`) |
| **Agent Skill (75+ hosts)** | `npx skills add dislop-ai/dislop` | Installs [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) + 4 local reference cards in Claude Code, Codex, Cursor, Windsurf, Antigravity, and OpenCode (`0` network calls) |
| **Claude Code Plugin** | `/plugin marketplace add dislop-ai/dislop` then `/plugin install dislop@dislop-ai` | Bundles Skill + local stdio MCP (`~130` always-on tokens) |
| **OpenAI Codex Plugin** | `codex plugin marketplace add dislop-ai/dislop` then `codex plugin add dislop@dislop-ai` | Ships native UI card metadata ([openai.yaml](./skills/dislop/agents/openai.yaml)) and `$dislop` trigger |
| **Gemini CLI Extension** | `gemini extensions install https://github.com/dislop-ai/dislop` | Mounts local `bin/dislop-mcp.mjs` directly via [gemini-extension.json](./gemini-extension.json) |
| **Official MCP Registry** | Search `io.github.dislop-ai/dislop` on `registry.modelcontextprotocol.io` | Lists local `npx` / `uvx` `stdio` packages and remote `https://dislop.com/mcp` |
| **VS Code / Cursor 1-Click MCP** | [Install in VS Code (Local Offline)](https://vscode.dev/redirect/mcp/install?name=dislop&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22--yes%22%2C%22dislop%22%2C%22--mcp%22%5D%7D) · [Install in VS Code (Cloud)](https://vscode.dev/redirect/mcp/install?name=dislop-cloud&config=%7B%22url%22%3A%22https%3A%2F%2Fdislop.com%2Fmcp%22%7D) · [Install in Cursor (Local)](cursor://anysphere.cursor-deeplink/mcp/install?name=dislop&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsImRpc2xvcCIsIi0tbWNwIl19) | Opens the editor's native confirmation dialog without manual JSON edits |
| **GitHub Action / `pre-commit`** | Reference `uses: dislop-ai/dislop@main` ([action.yml](./action.yml) and [.pre-commit-hooks.yaml](./.pre-commit-hooks.yaml)) | Gates modified lines in PRs with inline annotations or SARIF 2.1.0 |

### Manual MCP config (`Claude Code`, `Codex`, `Cursor`, `Windsurf`)

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "dislop", "--mcp"]
    }
  }
}
```

Exposed local MCP tools (`7` offline tools, `verbosity: "compact"` by default, with negative fixtures stripped): `dislop_check` (supports `pack` including `"auto"`, `profile`, `ml`, and `patterns`), `dislop_voice_extract_offline`, `dislop_model_score`, `dislop_model_status`, `dislop_explain`, `dislop_packs`, and `dislop_catalog`.

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

### Install once locally (true air-gapped / fast hooks)

```bash
# Node.js 20+ (published on npm, < 250 KB tarball, zero network after install)
npm install -g dislop
dislop check .

# Or Python 3.10+ (published on PyPI, zero external dependencies)
pip install dislop
dislop check .
```

### Open-Source Local (`Skill` + `CLI`) vs. Hosted Cloud (`dislop.com/mcp`)

- **Open Source (`dislop-ai/dislop`, Apache-2.0)**: `SKILL.md` + bundled local `./references/*.md`, Node/Python CLI (`dislop check [--pack <id|auto>] [--profile] [--ml] [--patterns] [--changed [ref]] [--staged] [--format text|json|sarif|github|md]`, `dislop patterns`, `dislop voice`, `dislop model [status|score|install|import|remove|deslop]`, `dislop setup`, `dislop deslop --local`, `dislop explain`, `dislop packs`, `dislop catalog`, `dislop resources`), 7-tool local stdio MCP (`--mcp`), all 7 built-in packs (`42` rules) + 53-pattern catalog (`patterns/`), bundled `14.6 KB` gzip (`49.0 KB` raw) Pocket ML ensemble (`models/pocket-slop-v1.json`, `< 0.5 ms`, `100.0%` F1 / `0.0%` Clean FPR on `stealth-vapor-v1`), `Awesome Anti-Slop`, and `dislop-bench v2`. Zero third-party packages, zero API keys, and `0` network calls during `check` / `patterns` / `voice` / `model score` so private drafts never leave your machine. For heavier local neural rewrites, `dislop setup` and `dislop model install` inspect RAM/disk budgets and let you optionally install `0.6B` (`~520 MB`), `1.7B` (`~1.3 GB`), or `4B` (`~2.5 GB`) local models (or import offline `.gguf`/`.onnx` weights with SHA-256 verification) protected by an internal numeric and qualifier retention guard during automated local rewrites.
- **Hosted Cloud Remote MCP & Web AI (`https://dislop.com/mcp`, `https://dislop.com/?lang=en#pricing`)**: Optional closed-source cloud backend powered by a paid-tier zero-training Google Gemini endpoint (no draft logging; see [privacy.md](https://dislop.com/privacy.md)). Exposes `dislop_review` (1 credit, hybrid 3rd-order review), `dislop_deslop` (2 credits, self-healing rewrite with an internal numeric and qualifier retention guard and automatic repair), and `dislop_voice_extract` (2 credits, `dislop.voice/1`). Includes 5 free anonymous web demo credits/day, **30 free monthly credits** after email key signup, and early-access waitlists for Pro (`$12/mo`, 1,500 credits), PAYGO (`$10 / 800 credits`), and Team (`$29/seat/mo`).

## Anti-slop benchmark (`dislop-bench v2`)

Run the full offline benchmark (`112` cross-modality detection samples across Node & Python + `18` end-to-end writing and design tasks comparing raw AI, naive humanizers, and `dislop`-guided revisions):

```bash
node scripts/run_benchmark.mjs --assert
```

Latest measured baseline ([benchmarks/REPORT.md](./benchmarks/REPORT.md) and [benchmarks/PATTERN-BENCHMARK.md](./benchmarks/PATTERN-BENCHMARK.md)):

- **Core Detection (`Suite A`, 112 samples = 48 v1 + 16 `holdout-v1` + 48 `text-hard-v2`)**: Precision `100.0%` · Recall `100.0%` · Clean FPR `0.0%` · Adversarial Near-Miss FPR `0.0%` · 2nd-Order Trap Recall `100.0%` · Node/Python Rule & Statistical Profile Parity `100.0%`.
- **Multi-Angle Pattern Benchmark (`154` samples = 48 + 16 + 62 `pattern-challenge-v2` + 28 `holdout-v2`)**: Precision `100.0%` · Recall `100.0%` · F1 `100.0%` · Clean FPR `0.0%` · Node/Python Parity `100.0%`.
- **Bundled Pocket ML (`stealth-vapor-v1`, 24 paired samples; 36 blind eval with holdouts)**: `14.6 KB` gzip (`49.0 KB` raw), `< 0.5 ms`, `100.0%` F1, `0.0%` Clean FPR.
- **End-to-End Revision (`Suite B`, 18 tasks = 12 `revision-v1` + 6 `revision-hard-v2`, weights `D1=45 / D2=20 / D3=25 / D4=10`)**: `raw_ai` **60.8 / 100** → `naive_humanizer` **70.8 / 100** (doubles 3rd-order slop and drops or invents numbers) → `dislop_clean` **100.0 / 100** (`18/18` all-clear).
- **Live 5-model comparison ([benchmarks/MODEL-COMPARISON.md](./benchmarks/MODEL-COMPARISON.md))**: Across `Gemini 3.1/3.5 Flash-Lite`, `Gemini 3.5/3.8 Flash`, and `Qwen 3.8 Flash`, bare prompts averaged `76.0–84.2 / 100` (`2/10–4/10` all-clear on the 10-task `revision-v1` live subset), while the `dislop` self-healing cloud pipeline lifted every model by **+15.8 to +22.3 points** (`97.0–100.0 / 100`, `8/10–10/10` all-clear; `Gemini 3.1 Flash-Lite` reached `98.5 / 100` in `1.2s` at `~$0.09 / 1k calls`).

See [benchmarks/README.md](./benchmarks/README.md) to score your own model, Skill, or cloud endpoint (`--eval`) or export randomized blind human A/B review sheets (`--export-blind-sheet`).

## dislop checks dislop

GitHub Actions CI runs `dislop pack-test` (160 fixture assertions: 83 hit + 77 clean in both Node and Python), 26 Python `unittest` conformance and engine tests across 4 modules (`test_conformance`, `test_engine`, `test_pattern_library`, `test_pocket_and_local_models`), pattern catalog checks (`node scripts/pattern_lab.mjs verify` and `assert`), and site checks (`tests/test_site.mjs`). It also runs `dislop check . --fail-on warning` across this repository's docs, `awesome/`, and `site/`.

## Docs & layout

- [Brand & Voice Guide](./docs/brand-and-voice-guide.md) ([zh-CN](./docs/brand-and-voice-guide.zh-CN.md))
- [Architecture](./docs/architecture.md) ([zh-CN](./docs/architecture.zh-CN.md)) · [Design System](./docs/design-system.md) ([zh-CN](./docs/design-system.zh-CN.md))
- [Roadmap](./ROADMAP.md) ([zh-CN](./ROADMAP.zh-CN.md)) · [Releasing](./docs/releasing.md) · [Contributing](./CONTRIBUTING.md) · [Research Index](./docs/research/README.md) · [Changelog](./CHANGELOG.md)

```text
dislop/
├── .agents/plugins/   # OpenAI Codex marketplace manifest (marketplace.json)
├── .claude-plugin/    # Claude Code plugin & marketplace manifests (Skill + local MCP)
├── .codex-plugin/     # OpenAI Codex native plugin manifest & UI card metadata
├── plugin.json        # Agent Plugins 1.0 portable manifest (paired with root mcp.json)
├── gemini-extension.json # Gemini CLI Extension Gallery manifest
├── server.json        # Official MCP Registry manifest (local stdio + remote HTTP)
├── action.yml         # Reusable GitHub Marketplace incremental check Action
├── awesome/           # Awesome Anti-Slop (README.md & README.zh-CN.md, 87 entries)
├── benchmarks/        # Offline anti-slop benchmark datasets (CC0-1.0) & reproducible reports
├── bin/               # Node.js CLI (dislop.mjs) & local stdio MCP launcher (dislop-mcp.mjs)
├── src/
│   ├── core.mjs       # Zero-dep ES module shared by Node CLI, MCP, and browser workbench
│   ├── pattern-engine.mjs # Multi-angle 11-probe extended pattern-bank scanner
│   ├── pocket-model.mjs# Bundled 14.6 KB gzip zero-dep Pocket ML ensemble & domain pack router
│   ├── local-model.mjs# Hardware-aware optional local small-model advisor (Node.js)
│   ├── binary-node.mjs# Zero-dep ZIP reader for Node.js (.docx / .pptx)
│   └── dislop/        # Zero-dep Python 3.10+ engine, pattern scanner, local-model advisor, CLI, and MCP
├── packs/             # Declarative dislop.pack/2 manifests (7 built-in packs, 42 rules, 160 fixtures)
├── patterns/          # Structured 53-pattern anti-slop catalog across 6 dimensions & 7 angles
├── skills/dislop/     # Cross-host Agent Skill (SKILL.md + local ./references/ + openai.yaml)
├── tests/             # 26 Python unittest suites, Node/Python conformance, and site tests
├── scripts/           # Manifest lockstep sync (sync_manifests.mjs), site compiler & benchmarks
├── site/              # Compiled dislop.com workbench, /awesome/, and /llms.txt pages
├── assets/            # Logo mark, light/dark banners, and 1200x630 social preview card
└── docs/              # Brand guide, architecture, design system, roadmap, and research
```

## License

[Apache License 2.0](./LICENSE)

<!-- mcp-name: io.github.dislop-ai/dislop -->
