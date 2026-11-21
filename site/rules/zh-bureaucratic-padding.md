---
content-type: reference-data
ruleId: zh-bureaucratic-padding
pack: business-brief
tier: taste
severity: warning
family: lexicon/cliche
---

# Rule: `zh-bureaucratic-padding`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-zh-bureaucratic-padding

## What It Catches
- EN: Chinese bureaucratic buzzword or throat-clearing filler.
- ZH: 存在空泛汇报套词或铺垫口头禅，掩盖了具体动作、主体与结果。

## Deletion Test
- EN: Ask 'who changed what, by how much, under what constraint?' and delete the abstract wrapper.
- ZH: 追问`谁对什么做了哪项改动、指标变了多少`，删掉抽象包装词。

## Exemplar (Reference Data)

```text
bad:  值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至 45 秒内。
trap: 这不是一次工单改造，而是客服体验的底气：首响压缩至 45 秒内。
good: 本次改造按问题紧急度拆分工单队列，一线客服首次响应时间压缩至 45 秒内。
```
