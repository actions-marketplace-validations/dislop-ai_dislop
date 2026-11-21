# `dislop` 官网定位、Slogan 与信息层级决策笔记

> 记录时间：2026-11-21 · 适用范围：`dislop.com` 首页、`/radar/` 目录与 Agent 静态端点（`/llms.txt`、`/index.md`、`/llms-full.txt`、`/tools/skill.md`）。

## 1. 对首版人机双读官网的定位诊断

首版人机双读官网完成了从单页演示到人机双读静态站（`/llms.txt`、`/catalog.json`、29 条预渲染规则、87 条实测生态雷达）的结构跃迁，但在首屏定位与信息层级上仍存在三处明显偏差：

1. **一级卖点偏窄，把“去 AI 味”藏在工程术语背后**：原 `<title>`、Eyebrow 与 H1 写的是 *“Audit deliverables before you publish”* / *“发稿前，用确定性规则审校交付物”*，给初访者的第一印象偏“窄众发稿前质检 / 印前检查”，没有在 3 秒内直接命中最高频搜索与真实痛点——**去 AI 味（De-slop）**。
2. **覆盖面感知被低估**：原首屏只列举文件扩展名，没有把「适配任意 AI 模型（Claude / GPT / Gemini / DeepSeek / Qwen / 本地模型）、任意 Agent 与开发环境（Claude Code / Codex / Cursor / Windsurf / Node / Python / 浏览器 / CI）、覆盖多场景多模态产物」收束成一眼可读的覆盖矩阵。
3. **二级卖点分散，缺乏紧贴首屏的硬证据托底**：底层调研规模（87 条实测核验生态雷达、31 条非主流设计与学术源）、双端零依赖一致测试（101 项样本断言 + 12 项跨语言契约测试）、`verify` 事实锁与正向差异化协议分散在页面中后段，访客在滚动前难以迅速建立“这套工具做得很全、很深、靠谱且随手可用”的信任感。

同时发现页脚仍残留已于 `f3ae279` 下线的 `dislop-ai.github.io` 镜像链接，本次一并清理。

## 2. 定稿 Slogan 与候选方案取舍

### 2.1 中英文定稿

- **中文主标（H1 主干 + 副句）**
  - 主干：**全面去 AI 味。**
  - 副句：覆盖写作、文档、PPT、PDF、前端 UI 与 Agent 交付的全套工具，适配任意模型、Agent 与开发环境：确定性标出套话与硬伤，改后复检保住每个数字、链接与引用。
  - Eyebrow：`00 / 全场景多模态去 AI 味工具箱 · 适配任意模型、Agent 与开发环境`
- **英文主标（H1 Strong + Muted）**
  - Strong：**De-slop AI outputs.**
  - Muted：A complete toolkit for writing, docs, decks, PDF, Web UI, and agent deliverables across any model or dev environment: catch stock phrasing and delivery defects deterministically, then verify edits kept every number, link, and citation intact.
  - Eyebrow：`00 / MULTI-MODAL DE-SLOP TOOLKIT · ANY MODEL, AGENT, OR DEV ENVIRONMENT`
- **Agent 端点总述（`/llms.txt` 与 `/index.md`）**
  - `Complete multi-modal de-slop toolkit for writing, Markdown, HTML/CSS/JSX/SVG, Word (.docx), PowerPoint (.pptx), PDF, and agent deliverables. Works with any model, agent, or dev environment — zero runtime dependencies, offline-first, deterministic checks + fact-preserving verify.`

### 2.2 淘汰候选与理由

| 候选方向 | 示例 | 淘汰理由 |
|---|---|---|
| 延续工程窄口径 | “发稿前，用确定性规则审校交付物” | “审校 / 印前检查”窄化了品类，初访者需要二次翻译才知道它是去 AI 味工具 |
| 营销形容词堆砌 | `一站式全方位去 AI 味平台，赋能全场景高质量交付` | 违反官网 Anti-Slop 原则，直接命中 `zh-bureaucratic-padding`，空话多而证据少 |
| 二阶否定对比腔 | `不只是去 AI 味词表，而是全链路确定性工程` | 触发自身 `negation-pivot-frame` 规则，落入二阶 AI 文风陷阱 |
| 过度承诺未上线模态 | “De-slop everything across every format (video, code, audio)” | 超出 `v0.2.0` 实际探针覆盖范围，违背诚实边界原则 |

## 3. 一二级信息层级（Messaging Architecture）

