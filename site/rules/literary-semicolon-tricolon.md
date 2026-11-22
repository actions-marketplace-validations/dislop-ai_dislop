---
content-type: reference-data
ruleId: literary-semicolon-tricolon
pack: literary-essay
tier: taste
severity: warning
family: punctuation/tricolon
---

# Rule: `literary-semicolon-tricolon`

- Pack: [`literary-essay`](../packs/literary-essay.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-literary-semicolon-tricolon

## What It Catches
- EN: Balanced three-part semicolon sentence turns scene description into synthetic lyrical cadence.
- ZH: 单句连续用两个及以上分号排比景物或情绪，带有明显的生成式散文腔。

## Deletion Test
- EN: Break the three-part balance into natural prose sentences and keep the one sensory detail that carries the scene.
- ZH: 打破工整的三段分号排比，改成长短自然的叙述句，留住最具体的一两处感官细节。

## Exemplar (Reference Data)

```text
bad:  街道两旁的树叶逐渐染上金黄；午后的阳光变得柔和而绵长；行人的衣领也悄然立了起来。
trap: 树叶金黄。阳光柔和。衣领立起。
good: 午后阳光柔和，街道两旁的树叶已经发黄，路过的行人把衣领立了起来。
```
