---
content-type: reference-data
ruleId: staccato-slogan-run
pack: business-brief
tier: taste
severity: warning
family: frame/staccato
---

# Rule: `staccato-slogan-run`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-staccato-slogan-run

## What It Catches
- EN: Three or more consecutive ultra-short slogan fragments mimic dramatic copywriting cadence.
- ZH: 连续三个及以上超短断句口号（第二代 AI 戏剧化腔调）。

## Deletion Test
- EN: Combine the fragments into one factual sentence naming the cause and effect, or cut purely decorative rhythm beats.
- ZH: 把零碎口号合并为一句交代因果与边界的完整陈述，删去纯节奏铺陈。

## Exemplar (Reference Data)

```text
bad:  Signals drop. Photos vanish. Audits stall. Offline sync keeps all 120 inspection photos queued locally.
trap: Offline sync isn't a fallback — it's field resilience for 120 photos.
good: When cellular coverage drops in basement vaults, offline sync queues up to 120 inspection photos locally until reconnection.
```
