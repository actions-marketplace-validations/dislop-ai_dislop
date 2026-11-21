# `dislop` 反模式识别与查询体系：深度研究、分层架构与演进路线

> 快照日期：2026-11-21 · 关联文档：[生态全景调研](./anti-slop-landscape-2026.zh-CN.md) · [路线图](../../ROADMAP.zh-CN.md) · 精确改造 Spec：[anti-pattern-catalog-and-probes-v0.3.md](../specs/anti-pattern-catalog-and-probes-v0.3.md) · 验证原型：[prototype_antipattern_lab.mjs](../../scripts/prototype_antipattern_lab.mjs)
>
> 证据纪律：本文严格区分「经论文或公开基准核验的实证发现」与「基于开源规则集及社区公开实践的经验共识」，不把社区印象写成定量定理。

## 核心结论

1. **去 AI 味的前提是可解释、可定位、可检索的反模式识别**。大模型在长文、汇报、文案与界面生成中存在显著的「风格惯性（style inertia）」，且不同模型家族会留下稳定的词法、句法与节奏指纹（Bitton et al., `arXiv:2503.01659`）。但单靠黑盒概率百分比无法指导改稿，也会因误报引发创作者抵触；真正可落地的是「**确定性探针 + 结构化反模式目录（Catalog）+ 可选轻量小模型增量**」的漏斗架构。
2. **「低智能高专用」分层路线在工程与成本上完全成立**。早期 70%–80% 的高频反模式（客观交付事故、固定句式壳、逗号链与句长均一等节奏指标、CSS/Tailwind/SVG/PPTX 模板样式）可用零依赖确定性脚本在毫秒级检出；中后期对隐蔽语篇空洞、上下文歧义与视觉布局审美问题，可引入 150M–4B 级别的专用小模型（如多语种 `mmBERT` / `ModernBERT-base`、`Qwen3-0.6B/1.5B/4B + LoRA`、以及 `SmolVLM2` / `Qwen2.5-VL-3B`）作为可选插件，严格与零依赖核心包解耦。
3. **「反模式查询（Catalog）」应建在现有 `packs/*/pack.json` 单一事实源之上**。`dislop` 当前 29 条规则已自带 `family`、`modalities`、`deletionTest` 与 `bad -> trap -> good` 三态示例，但缺少按关键词、症状、模态、维度与模型倾向检索的查询层，且 `site/` 规则表尚缺 SARIF 约定的 `#rule-<id>` 锚点与搜索过滤。优先将 `packs/` 升级为可执行、可检索的 `dislop catalog`（CLI + MCP + 浏览器目录），既不偏离「Agent 交付物印前检查」定位，又能把社区贡献引导至规则样本与对照案例。
4. **独立原型已验证新探针与查询层可行性**。仓内新增零依赖原型 [prototype_antipattern_lab.mjs](../../scripts/prototype_antipattern_lab.mjs) 完成了全量 29 条规则多维检索与 5 条新型节奏/UI 确定性探针验证（全部正反断言通过，扫描仓内既有文件耗时约 30 ms，零误报），并实证暴露了中英文短语长度需分语种校准的关键工程细节。

---

## 1. 多维度反模式体系研究（语言/节奏 + UI/平面设计）

### 1.1 语言模式与节奏反模式：四层可观测结构

依据 `Wikipedia: Signs of AI writing`、`EQ-Bench Slop Score` 以及 2024–2026 年风格计量（stylometry）文献，自然语言中的 AI 味可拆解为四个递进观测层。当前 `dislop v0.2.0` 已较好覆盖 L1 词表与 L2 经典句式，但在 L3 节奏/韵律与 L4 语篇路标上存在明显补齐空间：

