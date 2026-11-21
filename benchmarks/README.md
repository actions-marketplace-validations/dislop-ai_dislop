# dislop Anti-Slop Benchmark (`dislop-bench v1`)

[简体中文](./README.zh-CN.md) · [Offline Baseline Report](./REPORT.md) · [Live 5-Model Comparison](./MODEL-COMPARISON.md)

This benchmark measures two concrete things offline, without subjective hand-waving:

1. **Detection quality (Suite A, 48 samples)**: Precision, recall, clean false-positive rate (including adversarial near-misses), 2nd-order slogan trap recall, and exact Node.js vs. Python parity across 6 writing and design domains.
2. **End-to-end de-slop effectiveness (Suite B, 12 tasks × 3 arms)**: Compares raw AI output, a naive humanizer rewrite, and a `dislop`-guided clean revision across deterministic slop clearance (45 pts), 3rd-order structural hygiene (30 pts), and key-number retention with zero hallucination (25 pts).

All samples are original and released under `CC0-1.0`. Everything runs locally in under a second with zero external dependencies or API keys.

## Run locally

```bash
# Run Suite A (48 detection samples, Node + Python parity) and Suite B (12 tasks)
node scripts/run_benchmark.mjs

# Enforce regression gates (exits 1 if precision, recall, FPR, parity, or composite drops)
node scripts/run_benchmark.mjs --assert

# Regenerate benchmarks/REPORT.md and benchmarks/results/latest.json
node scripts/run_benchmark.mjs --write-report
```

## Benchmark your own model, Skill, or backend

Run any model, Skill, or hosted endpoint (for example `No Skill` vs. `dislop Skill` vs. `dislop-cloud /api/v1/deslop`) on the 12 source items in [datasets/revision-v1.json](./datasets/revision-v1.json) and save a `dislop.bench-run/1` JSON file:

```json
{
  "schema": "dislop.bench-run/1",
  "label": "model-ab-test",
  "arms": {
    "baseline_no_skill": {
      "rev-en-01-release-note": "..."
    },
    "with_dislop_skill": {
      "rev-en-01-release-note": "..."
    }
  }
}
```

Then score it and optionally export a randomized blind human A/B review sheet:

```bash
node scripts/run_benchmark.mjs --eval path/to/run.json
node scripts/run_benchmark.mjs --export-blind-sheet baseline_no_skill with_dislop_skill --input path/to/run.json
```

## Layout

- `datasets/detection-v1.json`: 48 cross-modality detection samples across ZH/EN briefs, essays, HTML/CSS UI, and PPTX slide decks.
- `datasets/revision-v1.json`: 12 end-to-end writing and design tasks comparing `raw_ai`, `naive_humanizer`, and `dislop_clean`.
- `REPORT.md`: Reproducible Markdown report generated directly by `scripts/run_benchmark.mjs`.
- `results/latest.json`: Machine-readable JSON output for automated tracking.
