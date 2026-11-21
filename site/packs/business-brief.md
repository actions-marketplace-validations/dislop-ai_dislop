---
content-type: reference-data
pack: business-brief
tier: taste
version: 0.2.0
---

# Pack: `business-brief` — Business Brief & Technical Proposal

> Flags throat-clearing openers, bureaucratic padding, second-order negation pivots (`Not X, but Y`), staccato slogan chains, four-character triads, and unsourced claims.

检出铺垫废话、空洞套话、二阶对比口号（`不是 A，而是 B`）、断句口号链、四字排比串与无出处归因。

## `en-throat-clearing-opener`
- Tier: `taste` · Severity: `warning` · Family: `frame/opener`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Throat-clearing opener delays the concrete point.
- ZH: 英文铺垫式开场白拖延了核心事实。
- Deletion Test (EN): Cut everything up to 'that' or the comma. Does the remaining clause already state the full observation or constraint?
- Deletion Test (ZH): 删掉前半句铺垫壳，看剩下的主干是否已经完整表达了事实或限制条件。

```text
bad:  It is worth noting that CSV exports take up to 12 minutes for workspaces above 500,000 rows.
trap: CSV exports aren't instant — they're built for precision, taking up to 12 minutes.
good: CSV exports take up to 12 minutes for workspaces above 500,000 rows.
```

Atomic card: [en-throat-clearing-opener.md](../rules/en-throat-clearing-opener.md)

## `en-cliche-lexicon`
- Tier: `taste` · Severity: `info` · Family: `lexicon/cliche`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Stock promotional phrase where a specific verb or measurement would carry more weight.
- ZH: 高频公关套语，建议替换为具体动作或实测指标。
- Deletion Test (EN): If you delete this modifier, which concrete mechanism, metric, or trade-off disappears? State that fact directly.
- Deletion Test (ZH): 如果删掉这个修饰语，读者会少知道哪项机制、指标或取舍？直接写出那项事实。

```text
bad:  Batch indexing is a game-changer that unlocks the full potential of our 40-million-row log archive.
trap: This isn't indexing. It's instant recall across 40 million rows.
good: Batch indexing cuts 40-million-row log queries from 19 seconds to 1.4 seconds.
```

Atomic card: [en-cliche-lexicon.md](../rules/en-cliche-lexicon.md)

## `zh-bureaucratic-padding`
- Tier: `taste` · Severity: `warning` · Family: `lexicon/cliche`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Chinese bureaucratic buzzword or throat-clearing filler.
- ZH: 存在空泛汇报套词或铺垫口头禅，掩盖了具体动作、主体与结果。
- Deletion Test (EN): Ask 'who changed what, by how much, under what constraint?' and delete the abstract wrapper.
- Deletion Test (ZH): 追问`谁对什么做了哪项改动、指标变了多少`，删掉抽象包装词。

```text
bad:  值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至 45 秒内。
trap: 这不是一次工单改造，而是客服体验的底气：首响压缩至 45 秒内。
good: 本次改造按问题紧急度拆分工单队列，一线客服首次响应时间压缩至 45 秒内。
```

Atomic card: [zh-bureaucratic-padding.md](../rules/zh-bureaucratic-padding.md)

## `negation-pivot-frame`
- Tier: `taste` · Severity: `warning` · Family: `frame/negation-pivot`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Second-order `Not X, but Y` / `不是 A，而是 B` rhetorical pivot elevates an abstract slogan instead of stating a concrete fact.
- ZH: 二阶`不是 A，而是 B`对比修辞：先否定稻草人再拔高抽象概念，缺乏具体事实增量。
- Deletion Test (EN): Delete the negated first half ('Not X,'). If the remaining clause ('Y') holds no measurement, mechanism, or real correction, rewrite or cut the whole sentence.
- Deletion Test (ZH): 删掉前半句否定铺垫，只看`而是 B`。如果 B 没有数值、机制或真实纠偏信息，整句删改。

```text
bad:  这不是一款简单的文档检查工具，而是交付质量的底气。
trap: 工具已至。底气自生。交付无忧。
good: `dislop` 在发稿前标出本机路径泄露、未填占位符和超载幻灯片。
```

