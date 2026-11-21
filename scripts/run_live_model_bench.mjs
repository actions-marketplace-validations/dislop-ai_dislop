#!/usr/bin/env node
// Live multi-model anti-slop benchmark runner for dislop-bench v1.
// Evaluates bare prompts against open-source deterministic + 3rd-order + numeric-fidelity scoring,
// and optionally benchmarks a live dislop-cloud /api/v1/deslop endpoint (DISLOP_CLOUD_URL + DISLOP_CLOUD_TOKEN).
// Keys are injected ONLY via environment variables (never saved to disk, reports, or logs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditText, detectModality, resolveEffectivePack } from "../src/core.mjs";
import { runThirdOrderProbes, summarizeNumericDiff } from "./probes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATASET_PATH = path.join(ROOT, "benchmarks", "datasets", "revision-v1.json");
const RESULTS_DIR = path.join(ROOT, "benchmarks", "results");

function loadPacksById() {
  const packsDir = path.join(ROOT, "packs");
  const out = {};
  for (const entry of fs.readdirSync(packsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const p = path.join(packsDir, entry.name, "pack.json");
    if (fs.existsSync(p)) {
      const m = JSON.parse(fs.readFileSync(p, "utf8"));
      out[m.id] = m;
    }
  }
  return out;
}

const PACKS_BY_ID = loadPacksById();

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
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    envKey: "DISLOP_LLM_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    inputPer1M: 0.3,
    outputPer1M: 2.5,
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
  const pack = resolveEffectivePack(task.pack || "business-brief", PACKS_BY_ID);
  const modality = task.modality || detectModality(task.filename || "draft.md") || "markdown";
  const det = auditText(String(text || ""), { filename: task.filename || "draft.md", modality, pack });
  const findings = det.findings || [];
  const coreErrors = findings.filter((f) => f.severity === "error").length;
  const styleFindings = findings.filter((f) => f.severity !== "error").length;
  const third = runThirdOrderProbes(text, { modality, lang: task.lang });
  const num = summarizeNumericDiff(task.source, text, modality);

  const d1 = Math.max(0, 45 - coreErrors * 28 - styleFindings * 15);
  const d2 = Math.max(0, 30 - third.length * 15);
  const d3 = Math.max(0, Math.min(25, Math.round(num.retentionRate * 25) - num.added.length * 8));
  return {
    d1,
    d2,
    d3,
    composite: d1 + d2 + d3,
    detFindings: findings.length,
    coreErrors,
    thirdOrderHits: third.length,
    numericRetentionRate: num.retentionRate,
    missingNumbers: num.missing.length,
    inventedNumbers: num.added.length,
    allClear: findings.length === 0 && third.length === 0 && num.missing.length === 0 && num.added.length === 0,
  };
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function runBareArm(spec, apiKey, task) {
  const prompt =
    task.lang === "zh"
      ? `请把下面这段内容改干净、去掉 AI 味，保留原意和原有格式，只返回改完后的内容不要加解释：\n\n${task.source}`
      : `Remove AI slop from the following draft while keeping the original meaning and format. Return only the revised content with no commentary:\n\n${task.source}`;

  const t0 = performance.now();
  const resp = await fetch(`${spec.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: spec.id, temperature: 0.25, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const latencyMs = Math.round(performance.now() - t0);
  const raw = String(data?.choices?.[0]?.message?.content || "").trim();
  const cleaned = raw.replace(/^```(?:html|markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return {
    revised: cleaned,
    latencyMs,
    usage: {
      promptTokens: data?.usage?.prompt_tokens || 0,
      completionTokens: data?.usage?.completion_tokens || 0,
    },
  };
}

async function runCloudArm(cloudUrl, token, task) {
  const t0 = performance.now();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(`${cloudUrl.replace(/\/+$/, "")}/api/v1/deslop`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: task.source,
      filename: task.filename,
      modality: task.modality,
      pack: task.pack,
      lang: task.lang,
    }),
  });
  if (!resp.ok) throw new Error(`Cloud HTTP ${resp.status}`);
  const data = await resp.json();
  return {
    revised: data.revised,
    latencyMs: Math.round(performance.now() - t0),
    usage: data.usage || { promptTokens: 0, completionTokens: 0 },
    repaired: Boolean(data.repaired),
  };
}

async function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const textTasks = (dataset.tasks || []).filter((t) => typeof t.source === "string");
  const activeSpecs = MODEL_SPECS.filter((s) => Boolean(process.env[s.envKey]));
  const cloudUrl = process.env.DISLOP_CLOUD_URL || "";

  if (activeSpecs.length === 0 && !cloudUrl) {
    console.error("Set DISLOP_LLM_API_KEY / DASHSCOPE_API_KEY or DISLOP_CLOUD_URL to run live model benchmarks.");
    process.exit(2);
  }

  for (const spec of activeSpecs) {
    const records = [];
    for (const task of textTasks) {
      const b = await runBareArm(spec, process.env[spec.envKey], task);
      records.push({ taskId: task.id, ...b, score: scoreOutput(task, b.revised) });
    }
    const avg = (records.reduce((a, r) => a + r.score.composite, 0) / records.length).toFixed(1);
    const allClear = records.filter((r) => r.score.allClear).length;
    console.log(`${spec.label} bare_prompt: ${avg}/100 (all-clear ${allClear}/${records.length}, median ${median(records.map((r) => r.latencyMs))}ms)`);
  }

  if (cloudUrl) {
    const records = [];
    for (const task of textTasks) {
      const c = await runCloudArm(cloudUrl, process.env.DISLOP_CLOUD_TOKEN || "", task);
      records.push({ taskId: task.id, ...c, score: scoreOutput(task, c.revised) });
    }
    const avg = (records.reduce((a, r) => a + r.score.composite, 0) / records.length).toFixed(1);
    const allClear = records.filter((r) => r.score.allClear).length;
    console.log(`dislop-cloud (${cloudUrl}): ${avg}/100 (all-clear ${allClear}/${records.length}, median ${median(records.map((r) => r.latencyMs))}ms)`);
  }
}

main().catch((err) => {
  console.error("Live benchmark failed:", err.message);
  process.exit(1);
});
