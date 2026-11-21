---
content-type: reference-data
ruleId: svg-text-overflow-or-a11y
pack: deck-and-ui
tier: taste
severity: warning
family: ui/slop-chrome
---

# Rule: `svg-text-overflow-or-a11y`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `svg`
- Human anchor: https://dislop.com/#rule-svg-text-overflow-or-a11y

## What It Catches
- EN: Standalone SVG contains `<text>` likely to clip outside `viewBox` on fallback fonts, or omits `<title>`/`aria-label`.
- ZH: 独立 SVG 中的 `<text>` 在回退字体下存在超出 `viewBox` 裁切风险，或缺少 `<title>`/`aria-label` 无障碍说明。

## Deletion Test
- EN: Leave >= 12% horizontal safety margin for `<text>` inside `viewBox` (or convert wordmarks to `<path>` outlines) and include `<title>`.
- ZH: 为 SVG `<text>` 预留充足宽度余量（或将品牌字标转为 `<path>` 轮廓），并补充 `<title>`。

## Exemplar (Reference Data)

```text
bad:  <svg viewBox="0 0 200 40"><text x="10" y="28" font-size="24">Long fallback string that clips past 200px</text></svg>
trap: <svg viewBox="0 0 200 40"><text x="10" y="28" font-size="5">Tiny 5px unreadable text</text></svg>
good: <svg viewBox="0 0 420 40" role="img" aria-label="Release timeline"><title>Release timeline</title><text x="16" y="26" font-size="16">Q1–Q4 rollout</text></svg>
```
