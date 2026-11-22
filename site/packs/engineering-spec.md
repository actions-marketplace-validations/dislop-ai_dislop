---
content-type: reference-data
pack: engineering-spec
tier: taste
version: 0.6.0
---

# Pack: `engineering-spec` — Engineering RFC, PR & Postmortem

> Catches empty AI PR summaries, stop-thinking 'human error' postmortem labels, and unowned wishful action items alongside core and brief checks.

在技术文档与简报检查之上，专门拦截空洞的 AI 代码提交总结、把事故归结为`人为失误`的止步归因，以及无负责人无指标的许愿式改进项。

## `eng-pr-diff-parrot`
- Tier: `taste` · Severity: `warning` · Family: `frame/pr-wrapper`
- Modalities: `markdown, text`
- EN: Generic AI PR summary parrots file changes without stating the concrete bug, constraint, or metric.
- ZH: 空泛的 AI 提交摘要只重复`通过优化提升可维护性`，未说明具体修掉的缺陷、边界条件或单号。
- Deletion Test (EN): Replace the wrapper sentence with why the change was needed, what breaks without it, and how it was verified.
- Deletion Test (ZH): 删掉套话壳，直接写出关联问题单、改动前后的具体行为差异及验证方法。

```text
bad:  本次 PR 旨在通过重构连接池管理逻辑进一步提升系统的稳定性与可维护性。
trap: 这不是一次普通的代码重构，而是连接池稳定性的底层重塑。
good: 修复连接池重连分支未释放旧句柄导致的连接泄漏，避免长运行后连接耗尽。
```

Atomic card: [eng-pr-diff-parrot.md](../rules/eng-pr-diff-parrot.md)

## `eng-shallow-root-cause`
- Tier: `taste` · Severity: `warning` · Family: `evidence/root-cause`
- Modalities: `markdown, text, docx`
- EN: Postmortem stops at 'human error' instead of identifying the missing system guardrail.
- ZH: 故障复盘停在`人为失误/操作不当`，没有追查缺失的系统校验或防呆机制。
- Deletion Test (EN): Ask why the tooling allowed a single manual action to cause an outage, and write that missing check as the root cause.
- Deletion Test (ZH): 追问`为什么发布或运维工具允许一次手误直接打挂线上`，把缺失的自动拦截写成根因。

```text
bad:  根本原因：人为失误。
trap: 根本原因：值班人员风险意识有待进一步强化。
good: 根本原因：生产迁移脚本缺少库名白名单与行数上限预检，未拦截误指向主库的删除语句。
```

Atomic card: [eng-shallow-root-cause.md](../rules/eng-shallow-root-cause.md)

## `eng-vague-action-item`
- Tier: `taste` · Severity: `info` · Family: `evidence/actionability`
- Modalities: `markdown, text, docx`
- EN: Wishful action item lacks a concrete target component, threshold, owner, or due date.
- ZH: 许愿式改进项（如`加强监控``提高警惕`）缺少具体模块、阈值、负责人或截止时间，无法验收。
- Deletion Test (EN): Rewrite as a binary-verifiable ticket: which service, what threshold or test case, who owns it, and by what date.
- Deletion Test (ZH): 改成可验收的具体动作：给哪个服务加什么阈值告警或单测、谁负责、哪天上线。

```text
bad:  - [ ] 加强监控与告警。
trap: - [ ] 全面排查并持续跟进线上隐患。
good: - [ ] 给 `checkout-api` 增加 P99 > 400ms 持续 3 分钟告警并接入值班群（负责人：李工，11 月 30 日前完成）。
```

Atomic card: [eng-vague-action-item.md](../rules/eng-vague-action-item.md)