| 层次 | 反模式类别 | 中英文典型表现 | 形成机理（实证/分析） | `dislop v0.2.0` 覆盖现状 |
|---|---|---|---|---|
| L1 词法超额 | 超额高频词与公文抽象词 | 英文 `delve`, `tapestry`, `pivotal`, `testament`；中文 `赋能`、`抓手`、`闭环`、`底层逻辑` | RLHF 标注偏好「正式、流畅、高信息感」词汇，导致特定风格词出现远超历史基线的频率激增（Kobak et al., `arXiv:2406.07016`；Liang et al., `arXiv:2404.01268`） | 已覆盖 `en-cliche-lexicon`、`zh-bureaucratic-padding` |
| L2 句法模板 | 否定对比框架、三段排比、段尾说教总结与超短句口号 | `"It's not just X — it's Y"`、`这不是 A，而是 B`；三组四字词并列；`Signals drop. Photos vanish. Trust dies.` | 对抗式二元反转与三联排比在人工偏好评分中易获高分，且屏蔽 L1 词表后模型会坍缩到此二阶模板（EQ-Bench Slop Score 赋予对比句式 25% 权重） | 已覆盖 `negation-pivot-frame`、`staccato-slogan-run`、`zh-four-char-triad`、`zh/en-essay-moralizing-ending` |
| L3 节奏与韵律 | **连续逗号链、句长方差过低（节拍器效应）、标点密度偏斜** | 单句串联 5–8 个等长逗号分句（“逗号、逗号、逗号”）；连续 5 句以上句长稳定落在窄区间；破折号高频插话 | 自回归解码与概率平滑倾向回避极端短句与嵌套长句，导致句长分布方差（SLV）与突发性（burstiness）低于人类自然写作 | 仅覆盖 `excessive-em-dash-density`、`zh-halfwidth-punctuation`；**缺失逗号链与句长均一探针** |
| L4 语篇与版面结构 | 机械路标簇、段落均一、加粗列表墙、空泛权威背书 | 连续段落以 `首先/其次/此外/最后` 或 `Furthermore/Moreover/Additionally` 领起；全篇等长段落；连续 4 条 `- **小标题**：说明` | 指令微调强化了「结构清晰、分点作答」的助手默认格式，将其泛化到叙事文、简报与提案正文 | 已覆盖 `bold-lead-list-wall`、`unsourced-attribution`；**缺失机械路标簇与段落均一探针** |

### 1.2 节奏与韵律指标的量化建模

相比词表匹配容易误伤领域术语（例如 `Delve` 调试器或 `wool tapestry`），节奏与韵律指标作用于句子和段落的结构分布，更难通过简单同义词替换掩盖，也更适合作为可解释的 `info` / `warning` 信号：

1. **连续逗号链（Comma-Chain Cadence）**：模型在中文汇报与英文长句中常把多个并列动作或修饰语用连续逗号平铺在同一句内，缺少主从层次。确定性建模方式为：在剥离代码块、千分位数字（`12,000`）、括号引用与 Markdown 链接列表后，统计单句逗号数 `C >= 5`，并额外校验「非短名词枚举」条件——原型实测表明中英文须采用分语种单元口径（中文至少 4 个长度 `>= 4` 字的分句且均值 `>= 5.0` 字；英文至少 4 个长度 `>= 3` 词的分句且均值 `>= 3.2` 词），从而可靠放行 `支持 Markdown, HTML, CSS, SVG, DOCX, PPTX 六类文件` 这类合法短枚举。
2. **句长变异系数过低（Sentence-Length Monotony / 节拍器效应）**：人类写作自然交替使用 4 字短断与 35 字复合长句，而模型默认产出围绕均值上下窄幅波动。以段落为单位，在有效句数 `N >= 5` 且平均句长达到实质散文门槛（中文 `>= 14` 字，英文 `>= 10` 词）的前提下，计算句长变异系数 `CV = std(L) / mean(L)`。当 `CV < 0.16` 时呈现明显机械节拍。低于 5 句的短段落、标题、列表与表格全部豁免，避免在短文档上误报。
3. **机械过渡路标簇（Discourse Marker Cluster）**：单次使用 `首先` 或 `Furthermore` 完全正常，但连续 3 个以上自然段首句都以机械连接词领起（`首先/其次/此外/另外/最后/综上所述` 或 `Firstly/Furthermore/Moreover/Additionally/Consequently/In conclusion`），或单段内连续堆叠 3 个及以上句首过渡词，即为高置信度的报告腔模板信号。
4. **段落长度均一性（Paragraph-Length Uniformity）**：在长篇文档（有效正文段落 `>= 6` 段，排除代码块、列表与表格）中，如果各段字数变异系数 `CV_para < 0.18`，往往意味着模型按固定预算「切块填坑」。该指标仅适合作为整篇级 `info` 诊断，而不适合用于短文或结构化手册。

### 1.3 主流模型家族在常见任务上的高频固定倾向

必须强调证据边界：开源社区与学术界关于模型风格差异的证据层级并不相同。下表将**学术/公开基准实证**与**社区公开实操观察**分栏列出，避免将特定版本或提示词条件下的现象泛化为永久规律：

