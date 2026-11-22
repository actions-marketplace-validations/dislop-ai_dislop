---
content-type: reference-data
ruleId: eng-pr-diff-parrot
pack: engineering-spec
tier: taste
severity: warning
family: frame/pr-wrapper
---

# Rule: `eng-pr-diff-parrot`

- Pack: [`engineering-spec`](../packs/engineering-spec.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text`
- Human anchor: https://dislop.com/#rule-eng-pr-diff-parrot

## What It Catches
- EN: Generic AI PR summary parrots file changes without stating the concrete bug, constraint, or metric.
- ZH: 空泛的 AI 提交摘要只重复`通过优化提升可维护性`，未说明具体修掉的缺陷、边界条件或单号。

## Deletion Test
- EN: Replace the wrapper sentence with why the change was needed, what breaks without it, and how it was verified.
- ZH: 删掉套话壳，直接写出关联问题单、改动前后的具体行为差异及验证方法。

## Exemplar (Reference Data)

```text
bad:  本次 PR 旨在通过重构连接池管理逻辑进一步提升系统的稳定性与可维护性。
trap: 这不是一次普通的代码重构，而是连接池稳定性的底层重塑。
good: 修复 Redis 重连分支未释放旧句柄导致的连接泄漏（#412），压测 2 小时常驻连接数稳定在 64 以内。
```
