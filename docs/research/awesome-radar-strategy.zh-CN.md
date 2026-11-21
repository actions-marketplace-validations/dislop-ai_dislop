# 产品战略补充：资源雷达、公开基准与 `dislop` 的务实协同路线

> 关联文档：[anti-slop-landscape-2026.zh-CN.md](./anti-slop-landscape-2026.zh-CN.md) · 实证清单：[anti-slop-resource-radar.md](./anti-slop-resource-radar.md)（快照日期：2026-11-21）

## 核心结论

「信息收集、分类整理与结构化索引本身可以成为开源项目价值的一部分」，但前提是**索引提供的信息增益不能被现有注册中心替代，且维护成本不能反噬核心引擎迭代**。

经 2026-11-21 实测复核，反 AI 味细分 Awesome 目录在 GitHub 上星标普遍偏低（最高跨媒介目录 `shannhk/avoid-slop` 为 203★，多款 `awesome-slop` 仓库不足 30★），这**并非未被发现的流量真空，而是纯链接列表在 `skills.sh` 注册中心与综合技能目录时代冷启动困难的现实基数**。因此，建议**暂不将资源雷达作为 `dislop` 的「第二增长引擎」或仓促另建独立仓**，而是采取「**基准优先（Benchmark-backed Radar）+ 仓内带日期快照 + 量化 Gate 与 8 周熔断**」的克制路线：把 80%–100% 精力集中在核心引擎与可强制分发形态上，用可复算的「改稿事实丢失与二阶漂移离线基准」承接生态话语权。

---

## 1. 头部 `awesome-*` 与注册中心生态的真实机制（逐仓归因）

研究开源知识索引与发现层，必须把「历史成功的 Awesome 目录」放回各自诞生的生态条件中拆解，避免机械类比：

