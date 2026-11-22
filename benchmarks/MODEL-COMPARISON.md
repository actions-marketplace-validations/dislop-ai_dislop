# Live Model Comparison (`dislop-bench v1` & `v2`)

This report archives two live cloud model evaluations:

- **§1–2 (`revision-v1` 10-task live subset)**: Measured on `2026-11-21` across the **10** text and HTML writing/design tasks in [datasets/revision-v1.json](./datasets/revision-v1.json) (4 Chinese writing, 4 English writing, 2 HTML UI; excludes the 2 binary `.pptx` tasks), scored with the `v1` 3-axis weights (`D1=45 / D2=30 / D3=25`).
- **§3 (`revision-hard-v2` 6-task suite)**: Measured on `2026-11-22` across all **6** multi-paragraph clean-lexicon text tasks in [datasets/revision-hard-v2.json](./datasets/revision-hard-v2.json) (3 ZH + 3 EN). Canonical `dislop-bench v2` weights in `scripts/run_benchmark.mjs` and `benchmarks/REPORT.md` are **`D1=45 / D2=20 / D3=25 / D4=10`** (the archived raw table below was captured under the earlier `40 / 20 / 25 / 15` draft weights; both `v2_integrated` runs score `100.0 / 100` with `6/6` all-clear under either weighting).

Each model was evaluated under two identical setups:

- `bare_prompt`: One-shot generic prompt ("remove AI slop while keeping original meaning").
- `dislop_pipeline`: Production `dislop-cloud` self-healing pipeline (deterministic pre-check + 3rd-order probes + locked-number prompt + post-check gate + up to 1 automatic surgical repair pass).

## 1. Bare Prompt vs. `dislop` Self-Healing Pipeline (`revision-v1`, 10-Task Live Subset)

| Model | Bare Prompt Score | `dislop` Pipeline Score | Score Lift | Auto-Repairs |
|---|---:|---:|---:|---:|
| Gemini 3.1 Flash-Lite | 82.7 (4/10 all-clear) | **98.5** (9/10 all-clear) | **+15.8** | 1 auto-repaired |
| Gemini 3.5 Flash-Lite | 76 (2/10 all-clear) | **97** (8/10 all-clear) | **+21.0** | 2 auto-repaired |
| Gemini 3.5 Flash | 82.7 (3/10 all-clear) | **100** (10/10 all-clear) | **+17.3** | 0 auto-repaired |
| Gemini 3.8 Flash | 84.2 (4/10 all-clear) | **100** (10/10 all-clear) | **+15.8** | 0 auto-repaired |
| Qwen 3.8 Flash | 77.7 (2/10 all-clear) | **100** (10/10 all-clear) | **+22.3** | 0 auto-repaired |

## 2. Full Leaderboard (10-Task `revision-v1` Subset: Quality, Latency & Cost per 1,000 Calls)

| Model | Mode | Composite | D1 Det | D2 3rd-Order | D3 Retention | All-Clear | Repairs | Median Latency | Est. $ / 1k Calls |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | `bare_prompt` | **82.7 / 100** | 31.7/45 | 28.5/30 | 22.5/25 | 4/10 | 0 | 1156 ms | ~$0.03 |
| Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | `dislop_pipeline` | **98.5 / 100** | 45/45 | 28.5/30 | 25/25 | 9/10 | 1 | 1222 ms | ~$0.09 |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | `bare_prompt` | **76 / 100** | 27/45 | 24/30 | 25/25 | 2/10 | 0 | 800 ms | ~$0.03 |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | `dislop_pipeline` | **97 / 100** | 45/45 | 27/30 | 25/25 | 8/10 | 2 | 1052 ms | ~$0.10 |
| Gemini 3.5 Flash (`gemini-3.5-flash`) | `bare_prompt` | **82.7 / 100** | 33.2/45 | 27/30 | 22.5/25 | 3/10 | 0 | 8468 ms | ~$0.15 |
| Gemini 3.5 Flash (`gemini-3.5-flash`) | `dislop_pipeline` | **100 / 100** | 45/45 | 30/30 | 25/25 | 10/10 | 0 | 6169 ms | ~$0.35 |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | `bare_prompt` | **84.2 / 100** | 33.2/45 | 28.5/30 | 22.5/25 | 4/10 | 0 | 15323 ms | ~$0.15 |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | `dislop_pipeline` | **100 / 100** | 45/45 | 30/30 | 25/25 | 10/10 | 0 | 7699 ms | ~$0.36 |
| Qwen 3.8 Flash (`qwen3.8-flash`) | `bare_prompt` | **77.7 / 100** | 27.2/45 | 25.5/30 | 25/25 | 2/10 | 0 | 12303 ms | ~$0.38 |
| Qwen 3.8 Flash (`qwen3.8-flash`) | `dislop_pipeline` | **100 / 100** | 45/45 | 30/30 | 25/25 | 10/10 | 0 | 9035 ms | ~$0.33 |

## 3. Hard Clean-Lexicon Text Benchmark (`revision-hard-v2.json`, 6 Multi-Paragraph Tasks)

Measured on `2026-11-22` across all **6** harder clean-lexicon text tasks in [datasets/revision-hard-v2.json](./datasets/revision-hard-v2.json) (3 ZH + 3 EN multi-paragraph product launches, infra memos, and essays). These drafts avoid obvious v1 banned words while still showing keyword co-occurrence clusters, rhetorical Q&A hooks, semicolon tricolons, macro narrative sandwiches, and syntactic skeleton repetition. Production `dislop-bench v2` uses weights **`D1=45 / D2=20 / D3=25 / D4=10`** (`benchmarks/REPORT.md`); raw component columns below preserve the exact `2026-11-22` run log (`40/20/25/15` draft scale), where both `v2_integrated` rows hit `100.0 / 100` (`6/6` all-clear) under either weighting:

| Model | Mode | Composite | D1 Det | D2 3rd-Order | D3 Retention | D4 Telemetry | All-Clear | Score Lift |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | `bare_prompt` | **84.0 / 100** | 30.0/40 | 18.3/20 | 25.0/25 | 10.7/15 | 2/6 | — |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | **`v2_integrated`** | **100.0 / 100** | **40.0/40** | **20.0/20** | **25.0/25** | **15.0/15** | **6/6** | **+16.0** |
| Gemini 3.5 Flash (`gemini-3.5-flash`) | `bare_prompt` | **93.8 / 100** | 38.0/40 | 18.3/20 | 23.7/25 | 13.8/15 | 4/6 | — |
| Gemini 3.5 Flash (`gemini-3.5-flash`) | **`v2_integrated`** | **100.0 / 100** | **40.0/40** | **20.0/20** | **25.0/25** | **15.0/15** | **6/6** | **+6.2** |

## 4. Practical Model Routing Takeaways

1. **Why the pipeline matters more than swapping models**: A bare prompt on a strong model still slips on 2nd-order slogans, 3rd-order semicolon pitches, dead `href="#"` links, or dropped numbers. Adding `dislop`'s deterministic pre-check, locked-number list, and automatic repair loop raises both score and all-clear rate across every model family.
2. **Recommended production split for `dislop-cloud`**:
   - Route `dislop_review` (high-frequency 3rd-order critique) to the lowest-latency Flash-Lite tier (`DISLOP_LLM_MODEL_REVIEW`).
   - Route `dislop_deslop` (rewrite + repair) to the highest-scoring Flash tier with the best all-clear / cost ratio (`DISLOP_LLM_MODEL_DESLOP`).
3. **Reproduce locally**:
   ```bash
   # Inject your own provider keys via env vars, then run:
   node scripts/run_live_model_bench.mjs
   ```
