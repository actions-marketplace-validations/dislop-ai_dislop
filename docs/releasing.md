# Release & Multi-Platform Publishing Guide

[简体中文](./releasing.zh-CN.md)

Every `dislop` release goes through one zero-dependency script (`scripts/release.mjs`) and one GitHub Actions workflow (`.github/workflows/release.yml`). There is no extra release framework to maintain.

---

## 1. Two Commands for Every Release

Update `CHANGELOG.md`, commit your feature changes, and run:

```bash
# 1. Run all local preflight, privacy, dual-runtime, dogfood, and packaging checks
npm run release:check

# 2. Bump versions across all manifests, rebuild site/, re-verify, commit, tag, and push
npm run release -- 0.6.1 --commit --tag --push
```

Maintainers with a local Git-ignored `.private/deploy.local.sh` hook can append `--deploy` to deploy `site/` and sync the hosted cloud engine in the same step, followed by automatic `HTTP 200` checks against `https://dislop.com/llms.txt` and `/api/health`.

---

## 2. Target Platforms, Rules & Update Mechanics

All distribution targets fall into three groups based on how updates ship:

### Group 1: Auto-Synced on Git Tag / Release (Zero Extra Steps Per Release)

| Platform | One-Time Onboarding | Hard Platform Rules & Gotchas | How Updates Ship |
|---|---|---|---|
| **GitHub Releases & GitHub Marketplace (Action)** | Check "Publish this Action to the GitHub Marketplace" on the first Release | Root `action.yml` must have a globally unique `name` and a `branding` block | `release.yml` creates the GitHub Release from `CHANGELOG.md` and uploads `.tgz`/`.whl` archives on every `v*.*.*` tag |
| **`skills.sh` Leaderboard** | None; indexed automatically on first `npx skills add` | Reads `skills/dislop/SKILL.md` on `main`; requires YAML `name` + `description`, compact body (`<= 2.5 KB`), and relative `./references/*.md` paths | Live as soon as `main` updates |
| **Gemini CLI Extension Gallery** | Add GitHub repo topic `gemini-cli-extension` (configured) | Requires valid root `gemini-extension.json` plus a tagged GitHub Release for Google's daily crawler | Auto-indexed within 24h of each `v*.*.*` tag |
| **Anthropic Official Plugin Directory** | Submit GitHub repo + remote `https://dislop.com/mcp` once at `claude.ai/directory/manage` | Legacy `.mcpb` archives are phased out in favor of GitHub plugin bundles (`.claude-plugin/plugin.json`) and remote MCP URLs; `claude plugin details` displays projected always-on token cost (`~130` tokens today), so keep `SKILL.md` lean | Synced from GitHub Releases |
| **OpenAI ChatGPT / Codex Plugin Directory** | Submit repo once to the universal directory | Root `plugin.json` enforces a strictly closed top-level schema (`agent-plugins.org/1.0.0`); `shortDescription` must be `<= 30` chars; `.gitignore` must allow `.agents/plugins/marketplace.json` | Clients pull updates via `codex plugin marketplace upgrade` |
| **`pre-commit` Hooks** | None; users reference the repo URL directly | Users pin `rev: vX.Y.Z` tags in `.pre-commit-config.yaml`; never delete or force-move published tags | Users run `pre-commit autoupdate` against new `v*.*.*` tags |

### Group 2: Automated via GitHub Actions OIDC on `v*.*.*` Tags

