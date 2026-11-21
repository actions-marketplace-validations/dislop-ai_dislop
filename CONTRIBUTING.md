# Contributing to `dislop`

Thank you for helping keep `dislop` accurate, low-noise, and zero-dependency. Before picking up a larger change, check [ROADMAP.md](./ROADMAP.md) ([中文](./ROADMAP.zh-CN.md)) for active tracks and open design questions, and read [docs/brand-and-voice-guide.md](./docs/brand-and-voice-guide.md) before editing visitor-facing copy.

## 1. Rule Design Checklist

Every new or updated rule in `packs/<pack-id>/pack.json` must include:

1. **Clear Tier Placement**:
   - Put objective publication bugs (leaked local paths, unfilled placeholders, broken contrast, off-slide boxes, unaccepted tracked changes) in `packs/core/pack.json` (`tier: "invariant"`, `severity: "error"`).
   - Put genre-specific prose or layout taste signals in a genre pack (`tier: "taste"`, `severity: "warning"` or `"info"`).
2. **Portable, Bounded Patterns**:
   - Regex patterns must run identically in JavaScript (`new RegExp(pat, "gimu")`) and Python (`re.compile(pat, re.I | re.M)`).
   - Never use unbounded `.*` across sentences; bound gaps explicitly (e.g., `[^，。！？\n]{1,24}`).
3. **Bilingual Deletion Test & Fact-Preserving Exemplar**:
   - Provide `deletionTest.en` and `deletionTest.zh`.
   - Provide `exemplar.bad`, `exemplar.trap` (the second-order cliché to avoid), `exemplar.good`, and `exemplar.source`.
   - `exemplar.good` must preserve every number, qualifier, and concrete entity from `exemplar.bad` without inventing new facts.
4. **Automated Positive & Negative Fixtures**:
   - Add at least one triggering string in `fixtures.hit` and at least one realistic near-miss in `fixtures.clean`.

## 2. Privacy & Sample Licensing

- Never include real workstation usernames, internal hostnames, private repository references, or proprietary customer material in code, fixtures, or commit messages.
- All fixtures and exemplars must be original constructions or explicitly licensed open/public-domain text.

## 3. Local Verification Before Opening a PR

Run all checks from the repository root:

```bash
# 1. Sync browser workbench, Awesome READMEs, and /llms.txt endpoints
node scripts/build_site.mjs

# 2. Validate Pack Schema v2 and all 101+ rule fixtures in both runtimes
node bin/dislop.mjs pack-test
PYTHONPATH=src python3 -m dislop.cli pack-test

# 3. Run site tests, unit tests, and cross-runtime conformance tests
node tests/test_site.mjs
PYTHONPATH=src python3 -m unittest discover -s tests -v

# 4. Self-dogfood docs, SVG assets, awesome/, and site/ at warning threshold
node bin/dislop.mjs check . --fail-on warning
PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning
```
