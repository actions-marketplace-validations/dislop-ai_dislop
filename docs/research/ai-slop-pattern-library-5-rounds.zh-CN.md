# AI 味模式库专项调研、组织架构与 5 轮闭环实验报告

> 实验基线：`dislop` 仓库离线确定性双运行时（Node.js + Python 3.10+） · 数据与复现入口：[PATTERN-BENCHMARK.md](../../benchmarks/PATTERN-BENCHMARK.md) · 模式资产目录：[patterns/](../../patterns/) · 自动化实验脚本：[pattern_lab.mjs](../../scripts/pattern_lab.mjs) · 轮次记录：[round-history.json](../../benchmarks/results/round-history.json)
>
> **`v0.6.0` 最新状态注记**：本报告记录 Round 1–5（47 模式 = 35 规则包 + 12 模式库）的原始实验演进过程。随后在 `v0.6.0` 收口阶段，规则包扩展至 7 套内置包 **42 条活跃规则**，`patterns/dimensions/*.json` 同步扩展至 **53 条结构化模式（42 条规则包映射 + 11 条扩展模式库规则）**；并在完成工程搭配词（engineering-collocation）校准消除了原 `pat-clean-17-en-single-robust-ok` 的 1 例误报后，154 样本全集实测达到 **`Precision = 100.0%`、`Recall = 100.0%`、`F1 = 100.0%`、`Clean FPR = 0.0%`、`Node/Py Parity = 100.0%`**。

## 1. 为什么把「AI 味模式库」沉淀为独立项目资产

此前 `dislop` 的检查能力分散在 4 份 `packs/*/pack.json` 与若干探针函数里。经过系统复盘与基准诊断，我们发现单靠平铺规则列表存在三个结构短板：

1. **知识与代码耦合**：新增一批中文翻译腔短语、英文超额词组或过渡路标词时，需要同时改 JS 与 Python 引擎代码，无法像维护词典和结构资产一样按维度沉淀、评审和版本化。
2. **只靠单点规则抓不到「弱信号叠加」**：经过简单去词改写的 AI 稿件，会把每个单维度指标都压在阈值边缘（例如只出现 1 个温和套词 + 1 个机械过渡词 + 1 句抽象框架，且缺乏实测数字与代码依据），单条规则全部静默，但人眼一读就是 AI 味。
3. **评测集容易饱和**：`detection-v1`（48 样本）与 `holdout-v1`（16 样本）早已达到 `100%` F1，无法暴露节奏均一、连续同构开头、正文加粗泛滥、中文翻译腔簇、毛玻璃堆叠、PPT 连页纯字与多维隐蔽 AI 味等盲区。

因此，本次工作将 **AI 味模式库（`patterns/`）** 确立为与 `packs/` 并列的一等项目资产，并配套建立零依赖、双运行时 100% 一致的多角度模式检测引擎与 5 轮闭环评测体系。

---

## 2. 模式库组织形式与多角度检测架构

### 2.1 三层资产组织（`patterns/`）

- **分类本体（[taxonomy.json](../../patterns/taxonomy.json)）**：定义 6 个正交观测维度（`artifacts` 交付残留、`lexical` 词汇/词组/翻译腔、`syntactic` 句法与修辞框、`rhythm` 节奏/韵律/排版密度、`discourse` 语篇路标与结构、`visual-and-deck` 网页界面与幻灯片模板）、7 类检测角度与 3 级证据标准（`objective-invariant` / `empirical-corpus` / `editorial-consensus`）。
- **分维度模式目录（`patterns/dimensions/*.json`）**：按维度拆分 6 份资产文件；Round 1–5 初版收录 47 条模式，现 `v0.6.0` 已扩充至 **53 条模式条目**（全量映射 7 套规则包的 **42 条**规则 + **11 条**扩展模式库规则）。每条模式均包含双语名称、形成机理（`mechanism`）、检索标签（`tags`）、防误报护栏（`falsePositiveGuards`）、常见模型倾向（`modelTendencies`）与三态对照例句（`bad -> trap -> good`）。
- **可执行数据词库与阈值包（`patterns/banks/*.json`）**：将词组列表、权重、正则框和统计阈值抽离为 5 份纯 JSON 资产（`discourse-rhythm.json`、`lexical-signals.json`、`syntactic-frames.json`、`visual-deck.json`、`composite-fusion.json`），由 JS 引擎 [pattern-engine.mjs](../../src/pattern-engine.mjs) 与 Python 引擎 [pattern_engine.py](../../src/dislop/pattern_engine.py) 直接驱动执行。

### 2.2 七类互补检测角度

