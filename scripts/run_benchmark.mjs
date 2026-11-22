#!/usr/bin/env node
// Zero-dependency offline anti-slop benchmark runner & external-model evaluator (dislop-bench v2).
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
import { analyzeTextProfile, auditOoxmlEntries, auditText, resolveEffectivePack } from "../src/core.mjs";
import { runThirdOrderProbes as sharedRunThirdOrderProbes } from "./probes.mjs";

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
from dislop.engine import analyze_text_profile, audit_text, audit_ooxml_entries, load_all_packs, resolve_effective_pack

packs = load_all_packs(Path("packs"))
samples = json.loads(sys.stdin.read())
out = {}
for s in samples:
    pack = resolve_effective_pack(s.get("pack", "business-brief"), packs)
    mod = s.get("modality", "markdown")
    if mod in ("pptx", "docx"):
        res = audit_ooxml_entries(s.get("ooxml") or {}, filename=s.get("filename", f"sample.{mod}"), modality=mod, pack=pack)
        prof = None
    else:
        res = audit_text(s.get("text") or "", filename=s.get("filename", "sample.md"), modality=mod, pack=pack)
        prof = analyze_text_profile(s.get("text") or "", modality=mod) if mod in ("markdown", "text") else None
    out[s["id"]] = {"rules": sorted(f["ruleId"] for f in res.get("findings", [])), "profile": prof}
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

// ---------- 3rd-Order Structural Probes (Beyond Pack Rules) ----------

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

export function runThirdOrderProbes(payload, opts = {}) {
  return sharedRunThirdOrderProbes(payload, opts);
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
  const holdoutPath = path.join(DATASETS_DIR, "holdout-v1.json");
  const holdoutSamples = fs.existsSync(holdoutPath)
    ? JSON.parse(fs.readFileSync(holdoutPath, "utf8")).samples || []
    : [];
  const textHardPath = path.join(DATASETS_DIR, "text-hard-v2.json");
  const textHardSamples = fs.existsSync(textHardPath)
    ? JSON.parse(fs.readFileSync(textHardPath, "utf8")).samples || []
    : [];
  const samples = [...(dataset.samples || []), ...holdoutSamples, ...textHardSamples];
  const pyBatch = runPythonBatchAudit(samples);

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let parityMatches = 0;
  let profileParityMatches = 0;
  let profileComparableCount = 0;
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

    const pyEntry = pyBatch.ok ? pyBatch.results[s.id] || null : null;
    const pyRuleIds = pyEntry ? pyEntry.rules : null;
    const parityOk = pyBatch.ok ? JSON.stringify(nodeRuleIds) === JSON.stringify(pyRuleIds) : false;
    if (parityOk) parityMatches += 1;

    const mod = s.modality || "markdown";
    if (mod === "markdown" || mod === "text") {
      profileComparableCount += 1;
      const nodeProfile = analyzeTextProfile(String(s.text || ""), { modality: mod });
      if (pyEntry && JSON.stringify(nodeProfile) === JSON.stringify(pyEntry.profile)) {
        profileParityMatches += 1;
      }
    }

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
  const nearMissA = byCategory["clean-nearmiss"] || { hit: 0, total: 0 };
  const nearMissB = byCategory["near-miss"] || { hit: 0, total: 0 };
  const nearMissTotal = nearMissA.total + nearMissB.total;
  const nearMissFpr = nearMissTotal > 0 ? (nearMissA.hit + nearMissB.hit) / nearMissTotal : 0;
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
    profileParityRate: profileComparableCount > 0 ? profileParityMatches / profileComparableCount : 1,
    byDomain,
    byCategory,
    details,
  };
}

// ---------- Suite B / C: End-to-End De-Slop Effectiveness Evaluator ----------

function countNonNumericContentUnits(text) {
  const s = String(text || "").replace(/<[^>]+>/g, " ");
  const cjk = (s.match(/[\u4e00-\u9fff]/gu) || []).length;
  const words = (s.match(/[A-Za-z]{2,}/g) || []).length;
  return cjk + words;
}

