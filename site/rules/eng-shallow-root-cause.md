---
content-type: reference-data
ruleId: eng-shallow-root-cause
pack: engineering-spec
tier: taste
severity: warning
family: evidence/root-cause
---

# Rule: `eng-shallow-root-cause`

- Pack: [`engineering-spec`](../packs/engineering-spec.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, docx`
- Human anchor: https://dislop.com/#rule-eng-shallow-root-cause

## What It Catches
- EN: Postmortem stops at 'human error' instead of identifying the missing system guardrail.
- ZH: 故障复盘停在`人为失误/操作不当`，没有追查缺失的系统校验或防呆机制。

## Deletion Test
- EN: Ask why the tooling allowed a single manual action to cause an outage, and write that missing check as the root cause.
- ZH: 追问`为什么发布或运维工具允许一次手误直接打挂线上`，把缺失的自动拦截写成根因。

## Exemplar (Reference Data)

```text
bad:  根本原因：人为失误。
trap: 根本原因：值班人员风险意识有待进一步强化。
good: 根本原因：生产迁移脚本缺少库名白名单与行数上限预检，未拦截误指向主库的删除语句。
```
