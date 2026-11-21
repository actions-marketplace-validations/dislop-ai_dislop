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
| [business-model-and-open-core.zh-CN.md](./business-model-and-open-core.zh-CN.md) | **战略设计基线** | 9 款竞品定价对标、Open-Core 开源与云端增值边界、Google Cloud / Gemini 成本与隐私测算、防刷护栏与分阶段验证计划 |
| [anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md) | **一手调研** | 2026 年跨媒介（文稿、网页、办公文档、代码、多模态）开源工具与社区治理全景盘点 |
| [anti-pattern-detection-and-catalog.zh-CN.md](./anti-pattern-detection-and-catalog.zh-CN.md) | **一手调研 / `v0.3` 输入** | 语言节奏与界面反模式分析、四级检出漏斗，配套 [v0.3 规格](../specs/anti-pattern-catalog-and-probes-v0.3.md) 与 [验证原型](../../scripts/prototype_antipattern_lab.mjs) |
| [positive-divergence-and-personalization.zh-CN.md](./positive-divergence-and-personalization.zh-CN.md) | **远期提案** | 防均值回归与个性化声纹研究，配套 [positive-divergence/](./positive-divergence/) 草案 JSON 与 31 处公开设计参考源 |
| [multi-surface-integration-architecture.zh-CN.md](./multi-surface-integration-architecture.zh-CN.md) | **参考提案** | 浏览器、Skill、CLI、MCP、Hooks、SDK 与 HTTP API 的统一内核集成思路 |
| [multi-surface-architecture/website-as-agent-service.zh-CN.md](./multi-surface-architecture/website-as-agent-service.zh-CN.md) | **参考提案** | 静态官网向外部 Agent 提供 `/llms.txt`、`/catalog.json` 与纯 Markdown 页面的设计边界 |
| [awesome-anti-slop-topology-design.zh-CN.md](./awesome-anti-slop-topology-design.zh-CN.md) | **暂缓拆仓预案** | 8 组开源先例复盘与 `dislop.radar/3` 拆仓契约（[awesome-anti-slop-topology/](./awesome-anti-slop-topology/)）；现阶段清单留在主仓，仅当外部有效 PR 持续 `>= 5 条/月` 时再按需启用 |

## 维护说明

- 增删同路清单条目时，编辑 [anti-slop-radar-index.json](./anti-slop-radar-index.json)（同时填写中文 `summary` 与英文 `summaryEn`），然后运行 `node scripts/build_site.mjs` 同步 `awesome/README*.md`、`site/awesome/` 与 `/llms.txt`。
- 修改本目录任意文档后，运行 `node ./bin/dislop.mjs check docs/research --fail-on info` 与 `PYTHONPATH=src python3 -m dislop.cli check docs/research --fail-on info` 确认零命中。