function loadAllRevisionTasks() {
  const dataset = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, "revision-v1.json"), "utf8"));
  const hardRevPath = path.join(DATASETS_DIR, "revision-hard-v2.json");
  const hardTasks = fs.existsSync(hardRevPath)
    ? JSON.parse(fs.readFileSync(hardRevPath, "utf8")).tasks || []
    : [];
  return [...(dataset.tasks || []), ...hardTasks];
}

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

  const isTextModality = task.modality === "markdown" || task.modality === "text";
  const profile = isTextModality ? analyzeTextProfile(String(candidatePayload || ""), { modality: task.modality }) : null;

  // Guard against degenerate "numbers-only" deletions (e.g., dumping "14:12 14:38 3 502...")
  let degenerateProse = false;
  if (isTextModality) {
    const srcContent = countNonNumericContentUnits(task.source);
    const candContent = countNonNumericContentUnits(candidatePayload);
    const minRequired = Math.min(12, Math.max(4, Math.floor(srcContent * 0.25)));
    if (candContent < minRequired || (profile && profile.sentenceCount === 0)) {
      degenerateProse = true;
    }
  }

  // Dimension scores (0-100 total, 4 orthogonal dimensions in dislop-bench v2):
  //   D1 Deterministic Multi-Angle Clearance: 45 pts
  //   D2 3rd-Order Structural Hygiene: 20 pts
  //   D3 Key-Token / Numeric Retention + Non-Degenerate Prose: 25 pts
  //   D4 Pure Statistical Rhythm & Concreteness Telemetry: 10 pts (decoupled from D1 rule counts)
  const d1 = Math.max(0, 45 - coreErrors * 28 - styleFindings * 14);
  const d2 = Math.max(0, 20 - thirdOrderHits.length * 10);
  let d3 = Math.max(0, Math.min(25, Math.round(numMetrics.retentionRate * 25) - numMetrics.inventedCount * 8));
  if (degenerateProse) {
    d3 = Math.min(d3, 5);
  }
  let d4 = 10;
  if (degenerateProse) {
    d4 = 0;
  } else if (profile) {
    if (profile.sentenceCount >= 5 && profile.burstiness.status === "flat") d4 -= 5;
    if (profile.structure.lowBurstinessVapor) d4 -= 5;
    if (profile.sentenceCount >= 3 && profile.concreteness.anchorCount === 0) d4 -= 4;
    d4 = Math.max(0, d4);
  }
  const composite = d1 + d2 + d3 + d4;

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
    degenerateProse,
    telemetryRiskScore: profile ? profile.telemetryRisk.score : 0,
    scores: { d1, d2, d3, d4, composite },
    cleanAllClear:
      !degenerateProse &&
      findings.length === 0 &&
      thirdOrderHits.length === 0 &&
      numMetrics.retentionRate === 1 &&
      numMetrics.inventedCount === 0 &&
      d4 === 10,
  };
}

