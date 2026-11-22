---
content-type: reference-data
ruleId: narrative-sandwich-frame
pack: business-brief
tier: taste
severity: warning
family: structure/narrative-frame
---

# Rule: `narrative-sandwich-frame`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-narrative-sandwich-frame

## What It Catches
- EN: Macro-trend opener, future-facing closer, or dense transition-marker cluster ('Furthermore/Moreover/Additionally') follows the stock LLM essay sandwich.
- ZH: 出现宏大趋势开场（`随着……的飞速发展`）、展望式升华收尾（`展望未来……`）或连接词堆叠（`此外/与此同时/不仅如此`），呈现典型 AI 三明治叙事壳。

## Deletion Test
- EN: Cut the opening trend preamble and closing cheerleading; start on the concrete fact or decision and end on the next action or limit.
- ZH: 切掉开头趋势帽和结尾展望帽，直接从具体事实或改动起笔，在下一步动作或边界条件处收束。

## Exemplar (Reference Data)

```text
bad:  随着人工智能技术的飞速发展，研发团队正面临效率变革。此外，我们在 11 月把 PR 静态检查接入了 CI。与此同时，配置错误提前被拦了下来。不仅如此，下周还会覆盖剩余 4 个仓库。展望未来，主动拥抱变化的团队必将赢得先机。
trap: 时代变了。工具变了。协作也在变。
good: 11 月我们把 PR 静态检查接入了 CI，配置错误会在合并前被拦下，下周计划覆盖剩余 4 个仓库。
```
