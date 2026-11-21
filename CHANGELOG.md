# Changelog

All notable changes to `dislop` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Plain-Voice Copy Rewrite (Karpathy 80% ASD-STE100 + Anti-Pull-Quote Discipline)**:
  - Rewrote the website (`dislop.com`, `/awesome/`, `/llms.txt`), `README.md`, `README.zh-CN.md`, `awesome/README*.md`, `docs/brand-and-voice-guide*.md`, `docs/brand/voice.json`, `AGENTS.md`, CLI help strings, package descriptions, and social/banner SVGs (`assets/og-card.{svg,png}`, `assets/banner-*.svg`) to drop 3-part semicolon pitches, pull-quote closers, and performative copy-editor roleplay in favor of plain, relaxed, direct prose.
- **Collaboration Roadmap (`ROADMAP.md` & `ROADMAP.zh-CN.md`)**:
  - Consolidated project milestones, 5 parallel workstreams (`v0.2.x` -> `v0.4+`), 5 open design questions for GitHub Discussions, and collaborator pre-PR checks into root [ROADMAP.md](./ROADMAP.md) & [ROADMAP.zh-CN.md](./ROADMAP.zh-CN.md) (replacing `docs/strategy-and-roadmap*.md`), synced to `https://dislop.com/roadmap.md` and `/roadmap.zh-CN.md`.
- **Deep Brand Voice, UI/Visual Polish & Pure Bilingual Experience (`dislop.com` & GitHub)**:
  - Made `https://dislop.com` and `https://dislop.com/awesome/` default to Simplified Chinese (`zh-CN`) with one-click native English (`en`) switching and zero language mixing across hero samples, all 10 workbench specimens (5 ZH + 5 EN), margin notes, rule catalog, and all 87 Awesome Anti-Slop summaries (`awesome/README.md` in pure English + `awesome/README.zh-CN.md` in pure Chinese).
  - Replaced the hero terminal stack and numbered spec eyebrows on `dislop.com` with a perform-the-product red-pen headline, an interactive 3-state live Proof Card (powered by `src/core.mjs`), a 3-mark promise strip, collapsible editor-style margin notes, and a feed-legible `1200×630` social card (`assets/og-card.{svg,png}`).
  - Rewrote `README.md`, `README.zh-CN.md`, `AGENTS.md` (adding an editorial voice section), `skills/dislop/SKILL.md`, CLI help banners, `package.json`, `pyproject.toml`, and `server.json` (trimmed under the 100-char MCP registry cap) to drop internal jargon and show real `check`/`verify` output up front.
  - Fixed `packs/core/pack.json` `unfilled-placeholder` exemplar so `good` no longer invents an unmeasured latency figure, and removed superseded duplicate research notes (`positioning-and-messaging.zh-CN.md`, `anti-slop-resource-radar.md`, `awesome-radar-strategy.zh-CN.md`).
- **Brand Identity, Voice Baseline & `Awesome Anti-Slop` (`/awesome/`)**:
  - Added [docs/brand-and-voice-guide.md](./docs/brand-and-voice-guide.md), [docs/brand-and-voice-guide.zh-CN.md](./docs/brand-and-voice-guide.zh-CN.md), and the draft self-voice profile [docs/brand/voice.json](./docs/brand/voice.json) anchored in `assets/logo.svg` ("the sheet is set by machine; the marks are made by hand").
  - Promoted the 87-entry curated directory to **Awesome Anti-Slop** ([awesome/README.md](./awesome/README.md), [awesome/README.zh-CN.md](./awesome/README.zh-CN.md) & `https://dislop.com/awesome/`, with `/radar/` redirecting via HTTP 301).
  - Applied Brand Baseline visual tokens: unified `#F04438` Vermilion (`--pen`) across light/dark logo tiles, switched `stet` marks to round `2px dotted` underlines (distinct from dashed `query`), added `--radius-ctrl: 6px`, fixed Han heading tracking, and matched `color-scheme` scrollbars.
- **Human + Agent Dual-Native Website (`https://dislop.com`)**:
  - Upgraded `scripts/build_site.mjs` into a zero-dependency dual-native static compiler generating both the pre-rendered browser workbench (`site/index.html`), an interactive 87-entry ecosystem radar (`site/radar/index.html`), and progressive-disclosure static Agent endpoints (`/llms.txt`, `/llms-full.txt`, `/catalog.json`, `/index.md`, `/methodology/*.md`, `/cases/*.md`, `/tools/*.md`, `/tasks/*.md`, `/packs/*.md`, `/rules/*.md`, `/radar/index.{json,md}`).
  - Added build-time sanitization (stripping HTML comments, invisible/bidi Unicode characters, and negative test fixtures from Agent-facing outputs) plus byte-budget and link-integrity assertions.
  - Added searchable, multi-dimensional rule filtering (pack, modality, severity, bilingual keyword), stable `#rule-<id>` SARIF anchors, one-click `Try ↑` Workbench loading for text/UI/SVG rules, and a client-side stylometric voice meter preview.
