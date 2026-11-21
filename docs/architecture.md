# Architecture (`v0.3.0`)

[简体中文](./architecture.zh-CN.md)

`dislop` is a focused, deterministic anti-slop linter built around one shared rule manifest format (`schema: "dislop.pack/2"`). It checks only for AI-generation artifacts, clichés, and template chrome—not general security scanning, WCAG auditing, PDF preflight, or fact diffing.

## 1. Check -> Edit -> Re-check Loop

```text
Draft / File (.md, .txt, .html, .css, .jsx, .tsx, .docx, .pptx)
   │
   ▼
Check (`auditText`, `auditOoxmlEntries`)
   ├── AI Delivery Artifacts (`packs/core/`, severity: error)
   └── Style & Template Packs (`business-brief` | `literary-essay` | `deck-and-ui`, warning/info)
   │
   ▼
Edit Context (`deletionTest` check question + `bad -> trap -> good` examples)
   │   Author or agent edits ONLY the flagged spans
   ▼
Re-check (`dislop check` / MCP `dislop_check`)
   └── Confirms AI artifacts and clichés are cleared and catches 2nd-order AI slogans
```

`check` never modifies user files. It computes length-preserving masked views (`raw`, `prose`, `ui-text`) so code blocks, inline code, URLs, HTML tags, comments, and quoted specimens do not trigger prose false positives while line and Unicode codepoint column coordinates match the source 1:1.

## 2. Shared Engine & Runtime Parity

| Component | Path | Role |
|---|---|---|
| Shared JS Core | `src/core.mjs` | Pure ES module with zero `node:*` or DOM globals; shared identically by CLI, MCP, and `site/` browser workbench |
| Node Binary Reader | `src/binary-node.mjs` | Zero-dependency ZIP central-directory reader (`zlib.inflateRawSync`) for `.docx`/`.pptx` |
| Node CLI & MCP | `bin/dislop.mjs`, `bin/dislop-mcp.mjs` | CLI (`check`, `explain`, `packs`, `pack-test`, `init`) and stdio MCP server (`dislop_check`, `dislop_explain`, `dislop_packs`) |
| Python Core, CLI & MCP | `src/dislop/{engine,cli,mcp_server}.py` | Pure Python 3.10+ stdlib implementation kept in lockstep via `tests/test_conformance.py` |
| Rule Manifests | `packs/{core,business-brief,literary-essay,deck-and-ui}/pack.json` | Declarative `dislop.pack/2` rules (25 total), thresholds, check questions, examples, and `hit`/`clean` fixtures |
| Static Site Compiler | `scripts/build_site.mjs` | Zero-dependency compiler turning `src/core.mjs`, `packs/`, `skills/`, `docs/brand*`, `ROADMAP*.md`, and verified research JSON into `site/` and `awesome/README*.md` |
| Research, Specs & Prototype | `docs/research/`, `docs/specs/`, `scripts/prototype_antipattern_lab.mjs` | Verified 87-entry Awesome Anti-Slop dataset (`dislop.radar/2`), 31 design/academic references, multi-surface & positive-divergence studies, `v0.3` probe spec, and standalone self-tested prototype |

## 3. Coverage Honesty & Exit Codes

Uninspected inputs never masquerade as clean:

- `0` — Completed inspection with zero findings at or above `--fail-on` (default `error`).
- `1` — One or more findings met or exceeded `--fail-on` (or stale suppressions under `--report-unused`).
- `2` — Invalid CLI flags, missing target path, or an explicitly requested file that could not be inspected (e.g., corrupted OOXML archive or non-UTF-8 text).

## 4. Official Static Site (`dislop.com`)

`site/` compiles to plain static files with relative asset URLs and zero backend processes, served over HTTPS at `https://dislop.com` (`Content-Security-Policy` locking `connect-src 'none'`, zero third-party font or analytics requests). Both `dislop.com` and `/awesome/` default to Simplified Chinese (`zh-CN`) with one-click switching to native English (`en`), keeping all specimens, rule examples, and 87 directory summaries strictly separated by language:

- **For humans**: Live 3-state Hero Proof Card (`Original` / `Still sounds like AI` / `Cleaned up`), zero-upload browser workbench (`/#workbench`), searchable 25-rule catalog (`/#rules`, stable `#rule-<id>` SARIF anchors), offline-filterable 87-entry Awesome Anti-Slop directory (`/awesome/`), and synced `/roadmap.md` / `/roadmap.zh-CN.md`.
- **For external agents**: Static progressive-disclosure endpoints (`/llms.txt`, `/catalog.json`, `/index.md`, `/roadmap.md`, `/tasks/*.md`, `/methodology/*.md`, `/cases/*.md`, `/tools/*.md`, `/packs/*.md`, `/rules/*.md`, `/awesome/index.{json,md}`, `/llms-full.txt`). Build-time assertions enforce byte budgets (`llms.txt <= 2,600 B`), valid links, zero leaked `fixtures.hit`, and stripped HTML comments / invisible Unicode characters.
