# 路线图与协作计划（Roadmap）

[English](./ROADMAP.md)

最后更新：`2026-11-21` · 当前基线：`v0.3.0`（`dislop.com` 已上线）

这份路线图记录 `dislop` 现在已经做到哪一步、接下来准备做什么，以及还没拍板、需要团队一起讨论的问题。认领方向、挑规则阈值的刺，或者提新点子，直接在 [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions) 发起讨论，或开一个 [Issue](https://github.com/dislop-ai/dislop/issues) 认领任务即可。

---

## 1. 当前进度（`v0.3.0` 已上线）

| 模块 | 现已实现 | 核心目录 |
|---|---|---|
| 双端零依赖内核 | Node.js 20+ 与 Python 3.10+ 双端零外部依赖，通过 88 项规则样本断言与 10 项跨运行时一致性/单元测试 | `src/core.mjs`、`src/dislop/engine.py`、`tests/test_conformance.py` |
| 规则与文体包 | 共 25 条纯去 AI 味规则：`core` AI 残留硬伤（4 条，固定 `error`）+ 3 套文体与模板包（`business-brief`、`literary-essay`、`deck-and-ui`） | `packs/*/pack.json` |
| 支持格式 | `.md`、`.mdx`、`.txt`、`.html`、`.css`、`.jsx`、`.tsx`、`.docx`、`.pptx` | `src/binary-node.mjs`、`src/dislop/engine.py` |
| 官网与在线工作台 | 默认简体中文的 `dislop.com`（一键切原生英文、严格零混排），带首屏三态示例卡（`原稿` / `换了种 AI 味` / `改干净了`）、离线浏览器工作台（`CSP: connect-src 'none'`）与 `/llms.txt` 端点 | `scripts/build_site.mjs`、`site/` |
| Awesome Anti-Slop | 87 条双语核验清单（`dislop.radar/2`），同源生成纯英文 `awesome/README.md`、纯中文 `awesome/README.zh-CN.md` 与 `dislop.com/awesome/` 离线筛选页 | `docs/research/anti-slop-radar-index.json`、`awesome/` |
| Agent 与开发集成 | 跨宿主 `skills/dislop/SKILL.md`、本地 stdio MCP 服务（`dislop_check`、`dislop_explain`、`dislop_packs`）、Git 增量检查（`--changed`/`--staged`）、SARIF 2.1.0 与 GitHub PR 行内批注 | `skills/dislop/SKILL.md`、`bin/`、`server.json` |

---

## 2. 近期与中期工作轨道（支持多人并行）

各条轨道按代码边界拆开，方便成员同时推进、少碰合并冲突。

### 轨道 A — `v0.3.x` 发包、细节补齐与分发（当前优先）

目标：让用户能用最短命令直接安装上手，同时继续打磨去 AI 味规则覆盖。

- [ ] 发布 `dislop` 到 npm 与 PyPI（支持直接 `npx dislop` / `uvx dislop`），并向 MCP Registry 提交 `server.json`。
- [ ] 补齐细粒度 AI 味模式：英文单词级短句连发（`Faster. Leaner. Done.`）、更常见的中文寒暄开头（`好的，以下是你的稿子`）、三段对称分号推销句，并补对应不误报样本。
- [ ] 提供开箱即用的 `pre-commit` 配置与可复用的 GitHub Action 工作流模板。

**验收标准**：从公共源直接运行 `npx dislop check .` 与 `uvx dislop check .` 可用，新增样本在 Node 与 Python 双端全绿。

### 轨道 B — `v0.3.x` 节奏与模板探针深化（下一里程碑）

目标：把已跑通的节奏与界面模板探针正式并入双端主内核，继续保持零外部依赖。

- [ ] 按 [docs/specs/anti-pattern-catalog-and-probes-v0.3.md](./docs/specs/anti-pattern-catalog-and-probes-v0.3.md) 将 [scripts/prototype_antipattern_lab.mjs](./scripts/prototype_antipattern_lab.mjs) 里验证通过的 5 条新探针（连环逗号句、句长单调、过渡路标簇、毛玻璃滥用、侧边粗彩条卡片）合入 `src/core.mjs` 与 `src/dislop/engine.py`。
- [ ] 在双端 OOXML 解析器里实现 `pptx-layout-monotony`（检出连续 4 页以上完全雷同的幻灯片骨架）。
- [ ] 新增 `dislop catalog` CLI 子命令与 `dislop_catalog` MCP 工具，支持按格式、语种、级别与文体包检索规则。
- [ ] 抽离 Node 侧共用宿主模块（`src/node-host.mjs`、`src/mcp.mjs`），减少 CLI 与 MCP 的重复 I/O 代码。

**验收标准**：31 条规则在 Node/Python 双端通过 `pack-test` 与 `test_conformance.py`，全仓通过 `dislop check . --fail-on warning`。

### 轨道 C — 离线去 AI 味基准评测（首版已落地，持续扩充）

目标：用公开可复算的数据测出误报率、检出率与端到端去 AI 味效果，而不是靠嘴说。

- [x] 整理 48 份原创 `CC0-1.0` 检测样本（中文工作简报、中文随笔、英文技术文档、英文随笔、HTML/CSS 卡片、`.pptx` 幻灯片）与 12 组端到端改稿对照任务（[benchmarks/](./benchmarks/README.zh-CN.md)）。
- [x] 离线实测准确率（`100%`）、召回率（`100%`）、干净原稿误报率（`0%`）、二阶陷阱召回率（`100%`）、Node/Python 一致率（`100%`）以及 `raw_ai` vs `naive_humanizer` vs `dislop_clean` 综合得分。
- [x] 提供一键离线跑分、CI 回归门禁（`node scripts/run_benchmark.mjs --assert`）、外部模型/Skill 评测（`--eval`）与随机 A/B 盲评表导出（`--export-blind-sheet`），并自动生成 [benchmarks/REPORT.md](./benchmarks/REPORT.md)。
- [ ] 持续扩充真实长文、多页 PPT 与开源大模型后台（`server/`）跨模型 A/B 评测数据。

**验收标准**：已合入 CI，任何协作者在断网环境下执行 `node scripts/run_benchmark.mjs --assert` 即可复现。

### 轨道 D — `Awesome Anti-Slop` 持续维护与拆仓阈值（持续推进，可并行）

目标：保持 87 条中英文工具清单准确、中立、好查，同时不反噬核心引擎的开发精力。

- [ ] 增加 GitHub Issue 投稿表单模板（链接、类别、语种、中英各一句用途说明）与按月巡检链接/星标的可选脚本。
- [ ] 冷启动阶段继续把 `awesome/README.md`、`awesome/README.zh-CN.md` 与 `https://dislop.com/awesome/` 留在 `dislop-ai/dislop` 主仓内维护。
- [ ] **拆仓阈值**：仅当外部有效目录 PR 持续达到 `>= 5 条/月` 时，再按 `docs/research/awesome-anti-slop-topology/` 的 `dislop.radar/3` 预案切出独立 CC0-1.0 仓库 `dislop-ai/awesome-anti-slop`，同时永久保持 `https://dislop.com/awesome/` 地址不变。

### 轨道 E — Open-Core 云端增值与远期探索（`v0.4.0+`）

完整调研与定价测算见 [docs/research/business-model-and-open-core.zh-CN.md](./docs/research/business-model-and-open-core.zh-CN.md)。**开源底线**：CLI、Skill、Plugin、本地 stdio MCP、浏览器离线工作台、`Awesome Anti-Slop`、`dislop-bench` 与单机 BYOK `server/` 永久按 Apache-2.0 开源。云端托管与商业增值集中在难自建的多模态重能力与团队治理：

- [ ] **阶段 0（需求验证）**：官方托管低额度大模型体验与远程 MCP（独立付费 Vertex AI / Gemini Key + 硬日限额），验证 Web 端 vs 远程 MCP 真实拉动。
- [ ] **原排版文档一键洗稿（`.docx` / `.pptx` Round-Trip）**：拆解 OOXML、去 AI 味并复核数字保真后保留原样式导出。
- [ ] **网页与 PPT 视觉多模态审查（Visual Anti-Slop）**：无头渲染截图 + VLM 审校版式密度、模板审美与连续同版式。
- [ ] **个人与团队声纹库（`dislop.voice/1`）**：本地离线提取（`.dislop.local/voice.json`）与云端团队共享品牌语调库、GitHub App PR 自动巡检。
- [ ] 抽象设计文法卡（`dislop.taste/1`）与强类型 JS/Python SDK 门面。

---

## 3. 待讨论的 5 个开放问题（欢迎直接拍砖）

以下 5 个问题尚未写死，欢迎协作者在 Discussions / Issue 里直接给意见：

1. **三阶结构性 AI 味探针**：三段对称分号推销句、段尾金句收尾这类更隐蔽的 AI 腔，能不能做成低误报的确定性探针，避免误伤正常人类写作？
2. **`v0.3` 节奏探针的默认级别**：`comma-chain-cadence`（连环逗号句）与 `sentence-length-monotony`（句长单调）在 `literary-essay` 里是默认 `info` 提醒，还是默认关闭改为按需开启，避免误伤作者有意为之的文学节奏？
3. **首版离线基准的样本配比**：首批 50 份公开配对样本，优先覆盖哪几类真实场景（中文周报/方案、公众号长文、英文 README/技术文档、PPT 演示稿）？
4. **代码与 PR 治理的边界**：`dislop` 在 PR diff 里是继续专注文档、文案、PPT 与前端 UI 文件（把语言级 AST 交给 Oxlint/ESLint/Ruff），还是顺手加几条跨语言的空注释/假文档探针？
5. **发包后的第一个日常入口**：npm / PyPI 上架后，优先做可复用 GitHub Action、`pre-commit` 钩子仓，还是先做一个轻量 VS Code / Cursor 插件？

---

## 4. 协作方式与合并前检查

- **先聊方向再大改**：开放问题发在 [GitHub Discussions](https://github.com/dislop-ai/dislop/discussions)，认领具体任务或报误报直接建 [Issue](https://github.com/dislop-ai/dislop/issues)。
- **并行分工参考（少冲突）**：
  - 规则与双端内核：`packs/`、`src/core.mjs`、`src/dislop/`、`tests/test_engine.py`、`tests/test_conformance.py`
  - 官网与工具清单：`docs/research/anti-slop-radar-index.json`、`scripts/build_site.mjs`、`site/`、`tests/test_site.mjs`
  - 评测基准与文档：`scripts/`、`docs/`、`README*.md`、`ROADMAP*.md`
- **三条底线**：
  - `src/core.mjs` 与 `src/dislop/` 保持零外部运行时依赖。
  - 官网与工作台保持离线零上传（`CSP: connect-src 'none'`），不引入第三方字体与统计脚本。
  - 所有写给访客看的文案遵守 [docs/brand-and-voice-guide.zh-CN.md](./docs/brand-and-voice-guide.zh-CN.md) 与 [AGENTS.md](./AGENTS.md) §2，中英文严格不混排。
- **提 PR 前本地跑一遍**：
  ```bash
  node scripts/build_site.mjs
  node bin/dislop.mjs pack-test && PYTHONPATH=src python3 -m dislop.cli pack-test
  node tests/test_site.mjs && PYTHONPATH=src python3 -m unittest discover -s tests -v
  node bin/dislop.mjs check . --fail-on warning && PYTHONPATH=src python3 -m dislop.cli check . --fail-on warning
  ```
