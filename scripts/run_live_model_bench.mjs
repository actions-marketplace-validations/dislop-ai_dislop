#!/usr/bin/env node
/**
 * Unified live model benchmark runner for dislop-bench v2 (`dislop.live-bench/1`).
 * Works against API providers (Gemini / DashScope), local/Colab Ollama, and dislop-cloud staging.
 * Keys are read ONLY from environment variables and never saved to disk or logs.
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENGINE_VERSION,
  auditText,
  detectModality,
  resolveEffectivePack,
  verifyRevision,
} from "../src/core.mjs";
import { scoreRevision } from "./run_benchmark.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CANDIDATES_PATH = path.join(ROOT, "benchmarks", "models", "candidates.json");
const DEFAULT_DATASETS = [
  path.join(ROOT, "benchmarks", "datasets", "revision-v1.json"),
  path.join(ROOT, "benchmarks", "datasets", "revision-hard-v2.json"),
];

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

export function parseBenchArgs(argv) {
  const opts = {
    models: [],
    arms: ["bare", "fact_locked"],
    datasets: [],
    repeats: 1,
    concurrency: 2,
    maxUsd: 5.0,
    dryRun: false,
    out: null,
    cloudUrl: process.env.DISLOP_CLOUD_URL || "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--models" && argv[i + 1]) {
      opts.models.push(...argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
    } else if (a === "--arms" && argv[i + 1]) {
      opts.arms = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--dataset" && argv[i + 1]) {
      opts.datasets.push(path.resolve(process.cwd(), argv[++i]));
    } else if (a === "--repeats" && argv[i + 1]) {
      opts.repeats = Math.max(1, Number(argv[++i]) || 1);
    } else if (a === "--concurrency" && argv[i + 1]) {
      opts.concurrency = Math.max(1, Math.min(8, Number(argv[++i]) || 2));
    } else if (a === "--max-usd" && argv[i + 1]) {
      opts.maxUsd = Math.max(0.01, Number(argv[++i]) || 5.0);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = path.resolve(process.cwd(), argv[++i]);
    } else if (a === "--cloud-url" && argv[i + 1]) {
      opts.cloudUrl = argv[++i];
    }
  }
  if (opts.datasets.length === 0) opts.datasets = [...DEFAULT_DATASETS];
  return opts;
}

export function stripModelOutput(raw) {
  let s = String(raw || "").trim();
  const thinkEnd = s.lastIndexOf("</think>");
  if (thinkEnd !== -1) s = s.slice(thinkEnd + 8).trim();
  s = s.replace(/^```(?:html|markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return s;
}

export function assertLiveNetworkAllowed() {
  if (process.env.DISLOP_TEST_MODE === "1" || process.env.NODE_TEST_CONTEXT) {
    throw new Error("Live benchmark network calls are blocked in test mode (DISLOP_TEST_MODE=1).");
  }
}

export function loadTasks(datasetPaths) {
  const tasks = [];
  const hashes = {};
  for (const dsPath of datasetPaths) {
    const raw = fs.readFileSync(dsPath, "utf8");
    hashes[path.basename(dsPath)] = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
    const parsed = JSON.parse(raw);
    for (const t of parsed.tasks || []) {
      if (typeof t.source === "string") tasks.push(t);
    }
  }
  return { tasks, hashes };
}

function resolveApiKey(spec) {
  for (const envName of spec.envKeys || []) {
    if (process.env[envName]) return process.env[envName];
  }
  return spec.provider === "ollama" ? "ollama" : "";
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function estimateUsd(spec, usage) {
  const pin = spec.pricing?.inputPer1M || 0;
  const pout = spec.pricing?.outputPer1M || 0;
  return ((usage.promptTokens || 0) * pin + (usage.completionTokens || 0) * pout) / 1_000_000;
}

async function callChatCompletion(spec, apiKey, prompt) {
  assertLiveNetworkAllowed();
  const url = `${spec.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const t0 = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          model: spec.id,
          temperature: 0.2,
          max_tokens: spec.thinking ? 4096 : 2200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const bodyText = await resp.text();
      if ((resp.status === 429 || resp.status === 503) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 800 + Math.floor(Math.random() * 600)));
        continue;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${bodyText.slice(0, 140)}`);
      }
      const data = JSON.parse(bodyText);
      const choice = data?.choices?.[0];
      return {
        text: stripModelOutput(choice?.message?.content || ""),
        finishReason: choice?.finish_reason || "stop",
        latencyMs: Math.round(performance.now() - t0),
        usage: {
          promptTokens: Number(data?.usage?.prompt_tokens || 0),
          completionTokens: Number(data?.usage?.completion_tokens || 0),
        },
      };
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error("Chat completion failed");
}

function buildBarePrompt(task) {
  return task.lang === "zh"
    ? `请把下面这段内容改干净、去掉 AI 味，保留原意和原有格式，只返回改完后的内容不要加解释：\n\n${task.source}`
    : `Remove AI slop from the following draft while keeping the original meaning and format. Return only the revised content with no commentary:\n\n${task.source}`;
}

function buildFactLockedPrompt(task, findings) {
  const hints = findings.slice(0, 8).map((f) => `${f.ruleId}: ${f.match}`).join(", ") || "none";
  return task.lang === "zh"
    ? `请改写下面文稿去掉 AI 套话与开头寒暄，禁止使用“不是…而是…”、三段分号排比或段尾说教。必须原样保留全部数字、单位与边界词（最多/至少/不超过/约）。命中问题：${hints}。只输出改写正文：\n\n${task.source}`
    : `Rewrite to remove AI slop and throat-clearing openers. Do not use 'Not X, but Y' pivots, semicolon tricolons, or slogan closers. Preserve every number, unit, and qualifier (up to, at least, more than). Issues: ${hints}. Return only the revised text:\n\n${task.source}`;
}

async function runSingleArm(spec, apiKey, arm, task) {
  if (arm === "bare") {
    const r = await callChatCompletion(spec, apiKey, buildBarePrompt(task));
    const scored = scoreRevision(task, r.text);
    const fact = verifyRevision(task.source, r.text, { modality: task.modality || "markdown" });
    return { ...r, score: scored.scores, allClear: scored.cleanAllClear && fact.ok, factOk: fact.ok, repaired: false };
  }

  const modality = task.modality || detectModality(task.filename || "draft.md") || "markdown";
  const pack = resolveEffectivePack(task.pack || "business-brief", PACKS_BY_ID);
  const pre = auditText(task.source, { filename: task.filename || "draft.md", modality, pack });

  const pass1 = await callChatCompletion(spec, apiKey, buildFactLockedPrompt(task, pre.findings || []));
  const sc1 = scoreRevision(task, pass1.text);
  const fact1 = verifyRevision(task.source, pass1.text, { modality });
  if (sc1.cleanAllClear && fact1.ok && pass1.finishReason !== "length") {
    return { ...pass1, score: sc1.scores, allClear: true, factOk: true, repaired: false };
  }

  const errNotes = [
    ...sc1.detRuleIds,
    ...sc1.thirdOrderProbes,
    ...(fact1.issues || []),
  ].join("; ");
  const repairPrompt =
    `Fix these remaining issues while keeping every original number and qualifier exact (${errNotes || "clarity"}).\n` +
    `Original:\n${task.source}\n\nCurrent draft:\n${pass1.text}\n\nReturn only the fixed text:`;
  const pass2 = await callChatCompletion(spec, apiKey, repairPrompt);
  const sc2 = scoreRevision(task, pass2.text);
  const fact2 = verifyRevision(task.source, pass2.text, { modality });
  const totalUsage = {
    promptTokens: pass1.usage.promptTokens + pass2.usage.promptTokens,
    completionTokens: pass1.usage.completionTokens + pass2.usage.completionTokens,
  };
  const totalMs = pass1.latencyMs + pass2.latencyMs;

  let chosenText = pass2.text;
  let chosenScore = sc2;
  let chosenFact = fact2;
  if (!fact2.ok && fact1.ok) {
    chosenText = pass1.text;
    chosenScore = sc1;
    chosenFact = fact1;
  } else if (!fact2.ok) {
    chosenText = task.source;
    chosenScore = scoreRevision(task, task.source);
    chosenFact = { ok: true, issues: [] };
  }

  return {
    text: chosenText,
    finishReason: pass2.finishReason,
    latencyMs: totalMs,
    usage: totalUsage,
    score: chosenScore.scores,
    allClear: chosenScore.cleanAllClear && chosenFact.ok,
    factOk: chosenFact.ok,
    repaired: true,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseBenchArgs(argv);
  const registry = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
  const { tasks, hashes } = loadTasks(opts.datasets);

  let selected = registry.candidates || [];
  if (opts.models.length > 0) {
    const wanted = new Set(opts.models);
    selected = selected.filter((c) => wanted.has(c.id));
  } else if (!opts.dryRun) {
    selected = selected.filter((c) => c.provider !== "ollama" && Boolean(resolveApiKey(c)));
  }

  const gitSha = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim() || "unknown";

  if (opts.dryRun) {
    const plan = {
      schema: "dislop.live-bench/1",
      dryRun: true,
      gitSha,
      engineVersion: ENGINE_VERSION,
      datasetHashes: hashes,
      taskCount: tasks.length,
      arms: opts.arms,
      repeats: opts.repeats,
      maxUsd: opts.maxUsd,
      models: selected.map((c) => ({
        id: c.id,
        provider: c.provider,
        hasKey: Boolean(resolveApiKey(c)),
        plannedCalls: tasks.length * opts.arms.filter((a) => a !== "cloud").length * opts.repeats,
      })),
    };
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  if (selected.length === 0 && !opts.cloudUrl) {
    console.error("No runnable candidates selected or missing API key env vars (set --models or API keys, or pass --dry-run).");
    process.exit(2);
  }

  let spentUsd = 0;
  const results = [];

  for (const spec of selected) {
    const apiKey = resolveApiKey(spec);
    if (!apiKey && spec.provider !== "ollama") continue;
    for (const arm of opts.arms) {
      if (arm === "cloud") continue;
      const records = [];
      for (let rep = 0; rep < opts.repeats; rep += 1) {
        for (const task of tasks) {
          if (spentUsd >= opts.maxUsd) {
            throw new Error(`Budget cap reached ($${spentUsd.toFixed(4)} >= $${opts.maxUsd})`);
          }
          try {
            const out = await runSingleArm(spec, apiKey, arm, task);
            spentUsd += estimateUsd(spec, out.usage);
            records.push({ taskId: task.id, repeat: rep + 1, ok: true, ...out });
          } catch (err) {
            records.push({ taskId: task.id, repeat: rep + 1, ok: false, error: err.message, score: { composite: 0 }, latencyMs: 0, allClear: false });
          }
        }
      }
      const avg = records.reduce((a, r) => a + (r.score?.composite || 0), 0) / Math.max(1, records.length);
      const ac = records.filter((r) => r.allClear).length;
      const medMs = median(records.map((r) => r.latencyMs));
      const truncated = records.filter((r) => r.finishReason === "length").length;
      console.log(`${spec.label} [${arm}]: ${avg.toFixed(1)}/100 (all-clear ${ac}/${records.length}, truncated=${truncated}, median=${medMs}ms)`);
      results.push({ model: spec.id, arm, avgScore: Number(avg.toFixed(1)), allClear: ac, total: records.length, truncated, medianMs: medMs, records });
    }
  }

  const payload = {
    schema: "dislop.live-bench/1",
    dryRun: false,
    gitSha,
    engineVersion: ENGINE_VERSION,
    datasetHashes: hashes,
    spentUsd: Number(spentUsd.toFixed(5)),
    results,
  };
  if (opts.out) {
    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, JSON.stringify(payload, null, 2) + "\n", "utf8");
  }
  return payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Live benchmark failed:", err.message);
    process.exit(1);
  });
}
