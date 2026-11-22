---
content-type: reference-data
ruleId: template-skeleton-echo
pack: business-brief
tier: taste
severity: warning
family: structure/skeleton-echo
---

# Rule: `template-skeleton-echo`

- Pack: [`business-brief`](../packs/business-brief.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-template-skeleton-echo

## What It Catches
- EN: Three or more paragraphs or sentences repeat the exact same syntactic opener skeleton ('By <verb>ing...', '在……方面，', 'First/Second/Third/Finally').
- ZH: 连续 3 个及以上段落或句子复用同一句首骨架（如`在……方面，``首先/其次/再次/最后``By …ing,`），结构像套模板填词。

## Deletion Test
- EN: Merge related points into natural prose with varied openings, or use a compact table if you are listing parallel specs.
- ZH: 把同构段落按因果或主次合并成自然段并变化句首；若是并列参数对照，直接改成简洁表格。

## Exemplar (Reference Data)

```text
bad:  在数据采集方面，系统接入了业务日志。

在模型训练方面，团队定期更新权重。

在结果应用方面，业务方通过看板查看波动。
trap: 采数据。训模型。看看板。
good: 系统接入业务日志后，团队定期更新模型权重，业务方直接在看板里查看指标波动。
```
