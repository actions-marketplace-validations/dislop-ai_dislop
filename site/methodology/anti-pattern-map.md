---
content-type: reference-data
version: 0.2.0
---

# Cross-Modality Anti-Pattern Map

| Layer | Definition | Shipped `v0.2.0` Deterministic Coverage | Roadmap Extensions (`v0.3+` Spec) |
|---|---|---|---|
| **L0 Objective Delivery Defects** | Hard publication bugs (`severity: error`) | Leaked local paths, unfilled placeholders, AI chat residue, raw Markdown in DOCX/PPTX, unaccepted Office revisions/comments, dead `href="#"`, WCAG AA contrast (`< 4.5:1`), dark Z-elevation inversion, off-slide PPTX, PDF font/title/URI checks | Expanded PDF metadata checks and baseline suppression ledgers |
| **L1 First-Order Lexicon & Default UI** | Stock filler words and default generator chrome | `en-cliche-lexicon`, `zh-bureaucratic-padding`, `ui-ai-gradient`, `ui-pill-soup`, `ui-box-in-box`, `ui-prompt-echo-badge`, `svg-text-overflow-or-a11y` | `ui-glassmorphism-overuse`, `ui-accent-stripe-card` |
| **L2 Second-Order Cadence & Layout** | Structural fallback after banning stock words | `negation-pivot-frame`, `staccato-slogan-run`, `zh-four-char-triad`, `zh/en-essay-moralizing-ending`, `bold-lead-list-wall`, `excessive-em-dash-density`, `zh-halfwidth-punctuation`, slide word-walls/bullets/autofit | 5 prototype-verified probes (`comma-chain-cadence`, `sentence-length-monotony`, `discourse-marker-cluster`, `ui-glassmorphism-overuse`, `ui-accent-stripe-card`) + `pptx-layout-monotony` in v0.3 spec |
| **L3 Deep Context & Visual Composition** | Subtle semantic padding or page-level visual balance | Requires primary facts and human judgment | Optional decoupled local small-model plugins (P2: `mmBERT` / `Qwen3` / lightweight VLM), always `info` advisory only |

## Coverage Honesty Principle

Uninspectable artifacts (encrypted PDFs, corrupted archives, non-UTF-8 files) are reported explicitly as `[SKIP]` and exit `2` on single-file checks. `dislop` never reports an uninspected artifact as clean.
