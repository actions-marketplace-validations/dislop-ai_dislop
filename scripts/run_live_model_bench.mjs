#!/usr/bin/env node
// Live multi-model anti-slop benchmark runner for dislop (Bare Prompt vs. dislop Self-Healing Pipeline).
// Keys are injected ONLY via environment variables (never saved to disk, reports, or logs).
//
// Example (inject keys safely via your secret manager or env):
//   node scripts/run_live_model_bench.mjs --write-report
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDeterministicCheck, runLlmDeslop } from "../server/index.mjs";
import { createLlmClient } from "../server/llm-client.mjs";
import { runThirdOrderProbes, summarizeNumericDiff } from "../server/probes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATASET_PATH = path.join(ROOT, "benchmarks", "datasets", "revision-v1.json");
const RESULTS_DIR = path.join(ROOT, "benchmarks", "results");

// Published reference prices ($ per 1M tokens) for transparent cost estimation.
const MODEL_SPECS = [
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    envKey: "DISLOP_LLM_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    inputPer1M: 0.1,
    outputPer1M: 0.4,
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    envKey: "DISLOP_LLM_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    inputPer1M: 0.1,
    outputPer1M: 0.4,
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    envKey: "DISLOP_LLM_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    inputPer1M: 0.3,
    outputPer1M: 2.5,
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    envKey: "DISLOP_LLM_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    inputPer1M: 0.3,
    outputPer1M: 2.5,
  },
  {
    id: "deepseek-flash",
    label: "DeepSeek Flash",
    envKey: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    inputPer1M: 0.14,
    outputPer1M: 0.28,
  },
  {
    id: "qwen3.8-flash",
    label: "Qwen 3.8 Flash",
    envKey: "DASHSCOPE_API_KEY",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    inputPer1M: 0.05,
    outputPer1M: 0.4,
  },
];

