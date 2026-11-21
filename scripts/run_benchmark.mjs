#!/usr/bin/env node
// Zero-dependency offline anti-slop benchmark runner & external-model evaluator (dislop-bench v1).
//
// Usage:
//   node scripts/run_benchmark.mjs
//   node scripts/run_benchmark.mjs --assert
//   node scripts/run_benchmark.mjs --write-report
//   node scripts/run_benchmark.mjs --eval path/to/run.json
//   node scripts/run_benchmark.mjs --export-blind-sheet naive_humanizer dislop_clean --out benchmarks/results
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditOoxmlEntries, auditText, resolveEffectivePack } from "../src/core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BENCH_DIR = path.join(ROOT, "benchmarks");
const DATASETS_DIR = path.join(BENCH_DIR, "datasets");
const RESULTS_DIR = path.join(BENCH_DIR, "results");

// ---------- Load Packs ----------

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

// ---------- Audit Helpers (Node + Python Parity) ----------

function runNodeAudit(sample) {
  const pack = resolveEffectivePack(sample.pack || "business-brief", PACKS_BY_ID);
  if (sample.modality === "pptx" || sample.modality === "docx") {
    return auditOoxmlEntries(sample.ooxml || {}, {
      filename: sample.filename || `sample.${sample.modality}`,
      modality: sample.modality,
      pack,
    });
  }
  return auditText(String(sample.text || ""), {
    filename: sample.filename || "sample.md",
    modality: sample.modality || "markdown",
    pack,
  });
}

