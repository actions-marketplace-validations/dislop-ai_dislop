<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — 把稿子里的 AI 味挑出来" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="https://dislop.com">去 dislop.com 试试</a> ·
  <a href="https://www.npmjs.com/package/dislop">npm</a> ·
  <a href="https://pypi.org/project/dislop/">PyPI</a> ·
  <a href="./awesome/README.zh-CN.md">Awesome Anti-Slop 工具清单</a> ·
  <a href="./ROADMAP.zh-CN.md">路线图</a> ·
  <a href="https://x.com/dislop_ai">X (@dislop_ai)</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

`dislop` 把靠谱的写作规矩、网页和 PPT 设计原则、离线零依赖检查引擎和 87 条精选工具收在一起。交付文档、Word、PPT 或网页前，可以发给你的 AI 直接用、在线试查，或装成 Agent 的 Skill、Plugin 和 MCP。

拿一段模型刚写完的上线说明来举个例子：

```text
好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。
```

跑 `dislop check launch-note.md --lang zh`，会标出四处：

```text
[ERROR]   launch-note.md:1:1   chatbot-artifact         "好的，以下是修改后"
[WARNING] launch-note.md:1:16  zh-bureaucratic-padding  "值得注意的是，"
[WARNING] launch-note.md:1:35  zh-bureaucratic-padding  "抓手"
[WARNING] launch-note.md:1:38  zh-bureaucratic-padding  "全面赋能"
```

如果删掉了旧套话，却顺手换成了另一种 AI 腔（例如“这不是一次简单的升级，而是一场效率革命”），再跑一遍 `dislop check` 一样会被标出来。改回平实的话，检查直接通过。

