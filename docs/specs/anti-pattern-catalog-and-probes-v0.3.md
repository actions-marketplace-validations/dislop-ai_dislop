# `dislop v0.3` 改造设计与规则 Spec：反模式查询目录与节奏/UI 确定性探针

> 状态：设计草案（已通过独立原型 [prototype_antipattern_lab.mjs](../../scripts/prototype_antipattern_lab.mjs) 实测验证，未改动 v0.2.0 核心引擎文件）· 关联研究报告：[anti-pattern-detection-and-catalog.zh-CN.md](../research/anti-pattern-detection-and-catalog.zh-CN.md)

本文为 `dislop v0.3.0` 提供可直接合入实施的接口契约、Schema 扩展、6 条新确定性探针的精确规格与跨运行时（Node.js / Python / Browser）一致性测试清单。

---

## 1. `dislop.pack/2` 向后兼容元数据扩展

为支撑「反模式查询（Catalog）」且不破坏现有 `dislop pack-test` 与外部工具兼容性，继续保持 `schema: "dislop.pack/2"`，在单条 `rule` 对象上增加 4 个**可选元数据字段**（缺省时由引擎自动推断）：

```json
{
  "id": "comma-chain-cadence",
  "tier": "taste",
  "severity": "info",
  "family": "rhythm/comma-chain",
  "category": "language-rhythm",
  "languages": ["en", "zh"],
  "tags": ["comma-chain", "cadence", "rhythm", "逗号链", "串句"],
  "evidenceLevel": "empirical-corpus",
  "modelTendencies": ["general-llm", "zh-report"],
  "probe": "comma-chain-cadence",
  "zones": ["prose"],
  "modalities": ["markdown", "text", "html", "docx"]
}
```

字段约束与默认推演规则：

| 字段 | 类型 | 必填 | 默认推断与枚举约束 |
|---|---|---|---|
| `category` | `string` | 否 | 缺省按 `family` 前缀映射：`hygiene/` -> `delivery-hygiene`、`office/` -> `office-structure`、`lexicon/` -> `language-lexicon`、`frame/` -> `language-template`、`rhythm/` -> `language-rhythm`、`punctuation/` -> `language-punctuation`、`evidence/` -> `evidence-rigor`、`deck/` -> `deck-layout`、`ui/` -> `ui-design` |
| `languages` | `string[]` | 否 | 缺省按 `id` 前缀推断（`zh-` -> `["zh"]`，`en-` -> `["en"]`，其余 -> `["en", "zh"]`） |
| `tags` | `string[]` | 否 | 供中英文同义症状检索（例如搜「毛玻璃」「玻璃拟态」命中 `ui-glassmorphism-overuse`） |
| `evidenceLevel` | `string` | 否 | 限定三选一：`objective-invariant`（客观交付缺陷）、`empirical-corpus`（有语料/文献基线支撑）、`editorial-consensus`（编辑部与社区实践共识） |

---

## 2. 反模式查询接口 Spec（CLI + MCP + 浏览器工作台）

### 2.1 CLI：`dislop catalog`（别名 `dislop search`）

同步在 `bin/dislop.mjs` 与 `src/dislop/cli.py` 新增子命令：

```bash
dislop catalog [query]
  --pack <id>            # core | business-brief | literary-essay | deck-and-ui
  --category <cat>       # language-rhythm | language-template | ui-design | deck-layout ...
  --family <prefix>      # 前缀匹配，如 rhythm/ 或 ui/
  --modality <mod>       # markdown | text | html | css | jsx | svg | docx | pptx | pdf
  --severity <sev>       # error | warning | info
  --tier <tier>          # invariant | taste
  --lang <en|zh>         # 输出说明语种（默认 en）
  --format <text|json|md>
  --json                 # 等价于 --format json
```

退出码语义：`0` 表示查询执行成功（允许 `matched: 0`）；`2` 表示非法枚举参数（如未知 `--severity` 或未知 `--modality`）。

### 2.2 MCP：`dislop_catalog`

同步在 `bin/dislop.mjs` 与 `src/dislop/mcp_server.py` 注册第 5 个工具 `dislop_catalog`：

```json
{
  "name": "dislop_catalog",
  "description": "Search and browse dislop's anti-pattern catalog by keyword, category, family, modality, severity, or pack. Returns matching rule metadata, Deletion Tests, and before/trap/after exemplars.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Optional bilingual keyword query (matches id, tags, message, deletionTest, exemplar)" },
      "pack": { "type": "string" },
      "category": { "type": "string" },
      "family": { "type": "string" },
      "modality": { "type": "string" },
      "severity": { "type": "string", "enum": ["error", "warning", "info"] },
      "lang": { "type": "string", "enum": ["en", "zh"] },
      "includeExemplars": { "type": "boolean", "description": "Default true; set false for compact index listing" },
      "limit": { "type": "integer", "minimum": 1, "maximum": 100 }
    }
  }
}
```

输出结构固定包含 `schema: "dislop.catalog/1"`、`total`、`matched`、`facets`（各 `pack` / `category` / `severity` 计数）与 `items` 数组，且默认仅返回命中子集，避免一次性向 Agent 注入整份词表。

