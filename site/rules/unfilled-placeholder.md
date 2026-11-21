---
content-type: reference-data
ruleId: unfilled-placeholder
pack: core
tier: invariant
severity: error
family: hygiene/placeholder
---

# Rule: `unfilled-placeholder`

- Pack: [`core`](../packs/core.md) · Tier: `invariant` · Severity: `error`
- Modalities: `markdown, text, html, jsx, svg, docx, pptx, pdf`
- Human anchor: https://dislop.com/#rule-unfilled-placeholder

## What It Catches
- EN: Unfilled template placeholder, broken Word reference field, or dummy copy.
- ZH: 存在未替换的模板占位符、损坏的交叉引用域或测试假文。

## Deletion Test
- EN: Supply the verified value before shipping, or delete the unfinished section rather than leaving a bracketed marker.
- ZH: 发稿前填入核实后的真实数据；若数据尚未就绪，直接删去未完成段落而非保留占位标记。

## Exemplar (Reference Data)

```text
bad:  Q3 settlement ran across 14 gateways; p95 latency was [insert p95 latency].
trap: Q3 settlement improved dramatically across 14 gateways.
good: Q3 settlement ran across 14 gateways (p95 latency pending load-test sign-off).
```
