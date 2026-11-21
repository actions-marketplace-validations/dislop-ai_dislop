# `dislop` Strategy, Capabilities, Visual Identity & Multi-Surface Blueprint

[简体中文](./strategy-and-roadmap.zh-CN.md)

> Baseline: `v0.2.0` · Consolidated: 2026-11-21 · This document unifies positioning, capability boundaries, multi-surface product architecture, visual identity (VI), and phased roadmap into one canonical reference. Detailed primary research reports and verified datasets remain in [docs/research/README.md](./research/README.md).

---

## 1. Strategic Positioning & Differentiation

### 1.1 Primary Positioning

- **English**: **De-slop AI outputs.** A complete toolkit for writing, docs, decks, PDF, Web UI, and agent deliverables across any model or dev environment: catch stock phrasing and delivery defects deterministically, then verify edits kept every number, link, and citation intact.
- **Chinese**: **全面去 AI 味。** 覆盖写作、文档、PPT、PDF、前端 UI 与 Agent 交付的全套工具，适配任意模型、Agent 与开发环境：确定性标出套话与硬伤，改后复检保住每个数字、链接与引用。

### 1.2 Engineering Moat

As upstream prompt skills add deterministic linters and hooks while probabilistic "humanizers" routinely distort facts to evade AI detectors, `dislop` anchors on three verifiable strengths:

1. **Cross-Modality Deterministic Parity (Zero Runtime Dependencies)**: One zero-dependency core covers `.md`/`.txt`, `.html`/`.css`/`.jsx`/`.tsx`/`.svg`, `.docx`, `.pptx`, and `.pdf` structural metadata. Node.js and Python runtimes share 101 pack fixture assertions and 12 cross-runtime conformance tests.
2. **Three-Stage Fact-Preserving Loop (`check -> edit -> verify`)**: `check` flags defects without silent rewrites, returning Deletion Tests and `bad -> trap -> good` contrasts; `verify` enforces multiset preservation of numbers, qualifiers (`up to`/`at least`/`最多`/`至少`), units, dates, URLs, code spans, and citations while blocking second-order slogan displacement.
3. **Negative Defense + Positive Pull + Verified Radar**: Built on a zero-LLM core, `dislop` combines shipped preflight guardrails with draft offline voice (`dislop.voice/1`) and abstract design grammar (`dislop.taste/1`) protocols plus an 87-entry verified ecosystem radar (`dislop.radar/2`).

### 1.3 Ethics & Coverage Honesty

- **Quality over evasion**: `dislop` removes template noise and preserves factual accuracy rather than helping evade AI disclosure policies. Probabilistic detectors and adversarial bypass tools are isolated inside the radar's `contrast-and-detection` section.
- **Coverage honesty**: Uninspectable inputs (encrypted PDFs, corrupted archives, unextracted CID text layers) are reported explicitly as `[SKIP]` (and exit `2` on single-file checks), never silently marked clean.

---

## 2. Capability Ledger (Live vs. Prototype vs. Roadmap)

| Area | Shipped (`v0.2.0`) | Verified Prototype / `v0.3` Spec | Planned (P0–P2) |
|---|---|---|---|
| **Core Invariants (`packs/core`, `error`)** | 7 rules: local path leaks, unfilled placeholders, chatbot residue, raw Markdown in Office docs, dead UI controls, WCAG AA contrast & dark Z-elevation inversion, Office revisions/comments, off-slide PPTX frames, PDF URI/title/font hygiene | — | Expanded PDF metadata checks and baseline suppression ledgers |
| **Genre Taste Packs (`warning`/`info`)** | 22 rules across `business-brief` (8), `literary-essay` (5), and `deck-and-ui` (9) with code/URL/quote masking, Deletion Tests, and 3-state exemplars | 5 cadence/UI probes verified (20 assertions) in [prototype_antipattern_lab.mjs](../scripts/prototype_antipattern_lab.mjs); `pptx-layout-monotony` specified in `v0.3` spec | Merge 6 new probes into both runtimes; optional decoupled local small-model plugins (ONNX/GGUF, `info` only) |
| **Revision Guard (`verify`)** | Multiset verification for numbers+qualifiers+units, dates, URLs, code, citations + second-order slogan guard | — | Public offline benchmark for fact retention & second-order drift |
| **Anti-Pattern Catalog** | Pre-rendered 29-rule catalog on `dislop.com` with multi-facet search, `#rule-<id>` SARIF anchors, and 23 one-click `Try ↑` probes | Standalone CLI catalog query verified in prototype | Ship `dislop catalog` CLI and `dislop_catalog` MCP tool |
| **Positive Divergence & Voice** | Browser-RAM stylometric meter preview + 31 verified non-mainstream design/academic references | Draft `dislop.voice/1`, `dislop.taste/1`, and Three-Band Entropy Partition | Local `dislop voice extract`, S1–S4 skeleton cards, and cross-document repetition checks |
| **Ecosystem Radar** | 87 verified entries (`dislop.radar/2`) + offline filterable `/radar/` directory | `dislop.radar/3` per-entry JSON contract & starter templates | Graduate to standalone CC0-1.0 `dislop-ai/awesome-anti-slop` after npm/PyPI publish, synced via offline snapshot PRs |

