<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
    <img src="./assets/banner-light.svg" alt="dislop — 给 AI 写的东西配一支红笔" width="100%">
  </picture>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="https://dislop.com">去 dislop.com 试试</a> ·
  <a href="./awesome/README.zh-CN.md">Awesome Anti-Slop 同路清单</a> ·
  <a href="./ROADMAP.zh-CN.md">路线图</a> ·
  <a href="./LICENSE">Apache-2.0</a>
</p>

**给 AI 写的东西配一支红笔。**

先看一段模型交上来的上线说明：

```text
好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。这不是一次简单的升级，而是一场效率革命。
```

`dislop check launch-note.md --lang zh` 在上面批了五处：

```text
[ERROR]   launch-note.md:1:1   chatbot-artifact         "好的，以下是修改后"
[WARNING] launch-note.md:1:16  zh-bureaucratic-padding  "值得注意的是，"
[WARNING] launch-note.md:1:35  zh-bureaucratic-padding  "抓手"
[WARNING] launch-note.md:1:38  zh-bureaucratic-padding  "全面赋能"
[WARNING] launch-note.md:1:63  negation-pivot-frame     "这不是一次简单的升级，而是一场效率革命"
```

稿子你来改。改完，`dislop verify` 拿你的版本和原稿对一遍：

```text
dislop verify: ACCEPTED (findings 5 -> 0; all protected facts preserved)
```

要是顺手把“最多”删了，稿子会被退回来：

```text
dislop verify: REJECTED (findings 5 -> 0)
  - Protected numbers removed or altered: 最多 45 秒
```

它就干这三件事：不能发的硬伤直接划掉；听着像套话的地方问你一句；你改完，它核对数字、限定词、日期、链接、代码片段和引用是不是都还在。它不替你改稿，笔在你手里。