function runPythonBatchAudit(samples) {
  const pyCode = `
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path("src").resolve()))
from dislop.engine import audit_text, audit_ooxml_entries, load_all_packs, resolve_effective_pack

packs = load_all_packs(Path("packs"))
samples = json.loads(sys.stdin.read())
out = {}
for s in samples:
    pack = resolve_effective_pack(s.get("pack", "business-brief"), packs)
    mod = s.get("modality", "markdown")
    if mod in ("pptx", "docx"):
        res = audit_ooxml_entries(s.get("ooxml") or {}, filename=s.get("filename", f"sample.{mod}"), modality=mod, pack=pack)
    else:
        res = audit_text(s.get("text") or "", filename=s.get("filename", "sample.md"), modality=mod, pack=pack)
    out[s["id"]] = sorted(f["ruleId"] for f in res.get("findings", []))
print(json.dumps(out))
`;
  const proc = spawnSync("python3", ["-c", pyCode], {
    cwd: ROOT,
    input: JSON.stringify(samples),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    return { ok: false, error: (proc.stderr || proc.stdout || "python3 failed").trim() };
  }
  try {
    return { ok: true, results: JSON.parse(proc.stdout) };
  } catch (err) {
    return { ok: false, error: `Invalid JSON from python3: ${err.message}` };
  }
}

// ---------- 3rd-Order Structural Probes (Beyond Core 25 Rules) ----------

function extractPlainTextForScoring(payload, modality) {
  if (modality === "pptx" || modality === "docx") {
    const map = payload && typeof payload === "object" ? payload : {};
    const chunks = [];
    for (const [k, xml] of Object.entries(map)) {
      if (!/^ppt\/slides\/slide\d+\.xml$/i.test(k) && k !== "word/document.xml") continue;
      for (const m of String(xml).matchAll(/<(?:a|w):t\b[^>]*>([\s\S]*?)<\/(?:a|w):t>/g)) {
        chunks.push(m[1]);
      }
    }
    return chunks.join(" ");
  }
  return String(payload || "");
}

export function runThirdOrderProbes(payload, { modality = "markdown", lang = "zh" } = {}) {
  const hits = [];
  const raw = extractPlainTextForScoring(payload, modality);

  if (modality === "html" || modality === "css" || modality === "jsx" || modality === "tsx") {
    if (/backdrop-blur(?:-[a-z0-9]+)?/i.test(raw) && /(?:bg-white\/|bg-slate-\d+\/|rgba\()/i.test(raw)) {
      hits.push({ probeId: "struct-ui-glassmorphism", detail: "Translucent glassmorphism card chrome" });
    }
    if (/\bborder-l-[48]\b|border-left:\s*[4-9]px/i.test(raw)) {
      hits.push({ probeId: "struct-ui-accent-stripe", detail: "Thick left accent-stripe card template" });
    }
    return hits;
  }

  // 1. 3-part balanced semicolon pitch (ZH & EN)
  const zhSemiParts = raw.split(/[。！？\n]/).some((s) => (s.match(/；/g) || []).length >= 2);
  const enSemiParts = raw.split(/[.!?\n]/).some((s) => (s.match(/;/g) || []).length >= 2);
  if (zhSemiParts || enSemiParts) {
    hits.push({ probeId: "struct-semicolon-tricolon", detail: "3-part balanced semicolon pitch sentence" });
  }

  // 2. Pull-quote / slogan closer ("笔一直在你手里", "the pen stays in your hand", "这才是...真正的...")
  if (
    /(?:笔一直在你手里|这才是[^。！？\n]{2,18}真正的[^。！？\n]{1,10}|the pen stays in your hand|built for the future|quality ships\.)/i.test(
      raw
    )
  ) {
    hits.push({ probeId: "struct-pull-quote-closer", detail: "Pull-quote / slogan closing punchline" });
  }

  // 3. Comma-chain cadence (5+ commas inside a single sentence)
  const sentences = raw.split(/[。！？.!?\n]+/).filter((s) => s.trim().length > 0);
  if (sentences.some((s) => (s.match(/[，,]/g) || []).length >= 5)) {
    hits.push({ probeId: "struct-comma-chain", detail: "Sentence with 5+ comma-chained clauses" });
  }

  // 4. Discourse-marker cluster (3+ stock transitions in a short draft)
  const markers =
    lang === "zh"
      ? raw.match(/(?:此外|与此同时|不仅如此|总而言之|综上所述|换言之|进一步来看)/g) || []
      : raw.match(/\b(?:Furthermore|Moreover|Additionally|Consequently|In conclusion|Notably)\b/gi) || [];
  if (markers.length >= 3) {
    hits.push({ probeId: "struct-discourse-cluster", detail: `High transition-marker cluster (${markers.length})` });
  }

  return hits;
}

// ---------- Key-Token & Numeric Retention (Benchmark-Only Metric) ----------

function extractKeyNumbers(text) {
  const cleaned = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:from|via|to|p|px|py|mt|mb|rounded|border|slate|indigo|purple|pink|gray|zinc)-\d+(?:\/\d+)?\b/gi, " ");
  const nums = [];
  for (const m of cleaned.matchAll(/\b\d+(?:[.,]\d+)?%?\b/g)) {
    nums.push(m[0].replace(/,/g, ""));
  }
  return nums;
}

function measureNumericRetention(sourcePayload, candPayload, modality) {
  const srcText = extractPlainTextForScoring(sourcePayload, modality);
  const candText = extractPlainTextForScoring(candPayload, modality);
  const srcNums = Array.from(new Set(extractKeyNumbers(srcText)));
  const candNums = Array.from(new Set(extractKeyNumbers(candText)));

  if (srcNums.length === 0) {
    return {
      sourceCount: 0,
      retainedCount: 0,
      retentionRate: 1,
      inventedCount: candNums.length,
      missing: [],
      invented: candNums,
    };
  }

  const candSet = new Set(candNums);
  const srcSet = new Set(srcNums);
  const missing = srcNums.filter((n) => !candSet.has(n));
  const invented = candNums.filter((n) => !srcSet.has(n));
  const retainedCount = srcNums.length - missing.length;
  return {
    sourceCount: srcNums.length,
    retainedCount,
    retentionRate: retainedCount / srcNums.length,
    inventedCount: invented.length,
    missing,
    invented,
  };
}

