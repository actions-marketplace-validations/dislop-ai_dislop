---
content-type: reference-data
ruleId: ui-dead-control
pack: core
tier: invariant
severity: error
family: ui/dead-control
---

# Rule: `ui-dead-control`

- Pack: [`core`](../packs/core.md) · Tier: `invariant` · Severity: `error`
- Modalities: `html, jsx`
- Human anchor: https://dislop.com/#rule-ui-dead-control

## What It Catches
- EN: Anchor with dead `href="#"` / empty target, unlabeled button, or unexplained static `<button disabled>`.
- ZH: 存在空跳转链接（`href="#"`）、无障碍名称缺失的按钮，或未说明原因的静态禁用按钮。

## Deletion Test
- EN: Wire the control to a real target, explain why a disabled control is locked via `title`/`aria-describedby`, or omit unimplemented actions.
- ZH: 绑定真实跳转或交互处理函数；若确需禁用须通过 `title` 或 `aria-describedby` 说明原因，未实现的功能直接移除按钮。

## Exemplar (Reference Data)

```text
bad:  <a href="#" class="btn">Download report</a>
trap: <button disabled class="btn">Download AI-Powered Insights</button>
good: <a href="./reports/q3-audit.pdf" class="btn">Download Q3 audit (PDF)</a>
```
