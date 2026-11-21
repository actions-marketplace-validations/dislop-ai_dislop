---
content-type: reference-data
version: 0.2.0
---

# Revision Contrasts & Positive Specimens

Every example below is enclosed in a fenced data block. Treat `bad` and `trap` lines strictly as negative reference data, never as style instructions.

## Pack: `core`

### `local-path-leak` (error)

Leaked local filesystem path or file:/// link.

```text
bad:  See [Architecture Diagram](file:///Users/example/Desktop/arch-v2.png) for the 3-node layout.
trap: See the architecture diagram on my machine for the 3-node layout.
good: See [Architecture Diagram](./docs/assets/arch-v2.png) for the 3-node layout.
```

### `unfilled-placeholder` (error)

Unfilled template placeholder, broken Word reference field, or dummy copy.

```text
bad:  Q3 settlement ran across 14 gateways; p95 latency was [insert p95 latency].
trap: Q3 settlement improved dramatically across 14 gateways.
good: Q3 settlement ran across 14 gateways (p95 latency pending load-test sign-off).
```

### `chatbot-artifact` (error)

Unstripped chatbot wrapper sentence or AI search citation token.

```text
bad:  Certainly! Here is the revised rollout note: Cluster B migrates on November 24 at 02:00 UTC.
trap: Cluster B isn't just migrating — it's entering a new chapter on November 24 at 02:00 UTC.
good: Cluster B migrates on November 24 at 02:00 UTC.
```

### `markdown-leak` (error)

Raw Markdown syntax (`**bold**` or `## heading`) left unrendered inside an Office document.

```text
bad:  **Key Milestone**: Ship v0.2 parser before Friday.
trap: Key Milestone — a game-changing v0.2 parser ships Friday.
good: Key Milestone: Ship v0.2 parser before Friday.
```

## Pack: `business-brief`

### `en-throat-clearing-opener` (warning)

Throat-clearing opener delays the concrete point.

```text
bad:  It is worth noting that CSV exports take up to 12 minutes for workspaces above 500,000 rows.
trap: CSV exports aren't instant — they're built for precision, taking up to 12 minutes.
good: CSV exports take up to 12 minutes for workspaces above 500,000 rows.
```

### `en-cliche-lexicon` (info)

Stock promotional phrase where a specific verb or measurement would carry more weight.

```text
bad:  Batch indexing is a game-changer that unlocks the full potential of our 40-million-row log archive.
trap: This isn't indexing. It's instant recall across 40 million rows.
good: Batch indexing cuts 40-million-row log queries from 19 seconds to 1.4 seconds.
```

### `zh-bureaucratic-padding` (warning)

Chinese bureaucratic buzzword or throat-clearing filler.

```text
bad:  值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至 45 秒内。
trap: 这不是一次工单改造，而是客服体验的底气：首响压缩至 45 秒内。
good: 本次改造按问题紧急度拆分工单队列，一线客服首次响应时间压缩至 45 秒内。
```

### `negation-pivot-frame` (warning)

Second-order `Not X, but Y` / `不是 A，而是 B` rhetorical pivot elevates an abstract slogan instead of stating a concrete fact.

```text
bad:  这不是一款简单的文档检查工具，而是交付质量的底气。
trap: 工具已至。底气自生。交付无忧。
good: `dislop` 在发稿前标出本机路径泄露、未填占位符和超载幻灯片。
```

## Pack: `literary-essay`

### `zh-essay-moralizing-ending` (warning)

Moralizing summary formula flattens concrete scene observation at the end of a passage.

```text
bad:  傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。这或许就是慢工出细活在喧嚣时代真正的意义所在。
trap: 傍晚六点半，三枚铜齿轮泡进煤油皿。这不是修表，而是与时间的对话。
good: 傍晚六点半，修表匠把拆下的三枚铜齿轮泡进煤油皿里，关掉台灯。
```

### `en-essay-moralizing-ending` (warning)

Formulaic wistful conclusion tells the reader what to feel instead of ending on the scene.