// ---------- Suite A: Detection Benchmark ----------

function runDetectionSuite() {
  const dataset = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, "detection-v1.json"), "utf8"));
  const samples = dataset.samples || [];
  const pyBatch = runPythonBatchAudit(samples);

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let parityMatches = 0;
  let expectedRulesTotal = 0;
  let expectedRulesHit = 0;

  const byDomain = {};
  const byCategory = {};
  const details = [];

  for (const s of samples) {
    const res = runNodeAudit(s);
    const findings = res.findings || [];
    const nodeRuleIds = findings.map((f) => f.ruleId).sort();
    const predictedSlop = findings.length > 0;
    const isPos = s.expected === "slop";

    if (isPos && predictedSlop) tp += 1;
    else if (!isPos && predictedSlop) fp += 1;
    else if (!isPos && !predictedSlop) tn += 1;
    else fn += 1;

    const pyRuleIds = pyBatch.ok ? pyBatch.results[s.id] || [] : null;
    const parityOk = pyBatch.ok ? JSON.stringify(nodeRuleIds) === JSON.stringify(pyRuleIds) : false;
    if (parityOk) parityMatches += 1;

    for (const reqRule of s.expectedRuleIds || []) {
      expectedRulesTotal += 1;
      if (nodeRuleIds.includes(reqRule)) expectedRulesHit += 1;
    }

    if (!byDomain[s.domain]) byDomain[s.domain] = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
    byDomain[s.domain].total += 1;
    if (isPos && predictedSlop) byDomain[s.domain].tp += 1;
    else if (!isPos && predictedSlop) byDomain[s.domain].fp += 1;
    else if (!isPos && !predictedSlop) byDomain[s.domain].tn += 1;
    else byDomain[s.domain].fn += 1;

    if (!byCategory[s.category]) byCategory[s.category] = { hit: 0, total: 0 };
    byCategory[s.category].total += 1;
    if (predictedSlop) byCategory[s.category].hit += 1;

    details.push({
      id: s.id,
      domain: s.domain,
      expected: s.expected,
      category: s.category,
      predicted: predictedSlop ? "slop" : "clean",
      correct: predictedSlop === isPos,
      nodeRuleIds,
      pyRuleIds,
      parityOk,
    });
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const cleanFpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  const nearMiss = byCategory["clean-nearmiss"] || { hit: 0, total: 0 };
  const nearMissFpr = nearMiss.total > 0 ? nearMiss.hit / nearMiss.total : 0;
  const secondOrder = byCategory["2nd-order"] || { hit: 0, total: 0 };
  const secondOrderRecall = secondOrder.total > 0 ? secondOrder.hit / secondOrder.total : 1;

  return {
    schema: dataset.schema,
    totalSamples: samples.length,
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1,
    cleanFpr,
    nearMissFpr,
    secondOrderRecall,
    expectedRuleHitRate: expectedRulesTotal > 0 ? expectedRulesHit / expectedRulesTotal : 1,
    pythonAvailable: pyBatch.ok,
    pythonError: pyBatch.ok ? null : pyBatch.error,
    parityRate: samples.length > 0 ? parityMatches / samples.length : 0,
    byDomain,
    byCategory,
    details,
  };
}

// ---------- Suite B / C: End-to-End De-Slop Effectiveness Evaluator ----------