Atomic card: [negation-pivot-frame.md](../rules/negation-pivot-frame.md)

## `staccato-slogan-run`
- Tier: `taste` · Severity: `warning` · Family: `frame/staccato`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Three or more consecutive ultra-short slogan fragments mimic dramatic copywriting cadence.
- ZH: 连续三个及以上超短断句口号（第二代 AI 戏剧化腔调）。
- Deletion Test (EN): Combine the fragments into one factual sentence naming the cause and effect, or cut purely decorative rhythm beats.
- Deletion Test (ZH): 把零碎口号合并为一句交代因果与边界的完整陈述，删去纯节奏铺陈。

```text
bad:  Signals drop. Photos vanish. Audits stall. Offline sync keeps all 120 inspection photos queued locally.
trap: Offline sync isn't a fallback — it's field resilience for 120 photos.
good: When cellular coverage drops in basement vaults, offline sync queues up to 120 inspection photos locally until reconnection.
```

Atomic card: [staccato-slogan-run.md](../rules/staccato-slogan-run.md)

## `zh-four-char-triad`
- Tier: `taste` · Severity: `warning` · Family: `frame/triad`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Chained four-character Chinese slogan triad pads prose without measurable detail.
- ZH: 连续三个及以上四字套语并列（如`精准高效、安全可靠、灵活易用`），信息密度低。
- Deletion Test (EN): Delete all three adjectives; keep only claims backed by a number, failure mode, or configuration option.
- Deletion Test (ZH): 删掉整组四字形容词，只保留有数字、故障边界或配置项支撑的具体事实。

```text
bad:  新版网关具备精准高效、安全可靠、灵活易用的特性，单节点支持 8,000 QPS。
trap: 新版网关不是简单升级，而是 8,000 QPS 的性能飞跃。
good: 新版网关单节点支持 8,000 QPS，并在上游超时 2 秒后自动熔断。
```

Atomic card: [zh-four-char-triad.md](../rules/zh-four-char-triad.md)

## `unsourced-attribution`
- Tier: `taste` · Severity: `warning` · Family: `evidence/unsourced`
- Modalities: `markdown, text, html, docx, pptx`
- EN: Vague authority claim (`studies show`, `业内人士指出`) without a named source, link, or citation.
- ZH: 出现`研究表明/数据显示/业内人士指出`等模糊权威背书，但句内无具体机构、年份、链接或引用标记。
- Deletion Test (EN): Name the exact dataset, report year, or footnote `[n]`; if no source exists, delete the claim.
- Deletion Test (ZH): 补齐具体报告名称、年份或引用编号 `[n]`；若查无实据则直接删去该判断。

```text
bad:  Industry research shows that 70% of enterprise decks fail basic accessibility checks.
trap: Everyone knows most enterprise decks fail basic accessibility checks.
good: In our audit of 48 internal Q3 review decks, 31 contained at least one low-contrast caption (< 4.5:1).
```

Atomic card: [unsourced-attribution.md](../rules/unsourced-attribution.md)

## `bold-lead-list-wall`
- Tier: `taste` · Severity: `info` · Family: `frame/list-wall`
- Modalities: `markdown, text`
- EN: Run of 4+ `- **Label**: description` bullets reads like an unedited LLM summary wall.
- ZH: 连续 4 条及以上 `- **小标题**：说明` 列表墙，呈现典型大模型平铺罗列感。
- Deletion Test (EN): If the items argue one thesis, turn them into a short paragraph; keep bulleted bold labels only for true reference tables, CLI flags, or glossaries.
- Deletion Test (ZH): 如果是在阐述同一观点，改写为有主次逻辑的自然段；仅在参数说明、术语表或清单核对时保留加粗列表。

```text
bad:  - **Speed**: Runs fast locally.
- **Privacy**: Keeps files offline.
- **Modularity**: Uses JSON packs.
- **Clarity**: Prints line numbers.
trap: Speed. Privacy. Modularity. Clarity.
good: `dislop` runs locally with no network calls, loads rules from plain JSON packs, and prints exact file and line coordinates.
```

Atomic card: [bold-lead-list-wall.md](../rules/bold-lead-list-wall.md)
