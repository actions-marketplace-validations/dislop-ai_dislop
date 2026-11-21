---
content-type: reference-data
ruleId: bold-lead-list-wall
pack: business-brief
tier: taste
severity: info
family: frame/list-wall
---

# Rule: `bold-lead-list-wall`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text`
- Human anchor: https://dislop.com/#rule-bold-lead-list-wall

## What It Catches
- EN: Run of 4+ `- **Label**: description` bullets reads like an unedited LLM summary wall.
- ZH: 连续 4 条及以上 `- **小标题**：说明` 列表墙，呈现典型大模型平铺罗列感。

## Deletion Test
- EN: If the items argue one thesis, turn them into a short paragraph; keep bulleted bold labels only for true reference tables, CLI flags, or glossaries.
- ZH: 如果是在阐述同一观点，改写为有主次逻辑的自然段；仅在参数说明、术语表或清单核对时保留加粗列表。

## Exemplar (Reference Data)

```text
bad:  - **Speed**: Runs fast locally.
- **Privacy**: Keeps files offline.
- **Modularity**: Uses JSON packs.
- **Clarity**: Prints line numbers.
trap: Speed. Privacy. Modularity. Clarity.
good: `dislop` runs locally with no network calls, loads rules from plain JSON packs, and prints exact file and line coordinates.
```