| 模型家族 | 论文与公开基准实证（有公开一手出处） | 常见任务高频倾向（社区公开实操共识，随版本与系统提示词漂移） |
|---|---|---|
| **GPT 系列（OpenAI）** | 1. Kobak 等人（`arXiv:2406.07016`）与 Liang 等人（`arXiv:2404.01268`）证实 ChatGPT 发布后科学文献出现大规模超额词汇跃升（2024 年 PubMed 摘要下界 `13.5%`，CS 预印本最高 `17.5%`）。<br>2. Bitton 等人（`arXiv:2503.01659`）证实 OpenAI 家族在跨题材写作中具有稳定风格指纹，三分类器一致裁决精确率达 `0.9988`。<br>3. `EQ-Bench Slop Score` 与 `SlopBench`（2026-09）记录了 GPT 系列在对比句式与高频三元组上的稳定基线表现。 | **长文**：高频使用 `It's not X — it's Y`、破折号插话与段尾拔高收束。<br>**汇报/PPT**：默认输出 4–6 条加粗前缀列表墙（`- **核心亮点**：……`）与 `总而言之/展望未来` 收尾。<br>**文案**：高频使用 `game-changer`、`unlock`、三连超短句口号。<br>**技术文档**：偏好对称小节结构与 `It is worth noting that` 铺垫。 |
| **Claude 系列（Anthropic）** | 1. Bitton 等人（`arXiv:2503.01659`）与 `ATLAS / MAABench`（2026-10）均证实 Claude 家族具备与 OpenAI 可明确区分的风格与对数似然分布特征。<br>2. `sam-paech/slop-forensics` 公开语料统计记录了 Claude 创意写作中高频意象与特定连接词偏好。 | **长文**：相比早期 GPT 句式略流畅，但在禁用一阶套词后极易退化为二阶否定转折（`不是 A，而是 B`）、高密度破折号与温情抒情收尾。<br>**技术文档与前端**：默认偏向克制说明，但易产生过度防御性限定段落；无视觉约束时前端易落入第二代「暖米白 + 朱砂红」或精致卡片堆叠。<br>**文案**：偏好平衡双面表述（`一方面……另一方面……`）。 |
| **Gemini 系列（Google）** | 1. `arXiv:2503.01659` 与 `ATLAS`（2026-10）验证 Gemini 在多家族归因基准中具有独立可区分指纹。<br>2. `CodeT5-Authorship`（2025-06）在代码风格归因中同样观测到 Gemini 与其他家族的编码层可分性。 | **长文与技术文档**：倾向结构化信息密集输出，常见多级小标题、加粗关键词清单与高密度冒号引出说明。<br>**汇报/PPT**：在未限制单页字数时容易把整段说明塞进单页要点。<br>**文案**：在中文场景常出现规范书面语连贯长句与连续逗号并列分句。 |
| **DeepSeek 与 Qwen 系列（中文主力开源/开放权重）** | 1. `arXiv:2503.01659` 指出 DeepSeek-R1 与 OpenAI 输出存在显著风格特征重叠，引发蒸馏与合成数据谱系讨论。<br>2. `larashero3-dotcom/lieflat-less-ai-tone` 基于 520 万字对照语料与 629 篇跨模型实验证实：**不同模型在中文微观指标上会出现反向偏移**（例如每小句「的」字密度上部分模型高于人类而另一些低于人类），单一规则不可盲目套用全部模型。 | **长文（中文）**：DeepSeek 系列在议论文与评论中偏好短促警句、金句式对仗、四字排比与“先抑后扬”转折；Qwen 系列在中文职场与文档任务中偏向规范公文句式与分点综述。<br>**汇报/PPT**：中文汇报高频出现 `抓手/赋能/闭环`、四字三联与 `首先/其次/最后/综上所述` 路标链。<br>**技术文档**：容易夹杂半角西文标点或保留原始 Markdown 符号直出到 Office。 |

上述跨模型实证带来一条关键架构原则：**`dislop` 规则不针对某个厂商贴标签，而是针对具体的交付缺陷与可验证的语言/视觉退化现象建模**；模型家族倾向仅作为目录（Catalog）中的参考元数据与评测集采样维度，确保规则在多模型混合写作环境中保持稳定。

### 1.4 UI、前端、平面设计与 PPT 排版反模式及可检边界

综合 `pbakaus/impeccable`（62 条零 LLM 规则）、`Leonxlnx/taste-skill`、`cathrynlavery/diagram-design` 以及本仓库 [design-system.zh-CN.md](../design-system.zh-CN.md) 的实践经验，视觉与设计层的 AI 反模式必须按**数据可观测性**切分为三层，避免用静态正则硬碰需要像素感知的问题：

