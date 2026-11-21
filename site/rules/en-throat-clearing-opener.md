---
content-type: reference-data
ruleId: en-throat-clearing-opener
pack: business-brief
tier: taste
severity: warning
family: frame/opener
---

# Rule: `en-throat-clearing-opener`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-en-throat-clearing-opener

## What It Catches
- EN: Throat-clearing opener delays the concrete point.
- ZH: 英文铺垫式开场白拖延了核心事实。

## Deletion Test
- EN: Cut everything up to 'that' or the comma. Does the remaining clause already state the full observation or constraint?
- ZH: 删掉前半句铺垫壳，看剩下的主干是否已经完整表达了事实或限制条件。

## Exemplar (Reference Data)

```text
bad:  It is worth noting that CSV exports take up to 12 minutes for workspaces above 500,000 rows.
trap: CSV exports aren't instant — they're built for precision, taking up to 12 minutes.
good: CSV exports take up to 12 minutes for workspaces above 500,000 rows.
```