| 层级 | 核心传达 | 落位区块 | 支撑证据（拒绝空洞形容词） |
|---|---|---|---|
| **一级卖点（3 秒直给）** | **全面去 AI 味（De-slop AI outputs）**——广泛覆盖多场景、多模态，适配任意模型、Agent 与开发环境 | Band `00` 首屏 H1 + Eyebrow + `/llms.txt` 首段 | 标题直接点名去 AI 味与六类产物；右侧 3 条 10 秒可复制命令（`npx` / `uvx` / `curl /llms.txt`） |
| **二级卖点 1：全链路能力** | 负向识别 + 事实守卫 + 正向差异化 + 生态图谱 | Band `00` 四列证据带 + Band `03` 核心体系 | 4 套规则包 29 条规则、`dislop verify` 事实多重集核验、`dislop.voice/1` & `dislop.taste/1` 草案、87 条实测生态雷达 |
| **二级卖点 2：多场景多模态** | 覆盖写作、文档、PPT、PDF、前端 UI 与 Agent 交付，明示已实装与演进项 | Band `02` 全覆盖矩阵（新增） | 按产物分列支持扩展名、确定性检出范围，并以 `LIVE v0.2.0` / `PROTOTYPE · v0.3+` 显式标出状态 |
| **二级卖点 3：随手可用、广泛兼容** | 不挑模型、不挑 Agent、不挑开发环境 | Band `02` 兼容三栏 + Band `05` L0–L3 接入梯队 | 浏览器零上传工作台、`/llms.txt` 低 Token 直读、Node/Python CLI、Claude Code/Codex/Cursor/Windsurf MCP、Skill 与 CI |
| **二级卖点 4：实测可靠与工程深度** | 确定性双端一致，改后不篡改数字与引用 | Band `01` 在线工作台 + Band `04` 29 条规则目录 + Band `06` 生态与设计参考 | 0 运行时依赖、101 项样本断言 + 12 项跨语言一致测试、仓库自身 `--fail-on info` 零命中自审、31 条非主流设计与学术源 |

## 4. 诚实边界核对表（Live vs. Roadmap）

官网所有文案与静态端点严格执行以下能力口径，不虚构未上线特性：

| 能力项 | 当前状态 | 官网披露口径 |
|---|---|---|
| Markdown / Text / HTML / CSS / JSX / TSX / SVG / DOCX / PPTX / PDF 元数据 29 条确定性规则 | **已上线（`v0.2.0`）** | 标为 `LIVE v0.2.0`，支持浏览器工作台、Node CLI、Python CLI 与 stdio MCP |
| Stage-3 改稿复检（`dislop verify`，锁数字/限定词/单位/日期/链接/代码/引用并防二阶口号） | **已上线（`v0.2.0`）** | 标为 `LIVE v0.2.0`，支持工作台一键体验“合规改写”与“二阶陷阱” |
| 浏览器离线工作台、`/llms.txt`、`/catalog.json`、`/radar/`（87 条） | **已上线（L0）** | 标为 `LIVE`，`CSP: connect-src 'none'` 物理锁死外发 |
| Git 增量门禁（`--changed` / `--staged`）、GitHub 注解、SARIF 2.1.0 | **已上线（`v0.2.0`）** | 归入代码仓与 Agent 交付门禁，明示当前侧重文档/UI/卫生缺陷而非深度代码逻辑审计 |
| 5 条节奏/UI 新探针与 PPTX 版式趋同探针 | **原型验证 / `v0.3` 规格** | 标为 `PROTOTYPE / SPEC v0.3+`，附 `scripts/prototype_antipattern_lab.mjs` 出处 |
| 正向差异化协议（`dislop.voice/1`、`dislop.taste/1`）、封装版 Skill/Hooks、SDK 门面与 HTTP API | **草案 / 路线图（P0–P1）** | 标为 `DRAFT / P0–P1`，其中静态 `/tools/skill.md` 与 Hooks 模板已可直接读取复用 |
| 端侧轻量小模型插件（ONNX/GGUF）与深度代码/多模态视觉探针 | **规划中（P2 / Roadmap）** | 明确声明与零依赖核心严格解耦，不作为当前已实装功能宣传 |

## 5. Anti-Slop 自检清单

本次全部中英文官网文案、决策文档与 Agent 端点均须同时满足：

- 零禁用营销词（杜绝 `一站式`、`全方位`、`业内最先进`、`赋能`、`无缝`、`革命性`、`AI-Powered`、`game-changer` 等空泛宣传词）。
- 零二阶过矫句式（杜绝 `不是 A，而是 B`、三连超短断句口号、中文四字排比串与无出处权威归因）。
- 零视觉反模式（不增加 `rounded-full` 徽章堆砌，不引入三层套盒，保持 1px 连续标尺与 WCAG AA 对比度）。
- 最终通过 Node 与 Python 双端 `dislop check site/ --fail-on info` 与 `dislop check docs/research --fail-on info` 零命中验收。