| 检出层级 | 适用媒介与输入源 | 典型 AI 设计反模式 | 确定性/技术实现方式 | 误报风险与边界 |
|---|---|---|---|---|
| **A. 零渲染静态可检层**（`dislop` 核心主场） | `.html` / `.css` / `.jsx` / `.tsx` / `.svg` / `.pptx` / `.docx` / `.pdf` 源码与 XML | 1. 紫粉/蓝紫霓虹渐变与 `background-clip: text` 渐变大字<br>2. 胶囊标签泛滥（单视图 `> 6` 个 `rounded-full`）<br>3. 三层套盒（`box-in-box-in-box`）<br>4. **毛玻璃滥用**（`backdrop-blur` 单视图 `>= 3` 处）<br>5. **侧边粗彩条卡片**（`border-l-4` / `border-left: 4px solid` 堆叠 `>= 3` 处）<br>6. WCAG AA 对比度不达标与深色模式 Z 轴亮度倒置<br>7. 死点击控件与提示词回声标签（`AI-Powered`）<br>8. SVG `<text>` 越出 `viewBox` 与缺失 `<title>`<br>9. PPTX 文字墙、要点超限、`normAutofit < 80%`、文本框越界、**全套演示跨页版式高度单一** | 正则 + 轻量词法/标签栈解析 + CSS 变量颜色求值 + OOXML 几何坐标与属性统计 + PDF 对象字典检查 | 单文件静态分析无法计算跨 CSS 文件级联覆盖后的最终计算样式；须明确声明「仅检静态可解析声明」 |
| **B. 渲染态 DOM / 几何可检层**（可选 Headless / Playwright 扩展） | 渲染后的网页 DOM 树、`getComputedStyle`、元素 `getBoundingClientRect`、PDF 渲染坐标 | 1. **均等三栏图标卡片模板**（3 个同宽同高兄弟节点，均含顶部图标 + 居中标题 + 2 行说明）<br>2. **巨型居中指标 + 微小副标模板**与过多居中对齐正文<br>3. 真实重叠遮挡、小屏横向溢出（`scrollWidth > innerWidth`）、动态背景上的真实文字对比度<br>4. 布局抖动动效（对 `width`/`height`/`top`/`left` 做 transition）<br>5. 字体阶梯扁平（`h1` 到正文缺乏清晰比例跨度） | Headless Chromium 抓取计算样式与布局框（bounding box），执行确定性几何规则 | 依赖外部浏览器运行时，不放入 `dislop` 零依赖核心包，适合作为可选 CI 插件或与 `impeccable` 互补 |
| **C. 视觉 / 多模态模型必要层**（P2 轻量 VLM） | 网页整页截图、海报/宣传图、PPT 渲染图、配图素材 | 1. **平面构图与留白呼吸感失衡**（元素虽未越界但重心偏斜或视觉拥挤）<br>2. **信息层级失效**（首屏找不到主视觉焦点，所有卡片同等抢眼）<br>3. **配图「塑料感」与风格割裂**（过度光滑皮肤、虚假霓虹反光、同页混用写实图与扁平矢量）<br>4. **第二代审美同质化**（虽避开紫粉渐变，但整体观感仍像默认暖米白 SaaS 模板）<br>5. 复杂海报中的图文遮挡与阅读动线断裂 | 截图缩放至 `768–1024px` 后送入轻量 VLM（`Qwen2.5-VL-3B` / `SmolVLM2` / `Gemma-3 4B`）输出结构化 JSON 诊断 | 存在主观波动与较高延迟，仅作 `info` 级设计审校建议，禁止设为 CI 硬阻断错误 |

---

## 2. 分层识别技术路线（确定性脚本 -> 轻量小模型 / 开源模型）

### 2.1 四级漏斗协作架构

核心设计判断：**不需要也不应该用大参数通用 LLM 去干基础反模式识别**。大模型既慢又贵、结果不可复现，还容易在审校时产生幻觉；而纯规则脚本难以处理高度依赖上下文的隐蔽套话与整页视觉构图。最优工程形态是四级漏斗，逐层递减调用量、逐层提升语义覆盖：

```text
输入交付物 (.md / .html / .css / .svg / .docx / .pptx / .pdf / 可选截图)
   │
   ▼
[Stage L0: 确定性硬底线 · packs/core · < 5 ms · 0 误报目标]
   ├── 路径泄露、占位符、AI 寒暄残迹、Office 修订/批注、死控件、对比度、越界
   └── 直接触发 error，阻断 CI / 提交（绝不交由模型覆盖）
   │
   ▼
[Stage L1: 确定性统计、节奏与结构探针 · packs/<genre> · 5–40 ms]
   ├── 长度保真掩码区（屏蔽代码块、URL、引用、专名白名单）
   ├── 词法/句式探针 + 节奏指标（逗号链、句长 CV、路标簇）+ 静态 UI/PPTX 探针
   └── 输出精确行号、量化指标、删除测试与 bad -> trap -> good 对照
   │
   ▼ (仅当用户显式开启 `--ml` / 本地插件，且 L1 存在灰区段落或需深度体检)
[Stage L2: 轻量编码器 / 分类器 · 86M–300M INT8 ONNX · 20–120 ms/文档]
   ├── 职责 A（歧义消解）：复核 L1 边界命中（如真技术对比 vs. 虚假“不是 A，而是 B”）
   ├── 职责 B（细粒度多标签分类）：检出隐蔽空话、防御性废话、中英翻译腔、过度均衡套话
   └── 仅输出段落级定位 + 校准概率 + 所属反模式 ID，不改写原文
   │
   ▼ (按需触发：视觉截图审查或复杂语篇归因)
[Stage L3: 0.5B–4B 开源小模型 / 轻量 VLM · 本地 llama.cpp / WebGPU · 0.3–2.5 s]
   ├── 文本：Qwen3-0.6B/1.5B/4B + LoRA + JSON Grammar 约束输出结构化证据句
   ├── 视觉：Qwen2.5-VL-3B / SmolVLM2 审计 UI 截图与 PPT 渲染页的层级、留白与塑料感
   └── 严格降级为 `info` 商榷建议，并保留规则层 `dislop verify` 做改后事实锁死
```