function runRevisionSuite(externalArmsByName = null) {
  const tasks = loadAllRevisionTasks();

  const armNames = externalArmsByName ? Object.keys(externalArmsByName) : ["raw_ai", "naive_humanizer", "dislop_clean"];
  const armsSummary = {};

  for (const arm of armNames) {
    const taskScores = [];
    const missingTaskIds = [];
    for (const task of tasks) {
      const payload = externalArmsByName ? externalArmsByName[arm]?.[task.id] : task.arms?.[arm];
      if (payload === undefined) {
        missingTaskIds.push(task.id);
        continue;
      }
      taskScores.push(scoreCandidate(task, payload));
    }
    const n = taskScores.length || 1;
    const avg = (fn) => taskScores.reduce((acc, x) => acc + fn(x), 0) / n;
    armsSummary[arm] = {
      evaluatedTasks: taskScores.length,
      missingTasks: missingTaskIds.length,
      missingTaskIds,
      avgComposite: Number(avg((x) => x.scores.composite).toFixed(1)),
      avgD1DetClearance: Number(avg((x) => x.scores.d1).toFixed(1)),
      avgD2ThirdOrder: Number(avg((x) => x.scores.d2).toFixed(1)),
      avgD3Retention: Number(avg((x) => x.scores.d3).toFixed(1)),
      avgD4Telemetry: Number(avg((x) => x.scores.d4).toFixed(1)),
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
    schema: "dislop.bench-revision/2",
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
  const allTasks = loadAllRevisionTasks();
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

  for (const task of allTasks) {
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
        `| \`${arm}\` | **${s.avgComposite} / 100** | ${s.avgD1DetClearance} / 45 | ${s.avgD2ThirdOrder} / 20 | ${s.avgD3Retention} / 25 | ${s.avgD4Telemetry} / 10 | ${s.totalDetFindings} | ${s.totalThirdOrderHits} | ${s.avgNumericRetention}% (${s.totalInventedNumbers} invented) | ${s.allClearTasks} / ${s.evaluatedTasks} |`
    )
    .join("\n");

  return `# dislop Anti-Slop Benchmark Report (\`dislop-bench v2\`)

Generated offline by \`node scripts/run_benchmark.mjs --write-report\`. Zero external APIs or network calls were used.

## 1. Suite A — Detection Benchmark (${det.totalSamples} Samples)

Measures precision, recall, false-positive rate (including adversarial clean near-misses and 48 subtle clean-lexicon text passages in \`text-hard-v2.json\`), 2nd-order AI slogan trap catch rate, and exact Node.js vs. Python parity across both findings and 5-axis statistical text profiles.

| Metric | Measured Result |
|---|---|
| Precision | **${pct(det.precision)}** (${det.tp} TP / ${det.fp} FP) |
| Recall | **${pct(det.recall)}** (${det.tp} TP / ${det.fn} FN) |
| F1 Score | **${pct(det.f1)}** |
| Clean False-Positive Rate (FPR) | **${pct(det.cleanFpr)}** (${det.fp} / ${det.fp + det.tn}) |
| Adversarial Near-Miss FPR | **${pct(det.nearMissFpr)}** |
| 2nd-Order Trap Recall | **${pct(det.secondOrderRecall)}** |
| Expected Rule-ID Recall | **${pct(det.expectedRuleHitRate)}** |
| Node.js vs. Python Rule Parity | **${pct(det.parityRate)}** (${det.pythonAvailable ? "verified live" : `skipped: ${det.pythonError}`}) |
| Node.js vs. Python Statistical Profile Parity | **${pct(det.profileParityRate)}** |

### Breakdown by Domain

| Domain | Samples | TP | FP | TN | FN | Precision | Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${domainRows}

## 2. Suite B — End-to-End De-Slop Effectiveness (${rev.totalTasks} Tasks × 3 Arms)

Evaluates real writing and design outputs (12 v1 tasks + 6 hard clean-lexicon multi-paragraph tasks in \`revision-hard-v2.json\`) across 4 orthogonal dimensions:

- **D1 Deterministic Multi-Angle Clearance (45 pts)**: Zero \`packs/core\` AI artifacts and zero multi-angle \`dislop\` findings (co-occurrence clusters, punctuation micro-habits, narrative framing, skeleton echoes, and low-burstiness vapor).
- **D2 3rd-Order Structural Hygiene (20 pts)**: Zero pull-quote closers, glassmorphism walls, accent-stripe card templates, or structural echoes.
- **D3 Key-Number Retention & Prose Coherence (25 pts)**: Keeps concrete source numbers intact without dropping metrics, inventing figures, or deleting prose into number dumps.
- **D4 Pure Statistical Rhythm & Concreteness Telemetry (10 pts)**: Independent of D1 rule counts — verifies burstiness rhythm and concrete anchor density via \`analyzeTextProfile()\`.

| Arm | Composite | D1 Det | D2 3rd-Order | D3 Retention | D4 Telemetry | Det Findings | 3rd-Order Hits | Numeric Retention | All-Clear Tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${armRows}

## 3. How to Benchmark Your Own Model, Prompt, or Backend

1. Run your model, Skill, or hosted cloud endpoint (\`No Skill\` vs. \`dislop Skill\` vs. \`dislop-cloud /api/v1/deslop\`) on the 18 source inputs in [datasets/revision-v1.json](./datasets/revision-v1.json) and [datasets/revision-hard-v2.json](./datasets/revision-hard-v2.json).
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
      `Node/PyParity=${pct(det.parityRate)} ProfileParity=${pct(det.profileParityRate)}`
  );
  for (const [arm, s] of Object.entries(rev.arms)) {
    console.log(
      `[Suite B — ${arm.padEnd(16)}] Composite=${String(s.avgComposite).padStart(5)}/100 ` +
        `(D1=${s.avgD1DetClearance}/45, D2=${s.avgD2ThirdOrder}/20, D3=${s.avgD3Retention}/25, D4=${s.avgD4Telemetry}/10) ` +
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
    if (!det.pythonAvailable || det.profileParityRate < 1) {
      failures.push(`Node/Python Profile Parity ${pct(det.profileParityRate)} < 100%`);
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
