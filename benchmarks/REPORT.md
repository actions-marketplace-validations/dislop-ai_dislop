# dislop Anti-Slop Benchmark Report (`dislop-bench v1`)

Generated offline by `node scripts/run_benchmark.mjs --write-report`. Zero external APIs or network calls were used.

## 1. Suite A — Detection Benchmark (64 Samples)

Measures precision, recall, false-positive rate (including adversarial clean near-misses), 2nd-order AI slogan trap catch rate, and Node.js vs. Python exact parity across 6 writing and design domains.

| Metric | Measured Result |
|---|---|
| Precision | **100.0%** (32 TP / 0 FP) |
| Recall | **100.0%** (32 TP / 0 FN) |
| F1 Score | **100.0%** |
| Clean False-Positive Rate (FPR) | **0.0%** (0 / 32) |
| Adversarial Near-Miss FPR | **0.0%** |
| 2nd-Order Trap Recall | **100.0%** |
| Expected Rule-ID Recall | **100.0%** |
| Node.js vs. Python Parity | **100.0%** (verified live) |

### Breakdown by Domain

| Domain | Samples | TP | FP | TN | FN | Precision | Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `zh-brief` | 16 | 8 | 0 | 8 | 0 | 100.0% | 100.0% | 0.0% |
| `zh-essay` | 9 | 5 | 0 | 4 | 0 | 100.0% | 100.0% | 0.0% |
| `en-brief` | 15 | 8 | 0 | 7 | 0 | 100.0% | 100.0% | 0.0% |
| `en-essay` | 7 | 3 | 0 | 4 | 0 | 100.0% | 100.0% | 0.0% |
| `web-ui` | 8 | 4 | 0 | 4 | 0 | 100.0% | 100.0% | 0.0% |
| `pptx-deck` | 6 | 3 | 0 | 3 | 0 | 100.0% | 100.0% | 0.0% |
| `html-ui` | 3 | 1 | 0 | 2 | 0 | 100.0% | 100.0% | 0.0% |

## 2. Suite B — End-to-End De-Slop Effectiveness (12 Tasks × 3 Arms)

Evaluates real writing and design outputs across 3 orthogonal dimensions:

- **D1 Deterministic Clearance (45 pts)**: Zero `packs/core` AI artifacts and zero 1st-/2nd-order `dislop` findings.
- **D2 3rd-Order Structural Hygiene (30 pts)**: Zero 3-part balanced semicolon pitches, pull-quote closers, 5-comma chains, transition clusters, glassmorphism walls, or accent-stripe card templates.
- **D3 Key-Number Retention & Zero Hallucination (25 pts)**: Keeps concrete source numbers intact without dropping metrics or inventing unverified figures.

| Arm | Composite | D1 Det | D2 3rd-Order | D3 Retention | Det Findings | 3rd-Order Hits | Numeric Retention | All-Clear Tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `raw_ai` | **61.4 / 100** | 11.4 / 45 | 25 / 30 | 25 / 25 | 29 | 4 | 100% (0 invented) | 0 / 12 |
| `naive_humanizer` | **72.1 / 100** | 33.8 / 45 | 20 / 30 | 18.3 / 25 | 9 | 8 | 75.8% (3 invented) | 1 / 12 |
| `dislop_clean` | **100 / 100** | 45 / 45 | 30 / 30 | 25 / 25 | 0 | 0 | 100% (0 invented) | 12 / 12 |

## 3. How to Benchmark Your Own Model, Prompt, or Backend

1. Run your model, Skill, or hosted cloud endpoint (`No Skill` vs. `dislop Skill` vs. `dislop-cloud /api/v1/deslop`) on the 12 source inputs in [datasets/revision-v1.json](./datasets/revision-v1.json).
2. Save outputs as `schema: "dislop.bench-run/1"` and score them locally:
   ```bash
   node scripts/run_benchmark.mjs --eval path/to/run.json
   ```
3. Export a randomized blind human A/B review sheet for any two arms:
   ```bash
   node scripts/run_benchmark.mjs --export-blind-sheet naive_humanizer dislop_clean
   ```
