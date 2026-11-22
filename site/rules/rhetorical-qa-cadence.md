---
content-type: reference-data
ruleId: rhetorical-qa-cadence
pack: business-brief
tier: taste
severity: warning
family: punctuation/rhetorical-qa
---

# Rule: `rhetorical-qa-cadence`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx, pptx`
- Human anchor: https://dislop.com/#rule-rhetorical-qa-cadence

## What It Catches
- EN: Formulaic self-answered rhetorical question ('Why...? Because...' / 'The result?') mimics LLM blog hooks.
- ZH: 自问自答式设问套路（`为什么……？因为……``结果呢？`），带有明显生成式营销文节奏。

## Deletion Test
- EN: Delete the staged question and state the cause-and-effect directly in one sentence.
- ZH: 删掉摆拍式设问，直接在一句话里写出原因与结果。

## Exemplar (Reference Data)

```text
bad:  Why do internal dashboards collect dust after launch? Because they show vanity totals instead of next actions. The result? Teams export CSVs every Monday.
trap: Dashboards fail. Numbers pile up. Teams export CSVs.
good: Internal dashboards go unused when they show vanity totals without next actions, so teams end up exporting CSVs every Monday.
```
