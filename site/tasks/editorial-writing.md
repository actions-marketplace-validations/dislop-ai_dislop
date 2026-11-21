---
content-type: reference-data
task: editorial-writing
version: 0.2.0
---

# Task Bundle: Editorial & Literary Writing

Use this bundle for longform essays, non-fiction reporting, and narrative drafts in English or Chinese.

## 1. Editorial Principles

1. Stop on the concrete physical detail or direct observation instead of adding a moralizing closing sentence.
2. Cut formulaic `"Not X, but Y"` / `"不是 A，而是 B"` aphorisms unless stating a literal factual correction.
3. Keep em-dash density restrained (`<= 4` per 300 words) and avoid half-width ASCII punctuation wedged between Chinese characters.
4. Preserve natural sentence-length burstiness rather than flattening every sentence to uniform length.

## 2. Active Rules

### Pack `core`
- [`local-path-leak`](../rules/local-path-leak.md) (`error`): Leaked local filesystem path or file:/// link.
- [`unfilled-placeholder`](../rules/unfilled-placeholder.md) (`error`): Unfilled template placeholder, broken Word reference field, or dummy copy.
- [`chatbot-artifact`](../rules/chatbot-artifact.md) (`error`): Unstripped chatbot wrapper sentence or AI search citation token.
- [`markdown-leak`](../rules/markdown-leak.md) (`error`): Raw Markdown syntax (`**bold**` or `## heading`) left unrendered inside an Office document.
- [`ui-dead-control`](../rules/ui-dead-control.md) (`error`): Anchor with dead `href="#"` / empty target, unlabeled button, or unexplained static `<button disabled>`.
- [`ui-contrast-and-dark-inversion`](../rules/ui-contrast-and-dark-inversion.md) (`error`): Resolvable foreground/background contrast fails WCAG AA (< 4.5:1), or dark-theme canvas is brighter than raised surface tokens.
- [`office-pdf-hygiene`](../rules/office-pdf-hygiene.md) (`error`): Off-slide text box in PPTX, unaccepted tracked changes/comments in Office docs, or PDF metadata/font/URI defect.

### Pack `literary-essay`
- [`zh-essay-moralizing-ending`](../rules/zh-essay-moralizing-ending.md) (`warning`): Moralizing summary formula flattens concrete scene observation at the end of a passage.
- [`en-essay-moralizing-ending`](../rules/en-essay-moralizing-ending.md) (`warning`): Formulaic wistful conclusion tells the reader what to feel instead of ending on the scene.
- [`literary-negation-pivot`](../rules/literary-negation-pivot.md) (`warning`): Formulaic `Not X, but Y` / `不是 A，而是 B` aphorism interrupts narrative texture.
- [`excessive-em-dash-density`](../rules/excessive-em-dash-density.md) (`info`): High em-dash (`—` / `——`) frequency creates breathless LLM parenthetical rhythm.
- [`zh-halfwidth-punctuation`](../rules/zh-halfwidth-punctuation.md) (`warning`): Half-width ASCII punctuation (`,;:!?`) wedged directly between Chinese characters.

## 3. Reference Contrast

```text
bad:  傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。这或许就是慢工出细活在喧嚣时代真正的意义所在。
trap: 傍晚六点半，三枚铜齿轮泡进煤油皿。这不是修表，而是与时间的对话。
good: 傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。
```

## 4. Deterministic Verification Command

```bash
npx --yes github:dislop-ai/dislop check essay.md --pack literary-essay --lang zh
npx --yes github:dislop-ai/dislop verify essay.before.md essay.after.md --pack literary-essay
```

Deep dives: [Pack `literary-essay`](../packs/literary-essay.md) · [Positive Divergence](../methodology/positive-divergence.md)
