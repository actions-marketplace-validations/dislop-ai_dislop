# Anti-Slop Research & Architecture Index (`2026-11`)

本目录汇总围绕 `dislop` 开展的五组专题研究、结构化数据原型与规格文档，覆盖生态全景、反模式识别与查询、正向差异化与个性化、多形态集成（含官网即 Agent 服务）以及 `awesome-anti-slop` 载体拓扑设计。

> [!TIP]
> 如需直接查阅整合后的最新战略与双引擎蓝图，请读 [strategy-and-roadmap.zh-CN.md](../strategy-and-roadmap.zh-CN.md)（[English](../strategy-and-roadmap.md)）；品牌风格与表达基准见 [brand-and-voice-guide.zh-CN.md](../brand-and-voice-guide.zh-CN.md)（[English](../brand-and-voice-guide.md)）；87 条精选目录分享入口见 [awesome/README.md](../../awesome/README.md)。本目录保留各专题的一手调研数据、出处与推导过程。

> [!NOTE]
> 所有 GitHub 仓库星标、最近推送日期与外部链接均在 **2026-11-21** 通过 GitHub REST API 与 HTTP 请求实测核验（星标与活跃度随时间动态变化）。本目录全部 Markdown 文档均通过 Node 与 Python 双端 `dislop check docs/research --fail-on info` 零命中自审；JSON 索引与原型文件单独通过结构校验。

## 1. 研究与设计文档总索引

| 文档 | 专题方向 | 核心内容与配套资产 |
|---|---|---|
| [anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md) | 生态全景调研 | 盘点海内外开源仓库、监管标识法规与社区实践，拆解文本、前端 UI、办公文档、代码与多模态五类媒介的演进脉络，界定 `dislop` 在「Agent 交付物印前检查」上的差异化边界 |
| [anti-slop-resource-radar.md](./anti-slop-resource-radar.md) | 生态资源雷达（87 条） | 由 [anti-slop-radar-index.json](./anti-slop-radar-index.json) 1:1 渲染生成，按八大分栏与四维标签组织 87 条经核验资源，明确区分常规项目、对照观察区与综合目录 |
| [anti-slop-radar-index.json](./anti-slop-radar-index.json) | 资源雷达单一事实源 (`dislop.radar/2`) | 中立结构化 JSON 索引，记录媒介、语种、多值介入阶段、是否含确定性检查、归档状态与上游许可证字段；直接驱动官网 `/radar/` 静态目录 |
| [awesome-radar-strategy.zh-CN.md](./awesome-radar-strategy.zh-CN.md) | 资源策略与门控基准 | 复盘头部 `awesome-*` 与 `skills.sh` 的分发机制，指出纯链接目录冷启动阻力，提出「基准优先（Benchmark-backed Radar）+ 量化 Gate + 熔断阈值」路线 |
| [anti-pattern-detection-and-catalog.zh-CN.md](./anti-pattern-detection-and-catalog.zh-CN.md) | 反模式识别与查询体系 | 梳理语言/节奏与 UI/平面设计反模式、跨模型倾向证据边界、确定性脚本到开源轻量小模型的四级漏斗，以及反模式目录查询与 P0–P2 路线（配套 [v0.3 Spec](../specs/anti-pattern-catalog-and-probes-v0.3.md) 与 [验证原型](../../scripts/prototype_antipattern_lab.mjs)） |
| [positive-divergence-and-personalization.zh-CN.md](./positive-divergence-and-personalization.zh-CN.md) | 正向差异化与个性化 | 围绕模式坍缩实证研究提出「三带可控熵边界」、六类非主流高品位设计谱系、五维可量化声纹画像与防二阶趋同机制（配套 [positive-design-card.example.json](./positive-divergence/positive-design-card.example.json)、[voice-profile.example.json](./positive-divergence/voice-profile.example.json)、[verified-positive-sources.json](./positive-divergence/verified-positive-sources.json)） |
| [multi-surface-integration-architecture.zh-CN.md](./multi-surface-integration-architecture.zh-CN.md) | 多形态开发者集成架构 | 确立「单一内核 + 薄适配层」与统一返回契约（`dislop.result/1`），系统规划 Level 0–3 共 11 类使用形态（官网、CLI、Agent Skill、MCP、Hooks、SDK、GitHub Action、HTTP API 与工作流节点）的差异化分工与分阶段路线 |
| [multi-surface-architecture/website-as-agent-service.zh-CN.md](./multi-surface-architecture/website-as-agent-service.zh-CN.md) | 官方网站即 Agent 服务 | 定义 `dislop.com` 的人机双读（Human + Agent Dual-Native）协议：三类资源自助导航（方法论/案例/工具）、3 层低 Token 渐进披露（`/llms.txt`、`/catalog.json`、纯 `.md` 镜像）、预渲染消除 SPA 空壳与防间接提示词注入清洗边界 |
| [awesome-anti-slop-topology-design.zh-CN.md](./awesome-anti-slop-topology-design.zh-CN.md) | `awesome-anti-slop` 载体拓扑 | 复盘 8 组开源先例并对比 4 种载体拓扑，确定「独立 `dislop-ai/awesome-anti-slop` 仓库（CC0-1.0）+ `dislop.com/radar/` 人机双读目录 + 主仓静态快照同步」方案与中立治理宪章（配套 [radar-v3-contract.json](./awesome-anti-slop-topology/radar-v3-contract.json) 与 [mvp-starter-templates.md](./awesome-anti-slop-topology/mvp-starter-templates.md)） |
| [positioning-and-messaging.zh-CN.md](./positioning-and-messaging.zh-CN.md) | 官网定位与信息层级 | 诊断首版人机双读官网的首屏口径偏差，确立「全面去 AI 味（De-slop AI outputs）」一级直给主标、四维二级证据体系、全场景多模态/全宿主覆盖矩阵与诚实边界清单 |

