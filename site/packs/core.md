---
content-type: reference-data
pack: core
tier: invariant
version: 0.2.0
---

# Pack: `core` — Core Publication Invariants

> Objective pre-publication checks enabled across every Taste Pack: leaked local paths, unfilled placeholders, AI chat residue, dead controls, contrast/dark-elevation defects, and Office/PDF hygiene.

所有审美包默认启用的客观交付检查：本机路径泄露、未填占位符、AI 对话残迹、死点击控件、对比度与深色层级倒置、Office 与 PDF 结构卫生。

## `local-path-leak`
- Tier: `invariant` · Severity: `error` · Family: `hygiene/path`
- Modalities: `markdown, text, html, css, jsx, svg, docx, pptx, pdf`
- EN: Leaked local filesystem path or file:/// link.
- ZH: 残留本机文件系统路径或 file:/// 链接。
- Deletion Test (EN): Replace the workstation path with a repository-relative path, a public HTTPS URL, or `/Users/example/...` if documenting a CLI.
- Deletion Test (ZH): 将个人工作站路径改为仓库相对路径、公开 HTTPS 链接，或在命令示例中改用 `/Users/example/...`。

```text
bad:  See [Architecture Diagram](file:///Users/example/Desktop/arch-v2.png) for the 3-node layout.
trap: See the architecture diagram on my machine for the 3-node layout.
good: See [Architecture Diagram](./docs/assets/arch-v2.png) for the 3-node layout.
```

Atomic card: [local-path-leak.md](../rules/local-path-leak.md)

## `unfilled-placeholder`
- Tier: `invariant` · Severity: `error` · Family: `hygiene/placeholder`
- Modalities: `markdown, text, html, jsx, svg, docx, pptx, pdf`
- EN: Unfilled template placeholder, broken Word reference field, or dummy copy.
- ZH: 存在未替换的模板占位符、损坏的交叉引用域或测试假文。
- Deletion Test (EN): Supply the verified value before shipping, or delete the unfinished section rather than leaving a bracketed marker.
- Deletion Test (ZH): 发稿前填入核实后的真实数据；若数据尚未就绪，直接删去未完成段落而非保留占位标记。

```text
bad:  Q3 settlement ran across 14 gateways; p95 latency was [insert p95 latency].
trap: Q3 settlement improved dramatically across 14 gateways.
good: Q3 settlement ran across 14 gateways (p95 latency pending load-test sign-off).
```

Atomic card: [unfilled-placeholder.md](../rules/unfilled-placeholder.md)

## `chatbot-artifact`
- Tier: `invariant` · Severity: `error` · Family: `hygiene/chat-residue`
- Modalities: `markdown, text, html, jsx, docx, pptx, pdf`
- EN: Unstripped chatbot wrapper sentence or AI search citation token.
- ZH: 残留未清理的 AI 对话寒暄壳或检索引用内部标记。
- Deletion Test (EN): Delete the conversational wrapper or internal citation token completely; the document starts at its actual subject.
- Deletion Test (ZH): 直接删掉对话寒暄句或内部引用残迹，正文从事实内容直接开始。

```text
bad:  Certainly! Here is the revised rollout note: Cluster B migrates on November 24 at 02:00 UTC.
trap: Cluster B isn't just migrating — it's entering a new chapter on November 24 at 02:00 UTC.
good: Cluster B migrates on November 24 at 02:00 UTC.
```

Atomic card: [chatbot-artifact.md](../rules/chatbot-artifact.md)

## `markdown-leak`
- Tier: `invariant` · Severity: `error` · Family: `hygiene/markdown-leak`
- Modalities: `docx, pptx`
- EN: Raw Markdown syntax (`**bold**` or `## heading`) left unrendered inside an Office document.
- ZH: Word 或 PowerPoint 文本中残留未渲染的原始 Markdown 标记（如 `**加粗**` 或 `## 标题`）。
- Deletion Test (EN): Convert the raw asterisks or hash marks into native Word/PowerPoint run formatting.
- Deletion Test (ZH): 去掉原始星号或井号，改用 Word/PowerPoint 原生样式或加粗格式。

