---
content-type: reference-data
ruleId: cooccurrence-slop-cluster
pack: business-brief
tier: taste
severity: warning
family: lexicon/cooccurrence
---

# Rule: `cooccurrence-slop-cluster`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-cooccurrence-slop-cluster

## What It Catches
- EN: Multiple subtle corporate/AI fluff verbs and modifiers co-occur in one low-evidence paragraph.
- ZH: 同一低事实段落内密集堆叠多个弱套词组合（如`有效推动/持续优化/显著提升`或`leverage/streamline/robust`），冲淡了具体改动。

## Deletion Test
- EN: Do not swap one buzzword for another; replace the whole cluster with who changed what and the measured delta.
- ZH: 不要把一个套词换成另一个近义词；整片替换成具体改动、执行主体与实测变化。

## Exemplar (Reference Data)

```text
bad:  本次客服系统按工单紧急度拆成 3 级队列，旨在有效推动跨部门协同效率，持续优化客户交互体验，并进一步助力业务团队实现精细化运营，最终显著提升整体服务质量，首响时间从 110 秒降到 42 秒。
trap: 客服系统升级不是功能叠加，而是首响从 110 秒降到 42 秒的服务跃升。
good: 本次客服系统按工单紧急度拆成 3 级队列，平均首响时间从 110 秒降到 42 秒。
```
