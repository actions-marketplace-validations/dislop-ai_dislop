---
content-type: reference-data
ruleId: comma-chain-runon
pack: business-brief
tier: taste
severity: info
family: punctuation/comma-chain
---

# Rule: `comma-chain-runon`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-comma-chain-runon

## What It Catches
- EN: Single sentence chains 5+ comma clauses in breathless LLM cadence.
- ZH: 单句内连续串接 5 个及以上逗号分句，节奏平铺拖沓。

## Deletion Test
- EN: Split into 2–3 shorter sentences with a clear main verb in each, and drop redundant parallel clauses.
- ZH: 拆成 2 到 3 句主干清晰的短句，顺手删掉凑排比的空分句。

## Exemplar (Reference Data)

```text
bad:  通过建立跨部门沟通机制，明确周二评审与周五发版节点，优化内部评审流程，加强文档沉淀管理，完善接口超时预警体系，同步推进自动化落地，我们让团队交付过程更稳。
trap: 建机制。明节点。优评审。强沉淀。
good: 我们固定了周二评审和周五发版两个节点，并补齐了接口超时预警和自动化检查，交付过程稳定多了。
```
