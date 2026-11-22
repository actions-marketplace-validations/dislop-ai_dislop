---
content-type: reference-data
ruleId: literary-narrative-frame
pack: literary-essay
tier: taste
severity: warning
family: structure/narrative-frame
---

# Rule: `literary-narrative-frame`

- Pack: [`literary-essay`](../packs/literary-essay.md) · Tier: `taste` · Severity: `warning`
- Modalities: `markdown, text, html, docx`
- Human anchor: https://dislop.com/#rule-literary-narrative-frame

## What It Catches
- EN: Sweeping era opener ('In an era defined by...') or uplifting takeaway closer wraps a personal essay in an LLM template.
- ZH: 以宏大时代背景起笔（`在快节奏的都市生活中……`）或未来式鸡汤收尾，给随笔套上了模板外壳。

## Deletion Test
- EN: Delete the opening era backdrop and the closing takeaway; start directly inside the concrete time, place, or object.
- ZH: 删掉开头`在当今/快节奏的时代`与结尾升华句，直接从具体时间、地点或器物写起。

## Exemplar (Reference Data)

```text
bad:  In an era defined by relentless notifications, the street stays quiet before seven except for the milk truck. Moving forward, protecting small pockets of stillness remains essential for living with intention.
trap: Notifications beep. Milk truck passes. Stillness stays.
good: Before seven the street stays quiet except for the milk truck.
```