function scoreCandidate(task, candidatePayload) {
  const sampleObj =
    task.modality === "pptx" || task.modality === "docx"
      ? { pack: task.pack, modality: task.modality, filename: task.filename, ooxml: candidatePayload }
      : { pack: task.pack, modality: task.modality, filename: task.filename, text: candidatePayload };

  const res = runNodeAudit(sampleObj);
  const findings = res.findings || [];
  const coreErrors = findings.filter((f) => f.severity === "error").length;
  const styleFindings = findings.length - coreErrors;

  const thirdOrderHits = runThirdOrderProbes(candidatePayload, {
    modality: task.modality,
    lang: task.lang,
  });

  const numMetrics = measureNumericRetention(task.source, candidatePayload, task.modality);

  // Dimension scores (0-100 total):
  //   D1 Deterministic Slop Clearance: 45 pts
  //   D2 3rd-Order Structural Hygiene: 30 pts
  //   D3 Key-Token / Numeric Retention (zero hallucination): 25 pts
  const d1 = Math.max(0, 45 - coreErrors * 28 - styleFindings * 15);
  const d2 = Math.max(0, 30 - thirdOrderHits.length * 15);
  const d3 = Math.max(0, Math.min(25, Math.round(numMetrics.retentionRate * 25) - numMetrics.inventedCount * 8));
  const composite = d1 + d2 + d3;

  return {
    taskId: task.id,
    domain: task.domain,
    coreErrors,
    styleFindings,
    totalDetFindings: findings.length,
    detRuleIds: findings.map((f) => f.ruleId),
    thirdOrderCount: thirdOrderHits.length,
    thirdOrderProbes: thirdOrderHits.map((h) => h.probeId),
    numericRetentionRate: numMetrics.retentionRate,
    inventedNumbers: numMetrics.inventedCount,
    scores: { d1, d2, d3, composite },
    cleanAllClear: findings.length === 0 && thirdOrderHits.length === 0 && numMetrics.retentionRate === 1 && numMetrics.inventedCount === 0,
  };
}

function runRevisionSuite(externalArmsByName = null) {
  const dataset = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, "revision-v1.json"), "utf8"));
  const tasks = dataset.tasks || [];

  const armNames = externalArmsByName ? Object.keys(externalArmsByName) : ["raw_ai", "naive_humanizer", "dislop_clean"];
  const armsSummary = {};

  for (const arm of armNames) {
    const taskScores = [];
    for (const task of tasks) {
      const payload = externalArmsByName ? externalArmsByName[arm]?.[task.id] : task.arms?.[arm];
      if (payload === undefined) continue;
      taskScores.push(scoreCandidate(task, payload));
    }
    const n = taskScores.length || 1;
    const avg = (fn) => taskScores.reduce((acc, x) => acc + fn(x), 0) / n;
    armsSummary[arm] = {
      evaluatedTasks: taskScores.length,
      avgComposite: Number(avg((x) => x.scores.composite).toFixed(1)),
      avgD1DetClearance: Number(avg((x) => x.scores.d1).toFixed(1)),
      avgD2ThirdOrder: Number(avg((x) => x.scores.d2).toFixed(1)),
      avgD3Retention: Number(avg((x) => x.scores.d3).toFixed(1)),
      totalDetFindings: taskScores.reduce((a, x) => a + x.totalDetFindings, 0),
      totalCoreErrors: taskScores.reduce((a, x) => a + x.coreErrors, 0),
      totalThirdOrderHits: taskScores.reduce((a, x) => a + x.thirdOrderCount, 0),
      avgNumericRetention: Number((avg((x) => x.numericRetentionRate) * 100).toFixed(1)),
      totalInventedNumbers: taskScores.reduce((a, x) => a + x.inventedNumbers, 0),
      allClearTasks: taskScores.filter((x) => x.cleanAllClear).length,
      tasks: taskScores,
    };
  }

  return {
    schema: dataset.schema,
    totalTasks: tasks.length,
    arms: armsSummary,
  };
}

