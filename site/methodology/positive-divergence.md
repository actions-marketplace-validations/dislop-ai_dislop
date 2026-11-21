---
content-type: reference-data
version: 0.4.0
status: draft-protocol
---

# Positive Divergence & Personalization (Draft Spec)

Empirical studies (Padmakumar & He, ICLR 2024; Doshi & Hauser, Science Advances 2024; Jiang et al., NeurIPS 2025 *Artificial Hivemind*) show post-trained LLMs exhibit both intra-model repetition and inter-model homogeneity. Swapping models or banning stock words alone pushes outputs toward safe statistical means or second-order templates.

## Three-Band Entropy Partition

1. **Band 1 — Zero-Entropy Invariants**: Clear hard AI delivery artifacts first (`dislop core`).
2. **Band 2 — Bounded Divergence Band**: Vary mid-layer structure using Verbalized Sampling (Zhang et al., 2025) and orthogonal prose skeletons:
   - `S1 Decision Ledger`: 1-sentence conclusion -> measured sample & metrics -> explicit limitation -> concrete next action.
   - `S2 Mechanism Teardown`: observed anomaly -> flawed intuition -> underlying mechanism -> bounded fix.
   - `S3 Field Note`: time/place/physical detail -> direct quote or observation -> stop on final concrete image.
   - `S4 Technical Spec`: capability matrix -> explicit non-goals -> failure modes/exit codes -> minimal example.
3. **Band 3 — Deterministic Pruning**: Filter out core errors, dropped facts, second-order slogan displacement, and cross-document template repetition.

## Draft Schemas (Zero-LLM Core)

- **`dislop.voice/1` (Local Voice Profile)**: Offline stylometric target bands computed from an author's own historical drafts (e.g., EN sentence-length CV `[0.38, 0.72]`, ZH sentence-length CV `[0.35, 0.68]`, max em-dashes, private bans in `.dislop.local/voice.json`).
- **`dislop.taste/1` (Positive Design Card)**: Abstract grid ratios, typography role stacks, color budgets (e.g., `maxBorderRadiusPx: 4`, `externalFontCdnAllowed: false`), and static assertions derived from print, Swiss editorial, and independent foundry traditions without copying third-party DOM or CSS.
