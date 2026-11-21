# `dislop` 战略、功能、交互、视觉 VI 与多形态产品全景蓝图

[English](./strategy-and-roadmap.md)

> 基线版本：`v0.2.0` · 最后整合：2026-11-21 · 本文汇总并替代分散在多份专题研究中的定位、功能边界、视觉规范与演进路线，作为当前仓库的唯一产品与架构总纲；原始实证数据与深度专题保留于 [docs/research/README.md](./research/README.md)。

---

## 1. 战略定位与护城河

### 1.1 一级定位与核心主张

- **中文主标**：**全面去 AI 味。** 覆盖写作、文档、PPT、PDF、前端 UI 与 Agent 交付的全套工具，适配任意模型、Agent 与开发环境：确定性标出套话与硬伤，改后复检保住每个数字、链接与引用。
- **英文主标**：**De-slop AI outputs.** A complete toolkit for writing, docs, decks, PDF, Web UI, and agent deliverables across any model or dev environment: catch stock phrasing and delivery defects deterministically, then verify edits kept every number, link, and citation intact.

### 1.2 为什么能站稳差异化位置

2026 年的开源去 AI 味生态已出现显著分化：上游提示词技能开始自带规则脚本与钩子（如 `pbakaus/impeccable` 的 62 条前端规则与 `Leonxlnx/taste-skill` 的 Stop hook），而纯概率“降 AI 率 / 拟人化”工具常为绕过检测器篡改数字与限定条件。`dislop` 锚定三条可验证的工程护城河：

1. **跨媒介交付物确定性体检（零外部依赖双端一致）**：单一零依赖内核覆盖 `.md`/`.txt`、`.html`/`.css`/`.jsx`/`.tsx`/`.svg`、`.docx`、`.pptx` 与 `.pdf` 结构元数据，Node.js 与 Python 双运行时通过同一套 101 项样本断言与 12 项跨语言契约测试。
2. **三阶段事实守恒复检闭环（`check -> edit -> verify`）**：`check` 只定位不越权改稿，输出删除测试（Deletion Test）与 `bad -> trap -> good` 对照；`verify` 以多重集校验锁死数字、限定词（`up to`/`at least`/`最多`/`至少`）、单位、日期、URL、代码与引用，并拦截把公关词替换成二阶口号句式（如 `不是 A，而是 B` 或三连短句）的过矫漂移。
3. **负向防线 + 正向牵引 + 实测生态雷达的闭环**：在零 LLM 确定性门禁之上，通过离线声纹（`dislop.voice/1`）与抽象设计参考卡（`dislop.taste/1`）对抗跨模型均值回归，并以 87 条实测核验资源雷达建立开放参考系。

### 1.3 伦理与覆盖诚实底线

- **反套话，不反披露**：专注提升表达精度、版式可读性与交付质量；与对抗式“降 AI 率 / 去水印”工具保持明确边界，生态雷达中将检测器与规避工具隔离在对照观察区（`contrast-and-detection`）。
- **覆盖诚实原则**：加密 PDF、受损压缩包或未实现深解析的文本层均显式输出 `[SKIP]`（单文件检查退出码 `2`），绝不将未检查对象伪装为“0 问题”。

---

## 2. 功能体系与诚实边界（已实装 vs 原型 vs 规划）

