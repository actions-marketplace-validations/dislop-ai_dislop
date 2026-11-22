---
content-type: reference-data
ruleId: eng-vague-action-item
pack: engineering-spec
tier: taste
severity: info
family: evidence/actionability
---

# Rule: `eng-vague-action-item`

- Pack: [`engineering-spec`](../packs/engineering-spec.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text, docx`
- Human anchor: https://dislop.com/#rule-eng-vague-action-item

## What It Catches
- EN: Wishful action item lacks a concrete target component, threshold, owner, or due date.
- ZH: 许愿式改进项（如`加强监控``提高警惕`）缺少具体模块、阈值、负责人或截止时间，无法验收。

## Deletion Test
- EN: Rewrite as a binary-verifiable ticket: which service, what threshold or test case, who owns it, and by what date.
- ZH: 改成可验收的具体动作：给哪个服务加什么阈值告警或单测、谁负责、哪天上线。

## Exemplar (Reference Data)

```text
bad:  - [ ] 加强监控与告警。
trap: - [ ] 全面排查并持续跟进线上隐患。
good: - [ ] 给 `checkout-api` 增加 P99 > 400ms 持续 3 分钟告警并接入值班群（负责人：李工，11 月 30 日前完成）。
```
