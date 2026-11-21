<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — A red pen for whatever your AI wrote" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="https://dislop.com">Try it at dislop.com</a> ·
  <a href="./awesome/README.md">Awesome Anti-Slop</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

**A red pen for whatever your AI wrote.**

Here is a launch note, the way a model hands it over:

```text
Certainly! Here is the launch note. It's worth noting that exports now finish in up to 12 minutes for workspaces above 500,000 rows. This isn't just a speed bump — it's a game-changer.
```

`dislop check launch-note.md` puts four marks on it:

```text
[ERROR]   launch-note.md:1:1    chatbot-artifact           "Certainly! Here is"
[WARNING] launch-note.md:1:37   en-throat-clearing-opener  "It's worth noting that"
[WARNING] launch-note.md:1:134  negation-pivot-frame       "This isn't just a speed bump — it's a game-changer"
[INFO]    launch-note.md:1:172  en-cliche-lexicon          "game-changer"
```

You do the editing. Then `dislop verify` reads your version against the original:

```text
dislop verify: ACCEPTED (findings 4 -> 0; all protected facts preserved)
```

Lose the `"up to"` while you tidy, and the edit comes back:

```text
dislop verify: REJECTED (findings 4 -> 0)
  - Protected numbers removed or altered: up to 12 minutes
```

That is the whole tool. It strikes what can't ship, asks about what sounds canned, and checks that your edit kept every number, qualifier, date, link, code span, and citation. It never rewrites a word; the pen stays in your hand.

