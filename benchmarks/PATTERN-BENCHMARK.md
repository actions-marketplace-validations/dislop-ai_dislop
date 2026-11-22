# AI-Slop Pattern Library Benchmark Report (`dislop-bench v2`)

Generated offline by `node scripts/pattern_lab.mjs write-report`. Zero network calls or external model APIs were used.

## 1. Asset Coverage Summary

- **Total Cataloged Patterns**: **53** patterns across **6** dimensions and **7** detection angles (`patterns/taxonomy.json`, `patterns/dimensions/*.json`, `patterns/banks/*.json`)
- **Executable Pack Rules**: **42** rules in `packs/*/pack.json`
- **Data-Driven Pattern-Bank Rules**: **11** declarative rules in `patterns/banks/*.json` (`src/pattern-engine.mjs` + `src/dislop/pattern_engine.py`)
- **Cross-Runtime Parity (Node.js vs. Python)**: **100%** across all **154** samples (337.3 ms)

## 2. Five-Round Closed-Loop Progression

| Round | Milestone | Samples | Precision | Recall | Overall F1 | Challenge v2 Recall | Holdout v2 F1 | Clean FPR | Node/Py Parity |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Round 1 | Round 1: Pattern Library Asset & Baseline | 112 | 97.5% | 69.6% | **81.3%** | 29.2% | - | 1.8% | 100% |
| Round 2 | Round 2: Rhythm & Discourse Pattern Bank | 114 | 97.9% | 82.5% | **89.5%** | 60% | - | 1.8% | 100% |
| Round 3 | Round 3: Lexical Calque Cluster & Syntactic Frames | 120 | 98.2% | 91.8% | **94.9%** | 82.8% | - | 1.7% | 100% |
| Round 4 | Round 4: UI/PPTX Structural Bank & Multi-Signal Composite Fusion | 126 | 98.5% | 100% | **99.2%** | 100% | - | 1.6% | 100% |
| Round 5 | Round 5: Adversarial Holdout v2 & Red-Team Calibration | 154 | 98.8% | 100% | **99.4%** | 100% | 100% | 1.3% | 100% |

## 3. Dataset Breakdown (154 Samples)

| Dataset | Samples | TP | FP | TN | FN | Precision | Recall | F1 | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `detection-v1` | 48 | 24 | 0 | 24 | 0 | 100% | 100% | **100%** | 0% |
| `holdout-v1` | 16 | 8 | 0 | 8 | 0 | 100% | 100% | **100%** | 0% |
| `pattern-challenge-v2` | 62 | 33 | 0 | 29 | 0 | 100% | 100% | **100%** | 0% |
| `holdout-v2` | 28 | 14 | 0 | 14 | 0 | 100% | 100% | **100%** | 0% |

## 4. Pattern Dimension Breakdown

| Dimension | Samples | TP | FP | TN | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `artifacts` | 8 | 8 | 0 | 0 | 0 | 100% | 100% | **100%** |
| `lexical` | 14 | 8 | 0 | 6 | 0 | 100% | 100% | **100%** |
| `syntactic` | 27 | 18 | 0 | 9 | 0 | 100% | 100% | **100%** |
| `discourse` | 21 | 16 | 0 | 5 | 0 | 100% | 100% | **100%** |
| `rhythm` | 32 | 16 | 0 | 16 | 0 | 100% | 100% | **100%** |
| `visual-and-deck` | 20 | 13 | 0 | 7 | 0 | 100% | 100% | **100%** |

## 5. Multi-Angle Incremental Ablation (154 Samples)

| Detection Configuration | Precision | Recall | Overall F1 | Challenge v2 Recall | Holdout v2 Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|
| Packs Only (42 core/pack rules) | 100% | 51.9% | **68.3%** | 24.2% | 7.1% | 0% |
| + Rhythm & Discourse Bank | 100% | 69.6% | **82.1%** | 51.5% | 42.9% | 0% |
| + Lexical Calque & Syntactic Frames Bank | 100% | 86.1% | **92.5%** | 78.8% | 71.4% | 0% |
| + Visual/UI & PPTX Structural Bank | 100% | 94.9% | **97.4%** | 93.9% | 85.7% | 0% |
| + Composite Multi-Signal Fusion (Full 7 Angles) | 100% | 100% | **100%** | 100% | 100% | 0% |

## 6. Reproduce Locally

```bash
node scripts/pattern_lab.mjs verify
node scripts/pattern_lab.mjs ablation
node scripts/pattern_lab.mjs assert
node scripts/pattern_lab.mjs dogfood
```
