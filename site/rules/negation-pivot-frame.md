---
content-type: reference-data
ruleId: negation-pivot-frame
pack: business-brief
tier: taste
severity: warning
family: frame/negation-pivot
---

# Rule: `negation-pivot-frame`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-negation-pivot-frame

## What It Catches
- EN: Second-order `Not X, but Y` / `不是 A，而是 B` rhetorical pivot elevates an abstract slogan instead of stating a concrete fact.
- ZH: 二阶`不是 A，而是 B`对比修辞：先否定稻草人再拔高抽象概念，缺乏具体事实增量。

## Deletion Test
- EN: Delete the negated first half ('Not X,'). If the remaining clause ('Y') holds no measurement, mechanism, or real correction, rewrite or cut the whole sentence.
- ZH: 删掉前半句否定铺垫，只看`而是 B`。如果 B 没有数值、机制或真实纠偏信息，整句删改。

## Exemplar (Reference Data)

```text
bad:  这不是一款简单的文档检查工具，而是交付质量的底气。
trap: 工具已至。底气自生。交付无忧。
good: `dislop` 在发稿前标出本机路径泄露、未填占位符和超载幻灯片。
```