// ---------- Blind A/B Human Review Sheet Generator ----------

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function exportBlindSheet(armA, armB, { inputPath = null, outDir = RESULTS_DIR, seed = 42 } = {}) {
  const dataset = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, "revision-v1.json"), "utf8"));
  const external = inputPath ? JSON.parse(fs.readFileSync(inputPath, "utf8")).arms : null;
  const rand = seededRandom(seed);
  const key = { schema: "dislop.blind-key/1", seed, armA, armB, mapping: {} };
  const lines = [
    "# dislop Blind A/B Human Evaluation Sheet",
    "",
    "Score each pair without knowing which method generated Response A or Response B.",
    "",
    "Rubric (1–5 per dimension): Naturalness, Information Density, Restraint (no pitchy tone or template chrome), Fact Fidelity, and Overall Preference (`A` / `B` / `Tie`).",
    "",
  ];

  for (const task of dataset.tasks) {
    const valA = external ? external[armA]?.[task.id] : task.arms?.[armA];
    const valB = external ? external[armB]?.[task.id] : task.arms?.[armB];
    if (valA === undefined || valB === undefined) continue;
    const swap = rand() >= 0.5;
    const shownA = swap ? valB : valA;
    const shownB = swap ? valA : valB;
    key.mapping[task.id] = { A: swap ? armB : armA, B: swap ? armA : armB };

    const fmt = (v) => (typeof v === "string" ? v : extractPlainTextForScoring(v, task.modality));
    lines.push(`## ${task.id} (\`${task.domain}\`, \`${task.modality}\`)`);
    lines.push("", "### Original Draft", "```text", fmt(task.source), "```");
    lines.push("", "### Response A", "```text", fmt(shownA), "```");
    lines.push("", "### Response B", "```text", fmt(shownB), "```");
    lines.push(
      "",
      "- Naturalness (1–5): A = ___ · B = ___",
      "- Fact Fidelity (1–5): A = ___ · B = ___",
      "- Preferred: `[ ] A` · `[ ] B` · `[ ] Tie`",
      ""
    );
  }

  fs.mkdirSync(outDir, { recursive: true });
  const sheetPath = path.join(outDir, "blind-sheet.md");
  const keyPath = path.join(outDir, "blind-key.json");
  fs.writeFileSync(sheetPath, lines.join("\n"), "utf8");
  fs.writeFileSync(keyPath, JSON.stringify(key, null, 2) + "\n", "utf8");
  return { sheetPath, keyPath, pairCount: Object.keys(key.mapping).length };
}

// ---------- Markdown Report Formatter ----------

function pct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

