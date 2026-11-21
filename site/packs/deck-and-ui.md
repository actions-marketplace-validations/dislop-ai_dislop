---
content-type: reference-data
pack: deck-and-ui
tier: taste
version: 0.2.0
---

# Pack: `deck-and-ui` — Slide Deck, Web UI & Graphic Layout

> Audits PowerPoint slide word-walls, bullet caps, autofit text shrink, weak topic titles, default purple-pink AI gradients, pill-badge soup, triple nested cards, prompt-echo chrome, and SVG clipping.

检查幻灯片文字墙、项目符号超限、字号自动缩排、弱结论标题，以及界面紫粉渐变、胶囊徽章堆砌、三层套盒、提示词回声标签与 SVG 裁切风险。

## `slide-word-wall`
- Tier: `taste` · Severity: `warning` · Family: `deck/density`
- Modalities: `pptx`
- EN: Slide exceeds readable copy budget (> 120 Latin words or > 280 Chinese characters).
- ZH: 单页幻灯片可见文字超载（英文 > 120 词或中文 > 280 字），变成文档搬家。
- Deletion Test (EN): Move background narrative to speaker notes or an appendix doc; keep one takeaway headline and <= 3 supporting evidence points on the slide.
- Deletion Test (ZH): 将长篇背景移入演讲者备注或配套文档，画面仅保留 1 句结论标题与不超过 3 条核心论据。

```text
bad:  Slide 3 packs 215 words of full-sentence prose explaining migration history, rollback scripts, staffing, and Q4 SLA targets.
trap: Slide 3 shrinks body font to 9pt so all 215 words fit inside one rounded box.
good: Slide 3 headline: 'Zero-downtime migration cut p99 latency from 420 ms to 95 ms' + 3 short metric rows (54 words total); full runbook linked in notes.
```

Atomic card: [slide-word-wall.md](../rules/slide-word-wall.md)

## `slide-bullet-overload`
- Tier: `taste` · Severity: `warning` · Family: `deck/density`
- Modalities: `pptx`
- EN: Slide contains more than 6 bullet items (`maxSlideBullets`), fragmenting visual hierarchy.
- ZH: 单页幻灯片项目符号超过 6 条（`maxSlideBullets`），视觉层级碎裂。
- Deletion Test (EN): Group related bullets into 2–3 structured columns or split across two slides.
- Deletion Test (ZH): 将零散条目归并为 2–3 组结构化分栏，或拆分为两页演示。

```text
bad:  Slide lists 9 separate top-level bullets covering pricing, onboarding, compliance, SLA, and billing.
trap: Slide wraps 9 bullets into 9 tiny pill badges.
good: Slide groups commercial terms into 3 columns: Pricing ($49/seat), Onboarding (2 days), SLA (99.95%).
```

Atomic card: [slide-bullet-overload.md](../rules/slide-bullet-overload.md)

## `slide-autofit-shrink`
- Tier: `taste` · Severity: `warning` · Family: `deck/density`
- Modalities: `pptx`
- EN: PowerPoint `normAutofit` shrank text below 80% (`fontScale < 80000`) because copy overflowed its box.
- ZH: 文本框触发 PowerPoint 自动缩排（`fontScale < 80%`），表明文案超出容器容量。
- Deletion Test (EN): Trim the overflowing copy or enlarge the text frame so body type renders at 100% scale.
- Deletion Test (ZH): 精简溢出文案或调大文本框尺寸，使正文按 100% 原始字号清晰排布。

```text
bad:  <a:normAutofit fontScale="62500" lnSpcReduction="20000"/> on body placeholder
trap: Manually hardcode 10pt font so `normAutofit` disappears while text stays illegible.
good: <a:noAutofit/> with 42 words set at 18pt and full line spacing
```

Atomic card: [slide-autofit-shrink.md](../rules/slide-autofit-shrink.md)

## `slide-weak-topic-title`
- Tier: `taste` · Severity: `info` · Family: `deck/density`
- Modalities: `pptx`
- EN: Content-heavy slide uses a generic topic label (`Overview`, `Background`, `背景`) instead of stating its takeaway.
- ZH: 正文密集的幻灯片使用`背景/概述/总结`等空泛名词做标题，未直接亮出本页结论。
- Deletion Test (EN): Replace `Overview` with the one-sentence finding the audience should remember from this slide.
- Deletion Test (ZH): 把`项目背景/数据概述`替换为听众看完本页应记住的一句具体结论。

```text
bad:  Title: 'Background' (above 65 words detailing 38% cart abandonment on mobile Safari)
trap: Title: 'Reimagining Checkout Excellence'
good: Title: 'Mobile Safari accounts for 38% of cart abandonment due to 4-step address entry'
```

Atomic card: [slide-weak-topic-title.md](../rules/slide-weak-topic-title.md)

## `ui-ai-gradient`
- Tier: `taste` · Severity: `warning` · Family: `ui/slop-chrome`
- Modalities: `html, css, jsx, svg`
- EN: Default purple/indigo-to-pink generator gradient or gradient-clipped display headline.
- ZH: 使用默认紫粉/蓝紫高饱和渐变或渐变裁切艺术字标题（典型生成式模板特征）。
- Deletion Test (EN): Replace decorative neon gradients with solid surface tokens, crisp 1px rules, and typographic contrast.
- Deletion Test (ZH): 去掉装饰性霓虹渐变，改用克制的纯色纸面令牌、1px 结构分界线与字重对比。