### 2.2 早期核心：确定性静态层的误报控制与可解释设计

确定性层能否赢得专业作者和工程团队信任，取决于「**低误报率**」与「**一眼看懂为什么错、怎么改**」，而不是规则总数堆到几百条：

1. **长度保真掩码区（Zones）**：沿用 `src/core.mjs` 的 `raw` / `prose` / `ui-text` 三视图机制，在正则或统计扫描前以等长空格遮蔽代码块、行内代码、URL、引用块、HTML 标签与 `dislop-quote` 标本区，保证字符偏移与 Unicode 列号 1:1 对齐原文。
2. **结构化豁免而非简单黑名单**：每条新探针必须内置语境护栏。例如 `negation-pivot-frame` 放行两端含具体数字/文件名/时间坐标的真实技术纠偏；`comma-chain-cadence` 放行千分位数字、短名词格式列表与链接列表；`ui-accent-stripe-card` 放行 `<blockquote>` 引用线。
3. **可解释四元组输出**：每条命中固定返回「精确坐标（`file:line:col` 或 `slide N`）+ 量化指标（如 `commas=6, cv=0.09`）+ 触发原因（`why`）+ 删除测试与三态示例（`deletionTest` + `bad -> trap -> good`）」，让人类作者和下游 Coding Agent 都无需猜测如何修改。

### 2.3 中后期：轻量小模型 / 开源小模型选型与端侧部署边界

围绕「低智能高专用」目标，中后期模型层不应追求通用对话能力，而应选用**小参数、长上下文、原生多语种、易于 ONNX/GGUF 量化**的专用模型家族。下表汇总了 2025–2026 年经过社区验证的主流候选路线：

| 候选模型路线 | 参数量与架构 | 量化后体积 | 推荐推理运行时 | 单次典型延迟（消费级笔记本 CPU / 端侧 GPU） | 适配任务与核心优缺点 |
|---|---|---|---|---|---|
| **`ModernBERT-base`** (`arXiv:2412.13663`) | 149M 编码器（RoPE + 交替局部/全局注意力，原生 **8,192 tokens**） | INT8 ONNX 约 **150–170 MB** | ONNX Runtime (Node/Python) · Transformers.js v3 (WASM/WebGPU) | 短段落 15–50 ms；长文整篇 60–180 ms | 英文长文免切片直接分类，极适合做英文多标签反模式分类与 L1 误报复核；短板是原版以英文与代码为主 |
| **`mmBERT`** (`arXiv:2509.06888`) | ModernBERT 多语种演进（3T tokens，覆盖 1,800+ 语种，8k 上下文） | INT8 ONNX 约 **180–350 MB**（视词表与规格） | ONNX Runtime · Transformers.js v3 | 约 30–220 ms/文档 | **中英双语文本反模式分类首选编码器**：原生解决中文与中英混排长上下文，可直接微调为 12–20 类反模式多标签头 |
| **`DeBERTa-v3-base` / `mDeBERTa-v3`** | 86M–278M 编码器（解耦注意力，上限 512 tokens） | INT8 ONNX 约 **90–280 MB** | ONNX Runtime | 滑窗每段 20–80 ms | 句级/段级微调精度成熟稳健，但在长文段落均一与跨段语篇识别上受 512 token 窗口限制 |
| **`Qwen3-0.6B / 1.5B / 4B` 或 `Qwen2.5-1.5B` + LoRA** | 0.6B–4B 解码器 + LoRA（`r=16~32`）或序列分类头 | GGUF `Q4_K_M` 约 **400 MB – 2.5 GB** | `llama.cpp`（Metal/CUDA/AVX2）+ JSON Grammar；WebGPU（0.6B/1.5B） | 0.6B/1.5B 在消费 GPU/Apple Silicon 可达 80–300 tok/s，单段结构化判定约 150–500 ms | 中文语感极强，可同时输出「反模式 ID + 证据片段 + 简短原因」；需配合 GBNF Grammar 强约束输出格式 |
| **`SmolVLM2` (256M / 500M / 2.2B)** | 超轻量视觉语言模型 | INT8/Q4 约 **200 MB – 1.4 GB** | ONNX Runtime / Transformers.js WebGPU / `llama.cpp` | 200–800 ms / 截图（缩放至 `768px`） | 图像 token 极少、内存占用低，适合端侧做「明显塑料感/视觉拥挤/模板风格」快速初筛 |
| **`Qwen2.5-VL-3B` / `Gemma-3 4B`** | 3B–4B 轻量多模态模型 | GGUF `Q4_K_M` 约 **2.0–2.8 GB** | 本地 `llama.cpp` / Ollama | 0.8–2.5 s / 截图（缩放至 `1024px`） | `Qwen2.5-VL-3B` 的 OCR 与空间框理解突出，适合审校中文 PPT 渲染页与复杂 Web UI 截图；`Gemma-3 4B` 适合审美与视觉层级点评 |

