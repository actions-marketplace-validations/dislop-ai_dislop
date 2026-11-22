---
content-type: reference-data
ruleId: reg-unsubstantiated-superlative
pack: regulated-comms
tier: taste
severity: warning
family: evidence/compliance
---

# Rule: `reg-unsubstantiated-superlative`

- Pack: [`regulated-comms`](../packs/regulated-comms.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-reg-unsubstantiated-superlative

## What It Catches
- EN: Absolute or superlative claim creates legal/compliance exposure where scoped SLA terms belong.
- ZH: 出现绝对化承诺或极限排他用语（如`绝对安全``零风险保障``全网第一`），存在合规与履约风险。

## Deletion Test
- EN: Replace absolute promises with verifiable scope, encryption/audit standards, or contracted SLA numbers.
- ZH: 删掉绝对化极限词，改写为具体的加密协议、审计认证编号或合同约定的 SLA 指标。

## Exemplar (Reference Data)

```text
bad:  新同城双活备份方案提供绝对安全与永久零故障保障（SLA 99.95%），客户迁移零风险承诺。
trap: 新同城双活备份方案打造坚不可摧的行业标杆级防线（SLA 99.95%）。
good: 新同城双活备份方案合同承诺月度可用性 99.95%，迁移前支持演练回滚。
```
