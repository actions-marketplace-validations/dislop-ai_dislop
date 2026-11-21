# AGENTS.md

本文件定义 `dislop` 仓库的开发约定、架构边界与质量门禁，适用于人类维护者与 AI 编程助手。

## 1. 核心工程原则

能用词法与句法结构、HTML/CSS/SVG 标记、PDF 对象与链接字典、Office Open XML 结构确定性检出的问题，统一实现为确定性探针（JS 核心 `src/core.mjs` 与 Python 实现 `src/dislop/engine.py`），不把基础体检交给高波动的大模型主观打分。

客观交付事故（路径泄露、未填占位符、AI 对话残迹、死点击控件、对比度与深色层级倒置、幻灯片越界）放入 `packs/core/`，固定为 `error` 并在所有文体包中默认启用；文体与版式审美信号放入各文体 `packs/<pack-id>/`，默认 `warning` 或 `info`，附删除测试与正反改稿对照。

修改文稿后须通过 `dislop verify`（或 MCP `dislop_verify`）核对数值、单位、日期、链接、代码片段与引用标记未丢失或篡改，且未把一阶套话替换成二阶口号句式（如 `不是 A，而是 B` 或三连短句）。浏览器工作台（`site/`）与 Node CLI/MCP（`bin/`）直接共用零依赖 ES 模块 `src/core.mjs`；Python CLI/MCP（`src/dislop/`）须通过 `tests/test_conformance.py` 与 Node 运行时跑同一组公开样本与 `dislop pack-test`。本仓库自身的文档、网站（`site/`）、SVG 资产与 CLI 输出均受 `dislop check . --fail-on warning` 门禁约束。

## 2. 安全与隐私红线

- **零凭据与私密信息入库**：严禁在代码、测试样本、配置或提交记录中写入 API Key、Token、Cookie、本机真实用户目录、内网主机地址或非公开项目材料。本地私有禁止词可写入被 Git 忽略的 `.dislop.local.json`。
- **样本脱敏与版权合规**：纳入 `packs/` 或 `tests/` 的正反例样本须为原创构造或明确允许再分发的公开材料，每条 `exemplar` 记录 `source` 字段，且 `good` 改写稿不得凭空编造原句没有的事实或数值。
- **离线确定性测试**：单测默认离线运行，严禁发起外部网络请求或调用付费模型接口；网站与在线工作台严禁加载第三方字体/统计外链，保持零上传（`connect-src 'none'`）。

## 3. 协作与验收工作流

- 新增或修改规则时，必须在对应 `pack.json` 中提供至少 1 条命中样本（`fixtures.hit`）与 1 条不误报样本（`fixtures.clean`），并运行 `node bin/dislop.mjs pack-test` 与 `PYTHONPATH=src python3 -m unittest discover -s tests` 全部通过。
- 修改 CLI 参数、MCP 工具协议或审美包结构时，同步更新 `README.md`、`README.zh-CN.md`、`docs/architecture.md` 与 `docs/architecture.zh-CN.md`。
