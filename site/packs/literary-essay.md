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

## `literary-semicolon-tricolon`
- Tier: `taste` · Severity: `warning` · Family: `punctuation/tricolon`
- Modalities: `markdown, text, html, docx`
- EN: Balanced three-part semicolon sentence turns scene description into synthetic lyrical cadence.
- ZH: 单句连续用两个及以上分号排比景物或情绪，带有明显的生成式散文腔。
- Deletion Test (EN): Break the three-part balance into natural prose sentences and keep the one sensory detail that carries the scene.
- Deletion Test (ZH): 打破工整的三段分号排比，改成长短自然的叙述句，留住最具体的一两处感官细节。

```text
bad:  街道两旁的树叶逐渐染上金黄；午后的阳光变得柔和而绵长；行人的衣领也悄然立了起来。
trap: 树叶金黄。阳光柔和。衣领立起。
good: 午后阳光柔和，街道两旁的树叶已经发黄，路过的行人把衣领立了起来。
```

Atomic card: [literary-semicolon-tricolon.md](../rules/literary-semicolon-tricolon.md)

## `literary-rhetorical-qa`
- Tier: `taste` · Severity: `warning` · Family: `punctuation/rhetorical-qa`
- Modalities: `markdown, text, html, docx`
- EN: Staged self-answered rhetorical question ('Why does ...? Because ...') lectures the reader instead of showing the scene.
- ZH: 散文里出现自问自答式设问（`为什么……？因为……`），像主持词而非真实叙述。
- Deletion Test (EN): Cut the rhetorical question and describe what actually happened in the scene.
- Deletion Test (ZH): 删掉自问自答的铺陈，直接写现场发生了什么。

```text
bad:  At 6:30 a.m. he brewed a cup of pour-over coffee. Why does brewing pour-over coffee feel so grounding? Because the deliberate pace invites us to pause.
trap: Warm water. Slow pour. Quiet pause.
good: At 6:30 a.m. he brewed a cup of pour-over coffee.
```

Atomic card: [literary-rhetorical-qa.md](../rules/literary-rhetorical-qa.md)

## `literary-narrative-frame`
- Tier: `taste` · Severity: `warning` · Family: `structure/narrative-frame`
- Modalities: `markdown, text, html, docx`
- EN: Sweeping era opener ('In an era defined by...') or uplifting takeaway closer wraps a personal essay in an LLM template.
- ZH: 以宏大时代背景起笔（`在快节奏的都市生活中……`）或未来式鸡汤收尾，给随笔套上了模板外壳。
- Deletion Test (EN): Delete the opening era backdrop and the closing takeaway; start directly inside the concrete time, place, or object.
- Deletion Test (ZH): 删掉开头`在当今/快节奏的时代`与结尾升华句，直接从具体时间、地点或器物写起。

```text
bad:  In an era defined by relentless notifications, the street stays quiet before seven except for the milk truck. Moving forward, protecting small pockets of stillness remains essential for living with intention.
trap: Notifications beep. Milk truck passes. Stillness stays.
good: Before seven the street stays quiet except for the milk truck.
```

Atomic card: [literary-narrative-frame.md](../rules/literary-narrative-frame.md)
