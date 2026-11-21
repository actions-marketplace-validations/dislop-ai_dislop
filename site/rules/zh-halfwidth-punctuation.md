---
content-type: reference-data
ruleId: zh-halfwidth-punctuation
pack: literary-essay
tier: taste
severity: warning
family: punctuation/zh-halfwidth
---

# Rule: `zh-halfwidth-punctuation`

- Pack: [`literary-essay`](../packs/literary-essay.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-zh-halfwidth-punctuation

## What It Catches
- EN: Half-width ASCII punctuation (`,;:!?`) wedged directly between Chinese characters.
- ZH: 汉字之间混入半角西文标点（`,;:!?`），违反中文排版规范（W3C CLREQ）。

## Deletion Test
- EN: Replace half-width ASCII punctuation between Han characters with full-width Chinese punctuation (`，；：！？`).
- ZH: 将汉字之间的半角标点替换为全角中文标点（`，；：！？`）。

## Exemplar (Reference Data)

```text
bad:  冬至那天下了初雪,院子里的腊梅开了三朵;香气一直飘到走廊。
trap: 冬至初雪。腊梅三朵。暗香盈袖。
good: 冬至那天下了初雪，院子里的腊梅开了三朵；香气一直飘到走廊。
```
