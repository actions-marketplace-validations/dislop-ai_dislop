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

`dislop` 是一个本地运行、零依赖的检查工具，专门用来挑出 AI 写完的文档、Word、PPT 和网页里的残留硬伤、套话和模板味。它只负责标出问题，不替你重写。

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

## 让 Agent 来用

- **Agent Skill**：把 [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) 装进 Claude Code、Codex、Cursor 或 Windsurf（`npx skills add dislop-ai/dislop`），按「先查 -> 局部改稿 -> 再查一遍」交稿。
- **不装本地工具也能读**：让联网 Agent 直接读 [dislop.com/llms.txt](https://dislop.com/llms.txt)（约 2.2 KB）、[dislop.com/catalog.json](https://dislop.com/catalog.json)、按场景挑一张任务卡（`/tasks/*.md`）或单条规则页（`/rules/<id>.md`）。

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

## 这个仓库自己也过这道门

GitHub Actions CI 在每次提交时跑完双端 `dislop pack-test`（88 项样本断言）、跨运行时一致性测试（`tests/test_conformance.py`）、官网校验测试（`tests/test_site.mjs`），并对仓库自己的文档、`awesome/` 与 `site/` 执行 `dislop check . --fail-on warning`。

## 文档与目录

- [文案与视觉基准](./docs/brand-and-voice-guide.zh-CN.md)（[English](./docs/brand-and-voice-guide.md)）
- [架构说明](./docs/architecture.zh-CN.md)（[English](./docs/architecture.md)）· [设计规范](./docs/design-system.zh-CN.md)（[English](./docs/design-system.md)）
- [路线图与协作计划](./ROADMAP.zh-CN.md)（[English](./ROADMAP.md)）· [贡献指南](./CONTRIBUTING.md) · [调研索引](./docs/research/README.md) · [变更记录](./CHANGELOG.md)

```text
dislop/
├── awesome/           # Awesome Anti-Slop 中英文工具清单（87 条）
├── bin/               # Node.js CLI（dislop.mjs）与 stdio MCP（dislop-mcp.mjs）
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
