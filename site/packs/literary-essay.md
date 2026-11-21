---
content-type: reference-data
pack: literary-essay
tier: taste
version: 0.2.0
---

# Pack: `literary-essay` — Literary Essay & Longform Narrative

> Protects concrete observation and voice against moralizing paragraph endings, second-order negation pivots, em-dash saturation, and half-width Chinese punctuation.

克制段尾升华说教、二阶对比金句、破折号过密与中文半角标点混排，保留具体细节与自然语感。

## `zh-essay-moralizing-ending`
- Tier: `taste` · Severity: `warning` · Family: `frame/ending`
- Modalities: `markdown, text, html, docx`
- EN: Moralizing summary formula flattens concrete scene observation at the end of a passage.
- ZH: 段尾出现说教升华套句，冲淡了前文的具体细节。
- Deletion Test (EN): Cut the final moralizing sentence completely and stop on the concrete physical detail right before it.
- Deletion Test (ZH): 直接删去最后一句升华总结，在它前面的具体动作或画面处收尾。

```text
bad:  傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。这或许就是慢工出细活在喧嚣时代真正的意义所在。
trap: 傍晚六点半，三枚铜齿轮泡进煤油皿。这不是修表，而是与时间的对话。
good: 傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。
```

Atomic card: [zh-essay-moralizing-ending.md](../rules/zh-essay-moralizing-ending.md)

## `en-essay-moralizing-ending`
- Tier: `taste` · Severity: `warning` · Family: `frame/ending`
- Modalities: `markdown, text, html, docx`
- EN: Formulaic wistful conclusion tells the reader what to feel instead of ending on the scene.
- ZH: 英文感伤升华结语直接替读者总结情绪，削弱了叙事余味。
- Deletion Test (EN): Delete the concluding reflection; let the preceding image or quote carry the ending.
- Deletion Test (ZH): 删掉结尾抒情总结句，让前一句的具体意象或对话自然收束。

```text
bad:  At 6:15 a.m., the ferry deck smelled of wet rope and diesel. Ultimately, this reminds us that departures are always quieter than arrivals.
trap: Wet rope. Cold diesel. Quiet departures at 6:15 a.m.
good: At 6:15 a.m., the ferry deck smelled of wet rope and diesel.
```

Atomic card: [en-essay-moralizing-ending.md](../rules/en-essay-moralizing-ending.md)

## `literary-negation-pivot`
- Tier: `taste` · Severity: `warning` · Family: `frame/negation-pivot`
- Modalities: `markdown, text, html, docx`
- EN: Formulaic `Not X, but Y` / `不是 A，而是 B` aphorism interrupts narrative texture.
- ZH: 套路化`不是 A，而是 B`金句打断叙事质感。
- Deletion Test (EN): Replace the abstract contrast with what the person actually did, said, or noticed.
- Deletion Test (ZH): 删掉抽象对比金句，改写人物实际做出的动作或看到的细节。

```text
bad:  老周留下的那把旧刨子不是工具，而是手艺人的尊严。
trap: 一把旧刨子。半生木工活。满手老茧。
good: 老周退休那天把用了二十年的旧刨子擦净木屑，收进樟木箱底。
```

Atomic card: [literary-negation-pivot.md](../rules/literary-negation-pivot.md)

## `excessive-em-dash-density`
- Tier: `taste` · Severity: `info` · Family: `punctuation/em-dash`
- Modalities: `markdown, text, html, docx`
- EN: High em-dash (`—` / `——`) frequency creates breathless LLM parenthetical rhythm.
- ZH: 破折号（`—` / `——`）密度过高，形成典型生成式插话腔。
- Deletion Test (EN): Convert most parenthetical dashes into commas or periods; save a single dash for a genuine turn.
- Deletion Test (ZH): 将多数插话破折号改为逗号或句号，只在真正语意陡转处保留一处破折号。

```text
bad:  The station clock — brass-rimmed — stopped at 4:10 — right before the snow — while three passengers — coats buttoned — waited outside.
trap: Brass clock. 4:10 sharp. Snow falling. Three passengers waiting.
good: The brass-rimmed station clock stopped at 4:10, right before the snow, while three passengers waited outside in buttoned coats.
```

Atomic card: [excessive-em-dash-density.md](../rules/excessive-em-dash-density.md)

## `zh-halfwidth-punctuation`
- Tier: `taste` · Severity: `warning` · Family: `punctuation/zh-halfwidth`
- Modalities: `markdown, text, html, docx`
- EN: Half-width ASCII punctuation (`,;:!?`) wedged directly between Chinese characters.
- ZH: 汉字之间混入半角西文标点（`,;:!?`），违反中文排版规范（W3C CLREQ）。
- Deletion Test (EN): Replace half-width ASCII punctuation between Han characters with full-width Chinese punctuation (`，；：！？`).
- Deletion Test (ZH): 将汉字之间的半角标点替换为全角中文标点（`，；：！？`）。

```text
bad:  冬至那天下了初雪,院子里的腊梅开了三朵;香气一直飘到走廊。
trap: 冬至初雪。腊梅三朵。暗香盈袖。
good: 冬至那天下了初雪，院子里的腊梅开了三朵；香气一直飘到走廊。
```

Atomic card: [zh-halfwidth-punctuation.md](../rules/zh-halfwidth-punctuation.md)