- **Research & Specification Corpus (`docs/research/`, `docs/specs/`)**:
  - Anti-pattern detection & catalog study (`docs/research/anti-pattern-detection-and-catalog.zh-CN.md`) paired with the `v0.3` rule/catalog specification (`docs/specs/anti-pattern-catalog-and-probes-v0.3.md`) and standalone zero-dependency verification prototype (`scripts/prototype_antipattern_lab.mjs`: 29 indexed rules, 5 candidate cadence/UI probes, 20 self-test assertions).
  - Positive divergence & personalization study (`docs/research/positive-divergence-and-personalization.zh-CN.md`), 31 verified non-mainstream design/typography/academic references (`verified-positive-sources.json`), and draft `dislop.voice/1` & `dislop.taste/1` examples.
  - Multi-surface integration architecture (`docs/research/multi-surface-integration-architecture.zh-CN.md`) and Website-as-an-Agent-Service protocol (`docs/research/multi-surface-architecture/website-as-agent-service.zh-CN.md`).
  - Community topology proposal (`docs/research/awesome-anti-slop-topology-design.zh-CN.md`) with `dislop.radar/3` contract and starter templates (deferred while single-repo-first).
- **Website Verification & Optimization**:
  - Audited and hardened `site/` and `scripts/build_site.mjs` for pre-rendered vs. hydrated parity, accessibility, i18n completeness, clipboard fallbacks, contrast accuracy, and CI drift detection.

### Changed

- Unified the official homepage on a single canonical HTTPS origin (`https://dislop.com`) and removed the redundant `github.io` Pages mirror workflow (`f3ae279`).
- Aligned WCAG 2.2 AA contrast figures across `docs/design-system.md`, `docs/design-system.zh-CN.md`, and `site/index.html` to exact computed values from `src/core.mjs`.
- Updated repository documentation (`README.md`, `README.zh-CN.md`, `docs/architecture.md`, `docs/architecture.zh-CN.md`, `docs/research/README.md`, `CONTRIBUTING.md`) and project directory map to reflect the dual-native site, research index, and `v0.3` prototype.

## [0.2.0] - 2026-11-21

### Added

- **Two-Tier Rule Architecture (`dislop.pack/2`)**:
  - Introduced `packs/core/pack.json` (`tier: "invariant"`, `severity: "error"`, always inherited) covering local path leaks, unfilled placeholders, chatbot residue, raw Markdown in Office docs, dead UI controls, resolvable WCAG AA contrast failures, dark-mode Z-elevation inversion, and Office/PDF structural hygiene.
  - Expanded genre Taste Packs (`business-brief`, `literary-essay`, `deck-and-ui`) to 29 total rules with bilingual Deletion Tests, `bad -> trap -> good` exemplars, and 101 automated `hit`/`clean` fixture assertions.
- **Stage-3 Revision Verification (`dislop verify` / MCP `dislop_verify`)**:
  - Added deterministic multiset guards for numbers (including qualifiers such as `up to` / `at least` / `最多` / `至少` and units), dates, URLs, code spans/blocks, and citations, alongside second-order slogan displacement detection (`negation-pivot`, `staccato`, `triad`, `ending`).
- **Cross-Modality Binary & Dual-Runtime Parity**:
  - Added zero-dependency Node.js (`src/core.mjs`, `src/binary-node.mjs`) and Python (`src/dislop/`) parsers for `.docx`, `.pptx` (true `p:sldIdLst` slide order, joined `<a:t>` runs, word walls, bullet caps, `normAutofit`, off-slide frames), and structural `.pdf` metadata (`/URI`, `/Title`, `/FontDescriptor`, `/MediaBox`), with explicit `[SKIP]` coverage honesty.
  - Added cross-runtime conformance test suite (`tests/test_conformance.py`) verifying identical behavior between Node.js and Python across OOXML, PDF, Unicode coordinates, MCP JSON-RPC, and `verify`.
  - Added Git incremental diff gating (`--changed`, `--staged`), SARIF 2.1.0 & GitHub PR annotation formatters, inline reason-annotated suppressions (`--report-unused`), and `dislop init`.
- **Galley Proof Design System & Browser Workbench (`site/`)**:
  - Authored `docs/design-system.md` & `docs/design-system.zh-CN.md`, adaptive light/dark SVG banners (`assets/banner-light.svg`, `assets/banner-dark.svg`), and the zero-upload browser workbench (`CSP: connect-src 'none'`, native `DecompressionStream` OOXML inspection).
- **2026 Anti-Slop Landscape & Ecosystem Radar (`c6ad85d`)**:
  - Published `docs/research/anti-slop-landscape-2026.zh-CN.md`, the 87-entry verified radar (`anti-slop-radar-index.json` / `anti-slop-resource-radar.md`), and the benchmark-backed strategy note (`awesome-radar-strategy.zh-CN.md`).

## [0.1.0] - 2026-11-21

### Added

- Initial zero-dependency Node.js (`bin/dislop.mjs`, `bin/dislop-mcp.mjs`) and Python (`src/dislop/`) CLI and stdio MCP server implementations.
- First three modular Taste Packs (`business-brief`, `literary-essay`, `deck-and-ui`), brand mark (`assets/logo.svg`, `assets/banner.svg`), bilingual `README` / `docs/architecture`, `CONTRIBUTING.md`, `server.json`, Apache-2.0 `LICENSE`, and GitHub Actions CI with self-dogfooding.

## [0.0.1] - 2026-11-21

### Added

- Repository bootstrap (`aec5d35`): initial `AGENTS.md`, `README.md`, `docs/architecture.md`, and `.gitignore`.
