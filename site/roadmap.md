---
content-type: reference-data
version: 0.2.0
snapshot: 2026-11-21
---

# Roadmap

[简体中文](./roadmap.zh-CN.md)

Last updated: `2026-11-21` · Current baseline: `v0.2.0` (`dislop.com` live)

This roadmap tracks what `dislop` ships today, what we are building next, and the open design questions we want to decide together. If you want to pick up a track, push back on a threshold, or propose a rule, open a thread in [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) or claim an [Issue](https://github.com/dislop-ai/dislop/issues).

---

## 1. Where We Are (`v0.2.x` Shipped)

| Area | Shipped today | Key files |
|---|---|---|
| Core engine & parity | Zero-dependency Node.js 20+ and Python 3.10+ engines passing 101 rule fixtures and 12 cross-runtime conformance tests | `src/core.mjs`, `src/dislop/engine.py`, `tests/test_conformance.py` |
| Rules & packs | 29 rules across `core` (7 `error` invariants) and 3 style packs (`business-brief`, `literary-essay`, `deck-and-ui`) | `packs/*/pack.json` |
| Edit verification | `dislop verify` & MCP `dislop_verify` guarding numbers, qualifiers, units, dates, URLs, code spans, citations, and 2nd-order slogan drift | `src/core.mjs`, `src/dislop/engine.py` |
| Formats | `.md`, `.mdx`, `.txt`, `.html`, `.css`, `.jsx`, `.tsx`, `.svg`, `.docx`, `.pptx`, `.pdf` structural metadata (`[SKIP]` on encrypted/unparsed layers) | `src/binary-node.mjs`, `src/dislop/engine.py` |
| Website & Workbench | Default-Chinese `dislop.com` with native English toggle, zero language mixing, live 3-state hero proof card, offline browser workbench (`CSP: connect-src 'none'`), and `/llms.txt` endpoints | `scripts/build_site.mjs`, `site/` |
| Awesome Anti-Slop | 87 checked bilingual entries (`dislop.radar/2`), pure English `awesome/README.md`, pure Chinese `awesome/README.zh-CN.md`, and offline filter at `dislop.com/awesome/` | `docs/research/anti-slop-radar-index.json`, `awesome/` |
| Agent & editor entry points | Cross-host `skills/dislop/SKILL.md`, stdio MCP server (`bin/dislop-mcp.mjs`, `src/dislop/mcp_server.py`), Git diff gating (`--changed`/`--staged`), SARIF 2.1.0 & GitHub PR annotations | `skills/dislop/SKILL.md`, `bin/`, `server.json` |

---

## 2. Active Tracks & Milestones

Tracks are scoped so maintainers can work in parallel with minimal merge conflicts.

### Track A — `v0.2.x` Packaging, Polish & Distribution (Now)

Goal: make `dislop` one command away from standard registries and fix small edge cases caught during dogfooding.

- [ ] Publish `dislop` to npm and PyPI (`npx dislop` / `uvx dislop`), and register `server.json` in the MCP registry.
- [ ] Add localized Chinese rejection messages to `dislop verify --lang zh` alongside stable machine-readable `reasonCodes` in JSON output.
- [ ] Catch 1-word English staccato chains (`Faster. Leaner. Done.`) and broader Chinese chatbot openings (`好的，以下是你的稿子`) with clean near-miss fixtures.
- [ ] Ship copy-ready `pre-commit` hook config and a thin reusable GitHub Action workflow.

**Done when**: `npx dislop check .` and `uvx dislop check .` work from public registries, and all new fixtures pass in both Node and Python.

### Track B — `v0.3.0` Core Deepening & Rule Catalog (Next)

Goal: promote our verified `v0.3` prototype into both production runtimes without adding dependencies.

- [ ] Merge the 5 prototype-verified probes from [scripts/prototype_antipattern_lab.mjs](https://github.com/dislop-ai/dislop/blob/main/scripts/prototype_antipattern_lab.mjs) (`comma-chain-cadence`, `sentence-length-monotony`, `discourse-marker-cluster`, `ui-glassmorphism-overuse`, `ui-accent-stripe-card`) into `src/core.mjs` and `src/dislop/engine.py` per [docs/specs/anti-pattern-catalog-and-probes-v0.3.md](https://github.com/dislop-ai/dislop/blob/main/docs/specs/anti-pattern-catalog-and-probes-v0.3.md).
- [ ] Implement `pptx-layout-monotony` (detecting 4+ consecutive identical slide templates) in both Node and Python OOXML readers.
- [ ] Ship `dislop catalog` CLI subcommand and `dislop_catalog` MCP tool for structured filtering by modality, language, severity, and pack.
- [ ] Extract shared host helpers (`src/node-host.mjs`, `src/mcp.mjs`) so CLI and MCP do not duplicate I/O or config loading.

**Done when**: Node and Python pass identical `pack-test` and `test_conformance.py` assertions on all 35 rules, and the repository passes `dislop check . --fail-on warning`.

### Track C — Offline Benchmark for Fact Retention & False Positives (Next, Parallel)

Goal: back our editorial claims with reproducible offline numbers rather than opinions.

- [ ] Curate 30–50 original or open-licensed (`CC0` / `CC-BY`) paired drafts across Chinese business briefs, Chinese essays, English technical specs, HTML cards, and `.pptx` decks.
- [ ] Measure three concrete numbers offline: false-positive rate on clean human writing, recall on obvious AI slop, and rejection accuracy of `dislop verify` when qualifiers (`up to` / `最多`), numbers, or links are altered.
- [ ] Publish the benchmark runner under `scripts/` and report results in docs.

**Done when**: anyone can run one offline command and reproduce the exact score table.

### Track D — `Awesome Anti-Slop` Maintenance & Split Threshold (Ongoing, Parallel)

Goal: keep the 87-entry directory accurate, neutral, and useful in both English and Chinese without draining core engine time.

- [ ] Add an Issue form template for submitting new entries (URL, topic, locale, one-sentence EN & ZH summary) and an optional monthly link/star refresh script.
- [ ] Keep `awesome/README.md`, `awesome/README.zh-CN.md`, and `https://dislop.com/awesome/` inside `dislop-ai/dislop` while the project is in early growth.
- [ ] **Split threshold**: spin out a standalone CC0-1.0 `dislop-ai/awesome-anti-slop` repository (using the deferred `dislop.radar/3` contract in `docs/research/awesome-anti-slop-topology/`) only once sustained external directory PRs reach `>= 5/month`, keeping `https://dislop.com/awesome/` canonical permanently.

### Track E — `v0.4.0+` Local Voice Profiles & Integrations (Later / Exploratory)

- [ ] Local `dislop voice extract` (`dislop.voice/1`): compute sentence-length variation, punctuation habits, and private bans from a writer's own drafts completely offline (stored in Git-ignored `.dislop.local/voice.json`).
- [ ] Abstract design grammar cards (`dislop.taste/1`) for teams enforcing their own layout tokens without copying third-party sites.
- [ ] Typed JS/Python SDK facades and an optional Fetch-standard stateless HTTP API wrapper around `src/core.mjs`.
- [ ] Strictly decoupled, opt-in local small-model plugins (ONNX/GGUF, `info` advisory only — never inside the zero-dependency core).

---

## 3. Open Questions for Discussion

These five questions are open for co-maintainers and contributors to weigh in on before we lock code:

1. **`dislop verify` localization & JSON contract**: Should `verify --lang zh` localize human-readable reasons while adding a stable `reasonCodes` array (e.g. `protected_number_changed`, `second_order_drift`) for CI and MCP callers?
2. **Default severity for `v0.3` rhythm probes**: Should `comma-chain-cadence` and `sentence-length-monotony` default to `info` in both `business-brief` and `literary-essay`, or stay opt-in on `literary-essay` so intentional stylistic repetition is never nagged?
3. **Offline benchmark scope**: Which 3–4 document genres matter most for our first public 50-sample benchmark (e.g., Chinese product/weekly reports, WeChat/newsletter articles, English READMEs/specs, `.pptx` decks)?
4. **Code-comment & PR hygiene boundary**: Should `dislop` stay focused on prose, docs, decks, and UI files inside PR diffs (leaving language AST linting to Oxlint/ESLint/Ruff), or add lightweight comment/stub-doc probes?
5. **First editor/workflow integration after npm & PyPI**: Which unlocks the most daily use first—a reusable GitHub Action, a `pre-commit` hook repo, or a VS Code / Cursor extension?

---

## 4. How We Collaborate

- **Discuss first on direction**: Use [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) for open design questions and new rule ideas; open an [Issue](https://github.com/dislop-ai/dislop/issues) when claiming a track or reporting a false positive.
- **Parallel-friendly file boundaries**:
  - Core probes & parity: `packs/`, `src/core.mjs`, `src/dislop/`, `tests/test_engine.py`, `tests/test_conformance.py`
  - Website & Awesome directory: `docs/research/anti-slop-radar-index.json`, `scripts/build_site.mjs`, `site/`, `tests/test_site.mjs`
  - Benchmarks & docs: `scripts/`, `docs/`, `README*.md`, `ROADMAP*.md`
- **Hard guardrails (always on)**:
  - Zero external runtime dependencies in `src/core.mjs` and `src/dislop/`.
  - Zero external font CDNs, analytics, or network calls on `dislop.com` (`CSP: connect-src 'none'`).
  - Visitor-facing copy follows [docs/brand-and-voice-guide.md](https://github.com/dislop-ai/dislop/blob/main/docs/brand-and-voice-guide.md) and keeps Chinese and English examples strictly separated.
- **Run before opening a PR**:
  ```bash
  node scripts/build_site.mjs
  node bin/dislop.mjs pack-test && PYTHONPATH=src python3 -m dislop.cli pack-test
  node tests/test_site.mjs && PYTHONPATH=src python3 -m unittest discover -s tests -v
  node bin/dislop.mjs check . --fail-on warning && PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning
  ```
