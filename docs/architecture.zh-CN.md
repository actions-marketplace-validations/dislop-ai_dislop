# 系统架构说明（`v0.2.0`）

[English](./architecture.md)

`dislop` 由三段确定性审校闭环与统一的规则清单协议（`schema: "dislop.pack/2"`）构成。

## 1. 三阶段审校与复检闭环

```text
待发交付物 (.md, .html, .css, .svg, .docx, .pptx, .pdf)
   │
   ▼
阶段 1：确定性体检 (`auditText` / `auditOoxmlEntries` / `auditPdfStructure`)
   ├── 基础发布底线 (`packs/core/`，固定 `error`)
   └── 文体与界面审美包 (`business-brief` | `literary-essay` | `deck-and-ui`，`warning`/`info`)
   │
   ▼
阶段 2：改稿上下文 (`deletionTest` 删除测试 + `bad -> trap -> good` 对照 + `protectedFacts`)
   │   人类作者或本地 Agent 仅针对命中区间做局部修改
   ▼
阶段 3：局部修订复检 (`dislop verify` / MCP `dislop_verify`)
   ├── 核对数字（含限定词与单位）、URL、行内与围栏代码、引用标记的多重集完全一致
   ├── 确认未引入任何 `core` 错误且命中总数净下降
   └── 拦截向二阶口号句式（`negation-pivot`、`staccato`、`triad`、`ending`）的过矫漂移
```

### 为什么把“检查”与“复检”拆开

- **阶段 1（`check`）** 只读不改稿。引擎通过等长空格掩码构造 `raw`、`prose` 与 `ui-text` 三层视图：代码块、行内代码、URL、HTML 标签/注释与引用样本不会触发正文误报，同时所有命中的行号与 Unicode 码点列号均与源文件严格对齐。
- **阶段 2（`explain` 与行内附带样本）** 向作者或 MCP Agent 提供具体的**删除测试问题**及“反例 / 二阶陷阱 / 合规改写”对照，而不是直接下发禁用词黑名单——直接喂禁用词表正是诱发大模型同义词硬换与短句口号化的根源。
- **阶段 3（`verify`）** 用确定性规则兜住事实底线。例如把 `最多 12 分钟` 改成 `12 分钟`，或把 `重要抓手` 改写成 `这不是一次改造，而是底气`，都会被 `verify` 直接判为 `rejected` 并列出原因。

## 2. 双运行时与浏览器同源架构

| 模块 | 路径 | 职责 |
|---|---|---|
| JS 共享核心 | `src/core.mjs` | 纯标准 ES 模块（零 `node:*` 与 DOM 依赖），由 Node CLI、MCP 与浏览器工作台直接共用 |
| Node 二进制解析层 | `src/binary-node.mjs` | 基于标准库 `zlib.inflateRawSync` 解析 `.docx`/`.pptx` ZIP 中央目录及 `.pdf` 压缩流 |
| Node CLI 与 MCP | `bin/dislop.mjs`, `bin/dislop-mcp.mjs` | 命令行（`check`、`verify`、`explain`、`packs`、`pack-test`、`init`）与 stdio MCP 服务 |
| Python 核心与接口 | `src/dislop/{engine,cli,mcp_server}.py` | 纯 Python 3.10+ 标准库实现，通过 `tests/test_conformance.py` 与 Node 保持行为一致 |
| 规则包清单 | `packs/{core,business-brief,literary-essay,deck-and-ui}/pack.json` | 声明式 `dislop.pack/2` 规则、阈值、删除测试、三段样本与正反用例 |
| 官网清样工作台 | `site/`（由 `scripts/build_site.mjs` 同步） | 纯静态 HTML/CSS/JS，利用浏览器原生 `DecompressionStream('deflate-raw')` 在本地内存解析 `.docx`/`.pptx` |

## 3. 覆盖率诚实原则与退出码

未经检查的内容绝不伪装成“检查通过”：

- `0` — 已完成检查，且高于或等于 `--fail-on`（默认 `error`）的命中数为 0。
- `1` — 存在达到 `--fail-on` 阈值的命中项（或启用 `--report-unused` 时存在失效豁免注释）。
- `2` — 参数错误、目标路径不存在，或显式指定的单个文件无法检查（如加密 PDF 或非 UTF-8 编码文本）。

在零外部依赖模式下检查 PDF 时，`dislop` 会核验 `/URI` 本机路径泄露、`/Info` 原始文件名标题、`/FontDescriptor` 字体嵌入与跨页 `/MediaBox` 尺寸一致性，并将完整 CID 正文提取显式标记为 `[SKIP] <file>#prose`。

## 4. 官网静态部署（`dislop.com`）

`site/` 产物为纯静态文件（全部采用相对路径，零后端进程）：

- **单一官方入口（`https://dislop.com`）**：由海外静态 Nginx 源站直接通过 HTTPS 托管（关闭版本号暴露，配置 HSTS 与 `Content-Security-Policy` 双重锁死 `connect-src 'none'`，全站零第三方字体与统计外链）。中国大陆与海外访问者统一经由 `.com` 主站进入，不再分流或并存 `github.io` 镜像入口。