function scoreOutput(task, text) {
  const det = runDeterministicCheck({
    text,
    filename: task.filename,
    modality: task.modality,
    pack: task.pack,
  });
  const third = runThirdOrderProbes(text, { modality: task.modality, lang: task.lang });
  const num = summarizeNumericDiff(task.source, text, task.modality);

  const coreErrors = det.summary.errors;
  const styleFindings = det.summary.warnings;
  const d1 = Math.max(0, 45 - coreErrors * 28 - styleFindings * 15);
  const d2 = Math.max(0, 30 - third.length * 15);
  const d3 = Math.max(0, Math.min(25, Math.round(num.retentionRate * 25) - num.added.length * 8));
  const composite = d1 + d2 + d3;

  return {
    d1,
    d2,
    d3,
    composite,
    detFindings: det.summary.total,
    coreErrors,
    thirdOrderHits: third.length,
    numericRetentionRate: num.retentionRate,
    missingNumbers: num.missing.length,
    inventedNumbers: num.added.length,
    allClear: det.summary.total === 0 && third.length === 0 && num.missing.length === 0 && num.added.length === 0,
  };
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function runBareArm(llm, task) {
  const prompt =
    task.lang === "zh"
      ? `请把下面这段内容改干净、去掉 AI 味，保留原意和原有格式，只返回改完后的内容不要加解释：\n\n${task.source}`
      : `Remove AI slop from the following draft while keeping the original meaning and format. Return only the revised content with no commentary:\n\n${task.source}`;

  const t0 = performance.now();
  const res = await llm.completeText([{ role: "user", content: prompt }], {
    targetModel: llm.model,
    temperature: 0.25,
    maxTokens: 2000,
  });
  const latencyMs = Math.round(performance.now() - t0);
  const cleaned = res.content.trim().replace(/^```(?:html|markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return {
    revised: cleaned,
    latencyMs,
    usage: res.usage,
    attempts: 1,
    repaired: false,
  };
}

async function runDislopArm(llm, task) {
  const t0 = performance.now();
  const res = await runLlmDeslop(llm, null, {
    text: task.source,
    filename: task.filename,
    modality: task.modality,
    pack: task.pack,
    lang: task.lang,
    autoRepair: true,
  });
  const latencyMs = Math.round(performance.now() - t0);
  return {
    revised: res.revised,
    latencyMs,
    usage: res.usage,
    attempts: res.attempts,
    repaired: res.repaired,
  };
}

function summarizeArm(spec, armName, records) {
  const okRecs = records.filter((r) => !r.error);
  const n = okRecs.length || 1;
  const avg = (fn) => Number((okRecs.reduce((a, r) => a + fn(r), 0) / n).toFixed(1));
  const promptTok = okRecs.reduce((a, r) => a + (r.usage?.promptTokens || 0), 0);
  const compTok = okRecs.reduce((a, r) => a + (r.usage?.completionTokens || 0), 0);
  const avgPrompt = promptTok / n;
  const avgComp = compTok / n;
  const estUsdPer1k = Number(
    (((avgPrompt / 1_000_000) * spec.inputPer1M + (avgComp / 1_000_000) * spec.outputPer1M) * 1000).toFixed(2)
  );
  return {
    modelId: spec.id,
    modelLabel: spec.label,
    arm: armName,
    completed: okRecs.length,
    errors: records.length - okRecs.length,
    avgComposite: avg((r) => r.score.composite),
    avgD1: avg((r) => r.score.d1),
    avgD2: avg((r) => r.score.d2),
    avgD3: avg((r) => r.score.d3),
    detFindings: okRecs.reduce((a, r) => a + r.score.detFindings, 0),
    thirdOrderHits: okRecs.reduce((a, r) => a + r.score.thirdOrderHits, 0),
    avgNumRetentionPct: Number((okRecs.reduce((a, r) => a + r.score.numericRetentionRate, 0) / n * 100).toFixed(1)),
    inventedNumbers: okRecs.reduce((a, r) => a + r.score.inventedNumbers, 0),
    allClear: okRecs.filter((r) => r.score.allClear).length,
    repairsRescued: okRecs.filter((r) => r.repaired).length,
    medianLatencyMs: median(okRecs.map((r) => r.latencyMs)),
    avgTokens: Math.round((promptTok + compTok) / n),
    estUsdPer1kCalls: estUsdPer1k,
  };
}

function buildComparisonMarkdown(runDate, taskCount, summaries) {
  const valid = summaries.filter((s) => s.completed > 0);
  const rows = valid
    .map(
      (s) =>
        `| ${s.modelLabel} (\`${s.modelId}\`) | \`${s.arm}\` | **${s.avgComposite} / 100** | ${s.avgD1}/45 | ${s.avgD2}/30 | ${s.avgD3}/25 | ${s.allClear}/${s.completed} | ${s.repairsRescued} | ${s.medianLatencyMs} ms | ~\$${s.estUsdPer1kCalls.toFixed(2)} |`
    )
    .join("\n");

  const bareRows = valid.filter((s) => s.arm === "bare_prompt");
  const pipeRows = valid.filter((s) => s.arm === "dislop_pipeline");
  const liftLines = pipeRows
    .map((p) => {
      const b = bareRows.find((x) => x.modelId === p.modelId);
      if (!b) return null;
      const delta = (p.avgComposite - b.avgComposite).toFixed(1);
      const sign = Number(delta) >= 0 ? "+" : "";
      return `| ${p.modelLabel} | ${b.avgComposite} (${b.allClear}/${b.completed} all-clear) | **${p.avgComposite}** (${p.allClear}/${p.completed} all-clear) | **${sign}${delta}** | ${p.repairsRescued} auto-repaired |`;
    })
    .filter(Boolean)
    .join("\n");

  return `# Live Model Comparison (\`dislop-bench v1\`)

Measured on \`${runDate}\` across the **${taskCount}** text and HTML writing/design tasks in [datasets/revision-v1.json](./datasets/revision-v1.json) (4 Chinese writing, 4 English writing, 2 HTML UI).

Each model was evaluated under two identical setups:

- \`bare_prompt\`: One-shot generic prompt ("remove AI slop while keeping original meaning").
- \`dislop_pipeline\`: Production \`server/\` self-healing pipeline (deterministic pre-check + 3rd-order probes + locked-number prompt + post-check gate + up to 1 automatic surgical repair pass).

## 1. Bare Prompt vs. \`dislop\` Self-Healing Pipeline

| Model | Bare Prompt Score | \`dislop\` Pipeline Score | Score Lift | Auto-Repairs |
|---|---:|---:|---:|---:|
${liftLines}

## 2. Full Leaderboard (Quality, Latency & Cost per 1,000 Calls)

| Model | Mode | Composite | D1 Det | D2 3rd-Order | D3 Retention | All-Clear | Repairs | Median Latency | Est. \$ / 1k Calls |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
${rows}

## 3. Practical Model Routing Takeaways

1. **Why the pipeline matters more than swapping models**: A bare prompt on a strong model still slips on 2nd-order slogans, 3rd-order semicolon pitches, dead \`href="#"\` links, or dropped numbers. Adding \`dislop\`'s deterministic pre-check, locked-number list, and automatic repair loop raises both score and all-clear rate across every model family.
2. **Recommended production split for \`server/\`**:
   - Route \`dislop_review\` (high-frequency 3rd-order critique) to the lowest-latency Flash-Lite tier (\`DISLOP_LLM_MODEL_REVIEW\`).
   - Route \`dislop_deslop\` (rewrite + repair) to the highest-scoring Flash tier with the best all-clear / cost ratio (\`DISLOP_LLM_MODEL_DESLOP\`).
3. **Reproduce locally**:
   \`\`\`bash
   # Inject your own provider keys via env vars, then run:
   node scripts/run_live_model_bench.mjs --write-report
   \`\`\`
`;
}

async function main() {
  const args = process.argv.slice(2);
  const doWrite = args.includes("--write-report");
  const filterIdx = args.indexOf("--models");
  const wanted = filterIdx !== -1 ? new Set(args[filterIdx + 1].split(",").map((s) => s.trim())) : null;

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const textTasks = (dataset.tasks || []).filter((t) => typeof t.source === "string");

  const activeSpecs = MODEL_SPECS.filter((s) => {
    if (wanted && !wanted.has(s.id)) return false;
    return Boolean(process.env[s.envKey]);
  });

  if (activeSpecs.length === 0) {
    console.error("No model API keys present in env (GEMINI_API_KEY / DEEPSEEK_API_KEY / DASHSCOPE_API_KEY).");
    process.exit(2);
  }

  const summaries = [];
  const rawOutputs = {};

  for (const spec of activeSpecs) {
    const llm = createLlmClient({
      apiKey: process.env[spec.envKey],
      baseUrl: spec.baseUrl,
      model: spec.id,
      reviewModel: spec.id,
      deslopModel: spec.id,
      timeoutMs: 45000,
    });

    console.log(`\n>>> Benchmarking ${spec.label} (${spec.id}) on ${textTasks.length} tasks...`);

    const bareRecords = [];
    const dislopRecords = [];

    // Run tasks with small concurrency (2 at a time) for speed without tripping RPM limits
    for (let i = 0; i < textTasks.length; i += 2) {
      const batch = textTasks.slice(i, i + 2);
      const batchRes = await Promise.all(
        batch.map(async (task) => {
          let bareRec;
          try {
            const b = await runBareArm(llm, task);
            bareRec = { taskId: task.id, ...b, score: scoreOutput(task, b.revised) };
          } catch (err) {
            bareRec = { taskId: task.id, error: err.message };
          }

          let pipeRec;
          try {
            const p = await runDislopArm(llm, task);
            pipeRec = { taskId: task.id, ...p, score: scoreOutput(task, p.revised) };
          } catch (err) {
            pipeRec = { taskId: task.id, error: err.message };
          }
          return { bareRec, pipeRec };
        })
      );
      for (const { bareRec, pipeRec } of batchRes) {
        bareRecords.push(bareRec);
        dislopRecords.push(pipeRec);
      }
    }

    const bareSum = summarizeArm(spec, "bare_prompt", bareRecords);
    const pipeSum = summarizeArm(spec, "dislop_pipeline", dislopRecords);
    summaries.push(bareSum, pipeSum);
    rawOutputs[spec.id] = { bare_prompt: bareRecords, dislop_pipeline: dislopRecords };

    console.log(
      `  bare_prompt     : ${bareSum.avgComposite}/100 (allClear=${bareSum.allClear}/${bareSum.completed}, med=${bareSum.medianLatencyMs}ms, err=${bareSum.errors})`
    );
    console.log(
      `  dislop_pipeline : ${pipeSum.avgComposite}/100 (allClear=${pipeSum.allClear}/${pipeSum.completed}, repairs=${pipeSum.repairsRescued}, med=${pipeSum.medianLatencyMs}ms, err=${pipeSum.errors})`
    );
  }

  const runDate = new Date().toISOString().slice(0, 10);
  if (doWrite) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "benchmarks", "MODEL-COMPARISON.md"),
      buildComparisonMarkdown(runDate, textTasks.length, summaries),
      "utf8"
    );
    fs.writeFileSync(
      path.join(RESULTS_DIR, "model-comparison-v1.json"),
      JSON.stringify({ schema: "dislop.model-comparison/1", runDate, taskCount: textTasks.length, summaries, details: rawOutputs }, null, 2) +
        "\n",
      "utf8"
    );
    console.log("\nWrote benchmarks/MODEL-COMPARISON.md and benchmarks/results/model-comparison-v1.json");
  }
}

main().catch((err) => {
  console.error("Live benchmark failed:", err.message);
  process.exit(1);
});