| 检测角度 | 核心原理 | 代表模式 | 核心防误报护栏 |
|---|---|---|---|
| `regex-invariant` | 确定性硬伤与高置信词法匹配 | 占位符、对话寒暄、中文半角标点 | 长度保真掩码屏蔽代码块、URL 与引用区 |
| `lexicon-cluster` | 段落级加权词组与中文翻译腔簇 | `zh-ai-calque-cluster`、`en-ai-phrase-cluster` | 单词绝不触发；中文需同段 >= 2 处不同信号且加权 >= 2.2，英文需 >= 3 处且加权 >= 3.2 |
| `syntactic-frame` | 句法骨架与修辞套路匹配 | 否定反转、三段分号排比、平衡让步框、海报金句收尾、自问自答 | 豁免数字/文件名纠偏、文献引用分号、FAQ 标题及引号内负例引文 |
| `rhythm-statistics` | 句长/段长变异系数与排版密度统计 | 连续逗号链、句长节拍器（CV < 0.16）、连续 4 句同构开头、正文加粗泛滥、段长均一（CV < 0.13） | 跳过标题/列表/表格；分语种校准句长与括号剥离，豁免短格式枚举与千分位数字 |
| `discourse-structure` | 跨句与跨段机械路标及结构框架 | `discourse-marker-cluster`（连续 3 段或单段 3 句堆叠 `首先/其次/此外/最后` 或 `Furthermore/Moreover`） | 允许单次或两次正常衔接 |
| `visual-markup-ooxml` | 前端源码与 PPTX OOXML 结构解析 | `ui-glassmorphism-overuse`、`ui-accent-stripe-card`、`pptx-layout-monotony` | 毛玻璃允许 1–2 处吸顶/弹窗；侧边彩条限定 >= 4px 且豁免 `blockquote`；PPTX 跳过隐藏页/短封面且遇到图表/表格/图片即重置连续计数 |
| `composite-cooccurrence` | 跨维度弱信号复合共现 + 事实密度阻尼 | `composite-multi-signal` | 须同时命中 >= 3 个正交弱维度（弱词 + 弱路标 + 抽象框架/弱节奏）且具体事实计数（带单位数值、时间、代码段、文件名）<= 1 |

### 2.3 配套查询与检验工具

- **`dislop catalog`（别名 `search`）与 MCP `dislop_catalog`**：支持中英文关键词、维度、分类、规则包、模态与严重级多维检索，Node 与 Python 逐字节输出一致。
- **`dislop patterns`**：直接对文件或标准输入运行多角度模式扫描与维度画像，Node 与 Python 逐字节一致。
- **`scripts/pattern_lab.mjs`**：集成了 `verify`（模式库与 `packs/` 双向一致性校验）、`ablation`（分数据集/分维度/分角度消融）、`dogfood`（全仓真实文档误报压测）、`record-round`、`write-report` 与 `assert`（CI 回归门禁）。

---

## 3. 五轮闭环迭代实验全过程与实测数据

每轮遵循统一闭环：**诊断盲区 -> 扩充 `patterns/` 资产 -> 实现双运行时探针 -> 更新 Benchmark 与对抗负例 -> 运行全量消融 + 全仓真实文档压测 -> 依据误差校准阈值**。

### 3.1 五轮定量演进总表

| 轮次 | 核心动作 | 评测总样本 | Precision | Recall | Overall F1 | Challenge v2 召回 | Holdout v2 F1 | Clean FPR | Node/Py 一致率 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Round 1** | 建立 `patterns/` 47 模式资产架构 + `dislop catalog` CLI/MCP + 48 样本 `pattern-challenge-v2` 基线 | 112 | 97.5% | 69.6% | **81.3%** | 29.2% | - | 1.8% | 100% |
| **Round 2** | 落地 `discourse-rhythm.json` 词库与双运行时引擎（逗号链、句长节拍器、连续同构句首、正文加粗泛滥、段长均一与路标簇） | 114 | 97.9% | 82.5% | **89.5%** | 60.0% | - | 1.8% | 100% |
| **Round 3** | 落地 `lexical-signals.json` + `syntactic-frames.json`（中文翻译腔簇、英文超额词簇、模板化让步框、海报金句收尾与自问自答）+ 引号负例护栏校准 | 120 | 98.2% | 91.8% | **94.9%** | 82.8% | - | 1.7% | 100% |
| **Round 4** | 落地 `visual-deck.json`（毛玻璃、侧边粗彩条、PPTX 版式单调）+ `composite-fusion.json`（多维弱信号复合 + 事实密度阻尼） | 126 | 98.5% | 100.0% | **99.2%** | 100.0% | - | 1.6% | 100% |
| **Round 5** | 新增 28 样本未见对抗集 `holdout-v2` + 红队压测与双项校准（侧边彩条 `>= 4px` 校准 + 逗号链长括号剥离）+ 单测与 CI 门禁收口 | **154** | **98.8%** | **100.0%** | **99.4%** | **100.0%** | **100.0%** | **1.3%** | **100%** |

> 注：154 样本全部 75 条干净负例中，模式库引擎本身（`src/pattern-engine.mjs` / `src/dislop/pattern_engine.py`）保持 **`0 / 75 = 0.0%` 误报**；总表中 1 例误报（`pat-clean-17-en-single-robust-ok`）来自既有 `packs/business-brief` 的 `cooccurrence-slop-cluster` 规则。

### 3.2 各轮关键发现与误差校准记录

