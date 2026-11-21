# 海内外多平台「去 AI 味（Anti-Slop）」实践全景调研报告

> 快照日期：2026-11-21 · 实证基线：87 条经 GitHub API 或公开网页核验的开源仓库、社区政策、标准文档与研究论文（完整清单见 [awesome/README.zh-CN.md](../../awesome/README.zh-CN.md) 与 [anti-slop-radar-index.json](./anti-slop-radar-index.json)）。本文区分「有公开一手链接的实证事实」与「基于社区公开讨论的定性实践归纳」。

## 执行摘要

2024 至 2026 年间，「去 AI 味（anti-slop / de-slop）」从零星的提示词技巧演变为覆盖文稿、Web 前端、Word/PPT/PDF、代码 PR、科研论文与音视频的工程与内容治理议题。本次调研盘点了海内外主流开源生态、社区政策与平台实践，得出五项经交叉复核的核心判断：

第一，**关注度已获十万星级验证，但「星标」不等于「门禁采用」**。截至 2026-11-21，前端侧 `Leonxlnx/taste-skill`（119,423★）与 `pbakaus/impeccable`（114,155★）、图表侧 `cathrynlavery/diagram-design`（69,403★）、文本侧 `blader/humanizer`（71,724★）与 `op7418/Humanizer-zh`（23,450★）积累了极高关注度。但在 `skills.sh` 注册中心安装量分布高度集中，且绝大多数用户安装的是「直接生成更好初稿或一键润色」的技能，对「交付前强制门禁」的接受度仍需通过本地钩子或 CI 场景验证。

第二，**头部上游工具正在吞并下游确定性检测**。早期「上游靠 Prompt、下游靠 Linter」的分工已不适用于 2026 年的头部项目：`pbakaus/impeccable` 已自带 62 条零 LLM 确定性规则、`npx impeccable detect --sarif` 代码扫描输出与编辑钩子；`Leonxlnx/taste-skill` 配有 `scripts/gate.mjs`（Stop hook）与 `scripts/copy-lint.mjs`；文本侧 `seyedehsanhadi/sloptrim`（428★）实现了 Python 标准库本地检测、部分文档归档读取与公开基准 ROC-AUC；中文侧 `larashero3-dotcom/lieflat-less-ai-tone`（8,454★）则把 520 万字对照语料统计与本地 `scripts/detect.py` 结合在一起。

第三，**「AI 味」已从一阶词表演化为二阶过矫陷阱**。当模型和创作者规避了第一代标志词与紫粉渐变后，生成结果容易坍缩到第二代套路——文本端表现为密集的否定转折句、连续短句口号或刻意伪造口语错别字的「装人味翻车」；界面端则退回统一的暖米白配朱砂红卡片模板。同时，中文侧 `lieflat-less-ai-tone` 的配对对照实验提醒社区：部分流行黑名单词在相同事实前提下人机差异并不稳定，规则有效性必须以实测语料验证，而非凭直觉罗列禁词。

第四，**监管合规与对抗式「降检测率」正在分化市场**。中国《人工智能生成合成内容标识办法》及配套国家标准 GB 45438-2025 已于 2025 年 9 月 1 日正式施行，欧盟《人工智能法案》（EU AI Act）第 50 条透明度义务于 2026 年 8 月 2 日开始适用（既有系统机器可读标记宽限期至 2026 年 12 月 2 日）。在合规透明与平台治理背景下，中文付费市场仍有大量需求指向「绕过查重或降低 AIGC 检测率」，这与「提高交付清晰度与事实保真度」的诚实审校路线存在本质伦理分界。

第五，**`dislop` 最稳固的切入点是「Agent 交付物的印前检查（Preflight Check）」**。相比在前端规则上与 62 条规则加浏览器调优的 `impeccable` 正面交锋，`dislop` 真正罕有对手的组合是：覆盖 `.docx`、`.pptx`、`.pdf` 客观结构交付事故，提供改稿前后受保护标记多重集比对与二阶句式漂移拦截（`dislop verify`），并坚持中英双语与零上传浏览器清样工作台。

---

## 1. 概念溯源、监管背景与问题分层

### 1.1 概念起源与学术实证

