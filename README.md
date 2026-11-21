# dislop

**Cross-modal anti-AI-slop quality gate and pluggable Taste Packs (CLI & MCP).**

在文章、网页、图文卡片与办公文档（PDF / DOCX / PPTX）交付前，定位版式、数字、修辞与结构上的生成痕迹，提供同体裁改稿先例对照，并在严格语义与版式约束下完成修订。

## 核心设计

- **先查证，再动笔（Zero-Degradation Pipeline）**
  1. `audit`：确定性规则与跨模态几何/视觉探针先行，定位套话句式、虚构凑整数字、排版溢出、字号层级失衡与图表伪饰。
  2. `exemplar`：按文体与媒介检索高质量人工样本与正反改稿对照，替代抽象空泛的“请写得更自然”。
  3. `rewrite`（可选）：锁定事实、数字、专名、引用与版式边界，只重写命中的问题片段，改后自动复检，未达标不覆盖原稿。
- **引擎与审美解耦（`engine/` + `packs/`）**
  - `engine/`：跨模态解析器（Markdown / HTML / PDF / DOCX / PPTX）、确定性检查器、几何渲染探针与最小改动重写护栏。
  - `packs/`：可插拔的 **Taste Packs（审美包）**——将不同领域创作者、编辑与设计师的具体审美判断编码为可复用的规则、词表与正反样本（如商业方案交付包、长篇非虚构/文学公众号包、演示文稿与信息图包）。
- **双入口接入（`interfaces/`）**
  - **CLI（`dislop`）**：面向本地脚本、Git 提交门禁与 CI 流水线的确定性检查与批处理。
  - **MCP Server（`dislop-mcp`）**：面向 Claude Code、Codex、Cursor 等本地 Agent 的“出街前最后一步”工具调用闭环。

## 仓库目录规划

```text
dislop/
├── AGENTS.md              # 仓库协作与工程质量红线
├── docs/
│   └── architecture.md    # 三层架构、跨模态检查项与 Taste Pack 规范
├── engine/                # 跨模态解析、确定性探针与护栏式修订核心（建设中）
├── packs/                 # 可插拔审美包（规则 + 正反对照样本）
└── interfaces/            # CLI 与 MCP Server 入口（建设中）
```

## 演进路线

1. **阶段一（内部共创与高频自用）**：跑通日常高频交付材料（方案书、长文、演示稿、网页）的 `audit + exemplar + guarded rewrite` 闭环，沉淀首批核心审美包与黄金测试集。
2. **阶段二（开源 CLI + MCP 与审美包生态）**：开放核心检查器、CLI 与 MCP Server，支持外部作者与设计师贡献独立 Taste Packs。
3. **阶段三（跨模态工作台与团队门禁）**：面向非技术团队与企业交付场景提供拖拽式审校工作台、品牌专属规则托管与 API 门禁服务。