#### Round 1（暴露真实盲区）
在 `detection-v1` 与 `holdout-v1` 均已 100% 饱和的情况下，新建 `pattern-challenge-v2` 立刻把隐藏盲区拉回水面：`rhythm` 维度召回仅 `30.0%`，`lexical` 仅 `33.3%`，`visual-and-deck` 仅 `54.5%`，`pattern-challenge-v2` 整体 F1 仅 `43.8%`。同时在 `pat-syntactic-pos-04` 上暴露了中文自问自答只匹配「因为」而漏掉「这意味着什么？意味着……」的问题。

#### Round 2（节奏与路标维度收敛）
上线 6 个数据驱动节奏与路标探针后，`rhythm` 召回从 `30.0%` 跃升至 `100.0%`（0 误报），全仓 86 份真实文档压测仅产生 1 条真实 `info` 提示（`README.md` 16 行确为 5 逗号长句），验证了分语种长度门槛与短列表豁免的有效性。

#### Round 3（词簇与句法框 + 引号护栏校准）
`lexical` 召回升至 `100.0%`，`syntactic` 升至 `100.0%`。但在全仓 `dogfood` 压测中，我们捕获了一个真实误报：`pull-quote-closer` 命中了 `docs/brand-and-voice-guide.zh-CN.md:21` 正文里用引号引用的反面案例（“例如‘笔一直在你手里’”）。随即在词库配置里增加 `skipQuoted: true` 并在双端引擎加入中文/角落引号与「例如/比如」前导护栏，复测立即清零该误报。

#### Round 4（多模态模板 + 跨维复合隐蔽 AI 味）
上线 UI/PPTX 模板探针与 `composite-multi-signal` 后，全部 6 个维度召回均达 `100.0%`，成功捕获全部 4 条无单点硬伤的隐蔽 AI 味样本，同时 2 条带实测数字与代码文件名的近似干净样本经事实阻尼器全部放行。全仓压测同时暴露 `ui-accent-stripe-card` 把 `site/styles.css` 里 3px 语义状态条误判为 4px 粗彩条仪表盘卡片。

#### Round 5（未见对抗集 `holdout-v2` 与红队收口）
将 `visual-deck.json` 中侧边彩条门槛从 `3px` 校准为 `>= 4px`（与 Tailwind `border-l-4` / `border-l-8` 对齐），立刻消除 `site/styles.css` 误报；将逗号链括号剥离上限从 80 字符放宽至 120 字符，避免把带括号说明的概念列表（如 `skills/dislop/SKILL.md:25`）误判为平铺逗号串句。最终在 28 条全新未见对抗样本（`holdout-v2.json`，覆盖学术文献引用、法律 SLA 条款、3px 语义提示条 CSS、Markdown 表格与加粗术语清单、带数据压测记录、散文变节奏长段、6 页含图表中文 PPT 等困难负例与 14 条跨维度隐蔽正例）上取得 **`P = 100.0%`、`R = 100.0%`、`F1 = 100.0%`、`Clean FPR = 0.0%`、`Node/Py Parity = 100.0%`**。

---

## 4. 多角度增量消融结论（154 样本）

| 检测组合 | Precision | Recall | Overall F1 | Challenge v2 召回 | Holdout v2 召回 | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|
| 仅 `packs/`（35 条规则） | 97.6% | 51.9% | **67.8%** | 24.2% | 7.1% | 1.3% |
| + 节奏与语篇路标库（`discourse-rhythm`） | 98.2% | 69.6% | **81.5%**（+13.7） | 51.5% | 42.9% | 1.3% |
| + 词簇与句法框库（`lexical-signals` + `syntactic-frames`） | 98.6% | 86.1% | **91.9%**（+10.4） | 78.8% | 71.4% | 1.3% |
| + 界面与幻灯片模板库（`visual-deck`） | 98.7% | 94.9% | **96.8%**（+4.9） | 93.9% | 85.7% | 1.3% |
| + 跨维弱信号复合融合（全 7 角度） | **98.8%** | **100.0%** | **99.4%**（+2.6） | **100.0%** | **100.0%** | **1.3%** |

消融结果清晰证明：每一层新检测角度都带来不可替代的召回增益（合计提升 **+31.6 F1**，在未见对抗集 `holdout-v2` 上召回从 **7.1% 提升到 100.0%**），且全程未引入任何额外误报。

---

## 5. 后续演进建议

1. **模式库持续扩充机制**：新增中文行业套话（如产品 PR、简历、学术摘要）或英文新模型高频词时，只需向 `patterns/banks/*.json` 追加带权条目并在 `benchmarks/datasets/` 补齐一正一反样本，由 `npm run test:patterns` 自动把关，不再需要修改核心代码。
2. **与 `packs/` 渐进合流**：`pptx-layout-monotony` 已在 `v0.6.0` 晋升至 `packs/executive-deck/pack.json`，其余 11 条模式库规则现已通过 `dislop patterns` 与 `dislop check --patterns` 直接暴露，后续继续按零误报验证结果择优晋升。
3. **跨语料外部真值校准**：下一步可在公开无版权争议的人类真实语料（如开源 RFC、技术文档、经典散文）上执行大规模零误报压测，持续收紧各维度阈值并向开源社区开放模式提交规范。
