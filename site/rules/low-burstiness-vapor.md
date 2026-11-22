---
content-type: reference-data
ruleId: low-burstiness-vapor
pack: business-brief
tier: taste
severity: info
family: statistics/monotony
---

# Rule: `low-burstiness-vapor`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `info`
- Modalities: `markdown, text`
- Human anchor: https://dislop.com/#rule-low-burstiness-vapor

## What It Catches
- EN: Multi-sentence passage combines robotically uniform sentence lengths (low burstiness CV < 0.24) with near-zero concrete anchors (numbers, dates, files, or verifiable actions).
- ZH: 多句段落同时出现句长高度齐平（突发性变异系数 CV < 0.24）且几乎没有具体锚点（数字、时间、文件名或可核查动作），空泛同质感强。

## Deletion Test
- EN: Cut abstract summary sentences in half, vary sentence length naturally, and anchor every kept claim with a number, file, date, or concrete failure mode.
- ZH: 砍掉一半抽象概括句，拉开长短句节奏，并为保留的每条判断补上数字、文件、时间或真实边界。

## Exemplar (Reference Data)

```text
bad:  该方案注重用户体验的全面改善。系统架构保持了良好的扩展能力。团队协作形成了清晰的责任分工。日常运维建立了规范的处理流程。产品迭代围绕核心需求稳步推进。业务指标呈现出健康的增长态势。
trap: 体验改善。架构扩展。分工清晰。运维规范。
good: 本段暂未提供具体指标、改动文件或责任人，请先删去概括句，再由作者补入实测数据和变更项。
```
