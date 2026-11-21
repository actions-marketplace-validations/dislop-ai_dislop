---
content-type: reference-data
ruleId: unsourced-attribution
pack: business-brief
tier: taste
severity: warning
family: evidence/unsourced
---

# Rule: `unsourced-attribution`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-unsourced-attribution

## What It Catches
- EN: Vague authority claim (`studies show`, `业内人士指出`) without a named source, link, or citation.
- ZH: 出现`研究表明/数据显示/业内人士指出`等模糊权威背书，但句内无具体机构、年份、链接或引用标记。

## Deletion Test
- EN: Name the exact dataset, report year, or footnote `[n]`; if no source exists, delete the claim.
- ZH: 补齐具体报告名称、年份或引用编号 `[n]`；若查无实据则直接删去该判断。

## Exemplar (Reference Data)

```text
bad:  Industry research shows that 70% of enterprise decks fail basic accessibility checks.
trap: Everyone knows most enterprise decks fail basic accessibility checks.
good: In our audit of 48 internal Q3 review decks, 31 contained at least one low-contrast caption (< 4.5:1).
```
