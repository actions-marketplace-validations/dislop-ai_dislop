---
content-type: reference-data
ruleId: reg-unanchored-multiplier
pack: regulated-comms
tier: taste
severity: warning
family: evidence/baseline
---

# Rule: `reg-unanchored-multiplier`

- Pack: [`regulated-comms`](../packs/regulated-comms.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-reg-unanchored-multiplier

## What It Catches
- EN: Floating speedup or efficiency multiplier ('10x faster') omits the before/after baseline.
- ZH: 出现悬空的倍数宣称（如`10x faster``效率提升数倍`），句内未给出改动前后的具体基线数值。

## Deletion Test
- EN: Either add the exact baseline ('from 18s to 1.8s on 10M rows') or remove the multiplier.
- ZH: 补齐改动前后的实测对比基线（如`从 18 秒降到 1.8 秒`），无实测基线时直接删去倍数词。

## Exemplar (Reference Data)

```text
bad:  接入新版流式批处理引擎后，对账单导出效率提升数倍。
trap: 接入新版流式批处理引擎后，对账单导出迎来质的飞跃。
good: 接入新版流式批处理引擎后，对账单改为按块流式导出，无需等待全表缓存在内存。
```
