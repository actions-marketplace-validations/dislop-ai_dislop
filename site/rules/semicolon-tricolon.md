---
content-type: reference-data
ruleId: semicolon-tricolon
pack: business-brief
tier: taste
severity: warning
family: punctuation/tricolon
---

# Rule: `semicolon-tricolon`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-semicolon-tricolon

## What It Catches
- EN: Three-part balanced semicolon pitch sentence reads like generated marketing cadence.
- ZH: 单句内连续使用两个及以上分号构成三段对称排比，呈现典型 AI 推销腔。

## Deletion Test
- EN: Break the symmetry: split into plain sentences of unequal length or keep only the concrete behaviors.
- ZH: 打破三段工整对称：拆成长短不一的平实句子，或删掉充数的并列分句。

## Exemplar (Reference Data)

```text
bad:  前端把表单校验前置到输入时；后端将异步任务拆进独立队列；监控台实时追踪每笔超时请求。
trap: 校验前置。任务异步。超时可追。
good: 前端在输入时先做字段校验，后端把异步任务放进独立队列，监控台则负责追踪每笔超时请求。
```