#### 浏览器与核心包的零依赖 / 零上传架构红线

`dislop` 官网（`site/`）已将 `Content-Security-Policy` 锁死为 `connect-src 'none'`，且 Node/Python 核心包以**零第三方依赖**为核心卖点。因此模型层必须遵守三条物理隔离约束：

1. **核心包永不引入重依赖**：`dislop` 主包（npm / PyPI）永远保持纯零依赖静态内核；所有小模型能力以独立可选扩展分发（如 `@dislop/ml-local`、`pip install "dislop[ml]"` 或外部本地 `llama-server` 桥接）。
2. **浏览器侧坚持离线与显式加载**：默认清样工作台继续保持 `connect-src 'none'` 零外发；若未来在桌面端或独立实验页提供 WebGPU 小模型推理，须由用户显式选择本地权重文件（File System Access / OPFS 本地缓存），且短输入（`< 128` tokens）自动优先 WASM 避免 WebGPU 着色器冷启动开销，长输入再走 WebGPU。
3. **跨运行时契约一致**：模型层通过统一的局部插件协议（输入：L1 掩码后的分段文本 + L1 初步命中；输出：标准 `Finding` JSON 数组，固定 `tier: "advisory-ml"`、`severity: "info"` 与 `confidence` 字段）接入，避免污染 Node/Python 静态一致性测试套件。

### 2.4 训练/评测数据构造与误杀防护机制

在中文开源实践（如 `lieflat-less-ai-tone` 的对照实验）与学术文献（Bitton et al., `arXiv:2503.01659`；`ForgePrint`, 2026-09）中，小模型检测器最大的失败原因不是召回不够，而是**领域偏移误杀**（把母语非英语者、严谨法律/学术文体、或认真编写的技术文档误判为 AI 味）。数据与防误杀体系必须围绕以下四点设计：

1. **同事实配对语料（Fact-Matched Pairs）**：按「同一组事实提纲 -> 人类专家写作 / 多家主流模型直出 / 一阶词表屏蔽后的二阶改写」三元组构造样本，强制模型学习**表达与结构退化特征**而非主题词相关性。每条正例标注具体反模式 ID（多标签）与证据跨度，避免训练成无解释力的二元「人 vs. AI」黑盒。
2. **困难负样本集（Hard Negative Guard Set）**：专门收集容易触发误报的高质量纯人写语料——经典中文散文与技术文档、学术论文方法节、法律/合同条款、非母语作者的技术博客、合法数字/代码密集段落，并将其作为冻结的误报回归门禁。
3. **高精确率门控与一致性策略**：借鉴 `arXiv:2503.01659` 的多模型一致裁决（Unanimous Jury）思路与分段温度校准（Temperature Scaling）：
   - 规则层高置信度命中直接输出；
   - 小模型新增命中必须超过分文体校准阈值（如目标误报率 `FPR <= 1%`），并附上置信度区间与对应反模式条目链接；
   - 当小模型用于**消解规则层歧义**时（例如确认某句「不是 A，而是 B」是否为真实业务纠偏），允许将规则命中降级为 `info` 并保留审计痕迹，但不允许静默放行 `packs/core` 的 `error` 级客观交付缺陷。
4. **成本与延迟边界**：按「默认全量跑 L0+L1（`< 50 ms`）-> 本地交互编辑或 PR 增量仅对改动段落跑 L2（`< 200 ms`）-> 仅在显式 `--visual` 审稿时对渲染截图跑 L3（`< 2.5 s/页`）」控制开销，保证 CI 与编辑器保存钩子始终无感。

---

## 3. 面向 `dislop` 的功能规划、优化方案与分阶段演进路线

### 3.1 「反模式查询（Anti-Pattern Catalog & Query）」产品与架构设计

