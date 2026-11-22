# Research & Proposals Index (`2026-11`)

本目录保存围绕 `dislop` 开展的一手生态调研、数据快照与远期设计草案。对外最新口径请直接看：

- 品牌人格与表达基准：[brand-and-voice-guide.zh-CN.md](../brand-and-voice-guide.zh-CN.md)（[English](../brand-and-voice-guide.md)）
- 路线图与协作计划：[ROADMAP.zh-CN.md](../../ROADMAP.zh-CN.md)（[English](../../ROADMAP.md)）
- 87 条工具清单：[awesome/README.zh-CN.md](../../awesome/README.zh-CN.md)（[English](../../awesome/README.md) · 在线筛选 `https://dislop.com/awesome/`）

> 所有 GitHub 星标、最近推送日期与链接状态均于 **2026-11-21** 通过 GitHub API 与 HTTP 请求核验。本目录全部 Markdown 文档均需通过 Node 与 Python 双端 `dislop check docs/research --fail-on info` 零命中自审。

## 文档索引（区分现状、提案与历史资料）

| 文档 | 状态 | 内容说明 |
|---|---|---|
| [anti-slop-radar-index.json](./anti-slop-radar-index.json) | **现役数据 (`dislop.radar/2`)** | 87 条工具清单的单一 JSON 数据源（含中英双语摘要），直接编译生成 `awesome/README*.md` 与 `dislop.com/awesome/` |
| [business-model-and-open-core.zh-CN.md](./business-model-and-open-core.zh-CN.md) | **战略设计基线** | 复利护城河飞轮（对抗基准 + 6 维标准 + 垂直包 + 成本套利自愈云）、9 款竞品定价对标、三层信任边界与 Google Cloud / Gemini 成本防刷账 |
| [text-antislop-integrated-methodology.zh-CN.md](./text-antislop-integrated-methodology.zh-CN.md) | **已落地实证与方法论** | 六个文字去 AI 味分析角度、六种离线技术范式对照实验与 7 包 42 规则 + 5 轴画像整合架构 |
| [ai-slop-pattern-library-5-rounds.zh-CN.md](./ai-slop-pattern-library-5-rounds.zh-CN.md) | **已落地实证与实验** | 6 维度 7 角度反模式库组织架构、5 轮闭环迭代消融记录与 `v0.6.0` 扩展至 53 模式（154 样本 `100.0%` F1 / `0.0%` 误报）的校准结果 |
| [cli-model-bundling-and-tiering.zh-CN.md](./cli-model-bundling-and-tiering.zh-CN.md) | **已落地实证与架构** | CLI 随包内置 `14.6 KB` 去词面化传统集成模型 vs. 按需选装 `0.6B–4B` 本地小模型的六范式盲测对比、体积实测与内部数字保真护栏 |
| [universal-adaptation-and-marketplace-strategy.zh-CN.md](./universal-adaptation-and-marketplace-strategy.zh-CN.md) | **战略与工程规划基线** | 主流 Agent 客户端、编辑器（VS Code / Open VSX / Obsidian）、多 Agent 编排器（Orca / Herdr / Conductor）的统一薄壳适配、`/llms.txt` 静态契约与插件市场获客漏斗 |
| [anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md) | **一手调研** | 2026 年跨媒介（文稿、网页、办公文档、代码、多模态）开源工具与社区治理全景盘点 |
| [anti-pattern-detection-and-catalog.zh-CN.md](./anti-pattern-detection-and-catalog.zh-CN.md) | **一手调研 / 已落地输入** | 语言节奏、主流模型家族实证对照、三层界面反模式可检边界与分层识别漏斗 |
| [x-animation-and-gif-tooling-2026.zh-CN.md](./x-animation-and-gif-tooling-2026.zh-CN.md) | **一手调研 / 已落地选型** | X 热门动画库与动效工具实测盘点（33 仓库星标/协议核验）及 `dislop` 确定性 GIF 出图技术底座 |
| [positive-divergence-and-personalization.zh-CN.md](./positive-divergence-and-personalization.zh-CN.md) | **远期提案** | 防均值回归与个性化声纹研究，配套 [positive-divergence/](./positive-divergence/) 草案 JSON 与 31 处公开设计参考源 |
| [awesome-anti-slop-topology-design.zh-CN.md](./awesome-anti-slop-topology-design.zh-CN.md) | **暂缓拆仓预案** | 8 组开源先例复盘与 `dislop.radar/3` 拆仓契约（[awesome-anti-slop-topology/](./awesome-anti-slop-topology/)）；现阶段清单留在主仓，仅当外部有效 PR 持续 `>= 5 条/月` 时再按需启用 |

## 维护说明

- 增删工具清单条目时，编辑 [anti-slop-radar-index.json](./anti-slop-radar-index.json)（同时填写中文 `summary` 与英文 `summaryEn`），然后运行 `node scripts/build_site.mjs` 同步 `awesome/README*.md`、`site/awesome/` 与 `/llms.txt`。
- 修改本目录任意文档后，运行 `node ./bin/dislop.mjs check docs/research --fail-on info` 与 `PYTHONPATH=src python3 -m dislop.cli check docs/research --fail-on info` 确认零命中。