## 2. 跨专题综合结论

在**负向防线（确定性印前门禁 + 反模式查询）**上，头部上游技能已开始内置确定性脚本与编辑钩子（如 `pbakaus/impeccable` 62 条规则与 SARIF 输出、`Leonxlnx/taste-skill` Stop hook）。`dislop` 站得住脚的主航道在于「跨媒介交付物印前检查」：零依赖双端一致覆盖 `.md`/`.html`/`.css`/`.svg`/`.docx`/`.pptx`/`.pdf`，提供受保护事实多重集复检与二阶口号漂移拦截（`dislop verify`），并在此之上将 `packs/` 升级为可检索的反模式目录与四级识别漏斗（零依赖确定性探针先行，可选轻量小模型严格解耦）。

在**正向牵引（反趋同与个性化协议）**上，仅靠删除套话无法避免均值回归或二阶模板化（NeurIPS 2025 *Artificial Hivemind* 证实跨模型同样趋同）。可行路线是保持零 LLM 核心，用确定性工具实现三带可控熵边界——零熵锁死事实与 WCAG 底线，中层通过 `dislop.voice/1`（本地离线声纹统计）与 `dislop.taste/1`（抽离自独立印刷与字厂传统的抽象设计文法）引导宿主 Agent 差异化生成，再由确定性比选与跨文档趋同检测收口。

在**多形态集成与官网即服务**上，以单一零依赖核心（`src/core.mjs` + `src/dislop/`）驱动全部形态，差异化只留在触发时机与交互壳。官网 `dislop.com` 升级为 Level 0 人机双读入口：人类获得零上传浏览器清样工作台（`CSP: connect-src 'none'`）与可检索规则/资源目录，外部 Agent 通过 `/llms.txt`、`/catalog.json` 与纯 `.md` 端点按需低 Token 读取方法论、案例与工具。

在**生态资源雷达的演进拓扑**上，经冷启动期流量与注意力复盘，现阶段坚持**单仓沉淀优先**：继续由主仓维护单一事实源并直出 `dislop.com/radar/`（集中 GitHub 星标、外链与“清单 -> 工作台 -> CLI/MCP”转化，同时以平等入列和隔离对照观察区守住中立性）；仅当外部有效 PR 持续 `>= 5 条/月` 时，再按 `dislop.radar/3` 契约无损切出独立 CC0-1.0 仓库 `dislop-ai/awesome-anti-slop`，永久保留 `dislop.com/radar/` 规范地址。

## 3. 维护与自审门禁

- 增删生态雷达条目时，先编辑单一事实源 [anti-slop-radar-index.json](./anti-slop-radar-index.json)，再重新运行 `node scripts/build_site.mjs` 同步官网 `/radar/` 静态目录与 `/llms.txt`。
- 变更本目录任意 Markdown 文档后，须同时执行 `node ./bin/dislop.mjs check docs/research --fail-on info` 与 `PYTHONPATH=src python3 -m dislop.cli check docs/research --fail-on info` 确认零命中。
