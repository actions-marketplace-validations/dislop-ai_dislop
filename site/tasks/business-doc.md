---
content-type: reference-data
task: business-doc
version: 0.2.0
---

# Task Bundle: Business Brief & Technical Proposal

Use this bundle when auditing or revising PRDs, architecture specs, memos, Word (`.docx`) reports, or bilingual executive briefs.

## 1. Core Principles

1. Clear all `core` invariant errors first (paths, placeholders, chatbot residue, Office revisions/raw Markdown).
2. Apply the Deletion Test to flagged prose phrases rather than swapping synonyms.
3. Preserve every number, qualifier (`up to`, `at least`, `最多`, `至少`), unit, date, URL, code span, and citation verbatim.
4. Reject second-order slogans (`"Not X, but Y"`, three-word staccato chains, 4-char Chinese slogan triads).

## 2. Active Rules

### Pack `core`
- [`local-path-leak`](../rules/local-path-leak.md) (`error`): Leaked local filesystem path or file:/// link.
- [`unfilled-placeholder`](../rules/unfilled-placeholder.md) (`error`): Unfilled template placeholder, broken Word reference field, or dummy copy.
- [`chatbot-artifact`](../rules/chatbot-artifact.md) (`error`): Unstripped chatbot wrapper sentence or AI search citation token.
- [`markdown-leak`](../rules/markdown-leak.md) (`error`): Raw Markdown syntax (`**bold**` or `## heading`) left unrendered inside an Office document.
- [`ui-dead-control`](../rules/ui-dead-control.md) (`error`): Anchor with dead `href="#"` / empty target, unlabeled button, or unexplained static `<button disabled>`.
- [`ui-contrast-and-dark-inversion`](../rules/ui-contrast-and-dark-inversion.md) (`error`): Resolvable foreground/background contrast fails WCAG AA (< 4.5:1), or dark-theme canvas is brighter than raised surface tokens.
- [`office-pdf-hygiene`](../rules/office-pdf-hygiene.md) (`error`): Off-slide text box in PPTX, unaccepted tracked changes/comments in Office docs, or PDF metadata/font/URI defect.

### Pack `business-brief`
- [`en-throat-clearing-opener`](../rules/en-throat-clearing-opener.md) (`warning`): Throat-clearing opener delays the concrete point.
- [`en-cliche-lexicon`](../rules/en-cliche-lexicon.md) (`info`): Stock promotional phrase where a specific verb or measurement would carry more weight.
- [`zh-bureaucratic-padding`](../rules/zh-bureaucratic-padding.md) (`warning`): Chinese bureaucratic buzzword or throat-clearing filler.
- [`negation-pivot-frame`](../rules/negation-pivot-frame.md) (`warning`): Second-order `Not X, but Y` / `不是 A，而是 B` rhetorical pivot elevates an abstract slogan instead of stating a concrete fact.
- [`staccato-slogan-run`](../rules/staccato-slogan-run.md) (`warning`): Three or more consecutive ultra-short slogan fragments mimic dramatic copywriting cadence.
- [`zh-four-char-triad`](../rules/zh-four-char-triad.md) (`warning`): Chained four-character Chinese slogan triad pads prose without measurable detail.
- [`unsourced-attribution`](../rules/unsourced-attribution.md) (`warning`): Vague authority claim (`studies show`, `业内人士指出`) without a named source, link, or citation.
- [`bold-lead-list-wall`](../rules/bold-lead-list-wall.md) (`info`): Run of 4+ `- **Label**: description` bullets reads like an unedited LLM summary wall.

## 3. Reference Contrast

```text
bad:  值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至 45 秒内。
trap: 这不是一次工单改造，而是客服体验的底气：首响压缩至 45 秒内。
good: 本次改造按问题紧急度拆分工单队列，一线客服首次响应时间压缩至 45 秒内。
```

## 4. Deterministic Verification Command

```bash
npx --yes github:dislop-ai/dislop check brief.md --pack business-brief
npx --yes github:dislop-ai/dislop verify brief.before.md brief.after.md
```

Deep dives: [Pack `business-brief`](../packs/business-brief.md) · [Deletion Test](../methodology/deletion-test.md) · [Skill](../tools/skill.md)
