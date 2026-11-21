---
content-type: reference-data
ruleId: office-pdf-hygiene
pack: core
tier: invariant
severity: error
family: office/geometry
---

# Rule: `office-pdf-hygiene`

- Pack: [`core`](../packs/core.md) · Tier: `invariant` · Severity: `error`
- Modalities: `docx, pptx, pdf`
- Human anchor: https://dislop.com/#rule-office-pdf-hygiene

## What It Catches
- EN: Off-slide text box in PPTX, unaccepted tracked changes/comments in Office docs, or PDF metadata/font/URI defect.
- ZH: PPTX 文本框越出画布边界、Office 文档残留修订痕迹/批注，或 PDF 存在本机链接、未嵌入字体、原始文件名标题。

## Deletion Test
- EN: Accept or strip tracked changes and comments, bring off-slide text inside slide bounds, embed PDF fonts, and set a clean document title.
- ZH: 定稿前接受修订并清理批注，收回越界文本框，嵌入 PDF 字体并设置正式文档标题。

## Exemplar (Reference Data)

```text
bad:  PDF /Title (Microsoft Word - final_v3_edited(2).docx) with external link file:///Users/example/draft.docx
trap: PDF /Title (Untitled) with unembedded CIDFont
good: PDF /Title (Q4 Settlement Architecture Specification) with embedded subset fonts and relative HTTPS links
```