| Platform | One-Time Setup (Zero Long-Lived Secrets) | Hard Platform Rules & Gotchas | How Updates Ship |
|---|---|---|---|
| **npm (`dislop`)** | **Bootstrap order matters**: npm cannot add a Trusted Publisher before the package exists. Run **`npm login && npm publish --access=public` once from terminal for `v0.6.0`**, then bind GitHub Actions Trusted Publisher (`dislop-ai/dislop`, `release.yml`) on `npmjs.com`, and run `node scripts/sync_manifests.mjs --channel registry` once | Requires Node 22 with `npm >= 11.5.1` for OIDC; an empty `NODE_AUTH_TOKEN` env var breaks OIDC (`release.yml` strips placeholder `.npmrc` automatically); `publish-npm` skips cleanly with exit `0` when the exact version already exists on npm so `publish-mcp-registry` can proceed right after bootstrap; keep `"mcpName": "io.github.dislop-ai/dislop"` | `publish-npm` job publishes with OIDC provenance on every `v*.*.*` tag |
| **PyPI (`dislop`)** | Register a Pending Publisher at `pypi.org/manage/account/publishing/` (Owner `dislop-ai`, Repo `dislop`, Workflow `release.yml`, Environment `pypi`), create the `pypi` GitHub Environment, and set repo variable **`PYPI_OIDC_ENABLED=true`** (`gh variable set PYPI_OIDC_ENABLED --body true`) so the first release activates `publish-pypi` while PyPI still returns `404` (or trigger `gh workflow run release.yml -f publish_registries=true` right after completing npm + PyPI setup) | `README.md` must keep `<!-- mcp-name: io.github.dislop-ai/dislop -->` so the MCP Registry can verify PyPI ownership; wheel includes `packs/`, `patterns/`, and `models/`; `skip-existing: true` makes re-runs idempotent | `publish-pypi` job builds and publishes on every `v*.*.*` tag |
| **Official MCP Registry (+ Smithery & Glama)** | Claim Smithery and Glama listings once after first registry push | **Must run after npm and PyPI finish** (`needs: [publish-npm, publish-pypi]`); authenticates via `mcp-publisher login github-oidc`; `server.json` `description` must be **`<= 100` chars** and `version` must strictly increase | `publish-mcp-registry` job publishes local `stdio` and remote `streamable-http` entries automatically |
| **VS Code Marketplace & Open VSX (Track B)** | Create VS Marketplace publisher (`VSCE_PAT`) and Open VSX namespace (`OVSX_PAT`) | `vsce` rejects relative SVGs and non-HTTPS image links in extension READMEs and requires a `128x128` PNG icon | `publish-editor-extensions` job activates automatically once `integrations/vscode/package.json` lands |

### Group 3: `dislop.com` Static Site & Hosted Cloud Sync

- **Static site (`site/`)**: `npm run release` recompiles `site/` and locks SHA-256 hashes across all 76 catalog resources (`CSP: connect-src 'self'`, `llms.txt <= 2,600 B`, zero third-party requests).
- **Cloud engine parity**: When `src/core.mjs` or `packs/` changes, sync the deterministic engine into the private cloud service and pass its test suite before deploying (wired locally via Git-ignored `.private/deploy.local.sh` so hostnames and credentials never enter the public repository).

---

## 3. What `npm run release:check` Verifies

The script runs 11 checks in sequence and aborts immediately on any failure:

1. **Manifest lockstep** (`sync_manifests.mjs --check`): Locks versions and field caps across both runtimes, `package.json`, `pyproject.toml`, `SKILL.md`, and all 10 plugin/MCP manifests.
2. **Open-source secret & path scan**: Scans all tracked and unignored files for live tokens, workstation home paths, internal scheme URIs, private files (`.env`, `.private/`, `.dislop.local.json`), and missing `mcp-name` markers.
3. **Site & Awesome build** (`build_site.mjs`) + **Site & WCAG verification** (`test_site.mjs`, including `JSON.parse()` on every config snippet and strict EN/ZH separation).
4. **Dual-runtime rule fixtures & pattern catalog** (Node & Python `pack-test` across 160 assertions: 83 hit + 77 clean + `pattern_lab.mjs verify` and `assert`).
5. **Cross-runtime conformance tests** (27 Python `unittest` tests across 4 modules covering OOXML, pattern library, Pocket ML, local model advisor, and 7-tool compact MCP).
6. **Self-dogfooding** (`--fail-on warning` repo-wide and `--fail-on info` across `site/`, `docs/research/`, `skills/`, and `ROADMAP*`).
7. **Artifact smoke builds**: Packs the npm `.tgz` (target `< 250 KB`, enforced `<= 300 KB`), builds the Python `.whl` (`uv build`), and runs `claude plugin validate`.

---

## 4. Handling Partial Failures Without Rollback Mess

- **Transient registry timeout in CI**: Re-run failed jobs directly in GitHub Actions (or trigger `workflow_dispatch`), since each publish job is isolated.
- **Bug found right after tagging**: Because npm, PyPI, and the MCP Registry forbid overwriting a published version, never delete or move a published `v*.*.*` Git tag. Ship the fix as the next patch version (`npm run release -- 0.6.2 --commit --tag --push`).
