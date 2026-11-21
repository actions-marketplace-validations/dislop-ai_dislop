# AGENTS.md

写给在 `dislop` 仓库里干活的人和 AI 助手：规则放哪一层，字怎么写，哪些线不能踩，改完怎么验收。

## 1. 规则放哪一层

能从词法与句法结构、HTML/CSS/SVG 标记、PDF 对象与链接字典、Office Open XML 结构判定的问题，都写成确定性探针，在 JS 核心 `src/core.mjs` 与 Python 实现 `src/dislop/engine.py` 里各实现一遍。基础体检离线运行，不交给高波动的大模型主观打分。

换谁来看都不能发的交付疏漏，放进 `packs/core/`：本机路径泄露、未填占位符、AI 寒暄残迹、点不动的控件、对比度不足、深色层级倒置、幻灯片越界。这一层固定为 `error`，所有文体包默认开启。因文体而异的表达与版式提醒，放进各自的 `packs/<pack-id>/`，默认 `warning` 或 `info`，每条写清删掉会损失什么，并附原句、改过头与改好三段对照。

改完稿必须过 `dislop verify`（或 MCP `dislop_verify`）：数值、限定词、单位、日期、链接、代码片段与引用标记不能丢，也不能凭空编造；一阶套话不能换成二阶口号句式（如 `不是 A，而是 B` 或三连短句）。

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
- **离线确定性测试**：单测默认离线运行，严禁发起外部网络请求或调用付费模型接口；网站与在线工作台严禁加载第三方字体或统计外链，保持零上传（`connect-src 'none'`）。

## 4. 交付前跑什么

- 新增或修改规则时，在对应 `pack.json` 补至少 1 条命中样本（`fixtures.hit`）与 1 条易误报干净样本（`fixtures.clean`），并跑通 `node bin/dislop.mjs pack-test`、`PYTHONPATH=src python3 -m dislop.cli pack-test`、`node tests/test_site.mjs` 与 `PYTHONPATH=src python3 -m unittest discover -s tests`。
- 修改 CLI 参数、MCP 工具协议或规则包结构时，同步更新 `README.md`、`README.zh-CN.md`、`docs/architecture.md` 与 `docs/architecture.zh-CN.md`。