function buildMarkdownReport(det, rev) {
  const domainRows = Object.entries(det.byDomain)
    .map(([domain, d]) => {
      const p = d.tp + d.fp > 0 ? d.tp / (d.tp + d.fp) : 1;
      const r = d.tp + d.fn > 0 ? d.tp / (d.tp + d.fn) : 1;
      const fpr = d.fp + d.tn > 0 ? d.fp / (d.fp + d.tn) : 0;
      return `| \`${domain}\` | ${d.total} | ${d.tp} | ${d.fp} | ${d.tn} | ${d.fn} | ${pct(p)} | ${pct(r)} | ${pct(fpr)} |`;
    })
    .join("\n");

  const armRows = Object.entries(rev.arms)
    .map(
      ([arm, s]) =>
        `| \`${arm}\` | **${s.avgComposite} / 100** | ${s.avgD1DetClearance} / 45 | ${s.avgD2ThirdOrder} / 30 | ${s.avgD3Retention} / 25 | ${s.totalDetFindings} | ${s.totalThirdOrderHits} | ${s.avgNumericRetention}% (${s.totalInventedNumbers} invented) | ${s.allClearTasks} / ${s.evaluatedTasks} |`
    )
    .join("\n");

  return `# dislop Anti-Slop Benchmark Report (\`dislop-bench v1\`)

Generated offline by \`node scripts/run_benchmark.mjs --write-report\`. Zero external APIs or network calls were used.

## 1. Suite A — Detection Benchmark (${det.totalSamples} Samples)

Measures precision, recall, false-positive rate (including adversarial clean near-misses), 2nd-order AI slogan trap catch rate, and Node.js vs. Python exact parity across 6 writing and design domains.

| Metric | Measured Result |
|---|---|
| Precision | **${pct(det.precision)}** (${det.tp} TP / ${det.fp} FP) |
| Recall | **${pct(det.recall)}** (${det.tp} TP / ${det.fn} FN) |
| F1 Score | **${pct(det.f1)}** |
| Clean False-Positive Rate (FPR) | **${pct(det.cleanFpr)}** (${det.fp} / ${det.fp + det.tn}) |
| Adversarial Near-Miss FPR | **${pct(det.nearMissFpr)}** |
| 2nd-Order Trap Recall | **${pct(det.secondOrderRecall)}** |
| Expected Rule-ID Recall | **${pct(det.expectedRuleHitRate)}** |
| Node.js vs. Python Parity | **${pct(det.parityRate)}** (${det.pythonAvailable ? "verified live" : `skipped: ${det.pythonError}`}) |

### Breakdown by Domain

| Domain | Samples | TP | FP | TN | FN | Precision | Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${domainRows}

## 2. Suite B — End-to-End De-Slop Effectiveness (${rev.totalTasks} Tasks × 3 Arms)

Evaluates real writing and design outputs across 3 orthogonal dimensions:

- **D1 Deterministic Clearance (45 pts)**: Zero \`packs/core\` AI artifacts and zero 1st-/2nd-order \`dislop\` findings.
- **D2 3rd-Order Structural Hygiene (30 pts)**: Zero 3-part balanced semicolon pitches, pull-quote closers, 5-comma chains, transition clusters, glassmorphism walls, or accent-stripe card templates.
- **D3 Key-Number Retention & Zero Hallucination (25 pts)**: Keeps concrete source numbers intact without dropping metrics or inventing unverified figures.

| Arm | Composite | D1 Det | D2 3rd-Order | D3 Retention | Det Findings | 3rd-Order Hits | Numeric Retention | All-Clear Tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${armRows}

## 3. How to Benchmark Your Own Model, Prompt, or Backend

1. Run your model or backend (\`No Skill\` vs. \`dislop Skill\` vs. \`server/ LLM API\`) on the 12 source inputs in [datasets/revision-v1.json](./datasets/revision-v1.json).
2. Save outputs as \`schema: "dislop.bench-run/1"\` and score them locally:
   \`\`\`bash
   node scripts/run_benchmark.mjs --eval path/to/run.json
   \`\`\`
3. Export a randomized blind human A/B review sheet for any two arms:
   \`\`\`bash
   node scripts/run_benchmark.mjs --export-blind-sheet naive_humanizer dislop_clean
   \`\`\`
`;
}

// ---------- CLI Entry ----------