`dislop` reads Markdown, plain text, HTML/CSS/JSX/SVG, Word, PowerPoint, and PDF metadata. It gives the same answer in a browser tab at [dislop.com](https://dislop.com), from `npx` or `uvx`, over MCP, or as an agent skill, with no external dependencies to install and no network calls.

## Quick start

### Node.js 20+ (zero dependencies)

```bash
# Check the current folder (exits 1 on core errors; prints style queries)
npx --yes github:dislop-ai/dislop check .

# Check only lines changed against main and emit GitHub PR annotations
npx --yes github:dislop-ai/dislop check --changed origin/main --format github

# Explain a rule's question and before / overcorrected / after examples
npx --yes github:dislop-ai/dislop explain negation-pivot-frame

# Compare your edit against the original
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
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

## Red pencil, blue pencil

Tools that auto-rewrite drafts to "sound human" routinely drop qualifiers or alter numbers, while flat banned-word lists punish real nouns (`Delve` debugger, `wool tapestry`) and push models into fake-dramatic slogans.

`dislop` splits rules into two explicit tiers:

1. **Can't-ship rules (`packs/core/`, `severity: error`, always on)**: Objective defects that warrant failing a build—leaked local paths (`file:///Users/example/spec.pdf`), unfilled `[insert ...]` or `{{var}}` placeholders, stray chatbot greetings, raw Markdown left inside `.docx`/`.pptx`, dead `<a href="#">` links, WCAG AA contrast failures (`< 4.5:1`), dark-mode surface inversions, and off-slide PowerPoint text boxes.
2. **Style packs (`warning` / `info`, advisory by default)**: Pluggable JSON packs (`business-brief`, `literary-essay`, `deck-and-ui`). Every rule carries a plain question to ask yourself, a before / overcorrected / after contrast, and automated hit/clean fixtures.

## What it reads

Both the Node.js CLI (`bin/dislop.mjs`) and the Python CLI (`src/dislop/`) run with zero external runtime dependencies and pass the same conformance suite (`tests/test_conformance.py`).

| What you bring | Extensions | What `dislop` catches | Known boundary |
|---|---|---|---|
| Drafts & docs | `.md`, `.mdx`, `.txt` | Core errors + throat-clearing openers, `"Not X, but Y"` pivots, staccato slogan runs, Chinese bureaucratic padding, 4-char triads, moralizing endings, unsourced claims, half-width CJK punctuation | Code blocks, inline code, URLs, blockquotes, and `dislop-quote` blocks are masked for style rules |
| Web pages & SVG | `.html`, `.css`, `.jsx`, `.tsx`, `.svg` | Dead `<a href="#">` controls, unexplained `<button disabled>`, static WCAG contrast, dark-mode surface order, purple-pink gradients, pill-badge walls, 3-level nested boxes, clipped SVG labels | Static per-file inspection; runtime DOM state still needs browser tests |
| Word | `.docx` | Joined `<w:t>` runs, unaccepted tracked changes (`<w:ins>`/`<w:del>`), leftover comments, broken reference fields, raw Markdown asterisks, external `file:` links, and prose rules (`para N`) | Reports paragraph number rather than rendered page number |
| PowerPoint | `.pptx` | Presentation slide order (`p:sldIdLst`), joined `<a:t>` runs, slide word-walls (`> 120` words / `> 280` Han chars), bullet caps (`> 6`), `<a:normAutofit>` shrink (`< 80%`), off-slide shapes, generic titles | Hidden slides (`show="0"`) are reported as `[SKIP]` for density checks |
| PDF | `.pdf` | Local `/URI` links, raw filename `/Title` (`Microsoft Word - ...`), unembedded `/FontDescriptor` fonts, mixed `/MediaBox` page sizes | Encrypted PDFs and full body text extraction are explicitly reported as `[SKIP]`, never silently marked clean |

## Awesome Anti-Slop

Looking for other tools, style guides, design rules, PR policies, and papers in this space? Browse **[awesome/README.md](./awesome/README.md)** ([简体中文](./awesome/README.zh-CN.md)) or filter all 87 checked entries offline at **[dislop.com/awesome/](https://dislop.com/awesome/)** (machine-readable [index.json](https://dislop.com/awesome/index.json) and [index.md](https://dislop.com/awesome/index.md)).

## Use it from an agent

- **Agent Skill**: Install [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) in Claude Code, Codex, Cursor, or Windsurf (`npx skills add dislop-ai/dislop`) for the `check -> edit -> verify` loop.
- **No shell and no MCP**: Point any web-capable agent at [dislop.com/llms.txt](https://dislop.com/llms.txt) (~2.2 KB), [dislop.com/catalog.json](https://dislop.com/catalog.json), one task guide (`/tasks/*.md`), or any single rule page (`/rules/<id>.md`).

### MCP server (`Claude Code`, `Codex`, `Cursor`, `Windsurf`)

Attach `dislop` over stdio so coding and writing agents check drafts and compare edits locally:

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

Exposed MCP tools: `dislop_check`, `dislop_verify`, `dislop_explain`, and `dislop_packs`.

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

## dislop checks dislop

GitHub Actions CI runs `dislop pack-test` (101 fixture assertions in both Node and Python), cross-runtime conformance tests (`tests/test_conformance.py`), site verification tests (`tests/test_site.mjs`), and `dislop check . --fail-on warning` across this repository's docs, SVG assets, `awesome/`, and `site/`.

## Docs & layout

- [Brand & Voice Guide](./docs/brand-and-voice-guide.md) ([中文](./docs/brand-and-voice-guide.zh-CN.md))
- [Architecture](./docs/architecture.md) ([中文](./docs/architecture.zh-CN.md)) · [Design System](./docs/design-system.md) ([中文](./docs/design-system.zh-CN.md))
- [Roadmap](./docs/strategy-and-roadmap.md) ([中文](./docs/strategy-and-roadmap.zh-CN.md)) · [Research Index](./docs/research/README.md) · [Changelog](./CHANGELOG.md)

```text
dislop/
├── awesome/           # Awesome Anti-Slop (README.md & README.zh-CN.md, 87 entries)
├── bin/               # Node.js CLI (dislop.mjs) & stdio MCP launcher (dislop-mcp.mjs)
├── src/
│   ├── core.mjs       # Zero-dep ES module shared by Node CLI, MCP, and browser workbench
│   ├── binary-node.mjs# Zero-dep ZIP & PDF stream reader for Node.js
│   └── dislop/        # Zero-dep Python 3.10+ engine, CLI, and MCP server
├── packs/             # Declarative dislop.pack/2 manifests (core + 3 style packs, 29 rules)
├── skills/dislop/     # Cross-host Agent Skill (SKILL.md)
├── tests/             # Unit, Node/Python conformance, and site verification tests
├── scripts/           # Static site compiler (build_site.mjs) & v0.3 probe prototype
├── site/              # Compiled dislop.com workbench, /awesome/, and /llms.txt pages
├── assets/            # Logo mark, light/dark banners, and 1200x630 social preview card
└── docs/              # Brand guide, architecture, design system, roadmap, and research
```

## License

[Apache License 2.0](./LICENSE)
