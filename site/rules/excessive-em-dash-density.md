---
content-type: reference-data
ruleId: excessive-em-dash-density
pack: literary-essay
tier: taste
severity: info
family: punctuation/em-dash
---

# Rule: `excessive-em-dash-density`

- Pack: [`literary-essay`](../packs/literary-essay.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-excessive-em-dash-density

## What It Catches
- EN: High em-dash (`—` / `——`) frequency creates breathless LLM parenthetical rhythm.
- ZH: 破折号（`—` / `——`）密度过高，形成典型生成式插话腔。

## Deletion Test
- EN: Convert most parenthetical dashes into commas or periods; save a single dash for a genuine turn.
- ZH: 将多数插话破折号改为逗号或句号，只在真正语意陡转处保留一处破折号。

## Exemplar (Reference Data)

```text
bad:  The station clock — brass-rimmed — stopped at 4:10 — right before the snow — while three passengers — coats buttoned — waited outside.
trap: Brass clock. 4:10 sharp. Snow falling. Three passengers waiting.
good: The brass-rimmed station clock stopped at 4:10, right before the snow, while three passengers waited outside in buttoned coats.
```
