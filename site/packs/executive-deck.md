---
content-type: reference-data
pack: executive-deck
tier: taste
version: 0.6.0
---

# Pack: `executive-deck` — Executive Slide Deck & Board Readout

> Enforces conclusion-first slide headlines and flags monotonous multi-slide bullet skeletons on top of core deck and UI hygiene.

在演示文稿与界面规范之上，检查非结论式`过程名词`幻灯片标题与连续同骨架纯文字页。

## `slide-process-not-finding-title`
- Tier: `taste` · Severity: `warning` · Family: `deck/headline`
- Modalities: `markdown, pptx`
- EN: Topic-label headline names the work done ('Analysis of X') instead of stating the finding.
- ZH: 标题只写了`关于……的分析/汇报`这类过程标签，没有直接亮出本页结论。
- Deletion Test (EN): Replace 'Analysis of X' with the one-sentence answer your audience should remember if they read only the headline.
- Deletion Test (ZH): 如果听众只扫一眼标题，最该记住哪一个结论或变化数字？直接拿那句话当标题。

```text
bad:  ## 关于三季度新客首周流失率（34% 降至 19%）的分析汇报
trap: ## 重塑新客留存增长飞轮
good: ## 三季度新客首周流失率从 34% 降至 19%
```

Atomic card: [slide-process-not-finding-title.md](../rules/slide-process-not-finding-title.md)

## `pptx-layout-monotony`
- Tier: `taste` · Severity: `info` · Family: `deck/cadence`
- Modalities: `pptx`
- EN: Four or more consecutive slides repeat the exact same plain text-box skeleton without tables, charts, or visual variation.
- ZH: 连续 4 页及以上幻灯片重复完全相同的纯文字要点骨架（无表格、图表或版式变化），容易引发审阅疲劳。
- Deletion Test (EN): Convert comparative bullet slides into a structured table, timeline, or metric chart to break monotonous pacing.
- Deletion Test (ZH): 把其中对比或趋势类的要点页改成双栏对照表、流程图或数据图表，打破连页同版式。

```text
bad:  Slides 2–5 all use identical 'Title + 4 plain bullets' boxes with zero tables, charts, or diagrams.
trap: Slides 2–5 keep the exact same 4 bullets per slide and add decorative stock icons.
good: Slide 3 presents regional latency in a 4-row table and Slide 4 plots weekly error budget burn.
```

Atomic card: [pptx-layout-monotony.md](../rules/pptx-layout-monotony.md)
