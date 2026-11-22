---
content-type: reference-data
ruleId: pptx-layout-monotony
pack: executive-deck
tier: taste
severity: info
family: deck/cadence
---

# Rule: `pptx-layout-monotony`

- Pack: [`executive-deck`](../packs/executive-deck.md) · Tier: `taste` · Severity: `info`
- Modalities: `pptx`
- Human anchor: https://dislop.com/#rule-pptx-layout-monotony

## What It Catches
- EN: Four or more consecutive slides repeat the exact same plain text-box skeleton without tables, charts, or visual variation.
- ZH: 连续 4 页及以上幻灯片重复完全相同的纯文字要点骨架（无表格、图表或版式变化），容易引发审阅疲劳。

## Deletion Test
- EN: Convert comparative bullet slides into a structured table, timeline, or metric chart to break monotonous pacing.
- ZH: 把其中对比或趋势类的要点页改成双栏对照表、流程图或数据图表，打破连页同版式。

## Exemplar (Reference Data)

```text
bad:  Slides 2–5 all use identical 'Title + 4 plain bullets' boxes with zero tables, charts, or diagrams.
trap: Slides 2–5 keep the exact same 4 bullets per slide and add decorative stock icons.
good: Slide 3 presents regional latency in a 4-row table and Slide 4 plots weekly error budget burn.
```
