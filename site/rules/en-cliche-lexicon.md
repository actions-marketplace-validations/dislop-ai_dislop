---
content-type: reference-data
ruleId: en-cliche-lexicon
pack: business-brief
tier: taste
severity: info
family: lexicon/cliche
---

# Rule: `en-cliche-lexicon`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-en-cliche-lexicon

## What It Catches
- EN: Stock promotional phrase where a specific verb or measurement would carry more weight.
- ZH: 高频公关套语，建议替换为具体动作或实测指标。

## Deletion Test
- EN: If you delete this modifier, which concrete mechanism, metric, or trade-off disappears? State that fact directly.
- ZH: 如果删掉这个修饰语，读者会少知道哪项机制、指标或取舍？直接写出那项事实。

## Exemplar (Reference Data)

```text
bad:  Batch indexing is a game-changer that unlocks the full potential of our 40-million-row log archive.
trap: This isn't indexing. It's instant recall across 40 million rows.
good: Batch indexing cuts 40-million-row log queries from 19 seconds to 1.4 seconds.
```
