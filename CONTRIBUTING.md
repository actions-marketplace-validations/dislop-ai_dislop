# Contributing to `dislop`

Thank you for helping keep `dislop` accurate, low-noise, and zero-dependency. Before picking up a larger change, check [ROADMAP.md](./ROADMAP.md) ([Chinese](./ROADMAP.zh-CN.md)) for active tracks and open design questions, and read [docs/brand-and-voice-guide.md](./docs/brand-and-voice-guide.md) before editing visitor-facing copy.

## 1. Rule Design Checklist

Every new or updated rule in `packs/<pack-id>/pack.json` must include:

1. **Clear Tier Placement**:
   - Put clear AI delivery artifacts (stray chatbot greetings, unfilled placeholders, unrendered Markdown in Office files, dead `#` links, and unexplained disabled buttons) in `packs/core/pack.json` (`tier: "invariant"`, `severity: "error"`).
   - Put scenario-specific prose, layout, or slide signals in a scenario pack (`tier: "taste"`, `severity: "warning"` or `"info"`).
2. **Portable, Bounded Patterns**:
   - Regex patterns must run identically in JavaScript (`new RegExp(pat, "gimu")`) and Python (`re.compile(pat, re.I | re.M)`).
   - Never use unbounded `.*` across sentences; bound gaps explicitly (e.g., `[^.!?\n]{1,40}`).
3. **Bilingual Check Question & Fact-Preserving Exemplar**:
   - Provide `deletionTest.en` and `deletionTest.zh`.
   - Provide `exemplar.bad`, `exemplar.trap` (the second-order cliché to avoid), `exemplar.good`, and `exemplar.source`.
   - `exemplar.good` must preserve every number, qualifier, and concrete entity from `exemplar.bad` without inventing new facts.
4. **Automated Positive & Negative Fixtures**:
   - Add at least one triggering string in `fixtures.hit` and at least one realistic near-miss in `fixtures.clean`.

## 2. Privacy & Sample Licensing

- Never include real workstation usernames, internal hostnames, private repository references, or proprietary customer material in code, fixtures, or commit messages.
- All fixtures and exemplars must be original constructions or explicitly licensed open/public-domain text.

## 3. GitHub Workflow & Collaboration

- **Issues vs. Discussions**: Open a [GitHub Discussion](https://github.com/dislop-ai/dislop/discussions) for open design questions or new rule debates. Open an [Issue](https://github.com/dislop-ai/dislop/issues) using the matching form when claiming a roadmap task, reporting a false positive, or submitting an Awesome Anti-Slop entry.
- **Labels**: Issues use `track:*` (roadmap tracks A–D), `area:*` (`rules`, `voice-copy`, `site`, `mcp-cli`), and `priority: high` / `priority: medium` so tasks filter cleanly on the project board.
- **Branches & Pull Requests**: Use short branch names such as `feat/<topic>`, `fix/<topic>`, or `docs/<topic>`, reference the tracked issue with `Closes #<number>` in the PR body, and rely on `.github/CODEOWNERS` for maintainer review routing. Merged PR branches are deleted automatically, and `main` blocks force-pushes and branch deletion.

## 4. Local Verification & Releases

Run the full preflight check from the repository root before opening a PR (takes ~15s):

```bash
npm run release:check
```

Under the hood, `release:check` runs manifest lockstep checks (`scripts/sync_manifests.mjs --check`), open-source secret/path hygiene scans, `scripts/build_site.mjs`, and `tests/test_site.mjs`. It also runs Node and Python `pack-test`, all 26 Python `unittest` conformance suites, repo self-dogfooding (`dislop check . --fail-on warning`), and archive build smoke checks. For maintainer version bumps and multi-platform publishing rules, see [docs/releasing.md](./docs/releasing.md) ([Chinese](./docs/releasing.zh-CN.md)).
