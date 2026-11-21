---
content-type: reference-data
version: 0.2.0
---

# Deletion Test & Fact-Preserving Rewrites

## Why Flat Banned-Word Lists Fail

1. **False positives on real domain nouns**: Flat word lists flag `Delve` (Go debugger), `wool tapestry`, or literal numeric corrections (`重试窗口不是 5 秒，而是 60 秒`).
2. **Second-order displacement**: When models lose stock adjectives, they pivot to structural templates such as binary contrast slogans (`"It's not just X — it's Y"`) or three-word staccato chains (`"Signals drop. Photos vanish. Trust dies."`).
3. **Silent fact drift**: Blind "humanizer" rewrites frequently drop qualifiers (`up to 12 minutes` -> `12 minutes`), alter units, or break links.

## Three-Stage Loop

1. **Stage 1 — Deterministic Audit (`check`)**:
   - Resolve every `packs/core` `error` first (leaked paths, unfilled placeholders, chat residue, Office revisions, dead controls, contrast, off-slide shapes).
   - Treat Taste Pack `warning` / `info` findings as localized editorial queries.
2. **Stage 2 — Deletion Test**:
   - Apply each rule's Deletion Test question to the flagged span only.
   - Ask what concrete mechanism, measurement, or boundary remains if the filler phrase is deleted.
   - Keep code blocks, inline code, URLs, and quoted primary sources intact.
3. **Stage 3 — Revision Verification (`verify`)**:
   - Compare before and after multisets for numbers (including qualifiers and units), dates, URLs, code spans, code blocks, and citation markers.
   - Reject edits that introduce core errors, drop protected facts, or shift hits into second-order slogan families (`frame/negation-pivot`, `frame/staccato`, `frame/triad`, `frame/ending`, `frame/list-wall`).