大致就做这些。Markdown、纯文本、HTML/CSS/JSX、Word（`.docx`）和 PPT（`.pptx`）都能查。[dislop.com](https://dislop.com) 默认离线工作台与开源 Node/Python 命令行、本地 stdio MCP 共用同一套 **7 套场景包（`42` 条规则）**、5 轴节奏统计和离线声纹提取，全程零上传；命令行与本地 MCP 还内置扩展模式库扫描（`--patterns`）、随包 `14.6 KB` 轻量集成模型（`--ml`）以及按本机硬件选装本地小模型（`dislop model`）。需要免装环境接入或一键自愈去味时，再按需连官方托管云端 MCP（`https://dislop.com/mcp`）。

## 上手

### Node.js 20+（已上架 npm，零外部依赖，内置全部 7 套规则包）

```bash
# 检查当前目录（命中硬伤时退出码为 1，同时标出套话提醒）
npx --yes dislop check .

# 自动路由文体包，同时开启 5 轴节奏统计、14.6 KB 轻量模型与扩展模式库扫描
npx --yes dislop check draft.md --pack auto --profile --ml --patterns

# 离线提取你自己的句长与标点声纹，或按本机内存查看选装本地小模型建议
npx --yes dislop voice my-notes.md
npx --yes dislop model --lang zh

# 只查相对 main 新改的行，并输出 GitHub PR 行内批注
npx --yes dislop check --changed origin/main --format github

# 查看某条规则的判断方法和改前/改后示例
npx --yes dislop explain negation-pivot-frame --lang zh
```

### Python 3.10+（已上架 PyPI，零外部依赖）

```bash
# 用 uvx 免安装直接跑，或用 pip 安装
uvx dislop check quarterly-review.pptx
pip install dislop && dislop check . --lang zh
```

## AI 残留硬伤和套话提醒分开查

很多自动“去 AI 味”改写工具容易把旧套话换成另一种腔调，或者把你的语气全洗成同一种模版。单纯用黑名单也有毛病，容易误伤正常句子（比如「抓手机拍照」「北京大学、清华大学、复旦大学」）。

`dislop` 把 7 套内置包里的 42 条规则分成两层：

1. **AI 残留硬伤（`packs/core/`，固定 `error`，所有文体包默认开启）**：一眼就能看出的 AI 生成残迹——留在第一行的 AI 寒暄（`好的，以下是…`、`[oaicite:1]`）、没填的占位符（`{{var}}`、`【待补充】`）、贴进 Word/PPT 没渲染的裸 Markdown，以及 AI 网页里的空链接 `<a href="#">` 与占位禁用按钮。
2. **场景与垂直规则包（`warning` / `info`，默认全部内置、0 联网）**：`business-brief`（工作文档）、`engineering-spec`（PR 摘要复读、空洞根因复盘、无责任人改进项）、`regulated-comms`（无证据极限词、缺基线的“提升数倍”）、`literary-essay`（随笔长文）、`deck-and-ui`（PPT 与网页）与 `executive-deck`（只写“关于……的分析汇报”的过程标题、连续 4 页以上同骨架幻灯片）。每条都附判断方法、原句 / 改过头 / 改好三段示例，以及正反测试样本。

## 它读得了什么

Node.js 版（`bin/dislop.mjs`）和 Python 版（`src/dislop/`）都零外部依赖，通过同一套跨运行时一致性测试（`tests/test_conformance.py`）。

| 手头的文件 | 扩展名 | 能替你挑出什么 | 明确边界 |
|---|---|---|---|
| 文稿与长文 | `.md`, `.mdx`, `.txt` | AI 残留硬伤 + 开场白寒暄、公文黑话、“不是 A，而是 B”套句、连发短句和四字排比、段尾说教、无出处数据、满屏加粗清单、破折号过密、中文里混半角标点 | 代码块、行内代码、URL、引用块与 `dislop-quote` 示例区对文风规则自动屏蔽 |
| 网页与组件 | `.html`, `.css`, `.jsx`, `.tsx` | 空链接与无说明禁用按钮、默认紫粉渐变、满屏胶囊标签、三层套盒、`AI-Powered` 提示词营销徽章 | 只做单文件静态分析；动态渲染后的 DOM 需配合浏览器测试 |
| Word 文档 | `.docx` | 合并同段落文本运行、贴进文档没渲染的裸 Markdown 星号及正文套话（定位至 `para N`） | 报段落序号，不计算排版页码 |
| 演示文稿 | `.pptx` | 按真实放映顺序定位页码、裸 Markdown、单页字数墙（中文 > 280 字 / 英文 > 120 词）、要点超过 6 条、自动缩排低于 80%、空泛标题（“背景”“概述”）、连页版式单调及正文套话 | 隐藏幻灯片跳过密度检查并显式报 `[SKIP]` |

## Awesome Anti-Slop 工具清单

我们也顺手整理了 87 个去 AI 味相关的中英文工具、写作规范、前端设计规则、代码 PR 治理和论文。可以直接看 **[awesome/README.zh-CN.md](./awesome/README.zh-CN.md)**（[English](./awesome/README.md)），或者在 **[dislop.com/awesome/](https://dislop.com/awesome/)** 离线筛选（也提供 [index.json](https://dislop.com/awesome/index.json) 和 [index.md](https://dislop.com/awesome/index.md) 给 Agent 读取）。

## 让你的 AI、编辑器和流水线直接用

| 接入环境 | 一行命令或一键唤起 | 说明 |
|---|---|---|
| **任意联网 AI 对话** | 发一句：`先读 https://dislop.com/llms.txt，按里面的规矩和检查方法把接下来这份稿子过一遍。` | 免安装，直接读约 `2.4 KB` 索引、任务卡（`/tasks/*.md`）或单条规则页（`/rules/<id>.md`） |
| **跨宿主 Agent Skill** | `npx skills add dislop-ai/dislop` | 把 [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) 与 4 张本地参考卡装进 Claude Code、Codex、Cursor、Windsurf、Antigravity、OpenCode（全程 `0` 联网） |
| **Claude Code 插件** | `/plugin marketplace add dislop-ai/dislop` 后执行 `/plugin install dislop@dislop-ai` | 一键装好 Skill 与本地离线 MCP（常驻上下文仅约 `130` tokens） |
| **OpenAI Codex 插件** | `codex plugin marketplace add dislop-ai/dislop` 后执行 `codex plugin add dislop@dislop-ai` | 附带 [openai.yaml](./skills/dislop/agents/openai.yaml) 原生应用卡片与 `$dislop` 快捷指令 |
| **Gemini CLI 扩展** | `gemini extensions install https://github.com/dislop-ai/dislop` | 基于根目录 [gemini-extension.json](./gemini-extension.json) 直接挂载本地 `bin/dislop-mcp.mjs` |
| **官方 MCP 注册表** | 在 `registry.modelcontextprotocol.io` 检索 `io.github.dislop-ai/dislop` | 同时提供本地 `npx` / `uvx` 离线包与远程 `https://dislop.com/mcp` |
| **VS Code / Cursor 一键装 MCP** | [装进 VS Code（本地离线）](https://vscode.dev/redirect/mcp/install?name=dislop&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22--yes%22%2C%22dislop%22%2C%22--mcp%22%5D%7D) · [装进 VS Code（云端免环境）](https://vscode.dev/redirect/mcp/install?name=dislop-cloud&config=%7B%22url%22%3A%22https%3A%2F%2Fdislop.com%2Fmcp%22%7D) · [装进 Cursor（本地离线）](cursor://anysphere.cursor-deeplink/mcp/install?name=dislop&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsImRpc2xvcCIsIi0tbWNwIl19) | 浏览器点击直接拉起编辑器确认框，不用手改 JSON |
| **GitHub Action / `pre-commit`** | 在工作流里引用 `uses: dislop-ai/dislop@main`（见 [action.yml](./action.yml) 与 [.pre-commit-hooks.yaml](./.pre-commit-hooks.yaml)） | PR 只查本次改动行并输出行内批注或 SARIF 2.1.0 |

### 手动接入本地 MCP（`Claude Code`、`Codex`、`Cursor`、`Windsurf`）

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "dislop", "--mcp"]
    }
  }
}
```

提供 **7 个**本地离线工具（默认启用紧凑输出 `verbosity: "compact"` 节省上下文，且剥离负例样本）：`dislop_check`（支持 `pack` 含 `"auto"`、`profile`、`ml`、`patterns`）、`dislop_voice_extract_offline`、`dislop_model_score`、`dislop_model_status`、`dislop_explain`、`dislop_packs`、`dislop_catalog`。

## 配置，以及什么时候不听它的

运行 `dislop init` 生成 `.dislop.json`（个人私有禁词放在 Git 忽略的 `.dislop.local.json`）：

```json
{
  "failOn": "error",
  "ignore": ["vendor/**", "dist/**"],
  "overrides": [
    { "files": ["docs/**/*.md"], "pack": "business-brief" },
    { "files": ["essays/**/*.md"], "pack": "literary-essay" },
    { "files": ["site/**/*.{html,css,svg}"], "pack": "deck-and-ui" }
  ],
  "allow": ["无缝钢管"]
}
```

确需在某一行保留原文引用，在上一行写明原因即可（`--report-unused` 会清出失效注释）：

```markdown
<!-- dislop-ignore-next-line zh-bureaucratic-padding -- 原样摘录外部招标文件条款 -->
```

### 本地一次安装（真断网 / 快速 Hook 推荐）

```bash
# Node.js 20+（已上架 npm，装一次后完全离网运行，包体 < 250 KB）
npm install -g dislop
dislop check .

