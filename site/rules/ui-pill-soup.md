---
content-type: reference-data
ruleId: ui-pill-soup
pack: deck-and-ui
tier: taste
severity: warning
family: ui/slop-chrome
---

# Rule: `ui-pill-soup`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `html, jsx`
- Human anchor: https://dislop.com/#rule-ui-pill-soup

## What It Catches
- EN: Excessive `rounded-full` / `999px` text pills (> 6 per view) turn interface metadata into badge soup.
- ZH: 单视图堆砌超过 6 个胶囊圆角文字标签（`rounded-full` / `999px`），导致视觉噪音泛滥。

## Deletion Test
- EN: Render metadata as plain tabular text separated by middots (`·`) or hairlines; save one high-contrast label for actionable status.
- ZH: 将常规元数据改为用间隔号（`·`）或细线分隔的纯文本，仅对需要干预的异常状态保留单枚强调标记。

## Exemplar (Reference Data)

```text
bad:  8 adjacent `rounded-full` badges on one card: `Active`, `v2.4`, `US-West`, `SOC2`, `Fast`, `AI`, `Pro`, `Verified`.
trap: 8 square pastel badges with 8 emoji icons on one card.
good: Plain mono metadata line: `v2.4 · us-west-2 · SOC2` + single status word `degraded` when unhealthy.
```