| 能力域 | 现已实装（`v0.2.0`） | 原型已验 / `v0.3` 规格 | 后续规划（P0–P2） |
|---|---|---|---|
| **基础发布底线（`packs/core`，`error`）** | 7 条规则：本机路径泄露、未填占位符、AI 寒暄残迹、Office 裸 Markdown、空链接/未说明禁用控件、WCAG AA 对比度与深色 Z 轴倒置、Office 修订/批注/PPTX 越界/PDF 元数据与字体 | — | 扩展 PDF 元数据探针与基线豁免账本 |
| **文体与界面审美包（`warning`/`info`）** | 22 条规则：`business-brief`（8）、`literary-essay`（5）、`deck-and-ui`（9），自带代码/URL/引用遮蔽、删除测试与三段对照 | 5 条文本/UI 新探针已在 [prototype_antipattern_lab.mjs](../scripts/prototype_antipattern_lab.mjs) 通过 20 项断言（连续逗号链、句长 CV、过渡路标簇、毛玻璃滥用、侧边粗彩条）；另有 `pptx-layout-monotony` 规格 | 将 6 条新探针正式合入双端内核；可选解耦的端侧轻量小模型插件（ONNX/GGUF，仅 `info` 建议） |
| **阶段 3 改稿复检（`verify`）** | 数字+限定词+单位、日期、URL、行内/围栏代码、引用标记多重集校验 + 二阶口号漂移拦截 | — | 离线可复算的事实保真与二阶漂移公开评测基准 |
| **反模式查询目录（Catalog）** | 官网 29 条静态预渲染规则表（多维筛选、中英搜索、`#rule-<id>` SARIF 锚点、23 条一键工作台试跑） | 原型 CLI 多维查询已验证 | 正式落地 `dislop catalog` CLI 与 `dislop_catalog` MCP 工具 |
| **正向差异化与个性化** | 官网工作台内置浏览器纯内存声纹统计条 + 31 条非主流设计/学术参考源 | `dislop.voice/1`、`dislop.taste/1` JSON 草案与三带可控熵边界设计 | 离线 `dislop voice extract`、S1–S4 正向骨架卡与跨文档趋同检测 |
| **生态资源雷达** | 87 条实测核验索引（`dislop.radar/2`）与官网 `/radar/` 离线筛选目录（随主仓维护，集中星标与流量转化） | `dislop.radar/3` 单条目契约与建仓模板（按需启用） | **冷启动期坚持单仓沉淀**；仅当外部目录 PR 持续 `>= 5 条/月` 或外部维护者明确需要独立 CC0 治理时，再平滑切出 `dislop-ai/awesome-anti-slop`，同时永久保持 `dislop.com/radar/` 规范 URL 不变 |

---

## 3. 多形态产品矩阵（L0–L3 单一内核架构）

所有产品形态共享同一零依赖核心（`src/core.mjs` + `src/dislop/`）与规则事实源（`packs/*/pack.json`），差异化仅保留在触发时机与交互壳：

| 层级 | 产品形态 | 当前状态 | 目标用户与触发时机 | 入口与交付件 |
|---|---|---|---|---|
| **L0** | **人机双读官网（`dislop.com`）** | **已上线** | 首次访问者在线试用、审校本地文件，以及无本地安装的联网 Agent 零配置按需读取 | 静态 Nginx 单规范域名；工作台 `/#workbench`、雷达 `/radar/`、Agent 端点 `/llms.txt`、`/catalog.json`、`/tasks/*.md`、`/rules/*.md` |
| **L1** | **Agent Skill（`SKILL.md`）** | **已落地仓内 SSOT** | Claude Code、Codex、Cursor、Windsurf 等支持标准 Skill 的写作/研发 Agent | [skills/dislop/SKILL.md](../skills/dislop/SKILL.md)（同源编译至 `/tools/skill.md`） |
| **L1** | **Node.js & Python CLI** | **已发布 `v0.2.0`** | 本地目录/文件/stdin 检查、Git 增量门禁（`--changed`/`--staged`）、SARIF 2.1.0、GitHub PR 注解与 `verify` | `npx --yes github:dislop-ai/dislop` / `uvx --from git+https://github.com/dislop-ai/dislop` |
| **L2** | **Stdio MCP Server** | **已发布 `v0.2.0`** | 接入主流 Agent 客户端执行结构化 `dislop_check` / `dislop_verify` / `dislop_explain` / `dislop_packs` | `bin/dislop-mcp.mjs`、`src/dislop/mcp_server.py`、`server.json` |
| **L2** | **Hooks / pre-commit / CI** | **模板就绪（封装 P0）** | 每次保存或提交 PR 时自动拦截 `core` 客观错误 | `site/tools/cli-and-hooks.md`、`.github/workflows/ci.yml` |
| **L3** | **SDK & 无状态 HTTP API** | **内核已导出（门面/API P1）** | 异构后端服务、CMS 发稿中台、自托管工作流节点 | 已导出 `src/core.mjs`；后续新增强类型 SDK 门面与 Web Standard Fetch API |

---

## 4. 交互、UI 与品牌视觉 VI 体系

完整视觉参数见 [design-system.zh-CN.md](./design-system.zh-CN.md)，核心识别纪律整合如下：

### 4.1 品牌平面与 VI 资产

