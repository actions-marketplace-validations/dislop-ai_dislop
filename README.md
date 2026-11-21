<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — De-slop AI outputs and verify every fact" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="https://dislop.com">Workbench (dislop.com)</a> ·
  <a href="https://dislop.com/radar/">Radar (87)</a> ·
  <a href="./docs/strategy-and-roadmap.md">Blueprint</a> ·
  <a href="./docs/architecture.md">Architecture</a> ·
  <a href="./docs/design-system.md">Design System</a> ·
  <a href="./CHANGELOG.md">Changelog</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

**De-slop AI outputs across writing, docs, decks, PDF, Web UI, and agent workflows.** `dislop` inspects Markdown, plain text, HTML, CSS, JSX/TSX, SVG, Word (`.docx`), PowerPoint (`.pptx`), and structural PDF metadata with zero external runtime dependencies, reporting exact files, lines, paragraphs, or slides. Works with any AI model (Claude, GPT, Gemini, DeepSeek, Qwen, local), any agent host, and any dev environment via browser workbench, `/llms.txt`, `SKILL.md`, Node/Python CLI, or stdio MCP.

`dislop` never rewrites prose behind your back. When you or an agent revises a flagged span, `dislop verify` compares before and after text to confirm numbers, qualifiers (`up to`, `at least`), units, dates, links, code spans, and citations survived intact—and blocks second-order slogan displacement (`"It's not just X — it's Y"` or staccato three-word chains).

## Why Two Tiers Exist

Tools that "humanize" generated drafts routinely alter numbers or drop qualifiers to evade probabilistic detectors, while flat banned-word lists penalize legitimate nouns (`wool tapestry`, `Delve debugger`) and push models into fake-dramatic cadence.

`dislop` splits rules into two explicit tiers:

1. **Core Invariants (`packs/core/`, `severity: error`, enabled in every pack)**: Objective publication bugs that warrant failing a build—leaked workstation paths (`file:///Users/example/spec.pdf`), unfilled `[insert ...]` or `{{var}}` placeholders, unstripped chatbot wrappers (`Certainly! Here is...`, `[oaicite:...]`), raw Markdown left inside `.docx`/`.pptx`, dead `<a href="#">` links, resolvable WCAG AA contrast failures (`< 4.5:1`), dark-mode Z-luminance inversions, and off-slide PowerPoint text boxes.
2. **Genre Taste Packs (`warning` / `info`, advisory by default)**: Modular JSON rule packs (`business-brief`, `literary-essay`, `deck-and-ui`). Every rule carries a **Deletion Test** question, a `bad -> trap -> good` editorial exemplar, and automated `hit`/`clean` fixtures.

## Supported Modalities (`v0.2.0`)

Both the Node.js CLI (`bin/dislop.mjs`) and the Python CLI (`src/dislop/`) run with **zero external runtime dependencies** and pass the same conformance suite (`tests/test_conformance.py`).

| Modality | Extensions | What `dislop` Inspects | Known Boundary |
|---|---|---|---|
| Prose & Docs | `.md`, `.mdx`, `.txt` | Core invariants + throat-clearing openers, `"Not X, but Y"` negation pivots, staccato slogan runs, 4-char Chinese triads, moralizing endings, unsourced claims, half-width CJK punctuation | Code blocks, inline code, URLs, blockquotes, and `dislop-quote` blocks are masked for taste rules |
| Web UI & Vector | `.html`, `.css`, `.jsx`, `.tsx`, `.svg` | Dead `<a href="#">` controls, unexplained static `<button disabled>`, local CSS/inline WCAG contrast, dark-mode surface luminance order, purple-pink gradients, pill-badge overload, 3-level nested boxes, SVG `<text>` clipping | Inspects static source per file; hydrated runtime DOM state requires browser tests |
| Word | `.docx` | Joined `<w:t>` paragraph runs, unaccepted tracked changes (`<w:ins>`/`<w:del>`), leftover review comments, broken reference fields, leaked raw Markdown, external `file:` links, and prose rules (`para N`) | Reports paragraph index rather than rendered page number |
| PowerPoint | `.pptx` | True presentation slide order (`p:sldIdLst`), joined `<a:t>` runs, slide word-walls (`> 120` words / `> 280` Han chars), bullet caps (`> 6`), `<a:normAutofit>` text shrink (`< 80%`), off-slide text shapes, weak topic titles | Hidden slides (`show="0"`) are reported as `[SKIP]` for density checks |
| PDF | `.pdf` | `/URI` local file links, raw filename `/Title` (`Microsoft Word - ...`), unembedded `/FontDescriptor` fonts, mixed `/MediaBox` page sizes | Encrypted PDFs and full CID prose extraction are explicitly reported as `[SKIP]`, never silently marked clean |

## Quick Start

### Node.js 20+ (Zero Dependencies)

Run directly from GitHub via `npx`, or clone locally:

