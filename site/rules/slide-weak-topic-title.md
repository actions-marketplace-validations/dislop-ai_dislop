---
content-type: reference-data
ruleId: slide-weak-topic-title
pack: deck-and-ui
tier: taste
severity: info
family: deck/density
---

# Rule: `slide-weak-topic-title`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `info`
- Modalities: `pptx`
- Human anchor: https://dislop.com/#rule-slide-weak-topic-title

## What It Catches
- EN: Content-heavy slide uses a generic topic label (`Overview`, `Background`, `背景`) instead of stating its takeaway.
- ZH: 正文密集的幻灯片使用`背景/概述/总结`等空泛名词做标题，未直接亮出本页结论。

## Deletion Test
- EN: Replace `Overview` with the one-sentence finding the audience should remember from this slide.
- ZH: 把`项目背景/数据概述`替换为听众看完本页应记住的一句具体结论。

## Exemplar (Reference Data)

```text
bad:  Title: 'Background' (above 65 words detailing 38% cart abandonment on mobile Safari)
trap: Title: 'Reimagining Checkout Excellence'
good: Title: 'Mobile Safari accounts for 38% of cart abandonment due to 4-step address entry'
```