2024 年 5 月 8 日，开发者 Simon Willison 在博客（[simonwillison.net/2024/May/8/slop/](https://simonwillison.net/2024/May/8/slop/)）普及了 `slop` 一词，将其类比为电子邮件时代的 `spam`——特指**未经请求、未经人工审阅即大规模发送给他人的 AI 生成内容**。这一界定把问题聚焦在「交付质量与接收者的阅读/审阅负担」，而非一刀切排斥 AI 辅助。

学术界同期提供了量化证据。Dmitry Kobak 等人在 1,500 万篇 PubMed 生物医学摘要中追踪「超额词汇（excess vocabulary）」，推算 2024 年至少 13.5% 的摘要经由 LLM 处理或辅助（该数值为基于超额词汇统计的下界估计，而非逐篇确证；预印本 [arXiv:2406.07016](https://arxiv.org/abs/2406.07016)，2025 年 7 月刊于 *Science Advances*）。社区规范侧，英语维基百科 WikiProject AI Cleanup 持续维护的 [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) 已成为开源写作规则最常引用的公共参考蓝本。

### 1.2 监管与平台透明度坐标（2025–2026）

2025 至 2026 年，去 AI 味实践不再只是个人写作偏好，而是处在各国内容标识法规与平台治理的交汇处：

- **中国**：国家网信办等四部门联合发布的《人工智能生成合成内容标识办法》与强制性国家标准《网络安全技术 人工智能生成合成内容标识方法》（GB 45438-2025）于 2025 年 9 月 1 日施行，要求对生成合成文本、图片、音视频落实显式与隐式标识。
- **欧盟**：EU AI Act 第 50 条透明度义务于 2026 年 8 月 2 日适用，涵盖机器可读标记及公众利益文本、深度伪造内容的披露要求（既有系统机器可读标记宽限期至 2026 年 12 月 2 日）。

法规要求「不隐瞒合成来源」，而优质编辑与工程实践要求「不交付满屏废话、模板缺陷与失实改写」。把「提升清晰度与交付卫生」同「规避标识或伪造人工笔迹」切割开来，是开源工具长期成立的前提。

### 1.3 跨媒介四层问题模型

综合海内外实证样本，AI 生成交付物中的质量缺陷可分为四层，对应不同的确定性可检边界：

| 层级 | 定义 | 跨媒介典型表现 | 适配的治理方式 |
|---|---|---|---|
| L0 客观交付事故 | 与文风无关的硬缺陷，发布即造成事故 | 残留对话寒暄、内部引用标记、未填占位符、本机路径泄露、Word/PPT 裸 Markdown、未接受修订与残留批注、空链接 `<a href="#">`、对比度低于 WCAG AA、PPT 文本框越界 | 确定性静态阻断（`error`），零争议，适合直接入 CI 或提交钩子 |
| L1 一阶词表与默认组件 | 模型高频词与缺省视觉样式 | 英文套词（`delve`、`tapestry`、`pivotal`）、中文公文套话、默认紫粉渐变与玻璃拟态、均等三卡片、全篇加粗前缀列表、过度光滑的 AI 人像 | 确定性提示（`warning`/`info`）加专名白名单，避免误杀正常术语 |
| L2 二阶句法与过矫模板 | 屏蔽一阶词表后退回的结构同质化 | 否定转折句式、连续超短句口号、强行三段式排比、退回统一「暖米白配朱砂红」的伪人文页、代码中不必要的 `try/catch` 与复述代码的注释、中文「装人味翻车」 | 结构探针 + 删除测试（Deletion Test）+ 正反改稿对照 |
| L3 事实密度与一手视角 | 缺少具体证据、边界条件与真实立场 | 正确但空洞的平衡套话、脱离上下文的泛化建议、缺失真实物理细节的配图、未跑测试的补丁 | 无法单靠后置规则补足，需前置一手素材与立场，并在改后核对受保护标记 |

---

## 2. 海内外多平台实践盘点

### 2.1 X (Twitter) 与 Agent Skills 生态：从提示词热潮到规则与钩子回归

> 证据边界说明：以下工具机制与版本特征均核验自对应开源仓库 README 与公开文档；关于社区传播脉络的归纳结合公开技术报道与仓库演进时间线，不含 X 平台全量推文抽样统计。

海外开发者与创作者社区的实践围绕两个基础设施迅速扩散：跨工具通用的 `SKILL.md` 格式规范（[agentskills.io/specification](https://agentskills.io/specification)）与公共注册中心及 CLI（[skills.sh/docs](https://skills.sh/docs)）。2024 至 2026 年的实践呈现三条清晰主线：

一是**英语写作技能分化为「样稿适配」与「严格编辑部规范」两派**。早期 2024 年 4 月 Paul Graham 对 `delve` 的争议引发了英式与非洲英语使用者的反驳，暴露单一禁用词表的文化误报风险。随后 Siqi Chen 开源的 [blader/humanizer](https://github.com/blader/humanizer)（71,724★）将 `WP:AISIGNS` 拆解为结构化模式并支持作者样稿校准；Hardik Pandya 的 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)（19,097★）采用更刚性的编辑规范加五维自评；Peter Yang 的 [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop)（13,681★）在配套文章（[creatoreconomy.so](https://creatoreconomy.so/p/use-my-no-ai-slop-skill-to-remove-20-ai-slop-patterns)）中提出「25% 人工粗稿 + 50% AI 清理 + 25% 人工逐行定稿」的 25/50/25 分工。

二是**前端与图解技能迅速完成「从提示词到确定性门禁」的升级**。[pbakaus/impeccable](https://github.com/pbakaus/impeccable)（114,155★）除 20+ 设计精修指令与浏览器实时调优外，已内置 62 条无 LLM 确定性规则、SARIF 输出（`npx impeccable detect --sarif`）与编辑钩子；[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)（119,423★）配套了 `scripts/gate.mjs`（Stop hook）和 `scripts/copy-lint.mjs`；[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)（69,403★）将 51 种出版级 HTML+SVG 图解封装为技能，直接对抗粗糙的默认 Mermaid 图表。

三是**本地确定性散文与代码扫描器开始独立成型**。文本侧 [seyedehsanhadi/sloptrim](https://github.com/seyedehsanhadi/sloptrim)（428★）基于 Python 标准库实现了 62 条确定性探针、文件保存时钩子与部分文档归档读取，并公开了配对基准 ROC-AUC；代码侧 [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop)（6,241★）用 Oxlint 拦截低证据 TS/JS 模式，[scanaislop/aislop](https://github.com/scanaislop/aislop)（769★）做零 LLM 静态代码扫描，[peakoss/anti-slop](https://github.com/peakoss/anti-slop)（862★）通过 34 条规则的 GitHub Action 自动清理低质 AI PR。

### 2.2 中文社区实践（GitHub 中文项目、微信公众号、小红书、知乎与即刻）

> 证据边界说明：GitHub 中文仓库与腾讯云朱雀文档均有公开链接核验；微信公众号、小红书、知乎与即刻因平台登录墙与非公开算法限制，无法做全平台随机抽样，下文对平台写作与视觉实操的归纳属于**公开社区讨论与中文开源规则集的定性总结**。尤其需要指出：腾讯公开文档（[cloud.tencent.com/document/product/1552/137539](https://cloud.tencent.com/document/product/1552/137539)）仅说明 [朱雀大模型检测](https://matrix.tencent.com/ai-detect/) 提供 AIGC 文本与图像识别能力，并未证实微信公众号或小红书以朱雀分数作为推荐限流依据。

从已核验的中文开源项目（[op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh) 23,450★、[zenstory-ai/oh-story-claudecode](https://github.com/zenstory-ai/oh-story-claudecode) 8,800★、[larashero3-dotcom/lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone) 8,454★、[MrGeDiao/shuorenhua](https://github.com/MrGeDiao/shuorenhua) 2,726★、[LifelongLazyLearner/qu-ai-wei](https://github.com/LifelongLazyLearner/qu-ai-wei) 770★、[VincentOld/stop-slop-zh](https://github.com/VincentOld/stop-slop-zh) 106★、[jiji262/humanizer-chinese](https://github.com/jiji262/humanizer-chinese) 47★）可以看出中文语境的四个鲜明特征：

1. 本土化句式与语体痛点：英文规则无法覆盖中文高频的宏大时代开场（如 `在当今数字化浪潮下`）、公文与职场抽象名词堆砌（如 `赋能`、`抓手`、`闭环`、`底层逻辑`）、机械路标词（如 `首先/其次/最后/综上所述`）、对称四字排比串、中英混排半角标点错用以及翻译腔抽象主语（如 `这标志着……`）。
2. 「保事实」与「防装人味翻车」成为第二代中文工具共识：`MrGeDiao/shuorenhua` 明确提出按周报、群消息、长文分场景改稿，且保留原文数字、条件与承诺；`jiji262/humanizer-chinese` 则显式警告粗糙提示词会诱导模型故意写错别字、滥用网络梗或编造虚假深夜经历，造成更严重的信任折损。
3. 语料实证开始替代拍脑袋词表：`larashero3-dotcom/lieflat-less-ai-tone` 基于 520 万字语料与 629 篇跨模型对照实验发现，不同模型在同一指标上甚至呈现相反偏移（例如每小句「的」字密度上部分模型低于人类而另一些高于人类），且部分常被拉黑的词汇在相同事实下人机分布并无稳定差异。这一发现对所有确定性规则库极具警示意义。
4. 中文自媒体工作流与视觉去塑料感（定性社区归纳）：在微信公众号、知乎与即刻的公开创作者分享中，高频共识是单靠后置洗稿无法拯救空洞内容，必须先提供真实案例、踩坑细节与明确立场，再删去规整的对称段落与总结腔。小红书视觉配图讨论则集中于摆脱过度光滑、高饱和的「塑料感」——常见做法包括在 Flux/Midjourney 工作流中采用 `--style raw`、低 `--stylize`、真实镜头与自然光描述、相机原始文件命名提示，或结合开源扩散偏好对齐方案 [Tencent-Hunyuan/SRPO](https://github.com/Tencent-Hunyuan/SRPO)（1,278★）改善质感。同时，中文付费生态中存在大量以「过朱雀」「降知网/维普 AIGC 率」为卖点的工具（开源侧如 `AIWriteX`、`humanizer-zh-academic`），与面向专业交付质量的诚实审校明显分道扬镳。

### 2.3 GitHub 开源生态全景与五类产品形态

结合 87 条核验记录（详见 [awesome/README.zh-CN.md](../../awesome/README.zh-CN.md)），当前开源生态可分为五类形态：

| 阵营 | 代表项目（2026-11-21 星标） | 核心机制 | 现存短板或边界 |
|---|---|---|---|
| 1. 写作类 Agent Skills | `blader/humanizer` (71.7K★)、`op7418/Humanizer-zh` (23.5K★)、`hardikpandya/stop-slop` (19.1K★)、`petergyang/no-ai-slop` (13.7K★)、`lieflat-less-ai-tone` (8.5K★)、`epoko77-ai/im-not-ai` (6.7K★)、`MrGeDiao/shuorenhua` (2.7K★) | 通过 `SKILL.md` 注入模式清单、样稿或分场景规则，少数（如 `lieflat`）已配备本地检测脚本 | 多数仍依赖模型自觉改写，缺少改后受保护事实核验；不覆盖 `.docx`/`.pptx`/`.pdf` 结构缺陷 |
| 2. 前端、图解与视频审美工具 | `Leonxlnx/taste-skill` (119.4K★)、`pbakaus/impeccable` (114.2K★)、`cathrynlavery/diagram-design` (69.4K★)、`Nutlope/hallmark` (58.7K★)、`heydamir/unslop` (19.4K★)、`Tejashmakwana/motionmaxxing` (1.7K★)、`yetone/kill-ai-slop` (1.5K★) | 设计词汇指令 + 反模式规则；头部项目已自带确定性扫描、SARIF、Stop hook 与浏览器检查 | 聚焦 Web 前端、SVG 图解或动效，不覆盖自然语言长文、办公文档与改稿事实核验 |
| 3. 代码与开源 PR 治理 | `cursor/plugins` (17.9K★)、`miqdadbadjuber/anti-slop` (9.7K★)、`dmmulroy/anti-slop` (6.2K★)、`peteromallet/desloppify` (4.1K★)、`peakoss/anti-slop` (862★)、`scanaislop/aislop` (769★) | Oxlint/静态代码规则、diff 清理插件、GitHub Action 自动关闭低质 PR | 面向源代码与 GitHub 协作元数据，不覆盖文档交付物与跨语种写作 |
| 4. 确定性散文 Linter 与基准 | `vale-cli/vale` (6.4K★)、`btford/write-good` (5.1K★)、`get-alex/alex` (5.1K★)、`textlint/textlint` (3.2K★)、`seyedehsanhadi/sloptrim` (428★)、`sam-paech/slop-forensics` (374★)、`eric-tramel/slop-guard` (168★)、`FeedHive/ai-slop-detector` (113★) | 确定性规则、词典或公开语料统计打分，零 LLM 运行时 | 传统 Linter 缺少 AI 二阶句式规则与办公文档解析；新兴本地检测器偏英文单语，缺少改后标记多重集复检 |
| 5. 模型干预、统计检测与规避工具（对照区） | `p-e-w/heretic` (42.4K★)、`Turnitout-Humanizer` (12.5K★)、`NaSuno-SongHumanizer` (6.0K★)、`AIWriteX` (2.3K★)、`fast-detect-gpt` (442★)、`Binoculars` (439★)、`humanizer-zh-academic` (386★) | 权重修改、零样本概率检测，或以绕过检测/去水印为目标的改写工具 | 概率检测器存在误报争议；规避型工具易破坏事实准确性并触碰合规与学术诚信边界 |

从语种分布看，除英语与简体中文外，韩语（`epoko77-ai/im-not-ai` 6.7K★）、日语（`iKora128/stop-ai-slop-jp` 486★）、土耳其语（`yucezerey/turkish-anti-ai-skill` 330★）与四语种（`devswha/patina` 390★）均有独立开源仓库，表明各母语社区都在构建本土化的反翻译腔与反模板规则。

### 2.4 其他海外社区视角：开源维护者防御战与内容平台检测争议

在开源维护生态（GitHub、Hacker News），核心矛盾是**生成成本趋零与人工审阅成本高企之间的不对称**。三个有明确一手出处的标志事件集中发生在 2026 年初：curl 维护者 Daniel Stenberg 于 2026 年 1 月 26 日发文（[daniel.haxx.se](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/)）宣布因大量虚假 AI 安全报告把有效率压低至 5% 以下，正式于 1 月 31 日关闭赏金计划；Ghostty 作者 Mitchell Hashimoto 更新公开 [AI_POLICY.md](https://github.com/ghostty-org/ghostty/blob/main/AI_POLICY.md)，要求 AI 辅助 PR 仅限预批准 Issue 并由人类完全理解代码；tldraw 作者 Steve Ruiz 在 [Issue #7695](https://github.com/tldraw/tldraw/issues/7695) 宣布自动关闭外部 PR。需要客观区分的是：这些仓库面对的主要是**不负责任的外部对抗性提交者**，维护者需要的是类似 `peakoss/anti-slop` 的入站拦截机制，不能简单推导出恶意提交者会主动运行客户端自检工具。

在内容发布平台（Substack）与创作者社区，Substack 引入第三方 AI 检测工具（Pangram）引发了复杂反馈——官方汇总（[on.substack.com](https://on.substack.com/p/how-writers-are-reacting-to-substacks)）同时呈现了支持透明度与担忧误报的声音。相比黑盒概率百分比，社区对可解释的开源指标（如 [EQ-Bench Slop Score](https://eqbench.com/slop-score.html) 将分数拆为 60% 词频 + 25% 对比句式 + 15% 三元组）接受度更高。在独立产品发布侧，[Product Hunt 2026 Q2 报告](https://www.producthunt.com/p/general/product-hunt-s-state-of-tech-discovery-q2-2026) 亦反映出 AI 建站加速了供给竞争，推动开发者关注页面审美差异化。

---

## 3. `dislop` 现有能力对照与真实定位校准

结合仓内现状（`v0.2.0`：Node CLI、Node MCP 与 `site/` 浏览器清样工作台共用零依赖 `src/core.mjs`，Python `src/dislop/` 为独立标准库实现并通过 `tests/test_conformance.py` 保持一致；4 个 Pack 共 29 条规则——`core` 7、`business-brief` 8、`literary-essay` 5、`deck-and-ui` 9；CLI 命令含 `check`/`verify`/`explain`/`packs`/`pack-test`/`init`，MCP 提供 `dislop_check`/`dislop_verify`/`dislop_explain`/`dislop_packs`），将其与经核验的头部近邻做诚实对照：

| 对比维度 | 头部写作技能 (`humanizer` / `lieflat`) | 头部前端工具 (`impeccable` / `taste-skill`) | 本地散文检测 (`sloptrim`) | **`dislop`（当前真实能力）** |
|---|---|---|---|---|
| 确定性 / 零 LLM 扫描 | 多数无；`lieflat` 已带本地 Python 脚本 | **已有**（`impeccable` 62 条确定性规则 + SARIF + 钩子；`taste-skill` 含 Stop hook） | **已有**（62 条规则，Python 标准库零依赖，公开 ROC-AUC） | **已有**（Node + 浏览器同源 JS 核心 + Python 独立实现，双端零依赖） |
| 办公与发布二进制格式 | 无 | 无 | 支持部分文本与文档归档（含 `.docx`） | **核心差异化**：覆盖 `.docx`（修订/批注/裸 MD）、`.pptx`（顺序/字数墙/缩排/越界）、`.pdf`（`/URI`/标题/字体嵌入/尺寸一致性；完整 CID 正文显式跳过） |
| 前端 / SVG 静态检查 | 无 | **极强**（62 条规则 + 渲染态检查 + 浏览器实时调优） | 无 | **轻量补充**（`deck-and-ui` 9 条单文件静态规则，含对比度、深色亮度阶梯与 SVG 文字越界风险，不替代渲染态工具） |
| 改后受保护标记复检 (`verify`) | 缺失（靠提示词约束） | 缺失 | 缺失 | **核心差异化**：对提取的数字（含限定词与单位）、URL、代码与引用标记做多重集一致比对，并拦截二阶句式漂移 |
| 中英双语与浏览器零上传 | 多为单语或中英分仓 | 英文为主 | 英文为主 | **原生中英双语 + 零上传静态清样工作台（`connect-src 'none'`）** |

### 3.1 必须诚实面对的三处定位摩擦与能力边界

1. **不要在前端规则数量上与 `impeccable` 正面硬拼**。`dislop` 的前端规则应定位为「发稿前轻量静态兜底（对比度、死链接、深色层级倒置、SVG 文字越界风险）」，而非完整设计系统工具。
2. **明确 `dislop verify` 的真实边界与演进方向**。当前 `verifyRevision` 通过多重集比对已提取的数字/限定词/单位/URL/代码/引用标记：它能可靠拦住「删掉 `最多`」「把 `12 次` 改成 `11 次`」「丢掉链接」，但**不能检测同值对调（例如把 A 批次 `12 次` 与 B 批次 `3 次` 互换）或纯词义越界（例如把「首家富商」改成「首富」）**；同时在人工主动编辑（如纠正错误数字、合并重复句、把 `50%` 改为 `一半`）时，二元 `rejected` 会带来摩擦。因此 `verify` 最适合约束 Agent 自动化「仅改文风、不动事实」的批量润色流水线，后续应向「可确认的事实变更账本（Fact Diff Ledger）」演进。
3. **区分「会真用的场景」与「高摩擦场景」**。真正匹配 `dislop` 架构的场景包括：① 带 CI 门禁的文档与技术博客仓库（优先启用 `core` 阻断客观交付事故）；② Agent 生成的 Word / PPT / PDF 商务交付物印前体检（当前开源生态中几乎无直接对手）；③ 无人逐行看 diff 的批量润色流水线（搭配 Hook/Action 强制触发，而非仅靠 Agent 自愿调用 MCP）；④ 潜在的企业合规与品牌风格指南审计场景（需后续通过用户访谈验证）。相反，依赖手机与聊天框工作的小红书/公众号个人创作者很难主动在终端运行 CLI，不应将其作为近期主战场。

### 3.2 面向下阶段的工程与产品优先级建议

1. **把叙事收敛为「Agent 交付物的印前检查（Preflight Check）」**：与仓内 [design-system.zh-CN.md](../design-system.zh-CN.md) 的「建筑网格上的印刷校样单」意象完全合一，避开十万星前端与通用写作技能的正面红海。
2. **优先补齐「可安装」与「可强制」**：完成 v0.2.0 正式发版并上架 npm / PyPI，提供 Claude Code 插件加保存/提交钩子或即用 GitHub Action，解决 MCP 只能靠 Agent 自愿调用的短板。
3. **建设可复算的「改稿事实丢失与二阶漂移」离线基准**：这是比纯链接目录更高杠杆的生态切入点，路线安排见 [ROADMAP.zh-CN.md](../../ROADMAP.zh-CN.md)。
4. **让 `verify` 从二元拒绝演进为可确认事实账本**：在严格模式（适合无人值守 Agent 润色）之外，提供面向人类作者审阅的结构化变更清单，降低正当编辑误拒率。
