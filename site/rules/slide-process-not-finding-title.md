---
content-type: reference-data
ruleId: slide-process-not-finding-title
pack: executive-deck
tier: taste
severity: warning
family: deck/headline
---

# Rule: `slide-process-not-finding-title`

- Pack: [`executive-deck`](../packs/executive-deck.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, pptx`
- Human anchor: https://dislop.com/#rule-slide-process-not-finding-title

## What It Catches
- EN: Topic-label headline names the work done ('Analysis of X') instead of stating the finding.
- ZH: 标题只写了`关于……的分析/汇报`这类过程标签，没有直接亮出本页结论。

## Deletion Test
- EN: Replace 'Analysis of X' with the one-sentence answer your audience should remember if they read only the headline.
- ZH: 如果听众只扫一眼标题，最该记住哪一个结论或变化数字？直接拿那句话当标题。

## Exemplar (Reference Data)

```text
bad:  ## 关于三季度新客首周流失率（34% 降至 19%）的分析汇报
trap: ## 重塑新客留存增长飞轮
good: ## 三季度新客首周流失率从 34% 降至 19%
```
