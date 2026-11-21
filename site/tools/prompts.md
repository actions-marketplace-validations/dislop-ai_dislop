---
content-type: reference-data
version: 0.2.0
---

# Zero-Install Audit Checklists (When Local CLI/MCP Is Unavailable)

## Prose & Technical Brief Checklist

```text
1. Remove leaked workstation paths, unfilled placeholders, and chatbot wrappers.
2. Cut throat-clearing openers, stock promotional adjectives, and moralizing endings.
3. Preserve every number, qualifier (up to / at least / 最多 / 至少), unit, date, URL, code span, and citation verbatim.
4. Do not replace cut filler with binary negation slogans ("Not X, but Y") or three-word staccato fragments.
5. Verify the revised draft locally with: npx --yes github:dislop-ai/dislop verify before.md after.md
```

## Web UI & Slide Deck Checklist

```text
1. Verify zero dead controls (<a href="#"> or unexplained disabled buttons) and WCAG AA text contrast (>= 4.5:1).
2. Keep dark-mode surface luminance strictly monotonic (outer stage < sheet < raised control).
3. Avoid default purple-pink neon gradients, pill-badge soup (> 6 pills per view), and 3-level nested bordered boxes.
4. Cap slide copy at <= 120 English words (<= 280 Chinese chars), <= 6 bullets, and 100% font scale (no autofit shrink).
```