### 2.3 浏览器工作台（`site/`）改造点

1. **修复 SARIF `helpUri` 锚点断链**：在 `site/app.js` 的 `renderRulesTable()` 中为每行 `<tr>` 写入 `id="rule-${r.id}"`；页面加载与 `hashchange` 时若命中 `#rule-<id>`，自动清除筛选条件、滚动定位并短暂高亮该规则行。
2. **多维检索条**：在 `#rules` 区块现有 Pack 筛选按钮上方新增实时搜索框（支持中英文词与规则 ID）以及 `Category` / `Modality` / `Severity` 下拉筛选，100% 在内存执行，保持 `CSP: connect-src 'none'`。
3. **三态示例完整展示与一键试跑**：在规则行中补齐 `trap`（二阶陷阱）展示，并提供「Load in Workbench」按钮，将对应 `exemplar.bad` 直接载入上方清样工作台验证实时标红与 `verify` 校验。

---

## 3. 六条候选确定性新探针精确 Spec

所有新探针须在 `src/core.mjs` 与 `src/dislop/engine.py` 中实现完全等价的算法、正则与阈值，并在 `packs/*/pack.json` 中提供完整双语 `deletionTest`、`bad -> trap -> good` 示例与 `fixtures.hit` / `fixtures.clean`。

### 3.1 `comma-chain-cadence`（连续逗号链）

- **目标包与级别**：`business-brief`、`literary-essay`（`severity: "info"`，`family: "rhythm/comma-chain"`）。
- **阈值参数（`thresholds`）**：`minCommaChain: 5`，`minLongClauses: 4`，`minClauseUnitsZh: 4`，`minAvgClauseUnitsZh: 5.0`，`minClauseUnitsEn: 3`，`minAvgClauseUnitsEn: 3.2`。
- **算法步骤**：
  1. 在 `zones.prose` 上按自然段切分，跳过标题（`#`）、列表（`-/+/*/1.`）与表格（`|`）。
  2. 按句末标点 `[.!?。！？]` 切分句子；先将千分位数字 `\d{1,3}(?:,\d{3})+` 与行内代码替换为空占位，再移除单对括号内注释 `(...)` / `（...）`。
  3. 判定句子主语种（汉字数 `>= 英文词数 * 2` 视为 `zh`，否则 `en`）。
  4. 统计 `[，,]` 数量；若 `>= 5`，拆分为分句数组并按语种统计每分句单元数（中文按汉字 + 英文词 `1.5` 权；英文按词数 + 汉字 `0.6` 权）。
  5. 仅当长分句数 `>= 4`、均值达到语种门槛、且原始切片中 Markdown 链接 `](` 数量 `< 3` 时触发。
- **正反样例**：
  - `bad`：`在项目初期，团队整理了接口文档，梳理了历史日志，核对了权限列表，补齐了监控告警，最终在周五前完成了灰度发布。`
  - `trap`：`整理文档。梳理日志。核对权限。周五发布。`
  - `good`：`项目初期团队先补齐了接口文档、权限清单与监控告警。历史日志核对完毕后，服务在周五前完成灰度发布。`
  - `clean` 护栏：`支持的输入格式包括 Markdown, HTML, CSS, SVG, DOCX, PPTX 六类文件。` / `系统处理了 12,000,000 条日志，覆盖 4 个核心接口。`

### 3.2 `sentence-length-monotony`（句长节拍器效应）

- **目标包与级别**：`literary-essay`、`business-brief`（`severity: "info"`，`family: "rhythm/monotony"`）。
- **阈值参数**：`minMonotonySentences: 5`，`maxSentenceLengthCv: 0.16`，`minMeanUnitsZh: 14`，`minMeanUnitsEn: 10`。
- **算法步骤**：
  1. 在 `zones.prose` 上逐段扫描，跳过标题、列表、表格与代码块。
  2. 收集段内有效句长数组 `L`（仅保留单元数 `>= 4` 的句子，避免将缩写或短叹词计入）。
  3. 当 `len(L) >= 5` 且 `mean(L)` 达到语种下限时，计算总体标准差与变异系数 `CV = sqrt(mean((x - mean)^2)) / mean`。
  4. 若 `CV < 0.16`，在段落起始处发出 1 条提示，附带指标串 `sentences=N, mean=M, cv=C`。
- **正反样例**：
  - `bad`：连续 5 句均在 17–19 汉字之间的机械流水账段落（`CV ≈ 0.04`）。
  - `trap`：刻意删成每句 3 字的断句口号墙。
  - `good`：长短交错（短句 6 字点题 + 32 字复合句交代条件与例外 + 10 字收束，`CV > 0.45`）。

### 3.3 `discourse-marker-cluster`（机械过渡路标簇）

