# AGENTS.md

写给在 `dislop` 仓库里干活的人和 AI 助手：规则放哪一层，字怎么写，哪些线不能踩，改完怎么验收。

## 1. 规则放哪一层

`dislop` 只做跟**去 AI 味**直接相关的确定性检查，不做通用的 WCAG 无障碍审计、PDF 预检、安全路径扫描或改稿事实比对。能从词法与句法结构、HTML/CSS/JSX 标记、Word/PPT Open XML 结构判定的 AI 味与残留问题，都写成确定性探针，在 JS 核心 `src/core.mjs` 与 Python 实现 `src/dislop/engine.py` 里各实现一遍，离线运行，不交给高波动的大模型主观打分。

明显的 AI 交付残留放进 `packs/core/`：留在正文里的 AI 寒暄、未填占位符、贴进 Word/PPT 没渲染的裸 Markdown、AI 网页里的空链接与占位禁用按钮。这一层固定为 `error`，所有文体包默认开启。因场景而异的 AI 套话与模板味放进各自的 `packs/<pack-id>/`，默认 `warning` 或 `info`，每条写清删掉会损失什么，并附原句、换了种 AI 味的改过头版本，以及改干净版本三段对照。

三个运行时要给出同一个结果。浏览器工作台（`site/`）与 Node CLI/MCP（`bin/`）共用零依赖 ES 模块 `src/core.mjs`；Python CLI/MCP（`src/dislop/`）须通过 `tests/test_conformance.py`，与 Node 跑同一组公开样本与 `dislop pack-test`。仓库自身的文档、网站（`site/`）、`awesome/`、SVG 资产与 CLI 输出均受 `dislop check . --fail-on warning` 约束。

## 2. 写给人看的字

`0 findings` 只说明没踩中规则，不代表文字不像 AI 写的。访客读得到的字（README、官网、`/awesome/`、CLI 提示、发布说明、仓库与组织简介），动笔前先读 [docs/brand-and-voice-guide.zh-CN.md](./docs/brand-and-voice-guide.zh-CN.md)，按朴实、轻松、直接的开发者口吻写（参考 80% 简化技术表达），守住七条：

1. 第一句落在具体的东西上：一段原文、一个文件、一个数字或一条命令，不说空话。
2. 不写三段对称分号推销句，不写段尾“金句”收尾（如 `笔一直在你手里`），不穿校对编辑戏服（如 `可以付印`、`页边问你一句`、`蓝笔商榷`、`同路清单`）。
3. 同一个概念全站叫同一个普通名字（`硬伤` / `提醒` / `通过` / `没通过` / `工具清单`），不为了显得有变化来回换词。
4. 内部叫法不出门。`Level 0`、`L0–L3`、`Stage-3`、`双引擎`、`负向防线`、`正向牵引`、`三带熵`、`人机双读`、`单一事实源`、`P0/P1` 只留在 `docs/research/`，对外换成用户自己会说的话。
5. 同一屏里，同一个数字只说一次，不反复念经。
6. 小标题是一句人话。不加编号眉题（`00 / ...`），不拿全大写等宽标签当标题。
7. 中英文各写各的，严格不混排：中文界面与例句不夹英文样本，英文页面与清单不夹中文说明。

## 3. 安全、样本与隐私红线

- **零凭据与私密信息入库**：严禁在代码、测试样本、配置或提交记录中写入 API Key、Token、Cookie、本机真实用户目录、内网主机地址或非公开项目材料。本机专用禁词放在 Git 忽略的 `.dislop.local.json`。
- **样本脱敏与不编造事实**：纳入 `packs/` 或 `tests/` 的正反例样本须为原创构造或明确允许再分发的公开材料，每条 `exemplar` 记录 `source` 字段，且 `good` 改写稿不得凭空编造原句没有的事实或数值。
- **离线确定性测试**：单测默认离线运行，严禁发起外部网络请求或调用付费模型接口；网站严禁加载第三方字体、统计脚本或外域请求（`connect-src 'self'`），离线检查保持默认零上传，仅在用户主动点击云端 AI 按钮时发往同源付费模型端点。

## 4. 交付与发版前跑什么

- 新增或修改规则时，在对应 `pack.json` 补至少 1 条命中样本（`fixtures.hit`）与 1 条易误报干净样本（`fixtures.clean`），并跑通 `npm run release:check`（自动串联清单同源校验、开源脱敏扫描、官网构建、双端 `pack-test`、27 项跨端单测、全仓去 AI 味自查与打包校验）。
- 修改 CLI 参数、MCP 工具协议或规则包结构时，同步更新 `README.md`、`README.zh-CN.md`、`docs/architecture.md` 与 `docs/architecture.zh-CN.md`。
- 发新版本、打 Tag 或向各插件市场推送更新时，统一执行 `npm run release -- <X.Y.Z> ...`，各平台硬限制与上线顺序见 [docs/releasing.zh-CN.md](./docs/releasing.zh-CN.md)。

## 5. GitHub 协作约定

- **开干前先查 Issue 与 Discussions**：认领较大轨道或改动规则前，先核对 GitHub 开放 Issue、里程碑与 Discussions 结论，避免重复劳动；开新 PR 时在正文用 `Closes #<编号>` 关联对应 Issue。
- **分支与 `main` 护栏**：非微调改动建议拉短分支（`feat/...`、`fix/...`、`docs/...`）提 PR（`.github/CODEOWNERS` 自动分配评审，合并后自动删分支）；`main` 禁强推与删分支，保留快进推送以配合自动发版脚本。
- **公开与私有讨论严格分离**：商业计费、配额策略、运营台账与本机私密资料只放私有仓 `dislop-cloud` 或本地忽略目录，严禁写入公开仓 Issue、PR、Discussions 或提交说明。