| 代表项目（2026-11-21 星标） | 真实维护机制（核验自仓库源码与文档） | 为什么能起量，以及边界在哪 |
|---|---|---|
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome)（540,121★） | 依靠 [Awesome Manifesto](https://github.com/sindresorhus/awesome/blob/main/awesome.md) 与 [awesome-lint](https://github.com/sindresorhus/awesome-lint)（880★）把关；PR 模板要求申请入榜的子清单至少存活 30 天；因积压过载曾多次暂停接收 PR（同类 `awesome-nodejs` 则明确公告因垃圾与低质投稿暂停 PR） | 建立在早期全领域目录标准之上，护城河是十年积累的品牌与严格人工筛查 |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)（98,334★） | 建于 MCP 协议发布早期，充当新生态的统一服务目录 | 对应的是**新协议平台**上的可安装组件，而非跨工具的抽象写作主题 |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)（145,235★） | 仓内直接沉淀 100+ 可运行的 Agent/RAG 源码示例 | 增长引擎是「可运行代码资产」，不只是外链目录 |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)（58,476★） | 借助结构化数据文件与自动化脚本辅助校验列表健康度 | 锚定单一高热开发宿主（Claude Code）的全部插件生态 |
| [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills)（50,059★）与 [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)（37,396★） | 前者聚合 3,000+ 技能并提供本地发现 CLI/MCP；后者通过直接编辑 `README.md` 维护 1,000+ 技能 | **已经收录了主流 humanizer 与前端去 AI 味技能**，直接分流了细分列表流量 |
| [skills.sh](https://skills.sh/docs) | 公共注册中心 + 安装量榜单 + `npx skills add` 一行安装 | 对开发者而言，按真实安装量排序且能一键安装的注册中心，发现效率远高于静态 Markdown 链接墙 |

### 对「反 AI 味 Awesome 列表」的清醒诊断

截至 2026-11-21，GitHub 上已先后出现至少十个反 AI 味汇总仓，包括跨媒介的 [shannhk/avoid-slop](https://github.com/shannhk/avoid-slop)（203★，覆盖文本、代码、设计）、双语分级的 [zhuyansen/awesome-humanizer-skills](https://github.com/zhuyansen/awesome-humanizer-skills)（12★）以及存在半年的 [hwajongpark/awesome-slop](https://github.com/hwajongpark/awesome-slop)（9★）。它们未能成长为万星枢纽，背后有三个结构性原因：

1. **品类没有独立运行平台**：去 AI 味技能运行在 Claude Code、Cursor、Codex、Oxlint 等既有平台上，自然被平台级目录与 `skills.sh` 收编。
2. **头部极度集中**：少数头部项目已占据绝大部分心智与安装量，多数用户不需要一张 60 行表格来找前三名。
3. **「运动员兼裁判」的中立性损耗**：如果一个工具项目自己办 Awesome 列表，又用自家工具给投稿 PR 把门、按「与自家产品的差异」给竞品贴标签，外部开发者一眼就能看出导流意图，反而损伤可信度。

---

## 2. 信息整理如何真正为 `dislop` 创造不可替代的价值

放弃「纯链接搬运」幻想后，信息整理与分类研究仍能通过三条高信噪比路径反哺 `dislop`——每一条都锚定注册中心没有提供的数据：

### 路径一：做「离线实测基准」，而不是只做「静态链接墙」

`skills.sh` 能统计安装量，GitHub 能统计星标，但**没有任何平台公开测量过主流去 AI 味技能在改稿时「丢了多少数字与限定词、引入了多少二阶口号漂移」**。

`dislop` 具备天然优势去做一份公开、离线、可复算的评测基准（Benchmark-backed Radar）：
- 选取一组固定公开中英文测试文稿（含真实数值、限定词 `最多/up to`、链接与代码片段）；
- 冻结 5 个以上主流改写技能在 2 个以上主流模型上的真实改写输出并入库（保证单测与复算 100% 离线确定性，符合仓库 `AGENTS.md` 红线）；
- 用 `dislop verify` 与人工复核共同统计各方案的「受保护标记丢失率」「语义越界样本」与「二阶口号漂移率」。

这份基准同时完成两件要紧事：对外提供全网稀缺的一手选型依据，自然演示 `dislop verify` 的真实价值；对内先用数据验证「事实损耗在当前前沿模型上究竟有多高频」，防止产品假设建立在直觉之上。

### 路径二：建立「反模式演化语料源」，定向反哺 `packs/`

大模型每隔数月就会演化出新的默认表达与视觉模板（从第一代紫粉渐变、英文高频套词，到第二代暖米白模板、否定转折句与中文「装人味翻车」）。维持一份带日期快照、可机读的生态雷达，可帮助维护者持续追踪高价值实证研究（如 `lieflat-less-ai-tone` 的对照实验与 `sloptrim` 的 ROC-AUC 方法论），将经得起误报检验的规则吸收到 `packs/`，并淘汰误报过高的旧规则。

### 路径三：低门槛社区协作入口（以样本和规则为中心）

非编程背景的编辑、写作者与设计师难以直接修改 `src/core.mjs`，但可以提交经脱敏的真实反模式案例、`bad -> trap -> good` 三段改稿对照，或补充新出现的跨媒介工具与语料研究。把社区协作引导到「规则样本与实测基准」上，比引导到「提交外链 PR」对核心产品质量帮助大得多。

---

## 3. 分阶段量化 Gate 与熔断机制

在当前阶段（公开仓刚起步、v0.2.0 尚待合入发版、尚未上架 npm 与 PyPI），贸然并行维护「双运行时引擎 + 官网 + 独立 Awesome 仓库」会直接稀释工程精力。建议采用硬量化门控（阈值参照同类本地确定性工具的早期增长量级，如 `sloptrim` 428★、`aislop` 769★）：

| 阶段 | 精力配比 | 全部满足方可进入下一阶段的 Gate |
|---|---|---|
| **G0：核心引擎可装且可强制**（当前阶段） | 引擎与分发 100%；本目录仅作为带日期快照冻结 | 1. v0.2.0 完成提交打标且 GitHub Actions 全绿。<br>2. 正式发布到 npm 与 PyPI，摆脱仅靠 `npx github:` 安装。<br>3. 至少上线一种强制介入形态（Claude Code 插件加保存/停止钩子，或即用 GitHub Action）。<br>4. 全部规则在一份冻结的纯人写公开语料上完成误报基线测量，且 `core` 误报为 0。 |
| **G1：发布公开基准与仓内入口** | 引擎 80% / 离线基准 15% / 雷达快照 5% | G0 完成后 8 周内满足：GitHub 代码搜索可核查到 >= 10 个外部仓库引用 `dislop`；收到 >= 5 个来自 >= 3 位外部用户的 Issue 或 PR；完成并发布「改稿事实丢失与二阶漂移离线基准 v1」。达标后才考虑在 `site/` 增加静态 `/radar` 视图并在主仓 README 文末挂接「相关工作」入口。 |
| **G2：独立仓 `dislop-ai/awesome-anti-slop`（可选）** | 雷达投入上限 10%–15% | 仓内雷达在 8 周内收到 >= 10 个来自 >= 5 位外部贡献者的有效 PR；至少 3 个被收录项目主动回链；出现至少 1 位非原作者的共同维护者；周均维护耗时连续 4 周 <= 1 小时。 |

**8 周熔断规则**：若 README 文末入口上线 8 周后，收到的外部雷达 PR 少于 3 个，则立即停止将其扩展为独立目录的计划，将其永久定格为随大版本偶尔更新的「行业生态快照」，全部精力回归核心工具与公开基准。同时注意：`site/` 锁定 `CSP: connect-src 'none'` 且无第三方统计，后续观测仅依赖 GitHub Traffic、包管理器下载量与源站 Nginx 访问日志，不设依赖埋点的指标。

---

## 4. 资源雷达准入与治理草案

若未来跨过 G1 进入持续维护阶段，资源清单须遵守四条中立治理纪律，避免陷入「链接农场」或「既做裁判又做运动员」的信任损耗：

1. 单一事实源与中立 Schema：所有条目唯一维护于 [anti-slop-radar-index.json](./anti-slop-radar-index.json)，Markdown 视图由脚本自动生成，杜绝双份漂移。JSON 本身只记录客观属性（媒介、语种、多值介入阶段、是否含确定性检查、归档状态、上游真实许可证），不包含「相对 `dislop` 优劣」的主观标签；产品定位对比仅留存在调研报告正文。
2. 明确收录与伦理分区：须提供可公开核验的真实 URL（非空壳仓或纯付费黑盒站），以一句中性描述交代核心机制。凡主打「绕过查重」「降 AIGC 检测率」或「去音频水印」的工具，无论星标高低，统一放入「对照观察区」并注明风险，与常规工具严格隔离。
3. 区分「一次性规则」与「废弃软件」的生命周期规则：大量高星 `SKILL.md` 属于相对稳定的规则文档（如 `stop-slop` 已有数月无提交但完全可用），不能机械按「N 个月无提交」一刀切标灰。建议拆成两档：若上游显式 `archived: true` 或连续两次 CI 巡检返回 404/410 则标注归档或下架；对软件/CLI 类工具按默认分支提交时间超过 18 个月标注「维护停滞」，对纯文档技能与经典基准论文则保留「历史基线」标记。
4. 轻量中立的投稿门禁：未来若开放外部 PR，校验脚本只查 JSON Schema、重复链接与 HTTP 可达性，不强制用 `dislop` 自身文体包评判他人项目简介，守住索引的中立公信力。
