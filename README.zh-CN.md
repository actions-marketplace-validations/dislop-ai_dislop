<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — 把稿子里的 AI 味挑出来" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="https://dislop.com">去 dislop.com 试试</a> ·
  <a href="./awesome/README.zh-CN.md">Awesome Anti-Slop 工具清单</a> ·
  <a href="./ROADMAP.zh-CN.md">路线图</a> ·
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

大致就做这些。Markdown、纯文本、HTML/CSS/JSX、Word（`.docx`）和 PPT（`.pptx`）都能查。在 [dislop.com](https://dislop.com) 浏览器里、命令行用 `npx` 或 `uvx`、接 MCP、装成 Agent Skill 跑出来的结果一样，都不需要装额外依赖，也不联网。

## 上手

### Node.js 20+（零外部依赖）

```bash
# 检查当前目录（命中硬伤时退出码为 1，同时标出套话提醒）
npx --yes github:dislop-ai/dislop check .

# 只查相对 main 新改的行，并输出 GitHub PR 行内批注
npx --yes github:dislop-ai/dislop check --changed origin/main --format github

# 查看某条规则的判断方法和改前/改后示例
npx --yes github:dislop-ai/dislop explain negation-pivot-frame --lang zh
```

### Python 3.10+（零外部依赖）

```bash
# 用 uvx 直接跑
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# 或克隆到本地运行
git clone https://github.com/dislop-ai/dislop.git
cd dislop
PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning --lang zh
```

## AI 残留硬伤和套话提醒分开查

很多自动“去 AI 味”改写工具容易把旧套话换成另一种腔调，或者把你的语气全洗成同一种模版。单纯用黑名单也有毛病，容易误伤正常句子（比如「抓手机拍照」「北京大学、清华大学、复旦大学」）。

`dislop` 把 25 条规则分成两层：

1. **AI 残留硬伤（`packs/core/`，固定 `error`，所有文体包默认开启）**：一眼就能看出的 AI 生成残迹——留在第一行的 AI 寒暄（`好的，以下是…`、`[oaicite:1]`）、没填的占位符（`[insert ...]`、`{{var}}`、`【待补充】`）、贴进 Word/PPT 没渲染的裸 Markdown，以及 AI 网页里的空链接 `<a href="#">` 与占位禁用按钮。
2. **文体与模板包（`warning` / `info`，默认提示不阻断）**：按场景分的 JSON 规则包（`business-brief`、`literary-essay`、`deck-and-ui`）。每条都附判断方法、原句 / 改过头 / 改好三段示例，以及正反测试样本。

## 它读得了什么

Node.js 版（`bin/dislop.mjs`）和 Python 版（`src/dislop/`）都零外部依赖，通过同一套跨运行时一致性测试（`tests/test_conformance.py`）。

| 手头的文件 | 扩展名 | 能替你挑出什么 | 明确边界 |
|---|---|---|---|
| 文稿与长文 | `.md`, `.mdx`, `.txt` | AI 残留硬伤 + 开场白寒暄、公文黑话、“不是 A，而是 B”套句、连发短句和四字排比、段尾说教、无出处数据、满屏加粗清单、破折号过密、中文里混半角标点 | 代码块、行内代码、URL、引用块与 `dislop-quote` 示例区对文风规则自动屏蔽 |
| 网页与组件 | `.html`, `.css`, `.jsx`, `.tsx` | 空链接与无说明禁用按钮、默认紫粉渐变、满屏胶囊标签、三层套盒、`AI-Powered` 提示词营销徽章 | 只做单文件静态分析；动态渲染后的 DOM 需配合浏览器测试 |
| Word 文档 | `.docx` | 合并同段落文本运行、贴进文档没渲染的裸 Markdown 星号及正文套话（定位至 `para N`） | 报段落序号，不计算排版页码 |
| 演示文稿 | `.pptx` | 按真实放映顺序定位页码、裸 Markdown、单页字数墙（中文 > 280 字 / 英文 > 120 词）、要点超过 6 条、自动缩排低于 80%、空泛标题（“背景”“概述”）及正文套话 | 隐藏幻灯片跳过密度检查并显式报 `[SKIP]` |

## Awesome Anti-Slop 工具清单

我们也顺手整理了 87 个去 AI 味相关的中英文工具、写作规范、前端设计规则、代码 PR 治理和论文。可以直接看 **[awesome/README.zh-CN.md](./awesome/README.zh-CN.md)**（[English](./awesome/README.md)），或者在 **[dislop.com/awesome/](https://dislop.com/awesome/)** 离线筛选（也提供 [index.json](https://dislop.com/awesome/index.json) 和 [index.md](https://dislop.com/awesome/index.md) 给 Agent 读取）。

## 让你的 AI / Agent 来用

- **任意联网 AI 对话（免安装）**：直接复制这句话发给 ChatGPT、Claude、Kimi 等工具：
  ```text
  先读 https://dislop.com/llms.txt，按里面整理的文案和设计去 AI 味规矩与检查方法，帮我把接下来这份稿子发之前过一遍。
  ```
- **Agent Skill（跨宿主通用）**：用 `npx skills add dislop-ai/dislop` 把 [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) 装进 Claude Code、Codex、Cursor、Windsurf 或 Antigravity。装完后 Agent 会先按去 AI 味规矩动笔（避开一阶套词、二阶口号、三阶分号推销句和模板 UI），写完再跑检查并收尾。
- **Claude Code Plugin 插件包（一键装 Skill + 本地 MCP）**：
  ```text
  /plugin marketplace add dislop-ai/dislop
  /plugin install dislop@dislop-ai
  ```
- **静态文档接口（零安装）**：让联网 Agent 直接读 [dislop.com/llms.txt](https://dislop.com/llms.txt)（约 2.2 KB）、[dislop.com/catalog.json](https://dislop.com/catalog.json)、按场景挑一张任务卡（`/tasks/*.md`）或单条规则页（`/rules/<id>.md`）。

### 接入 MCP（`Claude Code`、`Codex`、`Cursor`、`Windsurf`）

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}
```

提供 3 个工具：`dislop_check`、`dislop_explain`、`dislop_packs`。

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

### 本地零大模型 vs. 开源大模型后台（`server/`）

- **CLI、Skill 与本地 stdio MCP（`--mcp`）**：纯确定性规则，不涉及大模型、不需要 API Key、完全离线。
- **开源大模型后台与远程 HTTP MCP（[server/](./server/README.zh-CN.md)）**：支持用自己的 Key 自托管（OpenAI、DeepSeek、Gemini 兼容端点、OpenRouter、Ollama），也支持官方部署。提供 `/v1/check`、`/v1/review`（三阶结构味与设计味审校）、`/v1/deslop`（去 AI 味改写 + 自动确定性复检）与远程 HTTP `/mcp`（5 个工具）。API Key 只放服务端环境变量（`DISLOP_LLM_API_KEY`），绝不进前端、仓库或错误日志。

## 去 AI 味效果基准测试（`dislop-bench v1`）

一键离线复现 `48` 份跨媒介检测样本（Node/Python 双端一致性核验）与 `12` 组端到端文案/设计改稿任务：

```bash
node scripts/run_benchmark.mjs --assert
```

最新离线实测结果（完整报告见 [benchmarks/REPORT.md](./benchmarks/REPORT.md)）：

- **检测基准（48 样本、6 类场景）**：准确率 `100.0%` · 召回率 `100.0%` · 干净原稿误报率 `0.0%` · 易误报近邻样本误报率 `0.0%` · 二阶 AI 口号召回率 `100.0%` · Node/Python 一致率 `100.0%`。
- **端到端去 AI 味效果（12 题 × 3 组）**：模型原稿 `raw_ai` **61.4 / 100** → 普通改写 `naive_humanizer` **72.1 / 100**（三阶结构味翻倍且漏改/编造数字）→ 按 dislop 规矩改稿 `dislop_clean` **100.0 / 100**（`12/12` 全过）。

详见 [benchmarks/README.zh-CN.md](./benchmarks/README.zh-CN.md)，支持评测任意模型/Prompt/Skill/后台（`--eval`）以及导出随机盲评表（`--export-blind-sheet`）。

## 这个仓库自己也过这道门

GitHub Actions CI 在每次提交时跑完双端 `dislop pack-test`（88 项样本断言）、跨运行时一致性测试（`tests/test_conformance.py`）、官网校验测试（`tests/test_site.mjs`），并对仓库自己的文档、`awesome/` 与 `site/` 执行 `dislop check . --fail-on warning`。

## 文档与目录

- [文案与视觉基准](./docs/brand-and-voice-guide.zh-CN.md)（[English](./docs/brand-and-voice-guide.md)）
- [架构说明](./docs/architecture.zh-CN.md)（[English](./docs/architecture.md)）· [设计规范](./docs/design-system.zh-CN.md)（[English](./docs/design-system.md)）
- [路线图与协作计划](./ROADMAP.zh-CN.md)（[English](./ROADMAP.md)）· [贡献指南](./CONTRIBUTING.md) · [调研索引](./docs/research/README.md) · [变更记录](./CHANGELOG.md)

```text
dislop/
├── .claude-plugin/    # Claude Code 插件与市场清单（打包 Skill + 本地 MCP）
├── .mcp.json          # 标准 stdio MCP 配置清单
├── awesome/           # Awesome Anti-Slop 中英文工具清单（87 条）
├── benchmarks/        # 去 AI 味效果基准测试数据集（CC0-1.0）与离线实测报告
├── bin/               # Node.js CLI（dislop.mjs）与 stdio MCP（dislop-mcp.mjs）
├── server/            # 开源大模型后台与远程 HTTP MCP（BYOK 自托管 / 官方可部署）
├── src/
│   ├── core.mjs       # 零依赖纯 ES 模块内核，由 Node CLI、MCP 与浏览器工作台共用
│   ├── binary-node.mjs# Node.js 零依赖 ZIP 解析层（.docx / .pptx）
│   └── dislop/        # 零依赖 Python 3.10+ 核心引擎、CLI 与 MCP 服务
├── packs/             # 声明式 dislop.pack/2 规则包（core + 3 套文体包，25 条规则）
├── skills/dislop/     # 跨宿主标准 Agent Skill（SKILL.md）
├── tests/             # 单元测试、Node/Python 跨运行时一致性测试与官网校验测试
├── scripts/           # 官网静态编译器（build_site.mjs）与 v0.3 探针原型
├── site/              # 编译产物：dislop.com 工作台、/awesome/ 清单与 /llms.txt
├── assets/            # 校对删除号标识、浅/深色横幅与 1200x630 分享图
└── docs/              # 品牌基准、架构、视觉规范、路线与调研资料
```

## 开源许可

[Apache License 2.0](./LICENSE)
