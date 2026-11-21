---
content-type: reference-data
ruleId: ui-prompt-echo-badge
pack: deck-and-ui
tier: taste
severity: warning
family: ui/slop-chrome
---

# Rule: `ui-prompt-echo-badge`

- Pack: [`deck-and-ui`](../packs/deck-and-ui.md) · Tier: `taste` · Severity: `warning`
- Modalities: `html, jsx, svg`
- Human anchor: https://dislop.com/#rule-ui-prompt-echo-badge

## What It Catches
- EN: Interface chrome echoes prompt-engineering hype (`AI-Powered`, `Zero Hallucination`) instead of naming the function.
- ZH: 界面标签直接回显提示词营销口号（如`AI 强力驱动``零幻觉保证`），未说明具体功能。

## Deletion Test
- EN: Delete the `AI-Powered` badge; label the control by the exact task it performs ('Extract invoice totals', 'Check slide word count').
- ZH: 删去`AI 驱动`装饰标牌，直接用控件完成的实际动作命名（如`核对幻灯片字数`）。

## Exemplar (Reference Data)

```text
bad:  <span class="eyebrow">AI-Powered · Zero Hallucination</span><h2>Document Checker</h2>
trap: <span class="eyebrow">Built for Craft · Pure Signal</span><h2>Document Checker</h2>
good: <h2>Document Linter for Markdown, HTML, DOCX & PPTX</h2>
```
