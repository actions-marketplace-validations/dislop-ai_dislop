# dislop Anti-Slop Benchmark Report (`dislop-bench v2`)

Generated offline by `node scripts/run_benchmark.mjs --write-report`. Zero external APIs or network calls were used.

## 1. Suite A — Detection Benchmark (112 Samples)

Measures precision, recall, false-positive rate (including adversarial clean near-misses and 48 subtle clean-lexicon text passages in `text-hard-v2.json`), 2nd-order AI slogan trap catch rate, and exact Node.js vs. Python parity across both findings and 5-axis statistical text profiles.

| Metric | Measured Result |
|---|---|
| Precision | **100.0%** (56 TP / 0 FP) |
| Recall | **100.0%** (56 TP / 0 FN) |
| F1 Score | **100.0%** |
| Clean False-Positive Rate (FPR) | **0.0%** (0 / 56) |
| Adversarial Near-Miss FPR | **0.0%** |
| 2nd-Order Trap Recall | **100.0%** |
| Expected Rule-ID Recall | **100.0%** |
| Node.js vs. Python Rule Parity | **100.0%** (verified live) |
| Node.js vs. Python Statistical Profile Parity | **100.0%** |

### Breakdown by Domain

| Domain | Samples | TP | FP | TN | FN | Precision | Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `zh-brief` | 35 | 18 | 0 | 17 | 0 | 100.0% | 100.0% | 0.0% |
| `zh-essay` | 14 | 7 | 0 | 7 | 0 | 100.0% | 100.0% | 0.0% |
| `en-brief` | 34 | 18 | 0 | 16 | 0 | 100.0% | 100.0% | 0.0% |
| `en-essay` | 12 | 5 | 0 | 7 | 0 | 100.0% | 100.0% | 0.0% |
| `web-ui` | 8 | 4 | 0 | 4 | 0 | 100.0% | 100.0% | 0.0% |
| `pptx-deck` | 6 | 3 | 0 | 3 | 0 | 100.0% | 100.0% | 0.0% |
| `html-ui` | 3 | 1 | 0 | 2 | 0 | 100.0% | 100.0% | 0.0% |

## 2. Suite B — End-to-End De-Slop Effectiveness (18 Tasks × 3 Arms)

Evaluates real writing and design outputs (12 v1 tasks + 6 hard clean-lexicon multi-paragraph tasks in `revision-hard-v2.json`) across 4 orthogonal dimensions:

- **D1 Deterministic Multi-Angle Clearance (45 pts)**: Zero `packs/core` AI artifacts and zero multi-angle `dislop` findings (co-occurrence clusters, punctuation micro-habits, narrative framing, skeleton echoes, and low-burstiness vapor).
- **D2 3rd-Order Structural Hygiene (20 pts)**: Zero pull-quote closers, glassmorphism walls, accent-stripe card templates, or structural echoes.
- **D3 Key-Number Retention & Prose Coherence (25 pts)**: Keeps concrete source numbers intact without dropping metrics, inventing figures, or deleting prose into number dumps.
- **D4 Pure Statistical Rhythm & Concreteness Telemetry (10 pts)**: Independent of D1 rule counts — verifies burstiness rhythm and concrete anchor density via `analyzeTextProfile()`.

| Arm | Composite | D1 Det | D2 3rd-Order | D3 Retention | D4 Telemetry | Det Findings | 3rd-Order Hits | Numeric Retention | All-Clear Tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `raw_ai` | **60.8 / 100** | 9.6 / 45 | 16.7 / 20 | 25 / 25 | 9.6 / 10 | 51 | 6 | 100% (0 invented) | 0 / 18 |
| `naive_humanizer` | **70.8 / 100** | 31 / 45 | 12.2 / 20 | 18.1 / 25 | 9.6 / 10 | 18 | 14 | 77.2% (5 invented) | 1 / 18 |
| `dislop_clean` | **100 / 100** | 45 / 45 | 20 / 20 | 25 / 25 | 10 / 10 | 0 | 0 | 100% (0 invented) | 18 / 18 |

## 3. How to Benchmark Your Own Model, Prompt, or Backend

1. Run your model, Skill, or hosted cloud endpoint (`No Skill` vs. `dislop Skill` vs. `dislop-cloud /api/v1/deslop`) on the 18 source inputs in [datasets/revision-v1.json](./datasets/revision-v1.json) and [datasets/revision-hard-v2.json](./datasets/revision-hard-v2.json).
2. Save outputs as `schema: "dislop.bench-run/1"` and score them locally:
   ```bash
   node scripts/run_benchmark.mjs --eval path/to/run.json
   ```
3. Export a randomized blind human A/B review sheet for any two arms:
   ```bash
   node scripts/run_benchmark.mjs --export-blind-sheet naive_humanizer dislop_clean
   ```
