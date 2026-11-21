---
content-type: reference-data
ruleId: slide-bullet-overload
pack: deck-and-ui
tier: taste
severity: warning
family: deck/density
---

# Rule: `slide-bullet-overload`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `pptx`
- Human anchor: https://dislop.com/#rule-slide-bullet-overload

## What It Catches
- EN: Slide contains more than 6 bullet items (`maxSlideBullets`), fragmenting visual hierarchy.
- ZH: 单页幻灯片项目符号超过 6 条（`maxSlideBullets`），视觉层级碎裂。

## Deletion Test
- EN: Group related bullets into 2–3 structured columns or split across two slides.
- ZH: 将零散条目归并为 2–3 组结构化分栏，或拆分为两页演示。

## Exemplar (Reference Data)

```text
bad:  Slide lists 9 separate top-level bullets covering pricing, onboarding, compliance, SLA, and billing.
trap: Slide wraps 9 bullets into 9 tiny pill badges.
good: Slide groups commercial terms into 3 columns: Pricing ($49/seat), Onboarding (2 days), SLA (99.95%).
```