- **目标包与级别**：`business-brief`（`severity: "warning"`，`family: "rhythm/discourse-signpost"`）；同步加入 `DISPLACEMENT_FAMILIES` 防止改稿二阶漂移。
- **阈值参数**：`minConsecutiveMarkedParas: 3`，`minMarkersInSinglePara: 3`。
- **触发条件（满足其一即命中）**：
  1. 连续 `>= 3` 个非列表、非标题、非表格自然段均以机械路标领起（中文：`^(首先|其次|再次|此外|另外|与此同时|最后|总而言之|综上所述|归根结底)[，,：:\s]`；英文：`^(Firstly|Secondly|Thirdly|Furthermore|Moreover|Additionally|In addition|Consequently|Ultimately|In conclusion|To summarize)[,\s]`）。
  2. 单个自然段内句首连续出现 `>= 3` 次上述过渡词。
- **豁免条件**：单次使用（如段落开头用一次 `首先` 引出范围界定）或两段内仅出现 1–2 次均不触发。

### 3.4 `ui-glassmorphism-overuse`（毛玻璃面板滥用）

- **目标包与级别**：`deck-and-ui`（`severity: "warning"`，`family: "ui/slop-chrome"`，`modalities: ["html", "css", "jsx"]`）。
- **阈值参数**：`maxBackdropBlurPerFile: 2`（达到 `>= 3` 触发）。
- **算法步骤**：在剥离注释、`script`、`code`、`pre` 与 `dislop-quote` 区块后，匹配 `\bbackdrop-blur(?:-[a-z0-9]+)?\b|backdrop-filter\s*:\s*blur\(`。单文件内出现 `<= 2` 处（如吸顶导航栏 + 模态遮罩）放行；`>= 3` 处时在首个命中处报出总次数。

### 3.5 `ui-accent-stripe-card`（侧边粗彩条卡片堆叠）

- **目标包与级别**：`deck-and-ui`（`severity: "warning"`，`family: "ui/slop-chrome"`，`modalities: ["html", "css", "jsx"]`）。
- **阈值参数**：`maxAccentStripesPerFile: 2`（达到 `>= 3` 触发）。
- **算法步骤**：在剥离注释与代码区块后，匹配 `\bborder-l-(?:4|8)\b|border-left\s*:\s*(?:[3-9]|\d{2,})px\s+solid\b`；若前向 40 字符内含 `blockquote` 标签或选择器则豁免。单文件非引用命中 `>= 3` 处时触发。

### 3.6 `pptx-layout-monotony`（跨页幻灯片结构单一）

- **目标包与级别**：`deck-and-ui`（`severity: "info"`，`family: "deck/layout-variety"`，`modalities: ["pptx"]`）。
- **阈值参数**：`minDeckSlidesForVariety: 5`，`maxConsecutiveIdenticalLayouts: 4`。
- **算法步骤（接入 `auditOoxmlEntries`）**：
  1. 过滤隐藏页（`show="0"`）与封面/过渡页（正文少于 12 词或 25 汉字）。
  2. 为每张内容页提取轻量结构指纹：`hasChart(<c:chart>)`、`hasTable(<a:tbl>)`、`hasImage(<p:pic>)`、`textShapeCount`（分桶 `1` / `2` / `3+`）、`hasBullets`（`0` / `1`）。
  3. 当有效内容页总数 `>= 5` 且连续 `>= 4` 页均退化为「无图表、无表格、无图片且仅含标题 + 单正文列表框」的纯字列表页时，在第 4 页位置发出 `info` 提示，建议将其中至少一页转为对比表、流程图或数据图。
- **合成测试标记（供 `dislop pack-test`）**：`PPTX_LAYOUT_RUN:4`（命中）与 `PPTX_LAYOUT_RUN:2`（放行）。

---

## 4. 双运行时一致性与回归验证清单

正式将本 Spec 合入 v0.3.0 时，须按以下顺序执行全量验收，确保零回归：

1. **规则包与固件测试**：为 6 条新规则补齐 `packs/*/pack.json` 的 `deletionTest`、`exemplar`（含 `source: "original"`）与 `hit`/`clean` fixtures，执行 `node bin/dislop.mjs pack-test` 与 `PYTHONPATH=src python3 -m dislop.cli pack-test` 并核对输出字符级一致。
2. **跨运行时一致性测试（`tests/test_conformance.py`）**：
   - 新增 `test_catalog_query_parity`：核对 Node CLI、Python CLI、Node MCP `dislop_catalog` 与 Python MCP `dislop_catalog` 对同一查询参数返回完全相同的 `ruleId` 集合与排序；
   - 新增 `test_rhythm_and_ui_v03_probes_parity`：核对逗号链、句长 CV、路标簇、毛玻璃滥用、侧边彩条与 PPTX 连续纯字页在双端输出相同的 `ruleId`、`location` 与 `fingerprint`。
3. **浏览器静态构建与自举门禁**：
   - 执行 `node scripts/build_site.mjs` 同步 `site/engine/core.mjs` 与 `site/engine/packs-data.mjs`；
   - 执行 `node bin/dislop.mjs check . --fail-on warning`、`node bin/dislop.mjs check docs/ --fail-on info` 与 Python 对等命令，均须 `0 findings`；
   - 在冻结的人写中英文公开语料集上运行误报基线评估，确认 `packs/core` 误报 `= 0` 且新增 `rhythm/*` 探针误报率处于可接受区间（默认 `info` 级）。
