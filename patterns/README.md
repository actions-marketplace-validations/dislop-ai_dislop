# AI-Slop Pattern Library (`patterns/`)

`patterns/` stores `dislop`'s versioned catalog of observable AI-writing, cadence, discourse, Web UI, and slide deck patterns as plain JSON assets.

## Directory Layout

- `patterns/taxonomy.json`: canonical 6 dimensions (`artifacts`, `lexical`, `syntactic`, `rhythm`, `discourse`, `visual-and-deck`), 7 detection angles, and 3 evidence levels.
- `patterns/dimensions/*.json`: 53 cataloged patterns linking all 42 active rules in `packs/*/pack.json` plus 11 extended pattern-bank rules in `patterns/banks/*.json`. Every entry records its mechanism, tags, false-positive guards, model tendencies, and a `bad -> trap -> good` example.
- `patterns/banks/*.json`: declarative signal lists and calibrated thresholds executed directly by `src/pattern-engine.mjs` (Node/Browser) and `src/dislop/pattern_engine.py` (Python) with 100% parity:
  - `discourse-rhythm.json`: repetitive sentence openers, inline bold saturation, paragraph-length uniformity, and mechanical discourse signposts.
  - `lexical-signals.json`: weighted translation-calque clusters and empirically over-represented phrase clusters.
  - `syntactic-frames.json`: balanced concession frames and pull-quote closers (with quotation guard).
  - `visual-deck.json`: Web UI glassmorphism overuse and thick left accent-stripe card stacks (`>= 4px`).
  - `composite-fusion.json`: cross-dimension stealth-slop co-occurrence rules damped by concrete fact density (numbers with units, timestamps, code spans, filenames).

## Common Commands

```bash
# Search the catalog across packs/ and patterns/
node bin/dislop.mjs catalog --dimension rhythm --lang en
PYTHONPATH=src python3 -m dislop.cli catalog --query "slogan" --json

# Run the multi-angle Pattern Library scanner on a file or stdin
node bin/dislop.mjs patterns README.md --lang en
node bin/dislop.mjs check README.md --patterns --lang en
printf "Furthermore, this initiative plays a pivotal role in delivering transformative value across teams." | node bin/dislop.mjs patterns - --stdin-filename draft.md --json

# Validate asset schemas, run multi-angle ablation, and enforce benchmark gates
node scripts/pattern_lab.mjs verify
node scripts/pattern_lab.mjs ablation
node scripts/pattern_lab.mjs assert
```

## Adding a New Pattern

1. Add the pattern entry to the matching file under `patterns/dimensions/` with bilingual `name`, `mechanism`, `tags`, `falsePositiveGuards`, and an original `exemplar`.
2. Add any new lexical signals, regex frames, or thresholds to `patterns/banks/*.json` so both JS and Python engines pick them up automatically.
3. Add at least one positive sample and one adversarial clean near-miss sample to `benchmarks/datasets/pattern-challenge-v2.json` or `benchmarks/datasets/holdout-v2.json`.
4. Run `node scripts/pattern_lab.mjs verify`, `node scripts/pattern_lab.mjs assert`, and `PYTHONPATH=src python3 -m unittest tests/test_pattern_library.py`.
