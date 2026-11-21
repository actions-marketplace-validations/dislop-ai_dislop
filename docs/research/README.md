# Anti-Slop Research & Resource Snapshot (`2026-11`)

本目录收录围绕 `dislop` 开展的海内外「去 AI 味（anti-slop / de-slop）」生态调研、87 条经实测核验的结构化资源快照，以及关于「信息索引、公开基准与核心产品如何配合」的战略分析。

> [!NOTE]
> 所有 GitHub 仓库星标、最近推送日期与外部链接均在 **2026-11-21** 通过 GitHub REST API 与 HTTP 请求实测核验（星标与活跃度随时间动态变化）。本目录 4 份 Markdown 文档全部通过 Node 与 Python 双端 `dislop check docs/research --fail-on info` 零命中自审；JSON 索引单独通过 Schema 与双向一致性校验。

## 1. 文档导航

| 文档 | 定位 | 核心内容 |
|---|---|---|
| [anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md) | 深度调研报告 | 梳理海内外开源仓库、平台规范与社区实践，拆解文本、前端 UI、办公文档、代码与多模态五类媒介的演进与监管背景，以及 `dislop` 的真实差异化边界 |
| [anti-slop-resource-radar.md](./anti-slop-resource-radar.md) | 资源雷达快照（87 条） | 由 [anti-slop-radar-index.json](./anti-slop-radar-index.json) 1:1 渲染生成，按八大分栏与四维标签组织 87 条经核验资源，明确区分常规项目、对照观察区与索引目录 |
| [anti-slop-radar-index.json](./anti-slop-radar-index.json) | 单一事实源 (`dislop.radar/2`) | 中立结构化 JSON 索引，包含媒介、语种、多值介入阶段、是否含确定性检查、归档状态与上游真实许可证字段 |
| [awesome-radar-strategy.zh-CN.md](./awesome-radar-strategy.zh-CN.md) | 产品战略补充 | 审视头部 `awesome-*` 与 `skills.sh` 的分发机制，论证为何纯链接目录在 2026 年易沦为冷启动墓地，提出「基准优先（Benchmark-backed Radar）+ 量化 Gate + 8 周熔断」的务实路线 |

## 2. 核心发现速览

单点去 AI 味工具已积累十万星级关注度，但头部项目本身也在快速工程化。前端侧 `Leonxlnx/taste-skill`（119,423★）已自带 Stop hook 门禁与文案检查，`pbakaus/impeccable`（114,155★）已内置 62 条零 LLM 确定性规则、SARIF 代码扫描输出与编辑钩子；文本侧 `seyedehsanhadi/sloptrim`（428★）已实现 Python 标准库本地检测并公布公开基准 ROC-AUC，`larashero3-dotcom/lieflat-less-ai-tone`（8,454★）结合 520 万字对照语料与本地脚本检测。因此，简单的「上游软提示、下游确定性」二分已经过时。

在发现层上，反 AI 味细分目录体量偏小（如跨媒介目录 `shannhk/avoid-slop` 为 203★，多款 `awesome-slop` 类仓库不足 30★），原因更接近「已有注册中心与综合目录承接了分发」（`skills.sh` 按安装量排行、`VoltAgent/awesome-agent-skills` 37.4K★ 与 `sickn33/agentic-awesome-skills` 50.1K★ 已收录头部写作与前端技能），而不是无人发现的红利空白。单靠搬运链接无法撑起第二增长引擎。

`dislop` 站得住脚的差异化位于「Agent 交付物的印前检查（Preflight Check）」：同时覆盖 `.docx`、`.pptx`、`.pdf` 客观结构交付事故（未接受修订、残留批注、PPT 文本框越界与字数墙、PDF 字体嵌入与本机路径），提供改稿前后受保护标记多重集比对与二阶句式漂移拦截（`dislop verify`），并具备原生中英双语规则与零上传浏览器清样工作台。

将信息整理转化为产品杠杆的正确姿势，是优先建设可复算的「改稿事实丢失率与二阶漂移率」离线基准，把资源清单定位为带日期的生态快照，并在达到外部采用 Gate 后再决定是否投入独立目录维护。

## 3. 维护与校验

如需增删条目，应先编辑单一事实源 [anti-slop-radar-index.json](./anti-slop-radar-index.json)，再同步重新生成 [anti-slop-resource-radar.md](./anti-slop-resource-radar.md) 并执行 `dislop check docs/research --fail-on info`。准入门槛、分阶段 Gate 与熔断条件见 [awesome-radar-strategy.zh-CN.md](./awesome-radar-strategy.zh-CN.md#4-资源雷达准入与治理草案)。