```text
bad:  <h1 class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Release Notes v2.4</h1>
trap: <h1 class="bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">Release Notes v2.4</h1>
good: <h1 class="page-title">Release Notes v2.4</h1>
```

Atomic card: [ui-ai-gradient.md](../rules/ui-ai-gradient.md)

## `ui-pill-soup`
- Tier: `taste` · Severity: `warning` · Family: `ui/slop-chrome`
- Modalities: `html, jsx`
- EN: Excessive `rounded-full` / `999px` text pills (> 6 per view) turn interface metadata into badge soup.
- ZH: 单视图堆砌超过 6 个胶囊圆角文字标签（`rounded-full` / `999px`），导致视觉噪音泛滥。
- Deletion Test (EN): Render metadata as plain tabular text separated by middots (`·`) or hairlines; save one high-contrast label for actionable status.
- Deletion Test (ZH): 将常规元数据改为用间隔号（`·`）或细线分隔的纯文本，仅对需要干预的异常状态保留单枚强调标记。

```text
bad:  8 adjacent `rounded-full` badges on one card: `Active`, `v2.4`, `US-West`, `SOC2`, `Fast`, `AI`, `Pro`, `Verified`.
trap: 8 square pastel badges with 8 emoji icons on one card.
good: Plain mono metadata line: `v2.4 · us-west-2 · SOC2` + single status word `degraded` when unhealthy.
```

Atomic card: [ui-pill-soup.md](../rules/ui-pill-soup.md)

## `ui-box-in-box`
- Tier: `taste` · Severity: `warning` · Family: `ui/slop-chrome`
- Modalities: `html, jsx`
- EN: Three or more nested bordered/rounded containers wrap the same content (`box-in-box-in-box`).
- ZH: 连续三层及以上带边框与圆角的容器层层套盒，挤压有效内容空间。
- Deletion Test (EN): Remove outer wrapper borders and separate sections with alignment, whitespace, or a single 1px rule.
- Deletion Test (ZH): 去掉多余的外层描边套盒，改用对齐、留白或单根 1px 分界线组织层级。

```text
bad:  <div class="border rounded-xl p-6"><div class="border rounded-lg p-4"><div class="border rounded-md p-3">99.98% uptime</div></div></div>
trap: <div class="shadow-xl rounded-2xl p-6"><div class="shadow-md rounded-xl p-4"><div class="bg-slate-900 rounded-lg p-3">99.98% uptime</div></div></div>
good: <section class="metric-row"><span>Uptime (90d)</span><strong>99.98%</strong></section>
```

Atomic card: [ui-box-in-box.md](../rules/ui-box-in-box.md)

## `ui-prompt-echo-badge`
- Tier: `taste` · Severity: `warning` · Family: `ui/slop-chrome`
- Modalities: `html, jsx, svg`
- EN: Interface chrome echoes prompt-engineering hype (`AI-Powered`, `Zero Hallucination`) instead of naming the function.
- ZH: 界面标签直接回显提示词营销口号（如`AI 强力驱动``零幻觉保证`），未说明具体功能。
- Deletion Test (EN): Delete the `AI-Powered` badge; label the control by the exact task it performs ('Extract invoice totals', 'Check slide word count').
- Deletion Test (ZH): 删去`AI 驱动`装饰标牌，直接用控件完成的实际动作命名（如`核对幻灯片字数`）。

```text
bad:  <span class="eyebrow">AI-Powered · Zero Hallucination</span><h2>Document Checker</h2>
trap: <span class="eyebrow">Built for Craft · Pure Signal</span><h2>Document Checker</h2>
good: <h2>Document Linter for Markdown, HTML, DOCX & PPTX</h2>
```

Atomic card: [ui-prompt-echo-badge.md](../rules/ui-prompt-echo-badge.md)

## `svg-text-overflow-or-a11y`
- Tier: `taste` · Severity: `warning` · Family: `ui/slop-chrome`
- Modalities: `svg`
- EN: Standalone SVG contains `<text>` likely to clip outside `viewBox` on fallback fonts, or omits `<title>`/`aria-label`.
- ZH: 独立 SVG 中的 `<text>` 在回退字体下存在超出 `viewBox` 裁切风险，或缺少 `<title>`/`aria-label` 无障碍说明。
- Deletion Test (EN): Leave >= 12% horizontal safety margin for `<text>` inside `viewBox` (or convert wordmarks to `<path>` outlines) and include `<title>`.
- Deletion Test (ZH): 为 SVG `<text>` 预留充足宽度余量（或将品牌字标转为 `<path>` 轮廓），并补充 `<title>`。

```text
bad:  <svg viewBox="0 0 200 40"><text x="10" y="28" font-size="24">Long fallback string that clips past 200px</text></svg>
trap: <svg viewBox="0 0 200 40"><text x="10" y="28" font-size="5">Tiny 5px unreadable text</text></svg>
good: <svg viewBox="0 0 420 40" role="img" aria-label="Release timeline"><title>Release timeline</title><text x="16" y="26" font-size="16">Q1–Q4 rollout</text></svg>
```

Atomic card: [svg-text-overflow-or-a11y.md](../rules/svg-text-overflow-or-a11y.md)