```text
bad:  **Key Milestone**: Ship v0.2 parser before Friday.
trap: Key Milestone — a game-changing v0.2 parser ships Friday.
good: Key Milestone: Ship v0.2 parser before Friday.
```

Atomic card: [markdown-leak.md](../rules/markdown-leak.md)

## `ui-dead-control`
- Tier: `invariant` · Severity: `error` · Family: `ui/dead-control`
- Modalities: `html, jsx`
- EN: Anchor with dead `href="#"` / empty target, unlabeled button, or unexplained static `<button disabled>`.
- ZH: 存在空跳转链接（`href="#"`）、无障碍名称缺失的按钮，或未说明原因的静态禁用按钮。
- Deletion Test (EN): Wire the control to a real target, explain why a disabled control is locked via `title`/`aria-describedby`, or omit unimplemented actions.
- Deletion Test (ZH): 绑定真实跳转或交互处理函数；若确需禁用须通过 `title` 或 `aria-describedby` 说明原因，未实现的功能直接移除按钮。

```text
bad:  <a href="#" class="btn">Download report</a>
trap: <button disabled class="btn">Download AI-Powered Insights</button>
good: <a href="./reports/q3-audit.pdf" class="btn">Download Q3 audit (PDF)</a>
```

Atomic card: [ui-dead-control.md](../rules/ui-dead-control.md)

## `ui-contrast-and-dark-inversion`
- Tier: `invariant` · Severity: `error` · Family: `ui/contrast`
- Modalities: `html, css`
- EN: Resolvable foreground/background contrast fails WCAG AA (< 4.5:1), or dark-theme canvas is brighter than raised surface tokens.
- ZH: 可静态解析的前景/背景对比度低于 WCAG AA（< 4.5:1），或深色模式下底层画布比上层卡片更亮（Z 轴亮度倒置）。
- Deletion Test (EN): Adjust ink/surface tokens until body text reaches >= 4.5:1 and dark-mode luminance rises strictly from page -> sheet -> raised card.
- Deletion Test (ZH): 调整前景色与表面色令牌，确保正文对比度 >= 4.5:1，且深色模式亮度按`底层画布 < 内容面 < 浮层卡片`严格递增。

```text
bad:  .badge { color: #D9381E; background: #F7F5F0; font-size: 12px; }
trap: .badge { color: #A855F7; background: #FAF5FF; font-size: 12px; }
good: .badge { color: #B42318; background: #F6F7F5; font-size: 12px; }
```

Atomic card: [ui-contrast-and-dark-inversion.md](../rules/ui-contrast-and-dark-inversion.md)

## `office-pdf-hygiene`
- Tier: `invariant` · Severity: `error` · Family: `office/geometry`
- Modalities: `docx, pptx, pdf`
- EN: Off-slide text box in PPTX, unaccepted tracked changes/comments in Office docs, or PDF metadata/font/URI defect.
- ZH: PPTX 文本框越出画布边界、Office 文档残留修订痕迹/批注，或 PDF 存在本机链接、未嵌入字体、原始文件名标题。
- Deletion Test (EN): Accept or strip tracked changes and comments, bring off-slide text inside slide bounds, embed PDF fonts, and set a clean document title.
- Deletion Test (ZH): 定稿前接受修订并清理批注，收回越界文本框，嵌入 PDF 字体并设置正式文档标题。

```text
bad:  PDF /Title (Microsoft Word - final_v3_edited(2).docx) with external link file:///Users/example/draft.docx
trap: PDF /Title (Untitled) with unembedded CIDFont
good: PDF /Title (Q4 Settlement Architecture Specification) with embedded subset fonts and relative HTTPS links
```

Atomic card: [office-pdf-hygiene.md](../rules/office-pdf-hygiene.md)
