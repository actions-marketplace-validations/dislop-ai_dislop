# Roadmap

[简体中文](./ROADMAP.zh-CN.md)

Last updated: `2026-11-22` · Current baseline: `v0.6.0` (`dislop.com` live)

This roadmap tracks what `dislop` ships today, how we are rolling out universal editor and agent integrations next, and the open design questions we want to decide together. To pick up a track, push back on a rule threshold, or propose a new idea, start a thread in [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) or claim an [Issue](https://github.com/dislop-ai/dislop/issues).

---

## 1. Where We Are (`v0.6.0` Shipped)

| Area | Shipped today | Key files |
|---|---|---|
| Core engine & parity | Zero-dependency Node.js 20+ and Python 3.10+ engines passing 160 rule fixtures (83 hit + 77 clean), 53-pattern catalog checks, offline `extractVoiceProfileOffline`, and 26 Python `unittest` conformance and engine tests | `src/core.mjs`, `src/dislop/engine.py`, `tests/test_conformance.py` |
| Built-in packs & local model advisor | All 7 scenario and vertical packs (`42` rules) bundled offline (`core`, `business-brief`, `engineering-spec`, `regulated-comms`, `literary-essay`, `deck-and-ui`, `executive-deck`), plus 11 extended pattern-bank probes (`--patterns`), a bundled `14.6 KB` gzip Pocket ML ensemble (`pocket-slop-v1`), and hardware-aware local model advisor (`dislop model`) | `packs/*/pack.json`, `patterns/`, `models/`, `src/local-model.mjs` |
| Formats | `.md`, `.mdx`, `.txt`, `.html`, `.css`, `.jsx`, `.tsx`, `.svg`, `.docx`, `.pptx` | `src/binary-node.mjs`, `src/dislop/engine.py` |
| Website & Workbench | Default-Chinese `dislop.com` with native English toggle, 2 proof marks (red solid `error` + blue dashed `warning`/`info`), 5-cell rhythm gauges, offline + cloud voice profile drawer, and `/llms.txt` endpoints | `scripts/build_site.mjs`, `site/` |
| Awesome Anti-Slop | 87 checked bilingual entries (`dislop.radar/2`), pure English `awesome/README.md`, pure Chinese `awesome/README.zh-CN.md`, and offline filter at `dislop.com/awesome/` | `docs/research/anti-slop-radar-index.json`, `awesome/` |
| Multi-surface manifests & CI gates | 10 CI-locked manifests generated from one source: Agent Skill (`skills/dislop/` with 4 local reference cards + `agents/openai.yaml`), Claude Code plugin (`.claude-plugin/`, ~130 always-on tokens), Codex plugin (`.codex-plugin/` + `.agents/plugins/marketplace.json`), Agent Plugins 1.0 (`plugin.json` + `mcp.json`), Gemini CLI extension (`gemini-extension.json`), dual-mode MCP Registry (`server.json` declaring both local `stdio` and remote `https://dislop.com/mcp`), GitHub Action (`action.yml`), and `.pre-commit-hooks.yaml` | `scripts/sync_manifests.mjs`, `plugin.json`, `server.json`, `action.yml` |

---

## 2. Active Tracks & Milestones

Full ecosystem research and marketplace ranking live in [docs/research/universal-adaptation-and-marketplace-strategy.zh-CN.md](./docs/research/universal-adaptation-and-marketplace-strategy.zh-CN.md). Tracks are split along clean directory boundaries so contributors can work in parallel.

### Track A — Public Package Registries & First 6 Marketplace Listings (Now)

Goal: finish account-side publishing so every install command resolves from public registries in milliseconds and claim first-wave marketplace slots.

- [x] Ship single-source manifest generator (`scripts/sync_manifests.mjs`), automated Trusted Publishing release workflow (`.github/workflows/release.yml`), reusable GitHub Action (`action.yml`), and `pre-commit` hooks (`.pre-commit-hooks.yaml`).
- [x] Default local MCP `dislop_check` to `verbosity: "compact"`, expose the focused 7-tool stdio surface, strip negative test fixtures from `dislop_explain`, pass `claude plugin validate` and `codex plugin` install checks, and set GitHub repository crawler topics (`gemini-cli-extension`, `claude-code-plugin`, `agent-plugins`).
- [ ] Run initial `npm publish` (`dislop`) and PyPI Trusted Publishing (`dislop`), flip `.mcp.json` / `mcp.json` via `node scripts/sync_manifests.mjs --channel registry`, and push `server.json` to `registry.modelcontextprotocol.io` (claiming Smithery and Glama listings).
- [ ] Submit both the GitHub plugin bundle and the remote `https://dislop.com/mcp` connector on Anthropic's directory portal (`claude.ai/directory/manage`), submit to OpenAI's universal plugin directory, and verify automatic indexing on `skills.sh` and `geminicli.com/extensions`.

**Done when**: `npx dislop check .`, `uvx dislop check .`, and `gemini extensions install` work straight from public registries, and the Official MCP Registry lists both local `stdio` and remote `streamable-http` transports.

### Track B — Dual-Published Editor Extension & Multi-Agent Fleet Orchestrators (Next)

Goal: ship one zero-dependency Web extension across both major VS Code registries and solve Git worktree handoff checks for parallel agent runners like Orca, Herdr, and Conductor.

- [ ] Build a lightweight Web-compatible extension `integrations/vscode/` (`< 150 KB`) directly around `src/core.mjs`: on-save/idle squiggles, hover before/trap/after cards, `Cmd+.` quick-ignore comments + optional cloud rewrite, and automatic agent registration via `mcpServerDefinitions` / `languageModelTools`; publish simultaneously to **VS Code Marketplace** and **Open VSX** (covering VS Code, Cursor, Windsurf, Antigravity, VSCodium, and `vscode.dev`).
- [ ] Package `integrations/antigravity/` (square high-contrast logo + 3 starter prompts), pass `agy plugin validate --strict` with zero warnings for Antigravity Partner Intake, and submit `.cursor-plugin/` + Cline MCP Marketplace PRs.
- [ ] Ship parallel-fleet templates: `integrations/orca/orca.yaml` and Conductor `post-setup.d` hooks (symlinking gitignored `.dislop.local.json` into isolated child Git worktrees and gating previews on `core` errors), `integrations/herdr/herdr-plugin.toml` for one-key pane checks, and Agent Hook scripts with a 2-strike circuit breaker.

**Done when**: installing `.vsix` activates both human diagnostics and editor agent tools with zero manual JSON edits, and child Git worktrees inherit `.dislop.local.json` cleanly.

### Track C — Writer & Desktop Productivity Stores + Benchmark Expansion (Parallel)

Goal: reach writers, researchers, and PMs outside code editors while expanding reproducible benchmark coverage.

- [x] Ship `dislop-bench v2`: 112 core detection samples + 154 multi-angle pattern samples (`100.0%` precision/recall, `0.0%` clean FPR, `100.0%` Node/Python parity), 18 end-to-end revision tasks (`18/18` all-clear), and 5-model live cloud comparisons ([benchmarks/REPORT.md](./benchmarks/REPORT.md)).
- [ ] Reuse `src/core.mjs` to publish an offline-first **Obsidian Community Plugin** and a **Raycast Store** extension (`Check Selected Text` / `Clean Clipboard Slop`).
- [ ] Add longer real-world drafts and multi-slide executive `.pptx` benchmarks, reviewing store install and free-tier cloud conversion telemetry every two weeks.

**Done when**: `node scripts/run_benchmark.mjs --assert` stays green offline in CI and both Obsidian and Raycast packages pass upstream automated checks.

### Track D — `Awesome Anti-Slop` Maintenance & Split Threshold (Ongoing, Parallel)

Goal: keep the 87-entry directory accurate, neutral, and easy to filter in both English and Chinese without splitting focus.

- [ ] Add a GitHub Issue form template for resource submissions (URL, topic, locale, one-sentence EN & ZH summary) and an optional monthly link/star refresh script.
- [ ] Keep `awesome/README.md`, `awesome/README.zh-CN.md`, and `https://dislop.com/awesome/` inside `dislop-ai/dislop` during early growth.
- [ ] **Split threshold**: spin out a standalone CC0-1.0 `dislop-ai/awesome-anti-slop` repository (`dislop.radar/3`) only once sustained external directory PRs reach `>= 5/month`, keeping `https://dislop.com/awesome/` canonical permanently.

### Track E — Open-Core Cloud Value-Adds & Longer-Term (`v0.6.0+`)

Market pricing benchmarks and unit economics live in [docs/research/business-model-and-open-core.zh-CN.md](./docs/research/business-model-and-open-core.zh-CN.md). **Open-source boundary**: `SKILL.md`, Node/Python CLI, local plugins, 7-tool local stdio MCP, all 7 built-in packs (`42` rules), 53-pattern catalog, bundled `14.6 KB` Pocket ML, offline browser workbench, `Awesome Anti-Slop`, and `dislop-bench v2` remain Apache-2.0 open source (`dislop-ai/dislop`). Hosted LLM endpoints and Remote HTTP MCP run in private `dislop-cloud`:

- [x] **Phase 0 (Live Hosted Cloud & Demand Validation)**: `dislop-cloud` live at `https://dislop.com/mcp` and `/api/v1/*` with 5 anonymous web demo credits/day, 30 free monthly credits after email signup, global daily budget cap, and Pro / PAYGO / Team waitlist.
- [ ] **Format-Preserving `.docx` / `.pptx` Round-Trip Rewrite**: Clean prose and slides while keeping native Office styles, masters, numbers, and bounding qualifiers intact.
- [ ] **Visual Multimodal Audit**: Headless screenshot rendering + VLM layout critique for web pages and slide decks.
- [ ] **Team Brand Voice Libraries & GitHub App PR Reviewer**: Shared `dislop.voice/1` profiles across teams and single-comment sticky PR summaries.
- [ ] Typed JS/TS (`.d.ts`) and Python (`py.typed`) in-memory byte-stream SDK facades.

---

## 3. Open Questions for Discussion

These five design choices are open for co-maintainers and contributors to weigh in on:

1. **VS Code / Open VSX diagnostic cadence**: Should editor underlines update only on file save (`onSave`) by default, or after a `300ms` typing pause? Does live underlining distract during first-draft writing?
2. **Agent Hook blocking scope & circuit breaker**: Our default hook blocks only on `packs/core` `error` artifacts and yields to the human after 2 consecutive blocks on the same file. Should we also ship a strict preset that blocks `regulated-comms` superlatives?
3. **Orca / Conductor worktree shared files**: Beyond `.dislop.local.json`, should our `orca.yaml` template also symlink `.dislop.local/voice.json` into child worktrees by default?
4. **Code-comment & PR hygiene boundary**: Should `dislop` stay strictly focused on prose, docs, decks, and UI files inside PR diffs (leaving AST checks to Oxlint/ESLint/Ruff), or add an opt-in probe for boilerplate AI PR descriptions and empty docstrings?
5. **Obsidian plugin primary UI**: Do longform Obsidian writers prefer a side-pane rhythm & findings summary, or inline dashed underlines inside Live Preview?

---

## 4. How We Collaborate

- **Discuss first on direction**: Use [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) for open design questions and rule proposals; open an [Issue](https://github.com/dislop-ai/dislop/issues) when claiming a track or reporting a false positive.
- **Parallel-friendly file boundaries**:
  - Core probes & parity: `packs/`, `patterns/`, `src/core.mjs`, `src/dislop/`, `tests/test_conformance.py`
  - Marketplaces & editor integrations: `scripts/sync_manifests.mjs`, `plugin.json`, `integrations/`, `action.yml`
  - Website & Awesome directory: `docs/research/anti-slop-radar-index.json`, `scripts/build_site.mjs`, `site/`, `tests/test_site.mjs`
  - Benchmarks & docs: `benchmarks/`, `docs/`, `README*.md`, `ROADMAP*.md`
- **Hard guardrails (always on)**:
  - Zero external runtime dependencies in `src/core.mjs` and `src/dislop/` core checkers.
  - Zero external font CDNs, analytics, or third-party requests on `dislop.com` (`CSP: connect-src 'self'`; offline check stays 0-upload by default).
  - Visitor-facing copy follows [docs/brand-and-voice-guide.md](./docs/brand-and-voice-guide.md) and keeps Chinese and English examples strictly separated.
- **Run one command before opening a PR or cutting a release** (platform publishing rules live in [docs/releasing.md](./docs/releasing.md)):
  ```bash
  npm run release:check
  ```