# 或 Python 3.10+（已上架 PyPI，零外部依赖）
pip install dislop
dislop check .
```

### 开源本地（`Skill` + `CLI`）vs. 官方托管云端（`dislop.com/mcp`）

- **开源本地（`dislop-ai/dislop`，Apache-2.0）**：`SKILL.md` 与本地 `./references/*.md` 参考卡、Node/Python 命令行（`dislop check [--pack <id|auto>] [--profile] [--ml] [--patterns] [--changed [ref]] [--staged] [--format text|json|sarif|github|md]`、`dislop patterns`、`dislop voice`、`dislop model [status|score|install|import|remove|deslop]`、`dislop setup`、`dislop deslop --local`、`dislop explain`、`dislop packs`、`dislop catalog`、`dislop resources`）、7 工具本地 stdio MCP（`--mcp`）、全部 7 套内置规则包（42 条规则）、53 条反模式库（`patterns/`）、随包内置的 `14.6 KB` gzip（原始 `49.0 KB`）传统集成模型（`models/pocket-slop-v1.json`，`< 0.5 ms`，在 `stealth-vapor-v1` 上 F1 `100.0%`、干净误报 `0.0%`）、`Awesome Anti-Slop` 及 `dislop-bench v2`。零第三方依赖、不需要 API Key，`check` / `patterns` / `voice` / `model score` 全程零联网，私密文档绝不离开本机；需要本地小模型改写时，可通过 `dislop setup` 或 `dislop model install` 按内存与磁盘预算选装 `0.6B`（约 `520 MB`）、`1.7B`（约 `1.3 GB`）或 `4B`（约 `2.5 GB`）小模型（也支持 `dislop model import` 离线校验导入 `.gguf`/`.onnx` 权重），改写时自动启用内部数字与边界限定词保真护栏兜底。
- **官方托管云端与远程 HTTP MCP（`https://dislop.com/mcp` · [开源与云端方案](https://dislop.com/#pricing)）**：独立闭源云端后台，使用付费级零训练 Google Gemini 模型端点（不落盘留存草稿；详见 [隐私说明](https://dislop.com/privacy.md)）。提供 `dislop_review`（1 额度，三阶结构诊断 + 规则联查）、`dislop_deslop`（2 额度，自愈一键去味，内置数字与限定词保真护栏及自动二次修复）与 `dislop_voice_extract`（2 额度，提取 `dislop.voice/1` 个人文风）。网页免登录每天 5 试用额度，邮箱领取免费密钥即享 **每月 30 免费额度**；Pro（`$12/月` · 1,500 额度）、按量包（`$10 / 800 额度`）与 Team（`$29/席位/月`）已开放早鸟预约。

## 去 AI 味效果基准测试（`dislop-bench v2`）

一键离线复现 `112` 份跨媒介检测样本（Node/Python 双端一致性核验）与 `18` 组端到端文案/设计改稿任务：

```bash
node scripts/run_benchmark.mjs --assert
```

最新离线实测结果（完整报告见 [benchmarks/REPORT.md](./benchmarks/REPORT.md) 与 [benchmarks/PATTERN-BENCHMARK.md](./benchmarks/PATTERN-BENCHMARK.md)）：

- **核心检测基准（`Suite A`，112 样本 = 48 基准 + 16 `holdout-v1` + 48 `text-hard-v2`）**：准确率 `100.0%` · 召回率 `100.0%` · 干净原稿误报率 `0.0%` · 易误报近邻样本误报率 `0.0%` · 二阶 AI 口号召回率 `100.0%` · Node/Python 规则与统计画像一致率 `100.0%`。
- **多角度反模式基准（`154` 样本 = 48 + 16 + 62 `pattern-challenge-v2` + 28 `holdout-v2`）**：准确率 `100.0%` · 召回率 `100.0%` · F1 `100.0%` · 干净误报率 `0.0%` · Node/Python 一致率 `100.0%`。
- **内置轻量模型（`stealth-vapor-v1`，24 份配对样本；含留出集 36 份盲测）**：`14.6 KB` gzip（原始 `49.0 KB`）、`< 0.5 ms`、F1 `100.0%`、干净误报 `0.0%`。
- **端到端改稿效果（`Suite B`，18 题 = 12 `revision-v1` + 6 `revision-hard-v2`，权重 `D1=45 / D2=20 / D3=25 / D4=10`）**：模型原稿 `raw_ai` **60.8 / 100** → 普通改写 `naive_humanizer` **70.8 / 100**（三阶结构味翻倍且漏改或编造数字）→ 按 dislop 规矩改稿 `dislop_clean` **100.0 / 100**（`18/18` 全过）。
- **5 模型真实在线对比（[benchmarks/MODEL-COMPARISON.md](./benchmarks/MODEL-COMPARISON.md)）**：实测 `Gemini 3.1/3.5 Flash-Lite`、`Gemini 3.5/3.8 Flash` 与 `Qwen 3.8 Flash`，在 `revision-v1` 的 10 题在线子集上裸 Prompt 仅得 `76.0–84.2 / 100`（`2/10–4/10` 全过），接入 `dislop` 云端自愈流水线后全线提升 **+15.8 至 +22.3 分**（达 `97.0–100.0 / 100`、`8/10–10/10` 全过；其中 `Gemini 3.1 Flash-Lite` 中位延迟仅 `1.2 秒`、每千次调用约 `$0.09`，得分 `98.5 / 100`）。

详见 [benchmarks/README.zh-CN.md](./benchmarks/README.zh-CN.md)，支持评测任意模型/Prompt/Skill/云端端点（`--eval`）以及导出随机盲评表（`--export-blind-sheet`）。

## 这个仓库自己也过这道门

GitHub Actions CI 在每次提交时跑完双端 `dislop pack-test`（160 项样本断言：83 条命中 + 77 条干净）、26 项 Python `unittest` 一致性与引擎单测（覆盖 `test_conformance`、`test_engine`、`test_pattern_library`、`test_pocket_and_local_models`）、反模式库核验（`node scripts/pattern_lab.mjs verify` 与 `assert`）、官网校验测试（`tests/test_site.mjs`），并对仓库自己的文档、`awesome/` 与 `site/` 执行 `dislop check . --fail-on warning`。

## 文档与目录

- [文案与视觉基准](./docs/brand-and-voice-guide.zh-CN.md)（[English](./docs/brand-and-voice-guide.md)）
- [架构说明](./docs/architecture.zh-CN.md)（[English](./docs/architecture.md)）· [设计规范](./docs/design-system.zh-CN.md)（[English](./docs/design-system.md)）
- [路线图与协作计划](./ROADMAP.zh-CN.md)（[English](./ROADMAP.md)）· [发版与多平台上线规范](./docs/releasing.zh-CN.md) · [贡献指南](./CONTRIBUTING.md) · [调研索引](./docs/research/README.md) · [变更记录](./CHANGELOG.md)

```text
dislop/
├── .agents/plugins/   # OpenAI Codex 市场清单（marketplace.json）
├── .claude-plugin/    # Claude Code 插件与市场清单（打包 Skill + 本地 MCP）
├── .codex-plugin/     # OpenAI Codex 原生插件清单与卡片配置
├── plugin.json        # Agent Plugins 1.0 跨平台标准清单（配根目录 mcp.json）
├── gemini-extension.json # Gemini CLI 扩展画廊清单
├── server.json        # 官方 MCP Registry 清单（同时声明本地 stdio 与远程 HTTP）
├── action.yml         # 可复用的 GitHub Marketplace 增量检查 Action
├── awesome/           # Awesome Anti-Slop 中英文工具清单（87 条）
├── benchmarks/        # 去 AI 味效果基准测试数据集（CC0-1.0）与离线实测报告
├── bin/               # Node.js CLI（dislop.mjs）与本地 stdio MCP（dislop-mcp.mjs）
├── src/
│   ├── core.mjs       # 零依赖纯 ES 模块内核，由 Node CLI、MCP 与浏览器工作台共用
│   ├── pattern-engine.mjs # 多角度 11 条扩展模式库扫描器
│   ├── pocket-model.mjs# 14.6 KB gzip 零依赖传统集成水文评分与场景路由模型
│   ├── local-model.mjs# 本机内存/芯片探测与可选本地小模型推荐（Node.js）
│   ├── binary-node.mjs# Node.js 零依赖 ZIP 解析层（.docx / .pptx）
│   └── dislop/        # 零依赖 Python 3.10+ 核心引擎、模式库扫描、本地模型探测、CLI 与 MCP 服务
├── packs/             # 声明式 dislop.pack/2 规则包（全部 7 套内置包，42 条规则，160 项样本断言）
├── patterns/          # 6 维度 7 角度 53 条结构化反模式库（patterns/dimensions/*.json）
├── skills/dislop/     # 跨宿主标准 Agent Skill（SKILL.md + 本地 ./references/ + openai.yaml）
├── tests/             # 26 项 Python 单测、Node/Python 跨运行时一致性测试与官网校验测试
├── scripts/           # 清单同源同步（sync_manifests.mjs）、官网编译器与基准脚本
├── site/              # 编译产物：dislop.com 工作台、/awesome/ 清单与 /llms.txt
├── assets/            # 校对删除号标识、浅/深色横幅与 1200x630 分享图
└── docs/              # 品牌基准、架构、视觉规范、路线与调研资料
```

## 开源许可

[Apache License 2.0](./LICENSE)
