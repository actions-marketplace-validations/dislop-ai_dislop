# 系统架构说明（`v0.3.0`）

[English](./architecture.md)

`dislop` 是一个专注“去 AI 味”的确定性检查工具，基于统一的规则包清单协议（`schema: "dislop.pack/2"`）。它只查 AI 残留硬伤、高频套话与 PPT/网页模板味，不做通用安全路径扫描、WCAG 无障碍审计、PDF 预检或改稿事实比对。

## 1. 写前避坑 -> 检查 -> 改稿 -> 再查闭环

```text
写前避坑 (`skills/dislop/SKILL.md` / `.claude-plugin/` / `/llms.txt`)
   └── 文案与网页/PPT 去 AI 味写作规矩，先避开一阶套词、二阶口号、三阶推销句与默认模板
   │
   ▼
检查 (`auditText` / `auditOoxmlEntries`，CLI / MCP / 浏览器工作台同源)
   ├── AI 残留硬伤 (`packs/core/`，固定 `error`)
   └── 文体与模板包 (`business-brief` | `literary-essay` | `deck-and-ui`，`warning`/`info`)
   │
   ▼
局部改稿 (`deletionTest` 判断方法 + `原句 -> 换了种 AI 味 -> 改好` 对照)
   │   作者或 Agent 仅针对标出的片段改稿，不编造原稿没有的事实
   ▼
再查一遍 (`dislop check` / MCP `dislop_check`)
   └── 确认旧套话已清干净，同时拦截换成二阶 AI 口号的情况
```

`check` 只读不改稿。引擎通过等长空格掩码构造 `raw`、`prose` 与 `ui-text` 三层视图：代码块、行内代码、URL、HTML 标签/注释与引用样本不会触发正文误报，同时所有命中的行号与 Unicode 码点列号均与源文件严格对齐。

## 2. 双运行时与浏览器同源架构

| 模块 | 路径 | 职责 |
|---|---|---|
| JS 共享核心 | `src/core.mjs` | 纯标准 ES 模块（零 `node:*` 与 DOM 依赖），由 Node CLI、MCP 与浏览器工作台直接共用 |
| Node 二进制解析层 | `src/binary-node.mjs` | 基于标准库 `zlib.inflateRawSync` 解析 `.docx`/`.pptx` ZIP 中央目录 |
| Node CLI 与 MCP | `bin/dislop.mjs`, `bin/dislop-mcp.mjs` | 命令行（`check`、`explain`、`packs`、`pack-test`、`init`）与 stdio MCP 服务（`dislop_check`、`dislop_explain`、`dislop_packs`） |
| Python 核心与接口 | `src/dislop/{engine,cli,mcp_server}.py` | 纯 Python 3.10+ 标准库实现，通过 `tests/test_conformance.py` 与 Node 保持行为一致 |
| 规则包清单 | `packs/{core,business-brief,literary-essay,deck-and-ui}/pack.json` | 声明式 `dislop.pack/2` 规则（共 25 条）、阈值、判断方法、三段样本与正反用例 |
| 开源大模型后台与远程 MCP | `server/{index,llm-client}.mjs`、`server/Dockerfile` | 可选零依赖 HTTP API（`/v1/check`、`/v1/review`、`/v1/deslop`）与远程 HTTP `/mcp`；Key 仅存服务端环境变量（`DISLOP_LLM_API_KEY`），支持官方部署与 BYOK 自托管 |
| 离线效果基准评测 | `benchmarks/`、`scripts/run_benchmark.mjs` | 48 份 `CC0-1.0` 跨媒介检测样本（含 Node/Python 一致性）+ 12 组端到端文案/设计改稿任务、三阶探针、数字保真评分、`--eval` 与盲评表导出 |
| 官网静态编译器 | `scripts/build_site.mjs` | 零依赖编译器，将 `src/core.mjs`、`packs/`、`skills/`、`docs/brand*`、`ROADMAP*.md` 与已核验研究 JSON 同源编译为 `site/` 与 `awesome/README*.md` |
| 专题研究、规格与原型 | `docs/research/`, `docs/specs/`, `scripts/prototype_antipattern_lab.mjs` | 87 条实测核验 Awesome Anti-Slop 数据源（`dislop.radar/2`）、31 条设计/学术参考、多形态与正向差异化研究、`v0.3` 探针规格及可独立自测的验证原型 |

## 3. 覆盖率诚实原则与退出码

未经检查的内容绝不伪装成“0 问题”：

- `0` — 已完成检查，且高于或等于 `--fail-on`（默认 `error`）的命中数为 0。
- `1` — 存在达到 `--fail-on` 阈值的命中项（或启用 `--report-unused` 时存在失效豁免注释）。
- `2` — 参数错误、目标路径不存在，或显式指定的单个文件无法检查（如损坏的 Office 压缩包或非 UTF-8 编码文本）。

## 4. 官网静态部署（`dislop.com`）

`site/` 产物为纯静态文件（全部采用相对路径，零后端进程），直接通过 `https://dislop.com` 静态托管（配置 HSTS 与 `Content-Security-Policy` 锁死 `connect-src 'none'`，零第三方字体与统计外链）。官网与 `/awesome/` 默认呈现简体中文（`zh-CN`），右上角一键切原生英文（`en`），中英文页面的样稿、规则例句与 87 条清单摘要完全隔离、互不混排：

- **面向人类**：首屏一键「复制发给 Agent」提示句、实时三态示例卡、3 组可复制分享的真实前后案例（`/#cases`）、零上传浏览器工作台（`/#workbench`，支持一键「贴我的稿子」和测后安装/GitHub 引导）、清晰的 5 种使用方式（`/#surfaces`）、87 条离线筛选工具清单（`/awesome/`）与分享/Star 引导区（`/#share`）。
- **面向外部 Agent**：技术端点列表与 25 条规则明细表在页面中用 `<details>` 折叠（不打扰普通访客，同时在静态 HTML 与 DOM 中完整保留），并同步提供纯文本与结构化直连端点（`/llms.txt`、`/catalog.json`、`/index.md`、`/roadmap.md`、`/tasks/*.md`、`/methodology/*.md`、`/cases/*.md`、`/tools/*.md`、`/packs/*.md`、`/rules/*.md`、`/awesome/index.{json,md}`、`/llms-full.txt`）。构建期自动执行体积预算（`llms.txt <= 2,600 B`）、链接可达性、剔除 `fixtures.hit` 与去除 HTML 注释/不可见字符校验。
