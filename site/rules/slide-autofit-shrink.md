---
content-type: reference-data
ruleId: slide-autofit-shrink
pack: deck-and-ui
tier: taste
severity: warning
family: deck/density
---

# Rule: `slide-autofit-shrink`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `pptx`
- Human anchor: https://dislop.com/#rule-slide-autofit-shrink

## What It Catches
- EN: PowerPoint `normAutofit` shrank text below 80% (`fontScale < 80000`) because copy overflowed its box.
- ZH: 文本框触发 PowerPoint 自动缩排（`fontScale < 80%`），表明文案超出容器容量。

## Deletion Test
- EN: Trim the overflowing copy or enlarge the text frame so body type renders at 100% scale.
- ZH: 精简溢出文案或调大文本框尺寸，使正文按 100% 原始字号清晰排布。

## Exemplar (Reference Data)

```text
bad:  <a:normAutofit fontScale="62500" lnSpcReduction="20000"/> on body placeholder
trap: Manually hardcode 10pt font so `normAutofit` disappears while text stays illegible.
good: <a:noAutofit/> with 42 words set at 18pt and full line spacing
```
