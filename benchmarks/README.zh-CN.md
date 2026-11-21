# dislop 去 AI 味效果测试基准（`dislop-bench v1`）

[English](./README.md) · [离线基线报告](./REPORT.md) · [5 模型真实在线对比](./MODEL-COMPARISON.md)

这套基准用来回答两个硬问题，不靠主观感觉：

1. **检查准不准**：在 48 份真实多语种样本上，误报率是不是接近 0%，一阶套话和二阶 AI 口号能不能稳稳抓出来，Node.js 与 Python 两个引擎结果是不是 100% 一致。
2. **改完有没有真去 AI 味**：把同一批 12 个文案与设计任务分别交给「模型原稿」「普通改写（换词/改口号）」和「按 dislop 规矩改写」，同时考核确定性清零、三阶结构味（如三段分号推销句、段尾金句、毛玻璃卡片）和关键数字保真率。

所有测试样本均为原创构造，按 `CC0-1.0` 公开，零网络依赖、零付费接口，任何人在断网环境下都能复现。

## 一键离线运行

```bash
# 运行全部 48 份检测样本 + 12 组改稿任务（含 Node/Python 一致性核验）
node scripts/run_benchmark.mjs

# 在 CI 或改规则前做回归门禁（掉分直接退出码 1）
node scripts/run_benchmark.mjs --assert

# 重新生成 benchmarks/REPORT.md 与 benchmarks/results/latest.json
node scripts/run_benchmark.mjs --write-report
```

## 评测你自己的模型、Prompt、Skill 或后台

把任意模型（例如 `无 Skill` vs `装 dislop Skill` vs `server/ 大模型后台`）对 [datasets/revision-v1.json](./datasets/revision-v1.json) 中 12 份 `source` 的输出保存为 `dislop.bench-run/1` JSON：

```json
{
  "schema": "dislop.bench-run/1",
  "label": "model-ab-test",
  "arms": {
    "baseline_no_skill": {
      "rev-zh-01-launch-note": "..."
    },
    "with_dislop_skill": {
      "rev-zh-01-launch-note": "..."
    }
  }
}
```

运行离线打分与生成盲评表：

```bash
# 输出各实验组的 0-100 综合分、确定性命中、三阶结构味与数字保真率
node scripts/run_benchmark.mjs --eval path/to/run.json

# 生成随机打乱顺序的 A/B 人工盲评表（blind-sheet.md）和独立答案映射（blind-key.json）
node scripts/run_benchmark.mjs --export-blind-sheet baseline_no_skill with_dislop_skill --input path/to/run.json
```

## 目录结构

- `datasets/detection-v1.json`：48 份跨媒介检测样本（中文工作文档、中文随笔、英文技术文档、英文随笔、HTML/CSS 界面、PPTX 幻灯片，含易误报干净样本与二阶口号陷阱）。
- `datasets/revision-v1.json`：12 组端到端文案与设计去 AI 味对照任务（3 组基线 × 12 题 = 36 份输出）。
- `REPORT.md`：由脚本自动生成的实测成绩单。
- `results/latest.json`：完整机器可读评分结果。
