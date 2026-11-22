---
content-type: reference-data
pack: regulated-comms
tier: taste
version: 0.6.0
---

# Pack: `regulated-comms` — External & Regulated Communications

> Flags unsubstantiated absolute claims ('100% secure', 'zero risk') and floating hype multipliers ('10x faster' with no baseline) in external docs.

面向对外公告、客户方案与合规审校，拦截绝对化极限承诺（`零风险``绝对安全``行业第一`）及无基线倍增夸大（`效率提升数倍`）。

## `reg-unsubstantiated-superlative`
- Tier: `taste` · Severity: `warning` · Family: `evidence/compliance`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Absolute or superlative claim creates legal/compliance exposure where scoped SLA terms belong.
- ZH: 出现绝对化承诺或极限排他用语（如`绝对安全``零风险保障``全网第一`），存在合规与履约风险。
- Deletion Test (EN): Replace absolute promises with verifiable scope, encryption/audit standards, or contracted SLA numbers.
- Deletion Test (ZH): 删掉绝对化极限词，改写为具体的加密协议、审计认证编号或合同约定的 SLA 指标。

```text
bad:  新同城双活备份方案提供绝对安全与永久零故障保障（SLA 99.95%），客户迁移零风险承诺。
trap: 新同城双活备份方案打造坚不可摧的行业标杆级防线（SLA 99.95%）。
good: 新同城双活备份方案合同承诺月度可用性 99.95%，迁移前支持演练回滚。
```

Atomic card: [reg-unsubstantiated-superlative.md](../rules/reg-unsubstantiated-superlative.md)

## `reg-unanchored-multiplier`
- Tier: `taste` · Severity: `warning` · Family: `evidence/baseline`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Floating speedup or efficiency multiplier ('10x faster') omits the before/after baseline.
- ZH: 出现悬空的倍数宣称（如`10x faster``效率提升数倍`），句内未给出改动前后的具体基线数值。
- Deletion Test (EN): Either add the exact baseline ('from 18s to 1.8s on 10M rows') or remove the multiplier.
- Deletion Test (ZH): 补齐改动前后的实测对比基线（如`从 18 秒降到 1.8 秒`），无实测基线时直接删去倍数词。

```text
bad:  接入新版流式批处理引擎后，对账单导出效率提升数倍。
trap: 接入新版流式批处理引擎后，对账单导出迎来质的飞跃。
good: 接入新版流式批处理引擎后，对账单改为按块流式导出，无需等待全表缓存在内存。
```

Atomic card: [reg-unanchored-multiplier.md](../rules/reg-unanchored-multiplier.md)
