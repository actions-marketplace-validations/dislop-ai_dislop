# Architecture (`v0.4.0`)

[简体中文](./architecture.zh-CN.md)

`dislop` is a focused, deterministic anti-slop linter built around one shared rule manifest format (`schema: "dislop.pack/2"`). It checks only for AI-generation artifacts, clichés, and template chrome—not general security scanning, WCAG auditing, PDF preflight, or fact diffing.

## 1. Prevent -> Check -> Clean Up -> Re-check Loop

```text
Drafting (`skills/dislop/SKILL.md` / `.claude-plugin/` / `/llms.txt`)
   └── Plain writing & anti-template UI rules prevent 1st-, 2nd-, and 3rd-order AI slop upfront
   │
   ▼
Check (`auditText`, `auditOoxmlEntries` via CLI, MCP, or browser workbench)
   ├── AI Delivery Artifacts (`packs/core/`, severity: error)
   └── Style & Template Packs (`business-brief` | `literary-essay` | `deck-and-ui`, warning/info)
   │
   ▼
Clean Up (`deletionTest` check question + `bad -> trap -> good` examples)
   │   Author or agent edits ONLY the flagged spans without inventing facts
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
| Node CLI & MCP | `bin/dislop.mjs`, `bin/dislop-mcp.mjs` | Offline CLI (`check`, `explain`, `packs`, `resources`, `pack-test`, `init`) and local stdio MCP (`dislop_check`, `dislop_explain`, `dislop_packs`) |
| Python Core, CLI & MCP | `src/dislop/{engine,cli,mcp_server}.py` | Pure Python 3.10+ stdlib implementation kept in lockstep via `tests/test_conformance.py` |
| Rule Manifests | `packs/{core,business-brief,literary-essay,deck-and-ui}/pack.json` | Declarative `dislop.pack/2` rules (25 total), thresholds, check questions, examples, and `hit`/`clean` fixtures |
| Hosted Cloud Backend & Remote MCP | Private `dislop-cloud` (`https://dislop.com/mcp`, `/api/v1/*`) | Closed-source hosted LLM service (paid-tier zero-training model routing, hashed `dslp_*` account tokens, 30 free monthly credits, self-healing `dislop_deslop`, `dislop_review`, `dislop_voice_extract`) |
| Anti-Slop Benchmark | `benchmarks/`, `scripts/run_benchmark.mjs` | 48 original `CC0-1.0` detection samples (Node/Python parity) + 12 end-to-end writing/design revision tasks with 3rd-order probes, numeric retention scoring, `--eval`, and blind A/B sheet export |
| Static Site Compiler | `scripts/build_site.mjs` | Zero-dependency compiler turning `src/core.mjs`, `packs/`, `skills/`, `docs/brand*`, `ROADMAP*.md`, and verified research JSON into `site/` and `awesome/README*.md` |
| Research, Specs & Prototype | `docs/research/`, `docs/specs/`, `scripts/prototype_antipattern_lab.mjs` | Verified 87-entry Awesome Anti-Slop dataset (`dislop.radar/2`), 31 design/academic references, multi-surface & positive-divergence studies, `v0.3` probe spec, and standalone self-tested prototype |

## 3. Coverage Honesty & Exit Codes

Uninspected inputs never masquerade as clean:

- `0` — Completed inspection with zero findings at or above `--fail-on` (default `error`).
- `1` — One or more findings met or exceeded `--fail-on` (or stale suppressions under `--report-unused`).
- `2` — Invalid CLI flags, missing target path, or an explicitly requested file that could not be inspected (e.g., corrupted OOXML archive or non-UTF-8 text).

## 4. Official Static Site (`dislop.com`)

`site/` compiles to plain static files served over HTTPS at `https://dislop.com` (`Content-Security-Policy` locking `connect-src 'self'`, zero third-party font or analytics requests). Offline deterministic checking runs 100% locally in browser memory with zero network calls; same-origin `/api/v1/*` and `/mcp` routes proxy to the hosted `dislop-cloud` service only when the user explicitly clicks an AI action or connects a Remote MCP client. Both `dislop.com` and `/awesome/` default to Simplified Chinese (`zh-CN`) with one-click switching to native English (`en`), keeping all specimens, rule examples, and 87 directory summaries strictly separated by language:

- **For humans**: One-click "Copy for Agent" hero prompt, live 3-state Hero Proof Card, 3 shareable real before/after cases (`/#cases`), zero-upload browser workbench (`/#workbench`, with instant "Paste my draft" and post-test install/GitHub guidance), clear 5-way usage guide (`/#surfaces`), offline-filterable 87-entry Awesome Anti-Slop directory (`/awesome/`), and share/GitHub strip (`/#share`).
- **For external agents**: Machine-readable endpoints folded cleanly out of humans' way in `<details>` while remaining 100% present in static HTML and served directly at `/llms.txt`, `/catalog.json`, `/index.md`, `/roadmap.md`, `/tasks/*.md`, `/methodology/*.md`, `/cases/*.md`, `/tools/*.md`, `/packs/*.md`, `/rules/*.md`, `/awesome/index.{json,md}`, and `/llms-full.txt`. Build-time assertions enforce byte budgets (`llms.txt <= 2,600 B`), valid links, zero leaked `fixtures.hit`, and stripped HTML comments / invisible Unicode characters.
