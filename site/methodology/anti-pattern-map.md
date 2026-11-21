---
content-type: reference-data
version: 0.4.0
---

# Cross-Modality Anti-Pattern Map

| Layer | Definition | Shipped `v0.4.0` Deterministic Coverage | Roadmap Extensions (`v0.3+` Spec) |
|---|---|---|---|
| **L0 AI Delivery Artifacts** | Obvious AI leftovers (`severity: error`) | Stray chatbot wrappers, unfilled placeholders, raw Markdown in DOCX/PPTX, dead `href="#"` placeholder controls | Baseline suppression ledgers |
| **L1 First-Order Lexicon & Default UI** | Stock filler words and default generator chrome | `en-cliche-lexicon`, `en-throat-clearing-opener`, `zh-bureaucratic-padding`, `ui-ai-gradient`, `ui-pill-soup`, `ui-box-in-box`, `ui-prompt-echo-badge` | `ui-glassmorphism-overuse`, `ui-accent-stripe-card` |
| **L2 Second-Order Cadence & Layout** | Structural fallback after banning stock words | `negation-pivot-frame`, `staccato-slogan-run`, `zh-four-char-triad`, `zh/en-essay-moralizing-ending`, `bold-lead-list-wall`, `excessive-em-dash-density`, `zh-halfwidth-punctuation`, slide word-walls/bullets/autofit/weak-titles | 5 prototype-verified probes (`comma-chain-cadence`, `sentence-length-monotony`, `discourse-marker-cluster`, `ui-glassmorphism-overuse`, `ui-accent-stripe-card`) + `pptx-layout-monotony` in v0.3 spec |
| **L3 Structural Voice & Visual Craft** | 3-part semicolon pitches, roleplay tone, page-level craft | Handled by `SKILL.md` plain writing & UI rules + 31 positive design references | Local `dislop.voice/1` stylometrics & optional local small-model plugins (advisory `info` only) |

## Coverage Honesty Principle

Uninspectable artifacts (corrupted archives, non-UTF-8 files) are reported explicitly as `[SKIP]` and exit `2` on single-file checks. `dislop` never reports an uninspected artifact as clean.