Markdown、纯文本、HTML/CSS/JSX/SVG、Word、PPT 和 PDF 元数据它都读。在 [dislop.com](https://dislop.com) 的浏览器标签页里、用 `npx` 或 `uvx`、接 MCP、装成 Agent Skill，查出来的结果都一样；不用装依赖，也不联网。

## 上手

### Node.js 20+（零外部依赖）

```bash
# 检查当前目录（命中硬伤时退出码为 1，同时提示套话商榷）
npx --yes github:dislop-ai/dislop check .

# 只查相对 main 新改的行，并输出 GitHub PR 行内批注
npx --yes github:dislop-ai/dislop check --changed origin/main --format github

# 查看某条规则该问自己的问题和改前/改后示例
npx --yes github:dislop-ai/dislop explain negation-pivot-frame --lang zh

# 改完和原稿对一遍：核对数字、限定词、链接与代码是否完好
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
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

## 红笔和蓝笔

市面上自动“拟人化改写”的工具为了改得像人，经常顺手删改数字或限定词；而单纯一张黑名单，既会误伤正常词（如「抓手机拍照」「北京大学、清华大学、复旦大学」），又会逼着模型换用故作深沉的短句口号。

`dislop` 把规则分成两层：

1. **硬伤规则（`packs/core/`，固定 `error`，所有文体包默认开启）**：换谁来看都不能发的疏漏——本机路径泄露（`file:///Users/example/spec.pdf`）、忘了填的占位符（`[insert ...]`、`{{var}}`、`【待补充】`）、留在第一行的 AI 寒暄、贴进 Word/PPT 没渲染的裸 Markdown、点不动的空链接 `<a href="#">`、低于 WCAG AA（`< 4.5:1`）的对比度、深色模式层级倒置，以及越出画布的 PPT 文本框。
2. **文体包（`warning` / `info`，默认提示不阻断）**：按文体划分的 JSON 规则包（`business-brief`、`literary-essay`、`deck-and-ui`）。每条都附一句问自己的问题、原句 / 改过头 / 改好三段对照，以及正反测试样本。

## 它读得了什么

Node.js 版（`bin/dislop.mjs`）和 Python 版（`src/dislop/`）都零外部依赖，通过同一套跨运行时一致性测试（`tests/test_conformance.py`）。

| 手头的文件 | 扩展名 | 能替你挑出什么 | 明确边界 |
|---|---|---|---|
| 文稿与长文 | `.md`, `.mdx`, `.txt` | 硬伤 + 开场白寒暄、公文黑话、“不是 A，而是 B”套句、四字排比、段尾说教、无出处数据、中文里混半角标点 | 代码块、行内代码、URL、引用块与 `dislop-quote` 示例区对文风规则自动屏蔽 |
| 网页与矢量图 | `.html`, `.css`, `.jsx`, `.tsx`, `.svg` | 空链接、无说明的禁用按钮、单文件对比度、深色模式表面明度顺序、默认紫粉渐变、满屏胶囊标签、三层套盒、SVG 文字裁切 | 只做单文件静态分析；动态渲染后的 DOM 需配合浏览器测试 |
| Word 文档 | `.docx` | 合并同段落文本运行、未接受的修订与残留批注、损坏引用域、裸 Markdown 残留、外部 `file:` 链接及正文套话（定位至 `para N`） | 报段落序号，不计算排版页码 |
| 演示文稿 | `.pptx` | 按真实放映顺序定位页码、单页字数墙（中文 > 280 字 / 英文 > 120 词）、要点超过 6 条、自动缩排低于 80%、文本框越界、空泛标题 | 隐藏幻灯片跳过密度检查并显式报 `[SKIP]` |
| PDF 文档 | `.pdf` | 本机 `/URI` 链接、残留原始文件名 `/Title`、未嵌入字体、跨页尺寸不一致 | 加密 PDF 与完整正文抽字显式报 `[SKIP]`，绝不假装“0 问题” |

## Awesome Anti-Slop 同路清单

想看看还有哪些人在做去 AI 味工具、写作规范、前端设计规则、代码 PR 治理或研究论文？可以直接翻 **[awesome/README.zh-CN.md](./awesome/README.zh-CN.md)**（[English](./awesome/README.md)），或在 **[dislop.com/awesome/](https://dislop.com/awesome/)** 离线筛选全部 87 条已核验资源（也提供 [index.json](https://dislop.com/awesome/index.json) 与 [index.md](https://dislop.com/awesome/index.md) 给 Agent 读取）。

## 让 Agent 来用

- **Agent Skill**：把 [skills/dislop/SKILL.md](./skills/dislop/SKILL.md) 装进 Claude Code、Codex、Cursor 或 Windsurf（`npx skills add dislop-ai/dislop`），按「先查 -> 局部改稿 -> 对照原稿」三步交稿。
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

提供 4 个工具：`dislop_check`、`dislop_verify`、`dislop_explain`、`dislop_packs`。

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

GitHub Actions CI 在每次提交时跑完双端 `dislop pack-test`（101 项样本断言）、跨运行时一致性测试（`tests/test_conformance.py`）、官网校验测试（`tests/test_site.mjs`），并对仓库自己的文档、SVG、`awesome/` 与 `site/` 执行 `dislop check . --fail-on warning`。

## 文档与目录

- [品牌风格与表达基准](./docs/brand-and-voice-guide.zh-CN.md)（[English](./docs/brand-and-voice-guide.md)）
- [架构说明](./docs/architecture.zh-CN.md)（[English](./docs/architecture.md)）· [设计规范](./docs/design-system.zh-CN.md)（[English](./docs/design-system.md)）
- [路线图与协作计划](./ROADMAP.zh-CN.md)（[English](./ROADMAP.md)）· [贡献指南](./CONTRIBUTING.md) · [调研索引](./docs/research/README.md) · [变更记录](./CHANGELOG.md)

```text
dislop/
├── awesome/           # Awesome Anti-Slop 中英文同路清单（87 条）
├── bin/               # Node.js CLI（dislop.mjs）与 stdio MCP（dislop-mcp.mjs）
├── src/
│   ├── core.mjs       # 零依赖纯 ES 模块内核，由 Node CLI、MCP 与浏览器工作台共用
│   ├── binary-node.mjs# Node.js 零依赖 ZIP 与 PDF 解析层
│   └── dislop/        # 零依赖 Python 3.10+ 核心引擎、CLI 与 MCP 服务
├── packs/             # 声明式 dislop.pack/2 规则包（core + 3 套文体包，29 条规则）
├── skills/dislop/     # 跨宿主标准 Agent Skill（SKILL.md）
├── tests/             # 单元测试、Node/Python 跨运行时一致性测试与官网校验测试
├── scripts/           # 官网静态编译器（build_site.mjs）与 v0.3 探针原型
├── site/              # 编译产物：dislop.com 工作台、/awesome/ 清单与 /llms.txt
├── assets/            # 校对删除号标识、浅/深色横幅与 1200x630 分享图
└── docs/              # 品牌基准、架构、视觉规范、路线与调研资料
```

## 开源许可

[Apache License 2.0](./LICENSE)