- **设计隐喻**：**建筑网格上的印刷校样单（Architectural Galley Proof）**——同时避开「深蓝紫粉霓虹渐变 + 胶囊堆砌」（第一代默认模板）与「暖米白 + 暖黑 + 陶土红」（第二代默认模板）。
- **品牌标识（[assets/logo.svg](../assets/logo.svg)）**：取自中西共通校对删除号（*dele* / GB/T 14706），实测适配 `16px` favicon、`64px` 头像与 `512px` 图标。
- **自适应仓库横幅**：[assets/banner-light.svg](../assets/banner-light.svg) 与 [assets/banner-dark.svg](../assets/banner-dark.svg)（已清理旧版重复 `banner.svg`），右侧校样标本严格遵守「朱红仅标 `core error`、墨绿虚线标 `stet` 锁定事实」的语义铁律。
- **社交分享图（Open Graph）**：[assets/og-card.svg](../assets/og-card.svg) 与光栅版 [assets/og-card.png](../assets/og-card.png)（`1200×630`），在 X、GitHub、Slack、Discord 与微信转发时呈现统一印刷校样识别。

### 4.2 色彩、对比度与排印约束

- **全量通过 WCAG 2.2 AA**：基于 `src/core.mjs` 精确复算，浅色清样（`#FFFFFF`）对比度 `--ink 18.0:1`、`--ink-2 8.6:1`、`--ink-3 6.0:1`、`--mark-error 6.6:1`、`--mark-warn 7.3:1`、`--mark-stet 6.5:1`；深色清样（`#15181C`）表面明度按 `--stage (L* 4.6) < --sheet (L* 8.1) < --raised (L* 12.6)` 单调递增，零 Z 轴倒置。
- **红蓝绿三语义绑定线型**：朱红实线（`error` 客观错误）、群青虚线（`warn/info` 审美商榷）、墨绿虚线（`stet` 受保护事实），绝不单靠颜色传意，也绝不将红色用于纯装饰。
- **零外部字体与零外发请求**：纯系统级中英混排三字体栈（衬线文稿 / 无衬线界面 / 等宽 `tabular-nums` 坐标），全站由 HTTP 响应头与 `<meta>` 双重锁定 `CSP: connect-src 'none'`。

### 4.3 官网交互设计原则

- **首屏直给 + 10 秒可试**：Band 00 顶部直接给出“全面去 AI 味”主标、4 列硬证据带与 3 条一键复制命令；Band 01 即为真实离线工作台（支持 5 组标本、本地拖拽/上传 `.md`/`.html`/`.docx`/`.pptx`/`.pdf`、清样批注与编辑复检双视图、一键体验合规改写与二阶陷阱、实时声纹统计）。
- **静态预渲染与前端水合同源**：规则表、端点清单、雷达数据与自审标本均由 `scripts/build_site.mjs` 在构建期静态生成，无 JS 爬虫与外部 Agent 拿到的结构信息与浏览器渲染保持一致。
- **渐进披露防注入**：`/llms.txt`（~2.4 KB）负责 L0 路由，`/tasks/*.md`（~1K tokens）按场景打包方法论、案例与工具，`/rules/<id>.md` 单卡独立访问；所有 Agent 端点强制剥离 `fixtures.hit`、HTML 注释与隐藏 Unicode 字符。

---

## 5. 分阶段演进与纪律门禁

1. **G0（当前收尾与发包准备）**：完成双端引擎、官网人机双读升级、仓内 `SKILL.md`、品牌 VI 与文档整合，完成 npm 与 PyPI 正式发包；**生态雷达留在主仓与 `dislop.com/radar/` 集中承接流量、星标与工作台转化，不提前拆仓分散注意力**。
2. **G1（`v0.3.0` 能力深化）**：将 `src/node-host.mjs` 与 `src/mcp.mjs` 从 CLI 解耦，合入 6 条新确定性探针、`dislop catalog` / `dislop_catalog`，并落地离线 `dislop verify` 基准集；若此时雷达外部 PR 持续 `>= 5 条/月`，再按 `dislop.radar/3` 契约无损切出独立 CC0 仓。
3. **G2（正向引擎与服务化扩展）**：推进 `dislop.voice/1` 离线提取器、`dislop.taste/1` 设计参考卡、无状态 Web Standard Fetch HTTP API 及严格解耦的端侧小模型可选插件。

### 防过度设计红线

- 核心引擎（`src/core.mjs` 与 `src/dislop/`）永久保持零第三方运行时依赖。
- 官网永久保持纯静态构建与 `CSP: connect-src 'none'`，不引入动态后端数据库。
- 适配层（CLI / MCP / Skill / 网站编译器 / 未来 HTTP API）不重复硬编码规则正则与阈值，所有判定归口于 `packs/` 与核心引擎。
