# Anti-Slop Resource Radar & Structured Snapshot

> 核验快照：**2026-11-21** · 收录总数：**87** 条 · 单一事实源：[anti-slop-radar-index.json](./anti-slop-radar-index.json) · 深度研报：[anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md)
>
> 本页面直接由 JSON 单一事实源 1:1 渲染生成，确保条数、链接、星标、日期、协议与分类标签完全一致。所有 GitHub 仓库星标与推送日期均经 API 实测核验（实时变动）。

## 1. 四维分类坐标（Taxonomy）

| 维度 | 可选枚举 | 说明 |
|---|---|---|
| `modality` | `prose` · `ui-design` · `diagram-media` · `code-pr` · `academic` · `multi-modal` | 目标媒介类型 |
| `locale` | `en` · `zh` · `multilingual` · `ko` · `ja` · `tr` | 主要覆盖语种 |
| `stages` | `upstream-prompt` · `midstream-rewrite` · `downstream-lint` · `benchmark-policy` · `model-level` | 可多选，标记介入环节 |
| `format` | `agent-skill` · `cli-linter` · `browser-tool` · `policy-standard` · `benchmark-dataset` · `awesome-list` · `github-action` · `pipeline-app` | 交付形态 |

```text
                       [ 生成前 / 上游 ]              [ 改写期 / 中游 ]             [ 发稿前 / 下游确定性检查 ]
文稿 (Prose)      -->  stop-slop / no-ai-slop   -->  humanizer / shuorenhua    -->  sloptrim / lieflat / Vale / dislop
前端 (UI/SVG)     -->  taste-skill / impeccable -->  unslop / hallmark         -->  impeccable detect / taste-skill gate / dislop
办公文档 (Office) -->  (尚无主流开源标准)        -->  人工 / Agent 局部修订      -->  dislop (.docx/.pptx/.pdf) / sloptrim (.docx)
代码 (Code/PR)    -->  Ghostty AI_POLICY        -->  desloppify / cursor deslop -->  dmmulroy/anti-slop / aislop / peakoss Action
图表与多模态      -->  diagram-design / SRPO    -->  motionmaxxing             -->  dislop (SVG 文字越界风险与对比度)
```

## 2. 权威规范、学术研究与社区政策

