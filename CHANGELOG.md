# Changelog

All notable changes to `dislop` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Clean Open-Source vs. Closed-Source Cloud Split (`v0.4.0`)**:
  - Kept the public Apache-2.0 repository (`dislop-ai/dislop`) strictly open-source, zero-LLM, and zero-network during checks: `SKILL.md` (3-tier progressive funnel with on-demand read-only links to free static `dislop.com` guides), Node/Python CLI (`check`, `explain`, `packs`, `resources`, `pack-test`, `init`), local stdio MCP, 25 deterministic rules, `Awesome Anti-Slop`, and `dislop-bench`.
  - Moved the closed-source hosted LLM backend and Remote Streamable HTTP MCP (`/mcp`, `/api/v1/*`) into the private `dislop-cloud` repository (live at `https://dislop.com/mcp`, powered by tiered zero-training paid Gemini routing with hashed `dslp_*` tokens, 5 anonymous web trial credits/day, 30 free monthly credits on signup, global daily budget cap, and Pro / PAYGO / Team waitlist).
  - Upgraded `https://dislop.com` to `CSP: connect-src 'self'` (still zero third-party fonts/analytics/hosts; offline checks remain 0-upload by default), adding opt-in `AI Review` (`1 credit`) and self-healing `AI Rewrite` (`2 credits`) buttons in `#workbench` plus the `#pricing` section with instant free 30-credit Remote MCP token registration and Pro/Credits/Team waitlist capture.

  - **5-Loop Multi-Layer Hardening (`v0.4.1`)**:
    - Added `/privacy.md` disclosing offline zero-upload boundaries vs. optional zero-training Google Gemini cloud endpoints, auto-detected `?lang=` / `navigator.language`, cleared stale AI panels on language switch, fixed the Pro (`$12/mo`, 1,500 cr) vs. PAYGO (`$10`, 800 cr) pricing ladder, and added a collapsible in-workbench personal voice extractor (`dislop.voice/1`).
    - Fixed JSON escaping in `tools/cli-and-hooks.md` and stripped `//` comments from copyable Remote MCP JSON, enforced automated `JSON.parse()` checks on all Agent doc configs in `tests/test_site.mjs`, and added per-client setup guides (Claude Code, Cursor, Codex) plus exact CLI/MCP flags in `SKILL.md`.
    - Upgraded `dislop-cloud` with atomic credit refunds on upstream LLM failure, plan-aware character caps (`4k / 12k / 50k`), and strict MCP Streamable HTTP `202 Accepted` notification handling.
    - Added a 16-sample real-world adversarial holdout suite (`benchmarks/datasets/holdout-v1.json`, expanding detection benchmark to `64` samples with `100% P/R/F1` and `100% Node/Python parity`) and fixed 5 real recall/FP blind spots in `chatbot-artifact`, `unfilled-placeholder`, and `negation-pivot-frame` across both JS and Python.

- **Focused Scope on Direct Anti-Slop Only (`v0.3.0`)**:
  - Removed features not directly tied to detecting AI slop: `dislop verify` / MCP `dislop_verify` (number/link revision diffing), PDF structural/font/MediaBox preflight, Word tracked-changes/comments hygiene, local filesystem path scanning (`local-path-leak`), WCAG contrast/dark-mode linting (`ui-contrast-and-dark-inversion`), and SVG `<title>`/fallback-clipping linting (`svg-text-overflow-or-a11y`).
  - Narrowed the active catalog to **25 pure anti-slop rules** across 4 packs (`core` AI delivery artifacts + `business-brief`, `literary-essay`, `deck-and-ui`) and updated the Hero Proof Card, workbench, READMEs, `SKILL.md`, banners, and OG card to focus strictly on 1st- and 2nd-order AI slop.

### Added

- **Anti-Slop Benchmark Suite (`dislop-bench v1`) & Open-Source LLM Backend / Remote HTTP MCP (`server/`)**:
  - Added [benchmarks/](./benchmarks/README.md) (`48` original `CC0-1.0` detection samples across 6 writing & design domains + `12` end-to-end revision tasks × 3 arms) and [scripts/run_benchmark.mjs](./scripts/run_benchmark.mjs) with Node/Python parity verification, 3rd-order structural probes, key-number retention scoring, external model/Skill evaluation (`--eval`), blind A/B sheet export (`--export-blind-sheet`), and CI regression gates (`--assert`).
  - Fixed two real recall gaps caught by the benchmark across both JS and Python runtimes: `zh-essay-moralizing-ending` matching `这或许就是...` and English named-subject `negation-pivot` clauses (`wasn't just ... — it was ...`).
  - Added zero-dependency open-source LLM backend & Remote Streamable HTTP MCP ([server/](./server/README.md)) supporting BYOK self-hosting and official deployment (`/health`, `/v1/check`, `/v1/review`, `/v1/deslop`, `/mcp`) with tiered review/deslop model routing (`DISLOP_LLM_MODEL_REVIEW` / `DISLOP_LLM_MODEL_DESLOP`), per-tool credit weights (`X-Dislop-Credits-Used`), global daily hard caps (`DISLOP_DAILY_LLM_LIMIT`), strict server-only env keys, secret redaction, rate limiting, payload caps, and offline unit tests ([tests/test_server.mjs](./tests/test_server.mjs)).
  - Upgraded `server/` with a self-healing `dislop_deslop` pipeline (`pre-check -> rewrite -> deterministic/3rd-order/numeric gate -> automatic surgical repair`), `POST /v1/voice/extract` + MCP `dislop_voice_extract` (`dislop.voice/1`), and shared `server/probes.mjs`; added reproducible live multi-model comparison ([scripts/run_live_model_bench.mjs](./scripts/run_live_model_bench.mjs) & [benchmarks/MODEL-COMPARISON.md](./benchmarks/MODEL-COMPARISON.md)) across 5 live models (`+15.8` to `+22.3` composite lift over bare prompting).
  - Added market-backed Open-Core & Cloud value-add strategy study ([docs/research/business-model-and-open-core.zh-CN.md](./docs/research/business-model-and-open-core.zh-CN.md)) benchmarking 9 comparable tools and Vertex AI / Gemini unit economics, synced into `ROADMAP.md` & `ROADMAP.zh-CN.md`.
- **Agent Plugin Bundle, Full Prevent-and-Check Skill & Hub Redesign (`dislop.com`)**:
  - Added standard Claude Code / Agent plugin manifests (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json`) bundling `skills/dislop/SKILL.md` with the local zero-dependency stdio MCP server.
  - Upgraded `skills/dislop/SKILL.md` from a check-only wrapper to a full `prevent -> check -> clean up -> re-check` anti-slop workflow covering 1st-order clichés, 2nd-order slogans, 3rd-order structural pitch habits, and UI/slide template rules.
  - Restructured `https://dislop.com` as a human-first, agent-friendly one-stop anti-slop hub: one-click "Copy for Agent" prompt right in the hero, 3 shareable real before/after cases (including our own 0-finding copy autopsy), instant "Paste my draft" workbench with post-test install & GitHub Star guidance, clear 5-way usage tabs (`Send to AI` / `Skill` / `Plugin` / `MCP` / `CLI` / `CI` / `.dislop.json`), folded `<details>` drawers for Agent technical endpoints and the 25-rule table, and a dedicated Share & GitHub Star band.
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