function main() {
  const args = process.argv.slice(2);
  const doAssert = args.includes("--assert");
  const doWriteReport = args.includes("--write-report");
  const evalIdx = args.indexOf("--eval");
  const blindIdx = args.indexOf("--export-blind-sheet");

  if (blindIdx !== -1) {
    const armA = args[blindIdx + 1];
    const armB = args[blindIdx + 2];
    if (!armA || !armB) {
      console.error("Usage: node scripts/run_benchmark.mjs --export-blind-sheet <armA> <armB> [--input run.json] [--out dir]");
      process.exit(2);
    }
    const inputIdx = args.indexOf("--input");
    const outIdx = args.indexOf("--out");
    const out = exportBlindSheet(armA, armB, {
      inputPath: inputIdx !== -1 ? args[inputIdx + 1] : null,
      outDir: outIdx !== -1 ? args[outIdx + 1] : RESULTS_DIR,
    });
    console.log(`Exported blind A/B sheet (${out.pairCount} pairs): ${out.sheetPath} (key: ${out.keyPath})`);
    return;
  }

  if (evalIdx !== -1) {
    const evalPath = args[evalIdx + 1];
    if (!evalPath || !fs.existsSync(evalPath)) {
      console.error("Missing or unreadable --eval JSON file.");
      process.exit(2);
    }
    const runData = JSON.parse(fs.readFileSync(evalPath, "utf8"));
    const rev = runRevisionSuite(runData.arms || {});
    console.log(JSON.stringify({ label: runData.label || path.basename(evalPath), ...rev }, null, 2));
    return;
  }

  const det = runDetectionSuite();
  const rev = runRevisionSuite();

  console.log(
    `[Suite A — Detection (${det.totalSamples} samples)] ` +
      `P=${pct(det.precision)} R=${pct(det.recall)} F1=${pct(det.f1)} ` +
      `CleanFPR=${pct(det.cleanFpr)} NearMissFPR=${pct(det.nearMissFpr)} ` +
      `2ndOrderR=${pct(det.secondOrderRecall)} RuleR=${pct(det.expectedRuleHitRate)} ` +
      `Node/PyParity=${pct(det.parityRate)}`
  );
  for (const [arm, s] of Object.entries(rev.arms)) {
    console.log(
      `[Suite B — ${arm.padEnd(16)}] Composite=${String(s.avgComposite).padStart(5)}/100 ` +
        `(D1=${s.avgD1DetClearance}/45, D2=${s.avgD2ThirdOrder}/30, D3=${s.avgD3Retention}/25) ` +
        `detFindings=${s.totalDetFindings} 3rdOrder=${s.totalThirdOrderHits} ` +
        `numRet=${s.avgNumericRetention}% invented=${s.totalInventedNumbers} allClear=${s.allClearTasks}/${s.evaluatedTasks}`
    );
  }

  if (doWriteReport) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(BENCH_DIR, "REPORT.md"), buildMarkdownReport(det, rev), "utf8");
    fs.writeFileSync(
      path.join(RESULTS_DIR, "latest.json"),
      JSON.stringify({ schema: "dislop.bench-report/1", detection: det, revision: rev }, null, 2) + "\n",
      "utf8"
    );
    console.log("Wrote benchmarks/REPORT.md and benchmarks/results/latest.json");
  }

  if (doAssert) {
    const failures = [];
    if (det.precision < 0.95) failures.push(`Precision ${pct(det.precision)} < 95%`);
    if (det.recall < 0.95) failures.push(`Recall ${pct(det.recall)} < 95%`);
    if (det.f1 < 0.95) failures.push(`F1 ${pct(det.f1)} < 95%`);
    if (det.cleanFpr > 0.05) failures.push(`Clean FPR ${pct(det.cleanFpr)} > 5%`);
    if (det.nearMissFpr > 0) failures.push(`Adversarial Near-Miss FPR ${pct(det.nearMissFpr)} > 0%`);
    if (det.secondOrderRecall < 1) failures.push(`2nd-Order Trap Recall ${pct(det.secondOrderRecall)} < 100%`);
    if (det.expectedRuleHitRate < 0.95) failures.push(`Expected Rule Recall ${pct(det.expectedRuleHitRate)} < 95%`);
    if (!det.pythonAvailable || det.parityRate < 1) {
      failures.push(`Node/Python Parity ${pct(det.parityRate)} < 100% (${det.pythonError || "mismatch"})`);
    }
    const rawScore = rev.arms.raw_ai?.avgComposite ?? 0;
    const naiveScore = rev.arms.naive_humanizer?.avgComposite ?? 0;
    const cleanScore = rev.arms.dislop_clean?.avgComposite ?? 0;
    if (cleanScore < 95) failures.push(`dislop_clean composite ${cleanScore} < 95`);
    if (cleanScore - naiveScore < 25) failures.push(`dislop_clean (${cleanScore}) - naive_humanizer (${naiveScore}) < 25`);
    if (cleanScore - rawScore < 35) failures.push(`dislop_clean (${cleanScore}) - raw_ai (${rawScore}) < 35`);

    if (failures.length > 0) {
      console.error("Benchmark regression assertions failed:");
      for (const f of failures) console.error(" -", f);
      for (const d of det.details.filter((x) => !x.correct || !x.parityOk)) {
        console.error("   sample:", JSON.stringify(d));
      }
      process.exit(1);
    }
    console.log("dislop bench-assert: ok (all detection, parity, and revision quality gates passed)");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