当前 `dislop` 仅有 `dislop packs`（看包列表）与 `dislop explain <rule-id>`（已知 ID 查单条），用户和 Agent 无法问出诸如「有哪些中文节奏反模式」「PPT 排版能检查哪些问题」「哪些规则会抓到紫粉渐变或套盒」这类查询。同时，审计 `site/app.js` 与 `src/core.mjs` 时发现一处现存缺口：**SARIF 输出已生成 `helpUri: https://dislop.com/#rule-<id>`，但 `site/` 规则表渲染时未写入 `id="rule-<id>"` 锚点，导致 IDE 点击帮助链接无法直达对应规则**。

围绕「单一事实源、可执行目录、零双份维护」原则，设计四位一体的反模式查询体系：

1. **统一目录模型（`dislop.catalog/1`）**：不另建脱离代码的静态清单，直接由 `packs/*/pack.json` 编译生成可检索目录视图，并向后兼容地为每条规则扩充轻量元数据字段：`category`（自动由 `family` 推导或显式声明）、`languages`（`["en"]` / `["zh"]` / `["en", "zh"]` / `["all"]`）、`tags`（检索别名，如 `["逗号链", "rhythm", "cadence"]`）、`evidenceLevel`（`objective-invariant` / `empirical-corpus` / `editorial-consensus`）与可选 `modelTendencies`（仅作参考说明，不参与硬判断）。
2. **CLI 查询命令（`dislop catalog` / 别名 `dislop search`）**：支持关键词全文检索（命中 `id`、双语 `message`、`deletionTest`、`exemplar` 与 `tags`）与多维过滤（`--pack`、`--category`、`--family`、`--modality`、`--severity`、`--tier`、`--lang`、`--json`、`--format md`）。
3. **MCP 工具扩展（`dislop_catalog`）**：让 Claude Code / Codex / Cursor 在写作或设计审查前，可按媒介和场景主动查询具体反模式条款与 `bad -> trap -> good` 对照（一次仅返回匹配的精简条目，避免把全部禁用词表塞进上下文引发同义词机械替换）。
4. **浏览器清样工作台（`site/#rules`）升级**：
   - 修复 `#rule-<id>` 锚点并在通过 URL hash 访问时自动展开并高亮对应规则行，闭合 SARIF 帮助链接回路；
   - 在现有按 Pack 筛选基础上，增加实时中英搜索框 + 维度/模态/严重级筛选器；
   - 表格支持展开查看完整的 `bad -> trap -> good` 三态对照（当前表格只渲染了 `bad` 和 `good`，漏掉了极具教学价值的 `trap` 二阶陷阱！）及「在上方工作台试运行此样本」一键按钮。

### 3.2 「反模式识别」增量蓝图

结合前述研究与现存 29 条规则版图，优先补齐 **6 条高信噪比确定性探针**（完整数学定义、阈值与 `hit`/`clean` 测试用例见 [v0.3 Spec](../specs/anti-pattern-catalog-and-probes-v0.3.md)）：

| 候选规则 ID | 所属包 | 级别 | 家族 (`family`) | 适用模态 | 检出核心与误报护栏 |
|---|---|---|---|---|---|
| `comma-chain-cadence` | `business-brief` / `literary-essay` | `info` | `rhythm/comma-chain` | `md`, `txt`, `html`, `docx` | 单句逗号 `>= 5` 且满足分语种长分句门槛；剥离千分位数字、括号引用、短格式枚举与链接列表 |
| `sentence-length-monotony` | `literary-essay` / `business-brief` | `info` | `rhythm/monotony` | `md`, `txt`, `html`, `docx` | 有效正文段内句数 `>= 5`、均长过门槛且句长变异系数 `CV < 0.16`；跳过标题/列表/表格/短段 |
| `discourse-marker-cluster` | `business-brief` | `warning` | `rhythm/discourse-signpost` | `md`, `txt`, `html`, `docx` | 连续 3 段及以上或单段 3 句以上堆叠机械过渡路标（`首先/其次/此外/最后`、`Furthermore/Moreover/Additionally`） |
| `ui-glassmorphism-overuse` | `deck-and-ui` | `warning` | `ui/slop-chrome` | `html`, `css`, `jsx` | 单视图出现 `>= 3` 处 `backdrop-blur` / `backdrop-filter: blur(...)`；允许顶栏或弹窗单处合法使用 |
| `ui-accent-stripe-card` | `deck-and-ui` | `warning` | `ui/slop-chrome` | `html`, `css`, `jsx` | 单视图堆叠 `>= 3` 处侧边粗彩条（`border-l-4`/`border-l-8`/`border-left: >=3px solid`）；豁免 `blockquote` |
| `pptx-layout-monotony` | `deck-and-ui` | `info` | `deck/layout-variety` | `pptx` | 内容页 `>= 5` 页的演示文稿中，连续 4 页及以上采用完全相同的版式指纹（同标题+单文本框要点结构且无图表/表格/图片） |

