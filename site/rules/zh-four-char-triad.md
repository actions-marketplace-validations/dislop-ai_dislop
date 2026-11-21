---
content-type: reference-data
ruleId: zh-four-char-triad
pack: business-brief
tier: taste
severity: warning
family: frame/triad
---

# Rule: `zh-four-char-triad`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-zh-four-char-triad

## What It Catches
- EN: Chained four-character Chinese slogan triad pads prose without measurable detail.
- ZH: 连续三个及以上四字套语并列（如`精准高效、安全可靠、灵活易用`），信息密度低。

## Deletion Test
- EN: Delete all three adjectives; keep only claims backed by a number, failure mode, or configuration option.
- ZH: 删掉整组四字形容词，只保留有数字、故障边界或配置项支撑的具体事实。

## Exemplar (Reference Data)

```text
bad:  新版网关具备精准高效、安全可靠、灵活易用的特性，单节点支持 8,000 QPS。
trap: 新版网关不是简单升级，而是 8,000 QPS 的性能飞跃。
good: 新版网关单节点支持 8,000 QPS，并在上游超时 2 秒后自动熔断。
```
