---
content-type: reference-data
ruleId: ui-box-in-box
pack: deck-and-ui
tier: taste
severity: warning
family: ui/slop-chrome
---

# Rule: `ui-box-in-box`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `html, jsx`
- Human anchor: https://dislop.com/#rule-ui-box-in-box

## What It Catches
- EN: Three or more nested bordered/rounded containers wrap the same content (`box-in-box-in-box`).
- ZH: 连续三层及以上带边框与圆角的容器层层套盒，挤压有效内容空间。

## Deletion Test
- EN: Remove outer wrapper borders and separate sections with alignment, whitespace, or a single 1px rule.
- ZH: 去掉多余的外层描边套盒，改用对齐、留白或单根 1px 分界线组织层级。

## Exemplar (Reference Data)

```text
bad:  <div class="border rounded-xl p-6"><div class="border rounded-lg p-4"><div class="border rounded-md p-3">99.98% uptime</div></div></div>
trap: <div class="shadow-xl rounded-2xl p-6"><div class="shadow-md rounded-xl p-4"><div class="bg-slate-900 rounded-lg p-3">99.98% uptime</div></div></div>
good: <section class="metric-row"><span>Uptime (90d)</span><strong>99.98%</strong></section>
```