公认定义、实证研究、技能格式规范与开源治理公告。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [Wikipedia: Signs of AI writing (WP:AISIGNS)](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | — | — | — | `en` / `prose` | `benchmark-policy` (`policy-standard`) | 否 | 英语维基百科 WikiProject AI Cleanup 维护的活规范，归类夸大意义、高频词、三段式、否定平行、残留寒暄与标记瑕疵，是多个开源写作技能的共同语料源头。 |
| [Simon Willison: Slop 概念源文](https://simonwillison.net/2024/May/8/slop/) | — | — | — | `en` / `multi-modal` | `benchmark-policy` (`policy-standard`) | 否 | 2024-05-08 发布，提出将未经请求且未经审阅的 AI 生成内容称为 slop（类比垃圾邮件 spam），奠定行业讨论口径。 |
| [Kobak et al. (arXiv:2406.07016 / Science Advances)](https://arxiv.org/abs/2406.07016) | — | — | — | `en` / `academic` | `benchmark-policy` (`benchmark-dataset`) | 否 | 分析 1,500 万篇 PubMed 摘要的超额词汇，推算 2024 年至少 13.5% 的生物医学摘要经 LLM 处理或辅助（下界估计，2025-07 刊于 Science Advances）。 |
| [EQ-Bench Slop Score](https://eqbench.com/slop-score.html) | — | — | — | `en` / `prose` | `benchmark-policy` + `downstream-lint` (`benchmark-dataset`) | 是 | 公开可解释的复合指标（60% 高频词 + 25% 对比句式 + 15% 高频三元组），用于跨模型横向对照文本模板化程度。 |
| [sam-paech/slop-score](https://github.com/sam-paech/slop-score) | 43 | 2025-11-22 | 未声明 | `en` / `prose` | `benchmark-policy` + `downstream-lint` (`cli-linter`) | 是 | EQ-Bench Slop Score 的公开评分实现代码。 |
| [StoryScope (arXiv:2604.03136)](https://arxiv.org/abs/2604.03136) | — | — | — | `en` / `prose` | `benchmark-policy` (`benchmark-dataset`) | 否 | 面向虚构叙事结构修复的研究框架，被多语种技能 Nanako0129/sepia 用作叙事层理论依据。 |
| [Agent Skills Specification](https://agentskills.io/specification) | — | — | — | `en` / `multi-modal` | `benchmark-policy` (`policy-standard`) | 否 | 跨 Agent 工具通用的 SKILL.md 目录与清单格式规范，独立于各家分发注册中心。 |
| [skills.sh Registry & CLI Docs](https://skills.sh/docs) | — | — | — | `en` / `multi-modal` | `benchmark-policy` (`policy-standard`) | 否 | 面向 Agent Skills 的公共注册中心与安装量榜单文档，已承接大量写作与前端去 AI 味技能的发现层流量。 |
| [Ghostty AI_POLICY.md](https://github.com/ghostty-org/ghostty/blob/main/AI_POLICY.md) | 64,293 | 2026-11-20 | MIT | `en` / `code-pr` | `benchmark-policy` (`policy-standard`) | 否 | Mitchell Hashimoto 确立的开源 AI 贡献政策：仅限预批准 Issue、强制工具披露，且贡献者必须独立理解全部代码。 |
| [Daniel Stenberg: The end of the curl bug bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/) | — | — | — | `en` / `code-pr` | `benchmark-policy` (`policy-standard`) | 否 | curl 维护者 2026-01-26 官方公告：因大量低质 AI 漏洞报告导致有效率从 >15% 跌至 <5%，决定于 2026-01-31 关闭赏金计划。 |
| [tldraw: Stay away from my trash! (Issue #7695)](https://github.com/tldraw/tldraw/issues/7695) | — | — | — | `en` / `code-pr` | `benchmark-policy` (`policy-standard`) | 否 | tldraw 维护者 2026-01 公告，因外部低质 AI PR 激增而采取自动关闭外部 PR 的防御措施。 |
| [Substack: How writers are reacting to AI detection](https://on.substack.com/p/how-writers-are-reacting-to-substacks) | — | — | — | `en` / `prose` | `benchmark-policy` (`policy-standard`) | 否 | Substack 官方汇总创作者对平台引入第三方 AI 检测工具的支持与担忧（含误报顾虑）。 |
| [Product Hunt State of Tech Discovery (Q2 2026)](https://www.producthunt.com/p/general/product-hunt-s-state-of-tech-discovery-q2-2026) | — | — | — | `en` / `ui-design` | `benchmark-policy` (`policy-standard`) | 否 | Product Hunt 2026 Q2 行业报告，反映 AI 辅助开发背景下的产品发布供给趋势。 |

## 3. 英语与多语种写作去 AI 味工具

面向英语、韩语、日语、土耳其语及跨语种的写作与学术改稿技能。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [blader/humanizer](https://github.com/blader/humanizer) | 71,724 | 2026-11-19 | MIT | `en` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 基于 WP:AISIGNS 的高星英语改写技能，支持导入作者样稿做语感校准。 |
| [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) | 19,097 | 2026-03-17 | MIT | `en` / `prose` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 偏严格编辑部规范的去套话技能，分拆 phrases、structures、examples 文件并配五维自评。 |
| [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) | 13,681 | 2026-09-02 | MIT | `en` / `prose` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 覆盖 20+ 英文句式模式，配套文章提出 25/50/25 人机协作改稿分工。 |
| [Adkid-Zephyr/anti-defensive-writing-Skill](https://github.com/Adkid-Zephyr/anti-defensive-writing-Skill) | 6,919 | 2026-11-15 | MIT | `multilingual` / `academic` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 中英双语学术技能，针对论文中过度防御性限定与空泛辩护段落。 |
| [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) | 6,696 | 2026-11-17 | MIT | `ko` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 韩语去 AI 味与反翻译腔润色技能，体现非英语母语语感修复的活跃度。 |
| [AIScientists-Dev/academic-humanizer](https://github.com/AIScientists-Dev/academic-humanizer) | 5,761 | 2026-07-03 | MIT | `en` / `academic` | `midstream-rewrite` (`agent-skill`) | 否 | 面向英文论文与 NSF/NIH 基金申报的去套话技能，保留学术语域（仓库 LICENSE 文件注明 MIT）。 |
| [Nanako0129/sepia](https://github.com/Nanako0129/sepia) | 3,913 | 2026-11-03 | MIT | `en` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 适配多类 Agent 工具的写作技能，结合 StoryScope 做虚构叙事结构修复与分场合文风调整。 |
| [lynote-ai/humanize-text](https://github.com/lynote-ai/humanize-text) | 3,522 | 2026-10-22 | MIT | `en` / `prose` | `midstream-rewrite` (`pipeline-app`) | 否 | 基于 LLM 的开源英文文本拟人化重写工具。 |
| [hexiecs/talk-normal](https://github.com/hexiecs/talk-normal) | 1,882 | 2026-04-22 | MIT | `en` / `prose` | `upstream-prompt` (`agent-skill`) | 否 | 极简系统提示词，约束模型用平实口语交流。 |
| [iKora128/stop-ai-slop-jp](https://github.com/iKora128/stop-ai-slop-jp) | 486 | 2026-06-11 | MIT | `ja` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 日语去 AI 味 Claude Skill。 |
| [stephenturner/skill-deslop](https://github.com/stephenturner/skill-deslop) | 444 | 2026-03-18 | MIT | `en` / `academic` | `midstream-rewrite` (`agent-skill`) | 否 | 面向科研文稿的轻量去 AI 味技能。 |
| [devswha/patina](https://github.com/devswha/patina) | 390 | 2026-09-29 | MIT | `multilingual` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 覆盖韩、英、中、日四种语言的文本去 AI 味项目。 |
| [yucezerey/turkish-anti-ai-skill](https://github.com/yucezerey/turkish-anti-ai-skill) | 330 | 2026-11-11 | MIT | `tr` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 土耳其语反翻译腔与去 AI 味写作技能。 |
| [MohamedAbdallah-14/unslop](https://github.com/MohamedAbdallah-14/unslop) | 195 | 2026-11-16 | MIT | `en` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 适配 Claude Code、Cursor、Windsurf、Codex 等多宿主的去 AI-isms 插件，显式声明保留代码、URL 与标题。 |

## 4. 中文语境专项去 AI 味项目

针对简体中文公文腔、翻译腔、网文连载与分场景润色的开源项目（规避检测类工具已统一移至第 8 节对照观察区）。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh) | 23,450 | 2026-09-23 | MIT | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | blader/humanizer 的中文汉化与适配版本，在中文开发者与创作者社区传播最广。 |
| [zenstory-ai/oh-story-claudecode](https://github.com/zenstory-ai/oh-story-claudecode) | 8,800 | 2026-11-20 | MIT | `zh` / `prose` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 中文网文连载 Agent 技能包，把大纲、伏笔追踪与去 AI 味整合到长篇工作流。 |
| [larashero3-dotcom/lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone) | 8,454 | 2026-11-11 | 未声明 | `multilingual` / `prose` | `midstream-rewrite` + `downstream-lint` (`agent-skill`) | 是 | 基于 520 万字语料与 629 篇跨模型对照实验构建的去 AI 味技能，内置本地 Python 检测脚本 scripts/detect.py。 |
| [MrGeDiao/shuorenhua](https://github.com/MrGeDiao/shuorenhua) | 2,726 | 2026-11-20 | MIT | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 中文优先改稿技能，主打保事实、分发布场景（周报、群消息、文章），强调不随意改动原意与数字。 |
| [hylarucoder/ai-flavor-remover](https://github.com/hylarucoder/ai-flavor-remover) | 1,208 | 2025-04-02 | 未声明 | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 早期中文去 AI 味提示词项目，面向推理模型压制中文报告腔。 |
| [LifelongLazyLearner/qu-ai-wei](https://github.com/LifelongLazyLearner/qu-ai-wei) | 770 | 2026-09-10 | MIT | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 简体中文去 AI 味技能，侧重消除机械连接词与公文腔。 |
| [Hyacehila/humanizer-zh-next](https://github.com/Hyacehila/humanizer-zh-next) | 257 | 2026-10-25 | MIT | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 基于 blader/humanizer 与 op7418/Humanizer-zh 的衍生中文改稿技能。 |
| [VincentOld/stop-slop-zh](https://github.com/VincentOld/stop-slop-zh) | 106 | 2026-05-28 | MIT | `zh` / `prose` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 借鉴 stop-slop 的中文规则：拆三连排比、去名词化、以具体对象替换抽象主语。 |
| [jiji262/humanizer-chinese](https://github.com/jiji262/humanizer-chinese) | 47 | 2026-08-02 | MIT | `zh` / `prose` | `midstream-rewrite` (`agent-skill`) | 否 | 总结 36 条中文 AI 写作模式，并显式加入防装人味翻车（伪造口癖或错别字）的约束。 |

## 5. 本地确定性散文 Linter 与结构检查器

零 LLM 运行时的静态规则检查器、传统散文 Linter 与语料取证工具（含本仓库客观条目）。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [vale-cli/vale](https://github.com/vale-cli/vale) | 6,413 | 2026-11-20 | MIT | `multilingual` / `prose` | `downstream-lint` (`cli-linter`) | 是 | Go 编写的标记感知散文静态 Linter，支持 YAML 规则包与 CI，面向传统文档风格检查。 |
| [btford/write-good](https://github.com/btford/write-good) | 5,111 | 2025-03-10 | MIT | `en` / `prose` | `downstream-lint` (`cli-linter`) | 是 | 经典英文被动语态、模糊词与陈词滥调确定性 Linter。 |
| [get-alex/alex](https://github.com/get-alex/alex) | 5,109 | 2024-11-27 | MIT | `en` / `prose` | `downstream-lint` (`cli-linter`) | 是 | 英文包容性措辞确定性检查器，展示规则化文本审计的成熟交互形态。 |
| [textlint/textlint](https://github.com/textlint/textlint) | 3,211 | 2026-11-21 | MIT | `multilingual` / `prose` | `downstream-lint` (`cli-linter`) | 是 | 插件化自然语言 AST Linter，在日语与技术文档出版领域生态成熟。 |
| [seyedehsanhadi/sloptrim](https://github.com/seyedehsanhadi/sloptrim) | 428 | 2026-11-10 | Apache-2.0 | `en` / `prose` | `downstream-lint` (`cli-linter`) | 是 | Python 标准库零依赖本地散文检测器（62 条确定性探针、支持部分归档格式与保存时钩子），并公布公开配对基准的 ROC-AUC。 |
| [sam-paech/slop-forensics](https://github.com/sam-paech/slop-forensics) | 374 | 2025-11-01 | MIT | `en` / `prose` | `benchmark-policy` + `downstream-lint` (`benchmark-dataset`) | 是 | 面向大模型输出语料的统计取证与高频词、三元组挖掘工具包。 |
| [eric-tramel/slop-guard](https://github.com/eric-tramel/slop-guard) | 168 | 2026-07-09 | MIT | `en` / `prose` | `downstream-lint` (`cli-linter`) | 是 | 零 LLM 裁判的规则驱动英文散文 0–100 打分器。 |
| [FeedHive/ai-slop-detector](https://github.com/FeedHive/ai-slop-detector) | 113 | 2026-10-12 | MIT | `en` / `prose` | `upstream-prompt` + `downstream-lint` (`browser-tool`) | 是 | 9 大类 120 条英文模式清单，提供浏览器在线检查页与配套 Agent Skill。 |
| [dislop-ai/dislop (本仓库)](https://github.com/dislop-ai/dislop) | 1 | 2026-11-21 | Apache-2.0 | `multilingual` / `multi-modal` | `downstream-lint` (`cli-linter`) | 是 | 零依赖确定性交付物印前审校与改稿标记多重集复检工具，覆盖中英双语文稿、前端/SVG 及 .docx/.pptx/.pdf 结构检查，配零上传浏览器工作台与 MCP 服务。 |

## 6. 前端 UI、图解与多模态去 AI 味

覆盖网页界面、HTML+SVG 图解、动态视频与图像偏好对齐的代表性项目。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [anthropics/skills (frontend-design)](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 198,134 | 2026-11-16 | Apache-2.0 | `en` / `ui-design` | `upstream-prompt` (`agent-skill`) | 否 | Anthropic 官方 Agent Skills 仓内的前端设计基准技能（子目录 LICENSE.txt 为 Apache-2.0），要求先立设计方向再编码。 |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 119,423 | 2026-11-08 | MIT | `en` / `ui-design` | `upstream-prompt` + `downstream-lint` (`agent-skill`) | 是 | 结合艺术指导、参考图、浏览器检查以及 scripts/gate.mjs（Stop hook）与 copy-lint.mjs 门禁的前端审美技能。 |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 114,155 | 2026-11-21 | Apache-2.0 | `en` / `ui-design` | `upstream-prompt` + `midstream-rewrite` + `downstream-lint` (`cli-linter`) | 是 | 提供 20+ 设计控制指令、浏览器实时调优，并内置 62 条零 LLM 确定性规则、SARIF 输出（npx impeccable detect --sarif）与编辑钩子。 |
| [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | 69,403 | 2026-11-19 | MIT | `en` / `diagram-media` | `upstream-prompt` (`agent-skill`) | 否 | 51 种出版级单文件 HTML+SVG 图解技能，显式规避默认粗糙 Mermaid 风格与冗余投影。 |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | 58,705 | 2026-11-11 | MIT | `en` / `ui-design` | `upstream-prompt` (`agent-skill`) | 否 | 面向 Claude Code、Cursor 与 Codex 的反 AI 味前端设计技能。 |
| [heydamir/unslop](https://github.com/heydamir/unslop) | 19,356 | 2026-11-15 | CC-BY-4.0 | `en` / `ui-design` | `midstream-rewrite` (`agent-skill`) | 否 | 把默认生成感浓重的页面重构为克制界面的 Claude 技能。 |
| [Tejashmakwana/motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing) | 1,726 | 2026-10-06 | Apache-2.0 | `en` / `diagram-media` | `upstream-prompt` + `midstream-rewrite` (`agent-skill`) | 否 | 面向动态图形与视频生成的去模板化 Agent 技能。 |
| [yetone/kill-ai-slop](https://github.com/yetone/kill-ai-slop) | 1,466 | 2026-09-15 | Apache-2.0 | `multilingual` / `ui-design` | `midstream-rewrite` (`agent-skill`) | 否 | 结合视觉与产品文案 AI 味图鉴以及扫描清理技能的双语项目。 |
| [Tencent-Hunyuan/SRPO](https://github.com/Tencent-Hunyuan/SRPO) | 1,278 | 2026-05-11 | Tencent-Custom-Academic | `multilingual` / `diagram-media` | `model-level` (`benchmark-dataset`) | 否 | 全扩散轨迹细粒度人类偏好对齐研究与代码，社区常用于缓解 Flux 写实生图的过度光滑塑料感（腾讯自定义条款）。 |
| [superdesigndev/superdesign-skill](https://github.com/superdesigndev/superdesign-skill) | 1,038 | 2026-08-21 | MIT | `en` / `ui-design` | `upstream-prompt` (`agent-skill`) | 否 | 面向编程 Agent 的反通用 AI 界面设计技能。 |
| [Yu-369/VibeCurb](https://github.com/Yu-369/VibeCurb) | 1,010 | 2026-08-05 | MIT | `en` / `ui-design` | `upstream-prompt` (`agent-skill`) | 否 | 向 AI 界面工作流注入审美品味约束的工具集。 |
| [funboy322/avoid-ai-design](https://github.com/funboy322/avoid-ai-design) | 166 | 2026-11-18 | MIT | `en` / `ui-design` | `midstream-rewrite` (`agent-skill`) | 否 | 审查并重写紫粉渐变等常见默认前端样式的轻量项目。 |

## 7. 代码与开源 PR 防 Slop 治理工具

面向代码静态规则、PR 自动清理与代码库债务重构的工具与插件。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [cursor/plugins (deslop)](https://github.com/cursor/plugins) | 17,899 | 2026-11-21 | 未声明 | `en` / `code-pr` | `midstream-rewrite` (`agent-skill`) | 否 | Cursor 官方插件库，含按 PR diff 清理冗余注释、多余 try/catch 与类型绕过的 deslop 插件。 |
| [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) | 9,713 | 2026-11-21 | MIT | `en` / `multi-modal` | `upstream-prompt` (`agent-skill`) | 否 | 同时覆盖前端界面、文案与代码的综合 Agent 规则集。 |
| [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) | 6,241 | 2026-11-20 | MIT | `en` / `code-pr` | `downstream-lint` (`cli-linter`) | 是 | 基于 Oxlint 的确定性规则集，拒绝低证据与低信号 TypeScript/JavaScript 模式。 |
| [peteromallet/desloppify](https://github.com/peteromallet/desloppify) | 4,144 | 2026-10-27 | OSNL-0.2 | `en` / `code-pr` | `midstream-rewrite` (`cli-linter`) | 是 | 面向 AI 堆积代码债务的系统化重构 Agent Harness（仓库 LICENSE 为 OSNL 0.2）。 |
| [peakoss/anti-slop](https://github.com/peakoss/anti-slop) | 862 | 2026-04-15 | AGPL-3.0 | `en` / `code-pr` | `downstream-lint` (`github-action`) | 是 | 内置 34 条检查规则的 GitHub Action，覆盖分支、标题、PR 描述、提交信息与改动规模，自动识别并关闭低质 AI PR。 |
| [scanaislop/aislop](https://github.com/scanaislop/aislop) | 769 | 2026-11-21 | MIT | `en` / `code-pr` | `downstream-lint` (`cli-linter`) | 是 | 零 LLM 运行时的确定性代码静态扫描器，检出死代码、不安全类型强转、吞异常与重复块。 |
| [MrZoyo/deslop-GPT](https://github.com/MrZoyo/deslop-GPT) | 141 | 2026-10-06 | MIT | `en` / `code-pr` | `midstream-rewrite` (`agent-skill`) | 否 | 删除优先的清理技能，专攻测试注水与表演式验证代码。 |
| [flamehaven01/AI-SLOP-Detector](https://github.com/flamehaven01/AI-SLOP-Detector) | 121 | 2026-11-19 | MIT | `en` / `code-pr` | `downstream-lint` (`cli-linter`) | 是 | 检出空函数、虚假文档与注水注释的静态扫描器。 |

## 8. 模型干预、统计检测与规避型工具（对照观察区）

本节收录模型权重修改、概率型 AI 检测器，以及主打绕过查重/降低 AIGC 检测率/去水印的工具，仅作行业全貌与伦理边界对照，不作推荐背书。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [p-e-w/heretic](https://github.com/p-e-w/heretic) | 42,388 | 2026-11-19 | AGPL-3.0 | `en` / `multi-modal` | `model-level` (`cli-linter`) | 否 | 免训练修改开源语言模型权重以压制 slop 与迎合输出（模型层路线对照）。 |
| [AhmadHassan-BTed/Turnitout-Humanizer](https://github.com/AhmadHassan-BTed/Turnitout-Humanizer) | 12,486 | 2026-11-17 | 未声明 | `en` / `academic` | `midstream-rewrite` (`browser-tool`) | 否 | 【对照观察】主打绕过查重与 AI 检测的规避工具，存在语义失真与学术诚信风险。 |
| [AhmadHassan-BTed/NaSuno-SongHumanizer](https://github.com/AhmadHassan-BTed/NaSuno-SongHumanizer) | 5,951 | 2026-11-05 | MIT | `en` / `diagram-media` | `midstream-rewrite` (`cli-linter`) | 否 | 【对照观察】针对 Suno/Udio 的音频去水印工具，反映规避需求已延伸至音频媒介。 |
| [iniwap/AIWriteX](https://github.com/iniwap/AIWriteX) | 2,301 | 2026-11-18 | Apache-2.0 | `zh` / `prose` | `midstream-rewrite` (`pipeline-app`) | 否 | 【对照观察】面向微信公众号/小红书的全自动生成、排版与过朱雀检测流水线，代表中文批量内容生产与规避检测诉求。 |
| [baoguangsheng/fast-detect-gpt](https://github.com/baoguangsheng/fast-detect-gpt) | 442 | 2026-02-07 | MIT | `en` / `prose` | `benchmark-policy` (`benchmark-dataset`) | 否 | ICLR 2024 零样本概率型机器文本检测代表作（统计检测路线对照）。 |
| [ahans30/Binoculars](https://github.com/ahans30/Binoculars) | 439 | 2024-05-14 | BSD-3-Clause | `en` / `prose` | `benchmark-policy` (`benchmark-dataset`) | 否 | ICML 2024 双模型对比零样本机器文本检测代表作。 |
| [redbaronyyyyy-eng/humanizer-zh-academic](https://github.com/redbaronyyyyy-eng/humanizer-zh-academic) | 386 | 2026-02-24 | MIT | `zh` / `academic` | `midstream-rewrite` (`agent-skill`) | 否 | 【对照观察】主打降低中文学术写作 AIGC 检测率的技能，统一归入规避类对照区。 |
| [腾讯朱雀大模型检测](https://matrix.tencent.com/ai-detect/) | — | — | — | `zh` / `multi-modal` | `benchmark-policy` (`browser-tool`) | 否 | 腾讯公开 AIGC 文本与图像检测服务，是中文创作者圈最常对标的统计检测参照系。 |
| [Pangram AI Detection](https://pangram.com/) | — | — | — | `en` / `prose` | `benchmark-policy` (`browser-tool`) | 否 | 英文商业概率型 AI 文本检测服务，是 Substack 等平台误报讨论的焦点参照。 |

## 9. Awesome 目录与技能聚合生态对照

涵盖头部平台级 Awesome 目录与现有细分反 AI 味目录，用于对照分析发现层结构。

| 名称 | 星标 (`2026-11-21`) | 推送日期 | 协议 | 语种 / 媒介 | 阶段 / 形态 | 确定性检查 | 核心机制与边界说明 |
|---|---:|---|---|---|---|---|---|
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | 540,121 | 2026-09-02 | CC0-1.0 | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | Awesome 清单总规范（含 awesome.md 宣言与 880★ 的 awesome-lint），要求申请入榜的子清单存活至少 30 天。 |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | 145,235 | 2026-11-18 | Apache-2.0 | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 以可运行代码样例驱动增长的 AI 应用目录，并非纯链接搬运。 |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 98,334 | 2026-11-17 | MIT | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 围绕新协议（MCP）发布初期建立的平台级索引目录。 |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 79,965 | 2026-09-18 | 未声明 | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 工具商主导维护的 Claude Skills 目录。 |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 58,476 | 2026-11-21 | 未声明 | `en` / `code-pr` | `benchmark-policy` (`awesome-list`) | 否 | 使用结构化数据与校验脚本辅助维护的高活跃度 Claude Code 资源目录。 |
| [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills) | 50,059 | 2026-11-20 | MIT | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 3,000+ 跨 Agent 技能目录（含本地发现 CLI/MCP），已直接收录多个去 AI 味技能。 |
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | 41,174 | 2026-05-30 | CC0-1.0 | `en` / `code-pr` | `benchmark-policy` (`awesome-list`) | 否 | 以可直接复制落地的规则文件为核心的 Cursor 规则资产库。 |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 37,396 | 2026-11-15 | MIT | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 收录 1,000+ 官方与社区技能（贡献者直接编辑 README.md），已覆盖多款 humanizer 类条目。 |
| [Leey21/awesome-ai-research-writing](https://github.com/Leey21/awesome-ai-research-writing) | 36,206 | 2026-08-19 | 未声明 | `multilingual` / `academic` | `benchmark-policy` (`awesome-list`) | 否 | 科研写作润色方向的高星垂直目录。 |
| [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) | 4,644 | 2026-06-20 | MIT | `en` / `ui-design` | `benchmark-policy` (`awesome-list`) | 否 | 68 份可直接使用 DESIGN.md 灵感集，证明可执行设计规范比纯链接更有粘性。 |
| [shannhk/avoid-slop](https://github.com/shannhk/avoid-slop) | 203 | 2026-08-24 | 未声明 | `en` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 现有专门面向反 AI 味的跨媒介目录（收录文本、代码与设计工具），说明细分列表需求体量远小于平台级目录。 |
| [zhuyansen/awesome-humanizer-skills](https://github.com/zhuyansen/awesome-humanizer-skills) | 12 | 2026-11-20 | 未声明 | `multilingual` / `multi-modal` | `benchmark-policy` (`awesome-list`) | 否 | 中英双语、覆盖文本/代码/UI 并带安全分级的反 AI 味技能列表样本。 |
| [hwajongpark/awesome-slop](https://github.com/hwajongpark/awesome-slop) | 9 | 2026-10-14 | 未声明 | `en` / `prose` | `benchmark-policy` (`awesome-list`) | 否 | 收录工具、研究与词表的早期小体量列表，也是纯链接列表冷启动困难的对照样本。 |