```bash
# Audit current directory (exits 1 on core errors; prints taste warnings)
npx --yes github:dislop-ai/dislop check .

# Gate only git-modified lines against main and emit GitHub PR annotations
npx --yes github:dislop-ai/dislop check --changed origin/main --format github

# Explain a rule's Deletion Test and before/trap/after exemplar
npx --yes github:dislop-ai/dislop explain negation-pivot-frame

# Verify a candidate edit kept all numbers, qualifiers, URLs, and code intact
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
```

### Python 3.10+ (Zero Dependencies)

```bash
# Run directly via uvx from Git
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Or run from a local checkout
git clone https://github.com/dislop-ai/dislop.git
cd dislop
PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning
```

## Agent Skill & Level 0 Web Service

- **Agent Skill (`skills/dislop/SKILL.md`)**: Drop [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) into Claude Code, Codex, Cursor, or Windsurf (`npx skills add dislop-ai/dislop`) for the three-step `check -> targeted edit -> verify` workflow.
- **Zero-Install Level 0 Agent Endpoints**: Any web-capable agent can read [https://dislop.com/llms.txt](https://dislop.com/llms.txt) (~2.4 KB), [https://dislop.com/catalog.json](https://dislop.com/catalog.json) (`dislop.catalog/1`), task bundles (`/tasks/*.md`), or 29 atomic rule cards (`/rules/<id>.md`).

## MCP Server (`Claude Code`, `Codex`, `Cursor`, `Windsurf`)

Attach `dislop` over stdio so coding and writing agents self-check drafts and verify edits locally:

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

Exposed MCP tools:

- `dislop_check` — Audits `text` or a workspace-relative `path`, returning flagged spans, `protectedFacts`, Deletion Tests, and inline exemplars (never handing the model a raw banned-word list that triggers synonym swapping).
- `dislop_verify` — Compares `before` and `after` strings; rejects dropped numbers/qualifiers, altered code/URLs, or displacement into second-order slogan frames.
- `dislop_explain` — Returns full rule metadata and `bad -> trap -> good` rewrites for a `ruleId`.
- `dislop_packs` — Lists installed packs (`core`, `business-brief`, `literary-essay`, `deck-and-ui`).

## Configuration & Inline Suppressions

Run `dislop init` to create `.dislop.json`:

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

For narrow one-off exceptions, place a reason-annotated comment above the line (`--report-unused` flags stale comments):

```markdown
<!-- dislop-ignore-next-line en-cliche-lexicon -- quoting vendor press release verbatim -->
```

## Self-Dogfooding & CI

GitHub Actions CI runs `dislop pack-test` (101 fixture assertions across both Node and Python), the cross-runtime conformance suite (`tests/test_conformance.py`), and `dislop check . --fail-on warning` across this repository's Markdown docs, SVG brand assets, and `site/` workbench (`packs/` and `tests/` are excluded because they intentionally store negative fixtures).

## Website & Agent Service (`dislop.com`)

- **Interactive Workbench & Rule Catalog**: [https://dislop.com](https://dislop.com) (static Nginx origin, zero backend, `CSP: connect-src 'none'`, offline `.docx`/`.pptx` inspection in browser memory)
- **87-Entry Ecosystem Radar**: [https://dislop.com/radar/](https://dislop.com/radar/) (offline-filterable directory compiled from `docs/research/anti-slop-radar-index.json`)
- **Level 0 Agent Endpoints**: [https://dislop.com/llms.txt](https://dislop.com/llms.txt) (routing index), [https://dislop.com/catalog.json](https://dislop.com/catalog.json) (`dislop.catalog/1`), task bundles (`/tasks/*.md`), and 29 atomic rule cards (`/rules/<id>.md`)

## Repository Layout

```text
dislop/
├── bin/               # Node.js CLI (dislop.mjs) & stdio MCP launcher (dislop-mcp.mjs)
├── src/
│   ├── core.mjs       # Zero-dep ES module shared by Node CLI, MCP, and browser workbench
│   ├── binary-node.mjs# Zero-dep ZIP & PDF stream reader for Node.js
│   └── dislop/        # Zero-dep Python 3.10+ engine, CLI, and MCP server
├── packs/             # Declarative dislop.pack/2 manifests (core + 3 genre packs, 29 rules)
├── skills/dislop/     # Canonical cross-host Agent Skill (SKILL.md)
├── tests/             # Unit tests, Node/Python conformance suite & site verification tests
├── scripts/
│   ├── build_site.mjs # Dual-native static compiler for site/
│   └── prototype_antipattern_lab.mjs # v0.3 catalog & cadence/UI probe verification lab
├── site/              # Compiled static website, workbench, radar, and /llms.txt endpoints
├── assets/            # Logo mark, light/dark banners, and 1200x630 Open Graph card
├── docs/
│   ├── strategy-and-roadmap*.md            # Unified strategy, VI, multi-surface & roadmap blueprint
│   ├── architecture*.md, design-system*.md # Bilingual architecture & visual design specs
│   ├── research/      # 2026 landscape, 87-entry radar SSOT, positive-divergence & multi-surface studies
│   └── specs/         # v0.3 anti-pattern catalog & probe specification
└── CHANGELOG.md       # Chronological development & optimization history
```

## License

[Apache License 2.0](./LICENSE)
