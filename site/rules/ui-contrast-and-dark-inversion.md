---
content-type: reference-data
ruleId: ui-contrast-and-dark-inversion
pack: core
tier: invariant
severity: error
family: ui/contrast
---

# Rule: `ui-contrast-and-dark-inversion`

- Pack: [`core`](../packs/core.md) · Tier: `invariant` · Severity: `error`
- Modalities: `html, css`
- Human anchor: https://dislop.com/#rule-ui-contrast-and-dark-inversion

## What It Catches
- EN: Resolvable foreground/background contrast fails WCAG AA (< 4.5:1), or dark-theme canvas is brighter than raised surface tokens.
- ZH: 可静态解析的前景/背景对比度低于 WCAG AA（< 4.5:1），或深色模式下底层画布比上层卡片更亮（Z 轴亮度倒置）。

## Deletion Test
- EN: Adjust ink/surface tokens until body text reaches >= 4.5:1 and dark-mode luminance rises strictly from page -> sheet -> raised card.
- ZH: 调整前景色与表面色令牌，确保正文对比度 >= 4.5:1，且深色模式亮度按`底层画布 < 内容面 < 浮层卡片`严格递增。

## Exemplar (Reference Data)

```text
bad:  .badge { color: #D9381E; background: #F7F5F0; font-size: 12px; }
trap: .badge { color: #A855F7; background: #FAF5FF; font-size: 12px; }
good: .badge { color: #B42318; background: #F6F7F5; font-size: 12px; }
```
