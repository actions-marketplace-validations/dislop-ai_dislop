---
content-type: reference-data
version: 0.6.0
snapshot: 2026-11-21
---

# 路线图与协作计划（Roadmap）

[English](./roadmap.md)

最后更新：`2026-11-22` · 当前基线：`v0.6.0`（`dislop.com` 已上线）

这份路线图记录 `dislop` 现在已经做到哪一步、接下来按什么顺序推进全平台适配与规则深化，以及还没写死、欢迎团队一起拍板的开放问题。认领任务、反馈误报，或者聊新点子，直接在 [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) 开帖，或建一个 [Issue](https://github.com/dislop-ai/dislop/issues) 即可。

---

## 1. 当前进度（`v0.6.0` 已落地）

| 模块 | 现已实现 | 核心目录 |
|---|---|---|
| 双端零依赖内核 | Node.js 20+ 与 Python 3.10+ 双端零外部依赖，通过 160 项规则样本断言（83 命中 + 77 干净）、53 条反模式库核验、离线声纹提取及 26 项 Python `unittest` 跨运行时一致性与引擎单测 | `src/core.mjs`、`src/dislop/engine.py`、`tests/test_conformance.py` |
| 全内置规则包与轻量模型 | 全部 7 套场景与行业包（42 条规则）直接内置离线运行：`core`、`business-brief`、`engineering-spec`、`regulated-comms`、`literary-essay`、`deck-and-ui`、`executive-deck`；附 11 条扩展模式库探针（`--patterns`）、随包 `14.6 KB` gzip 零依赖集成模型（`pocket-slop-v1`）与本机内存/芯片小模型选装向导（`dislop model`） | `packs/*/pack.json`、`patterns/`、`models/`、`src/local-model.mjs` |
| 支持格式 | `.md`、`.mdx`、`.txt`、`.html`、`.css`、`.jsx`、`.tsx`、`.svg`、`.docx`、`.pptx` | `src/binary-node.mjs`、`src/dislop/engine.py` |
| 官网与在线工作台 | 默认简体中文的 `dislop.com`（一键切原生英文、严格零混排），采用两种标线（红实线硬伤 / 蓝虚线套话提醒）、5 格白话节奏条、离线与云端双模式声纹抽屉及 `/llms.txt` 端点 | `scripts/build_site.mjs`、`site/` |
| Awesome Anti-Slop | 87 条双语核验清单（`dislop.radar/2`），同源生成纯英文 `awesome/README.md`、纯中文 `awesome/README.zh-CN.md` 与 `dislop.com/awesome/` 离线筛选页 | `docs/research/anti-slop-radar-index.json`、`awesome/` |
| 多平台清单与 CI 门禁 | 同源生成并受 CI 校验的 10 份分发清单：Agent Skill（`skills/dislop/` 含 4 张本地参考卡与 `agents/openai.yaml`）、Claude Code 插件（`.claude-plugin/`，常驻仅约 130 tokens）、Codex 插件（`.codex-plugin/` 与 `.agents/plugins/marketplace.json`）、Agent Plugins 1.0（`plugin.json` + `mcp.json`）、Gemini CLI 扩展（`gemini-extension.json`）、双通道 MCP Registry（`server.json` 含本地 `stdio` 与远程 `https://dislop.com/mcp`）、可复用 GitHub Action（`action.yml`）与 `.pre-commit-hooks.yaml` | `scripts/sync_manifests.mjs`、`plugin.json`、`server.json`、`action.yml` |

---

## 2. 近期与中期工作轨道（支持多人并行）

各条轨道按目录边界拆开，减少合并冲突。

### 轨道 A — 公共源正式上架与首批 6 大目录提审（当前最优先）

目标：完成账号侧首次发布，把全仓默认安装从 Git 拉取切到毫秒级公共注册中心，并拿下首批官方插件目录展位。

- [x] 建立同源清单同步与校验脚本（`scripts/sync_manifests.mjs`）、自动发包工作流（`.github/workflows/release.yml`）、GitHub Action（`action.yml`）与 `pre-commit` 钩子配置（`.pre-commit-hooks.yaml`）。
- [x] 默认开启本地 MCP 紧凑输出（`verbosity: "compact"`），收口为 7 个核心离线工具并剥离 `dislop_explain` 测试负例，通过 `claude plugin validate` 与 `codex plugin` 实装校验，配置 GitHub 仓库 `gemini-cli-extension` 等爬虫检索标签。
- [ ] 完成 npm（`dislop`）与 PyPI（`dislop`）首次登录发布，运行 `node scripts/sync_manifests.mjs --channel registry` 切换正式包名，并推送 `server.json` 至官方 MCP Registry（同步认领 Smithery 与 Glama）。
- [ ] 在 Anthropic 官方目录（`claude.ai/directory/manage`）提交 GitHub 插件包与远程 `https://dislop.com/mcp` 双通道审核，向 OpenAI 通用插件目录提审，并核验 `skills.sh` 与 `geminicli.com/extensions` 自动收录状态。

**验收标准**：公网直接执行 `npx dislop check .`、`uvx dislop check .` 与 `gemini extensions install` 可用，官方 MCP Registry 返回 `io.github.dislop-ai/dislop` 本地与远程双条目。

### 轨道 B — 编辑器单包双发与多 Agent 并行编排器适配（下一里程碑）

目标：用同一份零依赖 `src/core.mjs` 吃下最大编辑器搜索流量，并解决 Orca、Herdr、Conductor 等多 Agent 并行工具的 Git Worktree 收口痛点。

- [ ] 开发支持桌面与浏览器端（`vscode.dev`）的轻量 Web 扩展 `integrations/vscode/`（`< 150 KB`）：提供保存/空闲波浪线、悬停三段示例、`Cmd+.` 快速插入豁免注释或可选云端改写，并通过 `mcpServerDefinitions` / `languageModelTools` 自动把工具挂载进编辑器 Agent 模式；同步发布至 **VS Code Marketplace** 与 **Open VSX**（一次覆盖 VS Code、Cursor、Windsurf、Antigravity、VSCodium）。
- [ ] 构建独立目录 `integrations/antigravity/`（含方形高对比图标与 3 条启动提示词），跑通 `agy plugin validate --strict` 零警告后提交 Antigravity 伙伴审核；补齐 `.cursor-plugin/` 提交 Cursor 官方市场与 Cline MCP 市场 PR。
- [ ] 交付多 Agent 编排器专属配置：提供 `integrations/orca/orca.yaml` 与 Conductor `post-setup.d` 模板（新建子 Git Worktree 时自动软链被忽略的 `.dislop.local.json`，并在进预览前拦截硬伤），以及 `integrations/herdr/herdr-plugin.toml` 终端面板一键增量检查插件与带 2 次熔断的通用 Agent Hook 脚本。

**验收标准**：本地实装 `.vsix` 验证波浪线与 Agent 工具双挂载生效；模拟多 Worktree 并行场景验证私有禁词继承与 `--fail-on error` 拦截退出码准确。

### 轨道 C — 写作与桌面效率商店破圈及基准扩充（持续推进）

目标：触达不写代码但高频产出文章、方案与周报的创作者群体，并用公开可复现数据持续验证检出率。

- [x] 交付 `dislop-bench v2`：112 份核心检测基准与 154 份多角度反模式基准（准确率 `100.0%`、召回率 `100.0%`、干净原稿误报率 `0.0%`、双端一致率 `100.0%`）、18 组端到端改稿评测（`18/18` 全过）与 5 模型真实在线对比（[benchmarks/REPORT.md](./benchmarks/REPORT.md)）。
- [ ] 复用纯 JS `src/core.mjs` 打包上架 **Obsidian Community Plugins**（单文件离线检查 + 可选云端改写）与 **Raycast Store**（系统快捷键检查选中文本 / 剪贴板）。
- [ ] 扩充真实长文、多页管理汇报 `.pptx` 与跨模型盲评样本，按双周复盘各商店自然下载量与云端激活转化率。

**验收标准**：CI 断网执行 `node scripts/run_benchmark.mjs --assert` 全绿，Obsidian 与 Raycast 扩展通过各自社区仓库机器校验。

### 轨道 D — `Awesome Anti-Slop` 持续维护与拆仓阈值（并行推进）

目标：保持 87 条中英文工具清单准确、中立、好查，同时不分散主仓库注意力。

- [ ] 增加 GitHub Issue 投稿表单模板（链接、类别、语种、中英各一句用途说明）与按月巡检链接/星标的可选脚本。
- [ ] 冷启动阶段继续把 `awesome/README.md`、`awesome/README.zh-CN.md` 与 `https://dislop.com/awesome/` 留在 `dislop-ai/dislop` 主仓维护。
- [ ] **拆仓阈值**：仅当外部有效目录 PR 持续达到 `>= 5 条/月` 时，再按 `dislop.radar/3` 预案切出独立 CC0-1.0 仓库 `dislop-ai/awesome-anti-slop`，永久保持 `https://dislop.com/awesome/` 地址不变。

### 轨道 E — Open-Core 云端增值与远期探索（`v0.6.0+`）

完整定价与成本测算见 [docs/research/business-model-and-open-core.zh-CN.md](https://github.com/dislop-ai/dislop/blob/main/docs/research/business-model-and-open-core.zh-CN.md)。**开源与闭源边界**：`SKILL.md`、Node/Python CLI、各平台本地插件包、7 工具本地 stdio MCP、全部 7 套内置规则包（42 条规则）、53 条反模式库、`14.6 KB` 零依赖集成模型、浏览器离线工作台、`Awesome Anti-Slop` 与 `dislop-bench v2` 永久按 Apache-2.0 开源；官方托管大模型后台与远程 HTTP MCP 独立在闭源 `dislop-cloud` 运营：

- [x] **阶段 0（云端上线与需求验证）**：官方 `dislop-cloud` 已上线 `https://dislop.com/mcp` 与 `/api/v1/*`，支持每日 5 匿名试用额度、邮箱注册每月 30 免费额度、全局日限额硬熔断与 Pro / 按量包 / Team 预约登记。
- [ ] **原排版文档一键洗稿（`.docx` / `.pptx` Round-Trip）**：拆解 OOXML、去 AI 味并复核数字与限定词保真后保留原样式导出。
- [ ] **网页与 PPT 视觉多模态审查（Visual Anti-Slop）**：无头渲染真实截图 + VLM 审校版式拥挤度、模板审美与连续同版式。
- [ ] **团队共享声纹库与 GitHub App PR 自动巡检**：跨成员复用 `dislop.voice/1` 品牌口吻卡并在 PR 自动输出单条刷新摘要。
- [ ] 强类型 JS/TS（`.d.ts`）与 Python（`py.typed`）内存字节流 SDK 门面。

---

## 3. 待讨论的 5 个开放问题（欢迎直接拍砖）

以下问题尚未写死，欢迎协作者在 Discussions / Issue 里直接给意见：

1. VS Code 与 Open VSX 扩展是在保存文件（`onSave`）时再刷新波浪线，还是默认开启 `300ms` 停顿实时刷新？长文写作时实时划线会不会打断思路？
2. 目前默认建议 Agent 的 `PostToolUse` / `Stop` Hook 只对 `packs/core` 的 `error` 硬伤返回非零退出码、同一文件连续拦截 2 次即放行转人工；是否还需要一套一键严苛预设（连 `regulated-comms` 极限词也一起硬拦）？
3. 在 Orca 和 Conductor 新建子 Git Worktree 时，除了 `.dislop.local.json` 私有词表，是否默认把 `.dislop.local/voice.json` 个人声纹卡也一并软链过去？
4. PR diff 增量检查里，`dislop` 是继续专注文档、文案、PPT 与前端 UI 文件（把代码 AST 交给 Oxlint / ESLint / Ruff），还是给空话 PR 描述和假 JSDoc 单独做一条可选探针？
5. 长文作者在 Obsidian 里更需要侧边栏整篇节奏体检面板，还是直接在正文编辑区划蓝虚线？

---

## 4. 协作方式与合并前检查

- **先聊方向再大改**：开放问题发在 [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions)，认领具体任务或报误报直接建 [Issue](https://github.com/dislop-ai/dislop/issues)。
- **并行分工参考（少冲突）**：
  - 规则与双端内核：`packs/`、`patterns/`、`src/core.mjs`、`src/dislop/`、`tests/test_conformance.py`
  - 插件市场与编辑器集成：`scripts/sync_manifests.mjs`、`plugin.json`、`integrations/`、`action.yml`
  - 官网与工具清单：`docs/research/anti-slop-radar-index.json`、`scripts/build_site.mjs`、`site/`、`tests/test_site.mjs`
  - 评测基准与文档：`benchmarks/`、`docs/`、`README*.md`、`ROADMAP*.md`
- **三条底线**：
  - `src/core.mjs` 与 `src/dislop/` 核心检查器保持零外部运行时依赖。
  - 官网禁止加载第三方字体、统计脚本与外域请求（`CSP: connect-src 'self'`），默认离线检查 0 上传。
  - 所有写给访客看的文案遵守 [docs/brand-and-voice-guide.zh-CN.md](https://github.com/dislop-ai/dislop/blob/main/docs/brand-and-voice-guide.zh-CN.md) 与 [AGENTS.md](./AGENTS.md) §2，中英文严格不混排。
- **提 PR 或发版前跑一条命令**（多平台发布细则见 [docs/releasing.zh-CN.md](https://github.com/dislop-ai/dislop/blob/main/docs/releasing.zh-CN.md)）：
  ```bash
  npm run release:check
  ```
