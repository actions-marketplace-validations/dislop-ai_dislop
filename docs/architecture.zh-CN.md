# 系统架构说明（`v0.3.0`）

[English](./architecture.md)

`dislop` 是一个专注“去 AI 味”的确定性检查工具，基于统一的规则包清单协议（`schema: "dislop.pack/2"`）。它只查 AI 残留硬伤、高频套话与 PPT/网页模板味，不做通用安全路径扫描、WCAG 无障碍审计、PDF 预检或改稿事实比对。

## 1. 检查 -> 改稿 -> 再查闭环

```text
待发文件 (.md, .txt, .html, .css, .jsx, .tsx, .docx, .pptx)
   │
   ▼
检查 (`auditText` / `auditOoxmlEntries`)
   ├── AI 残留硬伤 (`packs/core/`，固定 `error`)
   └── 文体与模板包 (`business-brief` | `literary-essay` | `deck-and-ui`，`warning`/`info`)
   │
   ▼
改稿参考 (`deletionTest` 判断方法 + `原句 -> 换了种 AI 味 -> 改好` 对照)
   │   作者或 Agent 仅针对标出的片段改稿
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
| 官网静态编译器 | `scripts/build_site.mjs` | 零依赖编译器，将 `src/core.mjs`、`packs/`、`skills/`、`docs/brand*`、`ROADMAP*.md` 与已核验研究 JSON 同源编译为 `site/` 与 `awesome/README*.md` |
| 专题研究、规格与原型 | `docs/research/`, `docs/specs/`, `scripts/prototype_antipattern_lab.mjs` | 87 条实测核验 Awesome Anti-Slop 数据源（`dislop.radar/2`）、31 条设计/学术参考、多形态与正向差异化研究、`v0.3` 探针规格及可独立自测的验证原型 |

## 3. 覆盖率诚实原则与退出码

未经检查的内容绝不伪装成“0 问题”：

- `0` — 已完成检查，且高于或等于 `--fail-on`（默认 `error`）的命中数为 0。
- `1` — 存在达到 `--fail-on` 阈值的命中项（或启用 `--report-unused` 时存在失效豁免注释）。
- `2` — 参数错误、目标路径不存在，或显式指定的单个文件无法检查（如损坏的 Office 压缩包或非 UTF-8 编码文本）。

## 4. 官网静态部署（`dislop.com`）

`site/` 产物为纯静态文件（全部采用相对路径，零后端进程），直接通过 `https://dislop.com` 静态托管（配置 HSTS 与 `Content-Security-Policy` 锁死 `connect-src 'none'`，零第三方字体与统计外链）。官网与 `/awesome/` 默认呈现简体中文（`zh-CN`），右上角一键切原生英文（`en`），中英文页面的样稿、规则例句与 87 条清单摘要完全隔离、互不混排：

- **面向人类**：首屏实时三态示例卡（`原稿` / `换了种 AI 味` / `改干净了`）、零上传浏览器工作台（`/#workbench`）、可检索 25 条规则表（`/#rules`，带稳定 `#rule-<id>` SARIF 锚点）、87 条离线筛选工具清单（`/awesome/`）以及同源编译的 `/roadmap.zh-CN.md` / `/roadmap.md`。
- **面向外部 Agent**：渐进披露纯文本与结构化端点（`/llms.txt`、`/catalog.json`、`/index.md`、`/roadmap.md`、`/tasks/*.md`、`/methodology/*.md`、`/cases/*.md`、`/tools/*.md`、`/packs/*.md`、`/rules/*.md`、`/awesome/index.{json,md}`、`/llms-full.txt`）。构建期自动执行体积预算（`llms.txt <= 2,600 B`）、链接可达性、剔除 `fixtures.hit` 与去除 HTML 注释/不可见字符校验。