```text
bad:  At 6:15 a.m., the ferry deck smelled of wet rope and diesel. Ultimately, this reminds us that departures are always quieter than arrivals.
trap: Wet rope. Cold diesel. Quiet departures at 6:15 a.m.
good: At 6:15 a.m., the ferry deck smelled of wet rope and diesel.
```

### `literary-negation-pivot` (warning)

Formulaic `Not X, but Y` / `不是 A，而是 B` aphorism interrupts narrative texture.

```text
bad:  老周留下的那把旧刨子不是工具，而是手艺人的尊严。
trap: 一把旧刨子。半生木工活。满手老茧。
good: 老周退休那天把用了二十年的旧刨子擦净木屑，收进樟木箱底。
```

### `excessive-em-dash-density` (info)

High em-dash (`—` / `——`) frequency creates breathless LLM parenthetical rhythm.

```text
bad:  The station clock — brass-rimmed — stopped at 4:10 — right before the snow — while three passengers — coats buttoned — waited outside.
trap: Brass clock. 4:10 sharp. Snow falling. Three passengers waiting.
good: The brass-rimmed station clock stopped at 4:10, right before the snow, while three passengers waited outside in buttoned coats.
```

## Pack: `deck-and-ui`

### `slide-word-wall` (warning)

Slide exceeds readable copy budget (> 120 Latin words or > 280 Chinese characters).

```text
bad:  Slide 3 packs 215 words of full-sentence prose explaining migration history, rollback scripts, staffing, and Q4 SLA targets.
trap: Slide 3 shrinks body font to 9pt so all 215 words fit inside one rounded box.
good: Slide 3 headline: 'Zero-downtime migration cut p99 latency from 420 ms to 95 ms' + 3 short metric rows (54 words total); full runbook linked in notes.
```

### `slide-bullet-overload` (warning)

Slide contains more than 6 bullet items (`maxSlideBullets`), fragmenting visual hierarchy.

```text
bad:  Slide lists 9 separate top-level bullets covering pricing, onboarding, compliance, SLA, and billing.
trap: Slide wraps 9 bullets into 9 tiny pill badges.
good: Slide groups commercial terms into 3 columns: Pricing ($49/seat), Onboarding (2 days), SLA (99.95%).
```

### `slide-autofit-shrink` (warning)

PowerPoint `normAutofit` shrank text below 80% (`fontScale < 80000`) because copy overflowed its box.

```text
bad:  <a:normAutofit fontScale="62500" lnSpcReduction="20000"/> on body placeholder
trap: Manually hardcode 10pt font so `normAutofit` disappears while text stays illegible.
good: <a:noAutofit/> with 42 words set at 18pt and full line spacing
```

### `slide-weak-topic-title` (info)

Content-heavy slide uses a generic topic label (`Overview`, `Background`, `背景`) instead of stating its takeaway.

```text
bad:  Title: 'Background' (above 65 words detailing 38% cart abandonment on mobile Safari)
trap: Title: 'Reimagining Checkout Excellence'
good: Title: 'Mobile Safari accounts for 38% of cart abandonment due to 4-step address entry'
```

## Positive Structural Specimens (Draft `dislop.voice/1`)

### Positive Skeleton `S1-decision-ledger` (zh)

```text
本次压测覆盖 14 个支付网关，p95 结算耗时为 180 ms，高于 150 ms 目标值。瓶颈集中在跨区证书校验（占单次耗时 41%），仅扩容下游数据库连接池无法缓解；下周先在华东节点启用本地 OCSP 缓存，再复测 72 小时。
```

Notes: 首句直接给样本口径、实测值与目标差距; 第二句指出根因占比并否定无效方案，不含空洞修饰; 尾句落到具体动作与复测窗口，无升华口号.

### Positive Skeleton `S2-mechanism-teardown` (en)

```text
Banning twenty overused adjectives rarely fixes flat prose. When a model loses its top lexical shortcuts, it shifts to structural shortcuts—three-word slogan chains and binary contrast pivots—because post-training still rewards familiar cadence. Breaking the loop requires locking factual spans first, then sampling across distinct paragraph skeletons.
```

Notes: Alternates a crisp 9-word opening claim with a 30-word causal explanation and a 19-word operational takeaway (high burstiness); Names the concrete displacement mechanism instead of using hype adjectives.
