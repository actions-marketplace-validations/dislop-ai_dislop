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
- EN: Placeholder `href="#"` link, empty button, or unexplained disabled button typical of generated UI mockups.
- ZH: AI 生成网页常见的空跳转链接（`href="#"`）、空按钮或未说明原因的占位禁用按钮。

## Deletion Test
- EN: Wire the control to a real destination, explain why it is disabled via `title`/`aria-describedby`, or remove the fake button.
- ZH: 接上真实链接或交互，或者说明禁用原因；没做的功能直接删掉按钮。

## Exemplar (Reference Data)

```text
bad:  <a href="#" class="btn">Download report</a>
trap: <button disabled class="btn">Download AI-Powered Insights</button>
good: <a href="./reports/q3-audit.pdf" class="btn">Download Q3 audit (PDF)</a>
```