---

## 3. Multi-Surface Product Matrix (L0–L3)

All surfaces share one zero-dependency core (`src/core.mjs` + `src/dislop/`) and rule manifests (`packs/*/pack.json`):

| Level | Surface | Status | Target Workflow | Entry Point |
|---|---|---|---|---|
| **L0** | **Dual-Native Website (`dislop.com`)** | **Live** | Zero-install human workbench, 87-entry radar, and HTTP-only external agents | `https://dislop.com`, `/radar/`, `/llms.txt`, `/catalog.json`, `/tasks/*.md`, `/rules/*.md` |
| **L1** | **Agent Skill (`SKILL.md`)** | **Shipped in Repo (SSOT)** | Claude Code, Codex, Cursor, Windsurf, and `skills.sh`-compatible hosts | [skills/dislop/SKILL.md](../skills/dislop/SKILL.md) (compiled to `/tools/skill.md`) |
| **L1** | **Node.js & Python CLI** | **Shipped (`v0.2.0`)** | Local audits, git diff gating (`--changed`/`--staged`), SARIF 2.1.0, GitHub annotations, `verify` | `npx --yes github:dislop-ai/dislop` / `uvx --from git+https://github.com/dislop-ai/dislop` |
| **L2** | **Stdio MCP Server** | **Shipped (`v0.2.0`)** | Structured `dislop_check`, `dislop_verify`, `dislop_explain`, `dislop_packs` inside AI editors | `bin/dislop-mcp.mjs`, `src/dislop/mcp_server.py`, `server.json` |
| **L2** | **Hooks, pre-commit & CI** | **Templates Ready (Pkg P0)** | Automated pre-commit, PR, and `PostToolUse` error gating | `site/tools/cli-and-hooks.md`, `.github/workflows/ci.yml` |
| **L3** | **SDK & Stateless HTTP API** | **Core Exported (API P1)** | Polyglot backends, publishing pipelines, self-hosted workflow nodes | Exported `src/core.mjs`; typed SDK facades & Fetch-standard REST API planned |

---

## 4. Interaction, UI & Brand Visual Identity (VI)

Full visual tokens and ratios live in [design-system.md](./design-system.md). Key unified standards:

- **Visual System**: **Architectural Galley Proof Sheet** — rejecting both Generator Default #1 (purple-pink neon gradients + pill soup) and Generator Default #2 (warm cream `#F7F5F0` + terracotta fallback).
- **Brand Assets**:
  - Mark: [assets/logo.svg](../assets/logo.svg) — proofreader's delete mark (*dele* / GB/T 14706), verified at `16px`, `64px`, and `512px`.
  - Adaptive Banners: [assets/banner-light.svg](../assets/banner-light.svg) & [assets/banner-dark.svg](../assets/banner-dark.svg) (redundant duplicate `banner.svg` removed). Right-hand specimens strictly reserve Carmin Red for `core` `error` defects and Press Green for `stet` locked facts.
  - Social Preview Card: [assets/og-card.svg](../assets/og-card.svg) & rasterized [assets/og-card.png](../assets/og-card.png) (`1200×630`) for Open Graph and Twitter/X sharing.
- **Exact WCAG 2.2 AA & Dark Monotonicity**: Verified via `src/core.mjs` (`--ink` `18.0:1`/`15.3:1`, `--mark-error` `6.6:1`/`7.0:1`, `--mark-warn` `7.3:1`/`8.5:1`, `--mark-stet` `6.5:1`/`9.8:1`; dark lightness rises monotonically `L* 4.6 -> 8.1 -> 12.6`).
- **Zero-Upload & Progressive Disclosure**: Zero external font CDNs or analytics (`CSP: connect-src 'none'`); static pre-rendered HTML matches hydrated UI; Agent endpoints strip `fixtures.hit`, HTML comments, and invisible Unicode characters at build time.

---

## 5. Phased Execution & Anti-Overengineering Guardrails

1. **G0 (Current Packaging & Launch)**: Finalize dual-native site, canonical `SKILL.md`, VI suite, and npm/PyPI publication, then launch `dislop-ai/awesome-anti-slop` `v0.1.0`.
2. **G1 (`v0.3.0` Deepening)**: Extract `src/node-host.mjs` and `src/mcp.mjs`, ship the 6 new deterministic probes and `dislop catalog` / `dislop_catalog`, and publish the offline `verify` benchmark.
3. **G2 (Positive Engine & Service Layer)**: Ship offline `dislop.voice/1` extraction, `dislop.taste/1` cards, Fetch-standard stateless HTTP API, and strictly decoupled local small-model plugins.

### Hard Engineering Guardrails

- Core runtimes (`src/core.mjs`, `src/dislop/`) remain permanently zero-dependency.
- `dislop.com` remains purely static with `CSP: connect-src 'none'` and zero server-side state.
- Adapter layers (CLI, MCP, Skill, site compiler, future HTTP API) never duplicate rule regexes or thresholds outside `packs/` and the core engine.
