---
content-type: reference-data
ruleId: literary-rhetorical-qa
pack: literary-essay
tier: taste
severity: warning
family: punctuation/rhetorical-qa
---

# Rule: `literary-rhetorical-qa`

- Pack: [`literary-essay`](../packs/literary-essay.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-literary-rhetorical-qa

## What It Catches
- EN: Staged self-answered rhetorical question ('Why does ...? Because ...') lectures the reader instead of showing the scene.
- ZH: 散文里出现自问自答式设问（`为什么……？因为……`），像主持词而非真实叙述。

## Deletion Test
- EN: Cut the rhetorical question and describe what actually happened in the scene.
- ZH: 删掉自问自答的铺陈，直接写现场发生了什么。

## Exemplar (Reference Data)

```text
bad:  At 6:30 a.m. he brewed a cup of pour-over coffee. Why does brewing pour-over coffee feel so grounding? Because the deliberate pace invites us to pause.
trap: Warm water. Slow pour. Quiet pause.
good: At 6:30 a.m. he brewed a cup of pour-over coffee.
```