同时，在 `dislop verify` 协同层面，建议将 `rhythm/discourse-signpost` 纳入 `DISPLACEMENT_FAMILIES` 观察集合，防止模型在改写套词时退回机械分点过渡。

### 3.3 分阶段演进路线（P0 / P1 / P2）

与仓内 [ROADMAP.zh-CN.md](../../ROADMAP.zh-CN.md) 的分阶段节奏保持一致，所有演进围绕「Agent 交付物印前检查」主航道展开：

| 阶段 | 定位与周期 | 核心交付项 | 验收与门禁标准 |
|---|---|---|---|
| **P0：立即能上（v0.3.0，1–2 周）** | 零依赖确定性内核增强 + 可执行反模式目录 | 1. 落地 `dislop catalog` CLI、MCP `dislop_catalog` 与 `site/` 规则搜索/筛选/`#rule-<id>` 锚点/`trap` 展示。<br>2. 将经原型验证的 5–6 条节奏与 UI/PPT 确定性探针合入 `src/core.mjs` 与 `src/dislop/engine.py`（补齐双端一致性测试）。<br>3. 同步上架 npm / PyPI 并提供 Claude Code 保存钩子与 GitHub Action 模板。 | `dislop pack-test` 全绿；`tests/test_conformance.py` Node/Python 100% 一致；全仓 `dislop check . --fail-on warning` 与 `docs/` `--fail-on info` 零命中；冻结人写测试集 `core` 误报率 `= 0` |
| **P1：短期优化（v0.4.0，3–6 周）** | 语料校准 + 离线基准 + 渲染态可选扩展 | 1. 建立公开冻结的双语人写/多模型配对基准集（衡量各探针精确率、召回率与 `verify` 事实丢失率）。<br>2. 将 `dislop verify` 升级为支持严格阻断与「可确认事实变更账本（Fact Diff Ledger）」双模式。<br>3. 提供可选渲染态 UI 检查脚本（Playwright 抓取真实计算对比度、三栏均等卡片模板与小屏溢出），作为外部扩展而非核心依赖。 | 公开离线可复算基准脚本一键跑通；每条 `taste` 规则在人写基准集上的误报率公开透明并完成阈值校准 |
| **P2：中后期演进（v0.5+，按外部采用 Gate 触发）** | 开源轻量小模型插件化增量（`@dislop/ml-local` / `dislop[ml]`） | 1. 基于 `mmBERT` / `ModernBERT-base` 微调多标签反模式分类器（INT8 ONNX），承担 L1 歧义复核与隐蔽语篇空洞识别。<br>2. 提供本地 `llama.cpp` 桥接，可选调用 `Qwen3-1.5B/4B + LoRA`（文本证据抽取）与 `Qwen2.5-VL-3B` / `SmolVLM2`（PPT/UI 截图层级与塑料感审校）。<br>3. 保持主包零依赖与官网默认 `connect-src 'none'` 不变。 | 仅在冻结双语评测集上证明相比纯确定性层在 `FPR <= 1%` 约束下 Macro-F1 提升 `>= 8%` 时才正式发布；所有 ML 发现严格限定为 `info` 商榷级 |

### 3.4 本次独立原型实测结果

为在不动核心引擎文件的前提下提前验证架构假设，仓内新增零依赖独立原型脚本 [prototype_antipattern_lab.mjs](../../scripts/prototype_antipattern_lab.mjs)，直接只读加载 `packs/*/pack.json` 与 `src/core.mjs` 掩码工具，并完成了三项本机实测：

1. **反模式目录检索验证**：成功索引全部 4 个 Pack 的 29 条规则，按中文关键词（如 `--query "不是"` 命中 5 条跨包规则）与多维过滤（如 `--category ui-design` 命中 7 条 UI/SVG 规则）均在毫秒级返回准确结果。
2. **新探针正反样本自测（`self-test`）**：覆盖 `comma-chain-cadence`、`sentence-length-monotony`、`discourse-marker-cluster`、`ui-glassmorphism-overuse`、`ui-accent-stripe-card` 共 5 条新探针与目录查询断言（20 项断言全部通过）。首轮实测直接发现了中英文子句长度单位不一致导致的英文漏检问题，随即在原型中升级为中英分语种长度校准并复测通过。
3. **仓内真实文档误报体检（`probe .`）**：对本仓库既有 19 份 Markdown、HTML、CSS、SVG 文档执行全量扫描，总耗时约 **30 ms**，**0 误报**，验证了豁免条件在高质量真实文档上的可用性。
