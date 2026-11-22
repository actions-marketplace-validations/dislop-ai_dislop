#!/usr/bin/env node
/**
 * dislop AI-Slop Pattern Library Validator & Multi-Angle Experimentation Lab.
 * Zero external dependencies.
 *
 * Usage:
 *   node scripts/pattern_lab.mjs verify
 *   node scripts/pattern_lab.mjs ablation [--json]
 *   node scripts/pattern_lab.mjs record-round <1..5> --label "..." --focus "..."
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditOoxmlEntries, auditText, detectModality, resolveEffectivePack } from "../src/core.mjs";
import { auditPatterns } from "../src/pattern-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(ROOT, "packs");
const PATTERNS_DIR = path.join(ROOT, "patterns");
const DATASETS_DIR = path.join(ROOT, "benchmarks", "datasets");
const RESULTS_DIR = path.join(ROOT, "benchmarks", "results");

function loadPacksById() {
  const out = {};
  for (const entry of fs.readdirSync(PACKS_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const p = path.join(PACKS_DIR, entry.name, "pack.json");
    if (fs.existsSync(p)) {
      const m = JSON.parse(fs.readFileSync(p, "utf8"));
      out[m.id] = m;
    }
  }
  return out;
}

function loadPatternBanksNode() {
  const bankDir = path.join(PATTERNS_DIR, "banks");
  const out = {};
  if (!fs.existsSync(bankDir)) return out;
  for (const entry of fs.readdirSync(bankDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(bankDir, entry.name), "utf8"));
    out[data.id || entry.name.replace(/\.json$/, "")] = data;
  }
  return out;
}

function loadPatternLibraryFull() {
  const taxonomy = JSON.parse(fs.readFileSync(path.join(PATTERNS_DIR, "taxonomy.json"), "utf8"));
  const dimDir = path.join(PATTERNS_DIR, "dimensions");
  const patterns = [];
  const byRuleId = {};
  for (const entry of fs.readdirSync(dimDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const fileData = JSON.parse(fs.readFileSync(path.join(dimDir, entry.name), "utf8"));
    for (const pat of fileData.patterns || []) {
      const full = { dimension: fileData.dimension, ...pat };
      patterns.push(full);
      if (pat.ruleId) byRuleId[pat.ruleId] = full;
    }
  }
  return { taxonomy, patterns, byRuleId };
}

function verifyPatternLibrary() {
  const packs = loadPacksById();
  const allPackRuleIds = new Set();
  for (const p of Object.values(packs)) {
    for (const r of p.rules || []) allPackRuleIds.add(r.id);
  }

  const { taxonomy, patterns } = loadPatternLibraryFull();
  const validDims = new Set((taxonomy.dimensions || []).map((d) => d.id));
  const validAngles = new Set((taxonomy.detectionAngles || []).map((a) => a.id));
  const validEvidence = new Set(taxonomy.evidenceLevels || []);
  const seenIds = new Set();
  const seenRuleIds = new Set();
  const errors = [];

  for (const pat of patterns) {
    if (!pat.id) errors.push("Pattern missing id");
    else if (seenIds.has(pat.id)) errors.push(`Duplicate pattern id: ${pat.id}`);
    else seenIds.add(pat.id);

    if (pat.ruleId) {
      if (seenRuleIds.has(pat.ruleId)) errors.push(`Duplicate pattern ruleId: ${pat.ruleId}`);
      else seenRuleIds.add(pat.ruleId);
    }

    if (!validDims.has(pat.dimension)) errors.push(`${pat.id}: unknown dimension '${pat.dimension}'`);
    if (!validAngles.has(pat.detectionAngle)) errors.push(`${pat.id}: unknown detectionAngle '${pat.detectionAngle}'`);
    if (!validEvidence.has(pat.evidenceLevel)) errors.push(`${pat.id}: unknown evidenceLevel '${pat.evidenceLevel}'`);
    if (!pat.name?.en || !pat.name?.zh) errors.push(`${pat.id}: missing bilingual name`);
    if (!pat.mechanism?.en || !pat.mechanism?.zh) errors.push(`${pat.id}: missing bilingual mechanism`);
    if (!Array.isArray(pat.tags) || pat.tags.length === 0) errors.push(`${pat.id}: missing tags`);
    if (!Array.isArray(pat.falsePositiveGuards) || pat.falsePositiveGuards.length === 0) {
      errors.push(`${pat.id}: missing falsePositiveGuards`);
    }
    if (!pat.exemplar?.bad || !pat.exemplar?.good || !pat.exemplar?.source) {
      errors.push(`${pat.id}: missing exemplar (bad/good/source)`);
    }
    if (pat.status === "active" && !allPackRuleIds.has(pat.ruleId)) {
      errors.push(`${pat.id}: marked active but ruleId '${pat.ruleId}' not found in packs/`);
    }
  }

  for (const rid of allPackRuleIds) {
    if (!seenRuleIds.has(rid)) {
      errors.push(`Pack rule '${rid}' is missing from patterns/dimensions/*.json`);
    }
  }

  const banks = loadPatternBanksNode();
  for (const [bankKey, bankObj] of Object.entries(banks)) {
    if (bankObj && typeof bankObj.ruleId === "string" && !seenRuleIds.has(bankObj.ruleId)) {
      errors.push(`Bank '${bankKey}' ruleId '${bankObj.ruleId}' is missing from patterns/dimensions/*.json`);
    }
    for (const [subKey, val] of Object.entries(bankObj || {})) {
      if (val && typeof val === "object" && !Array.isArray(val) && typeof val.ruleId === "string") {
        if (!seenRuleIds.has(val.ruleId)) {
          errors.push(`Bank '${bankKey}.${subKey}' ruleId '${val.ruleId}' is missing from patterns/dimensions/*.json`);
        }
      }
    }
  }

  const byStatus = {};
  const byDim = {};
  const byAngle = {};
  for (const pat of patterns) {
    byStatus[pat.status] = (byStatus[pat.status] || 0) + 1;
    byDim[pat.dimension] = (byDim[pat.dimension] || 0) + 1;
    byAngle[pat.detectionAngle] = (byAngle[pat.detectionAngle] || 0) + 1;
  }

  return {
    ok: errors.length === 0,
    totalPatterns: patterns.length,
    activePackRules: allPackRuleIds.size,
    byStatus,
    byDimension: byDim,
    byAngle,
    errors,
  };
}

function loadAllDetectionDatasets() {
  const files = [
    { name: "detection-v1", file: "detection-v1.json" },
    { name: "holdout-v1", file: "holdout-v1.json" },
    { name: "pattern-challenge-v2", file: "pattern-challenge-v2.json" },
    { name: "holdout-v2", file: "holdout-v2.json" },
  ];
  const samples = [];
  const loadedFiles = [];
  for (const item of files) {
    const fullPath = path.join(DATASETS_DIR, item.file);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    loadedFiles.push({ name: item.name, count: (data.samples || []).length });
    for (const s of data.samples || []) {
      samples.push({ ...s, dataset: item.name });
    }
  }
  return { samples, loadedFiles };
}

function runPythonBatch(samples) {
  const pyCode = `
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path("src").resolve()))
from dislop.engine import audit_text, audit_ooxml_entries, load_all_packs, resolve_effective_pack
from dislop.pattern_engine import audit_patterns, load_pattern_banks

packs = load_all_packs(Path("packs"))
banks = load_pattern_banks(Path("patterns"))
samples = json.loads(sys.stdin.read())
out = {}
for s in samples:
    pack = resolve_effective_pack(s.get("pack", "business-brief"), packs)
    mod = s.get("modality", "markdown")
    fn = s.get("filename", f"sample.{mod}")
    if mod in ("pptx", "docx"):
        res = audit_ooxml_entries(s.get("ooxml") or {}, filename=fn, modality=mod, pack=pack)
        pat_res = audit_patterns("", filename=fn, modality=mod, banks=banks, ooxml=s.get("ooxml")) if "ooxml" in audit_patterns.__code__.co_varnames else {"findings": []}
    else:
        res = audit_text(s.get("text") or "", filename=fn, modality=mod, pack=pack)
        pat_res = audit_patterns(s.get("text") or "", filename=fn, modality=mod, banks=banks)
    combined = sorted(set([f["ruleId"] for f in res.get("findings", [])] + [f["ruleId"] for f in pat_res.get("findings", [])]))
    out[s["id"]] = combined
print(json.dumps(out))
`;
  const proc = spawnSync("python3", ["-c", pyCode], {
    cwd: ROOT,
    input: JSON.stringify(samples),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.status !== 0) return { ok: false, error: (proc.stderr || proc.stdout || "python failed").trim() };
  return { ok: true, results: JSON.parse(proc.stdout) };
}

function metricPack(c) {
  const precision = c.tp + c.fp > 0 ? c.tp / (c.tp + c.fp) : 1;
  const recall = c.tp + c.fn > 0 ? c.tp / (c.tp + c.fn) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = c.fp + c.tn > 0 ? c.fp / (c.fp + c.tn) : 0;
  return {
    ...c,
    precision: Number((precision * 100).toFixed(1)),
    recall: Number((recall * 100).toFixed(1)),
    f1: Number((f1 * 100).toFixed(1)),
    cleanFpr: Number((fpr * 100).toFixed(1)),
  };
}

function runAblation() {
  const packs = loadPacksById();
  const banks = loadPatternBanksNode();
  const { byRuleId } = loadPatternLibraryFull();
  const { samples, loadedFiles } = loadAllDetectionDatasets();
  const t0 = performance.now();
  const pyBatch = runPythonBatch(samples);

  const overall = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
  const packsOnly = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
  const byDataset = {};
  const byDimension = {};
  const byAngleHits = {};
  let parityMatches = 0;
  const missedSamples = [];
  const falsePositives = [];
  const parityMismatches = [];

  for (const s of samples) {
    const pack = resolveEffectivePack(s.pack || "business-brief", packs);
    const fn = s.filename || `s.${s.modality || "md"}`;
    const mod = s.modality || "markdown";
    const res =
      mod === "pptx" || mod === "docx"
        ? auditOoxmlEntries(s.ooxml || {}, { filename: fn, modality: mod, pack })
        : auditText(String(s.text || ""), { filename: fn, modality: mod, pack });

    const patRes = auditPatterns(String(s.text || ""), {
      filename: fn,
      modality: mod,
      banks,
      ooxml: s.ooxml || null,
    });

    const packFindings = res.findings || [];
    const patFindings = patRes.findings || [];
    const nodeRuleIds = Array.from(new Set([...packFindings.map((f) => f.ruleId), ...patFindings.map((f) => f.ruleId)])).sort();
    const pyRuleIds = pyBatch.ok ? pyBatch.results[s.id] || [] : null;
    const parityOk = pyBatch.ok && JSON.stringify(nodeRuleIds) === JSON.stringify(pyRuleIds);
    if (parityOk) parityMatches += 1;
    else parityMismatches.push({ id: s.id, nodeRuleIds, pyRuleIds });

    const predPos = nodeRuleIds.length > 0;
    const packPos = packFindings.length > 0;
    const isPos = s.expected === "slop";

    packsOnly.total += 1;
    if (isPos && packPos) packsOnly.tp += 1;
    else if (!isPos && packPos) packsOnly.fp += 1;
    else if (!isPos && !packPos) packsOnly.tn += 1;
    else packsOnly.fn += 1;

    const dim =
      s.dimension ||
      (s.expectedRuleIds?.[0] && byRuleId[s.expectedRuleIds[0]]?.dimension) ||
      (nodeRuleIds[0] && byRuleId[nodeRuleIds[0]]?.dimension) ||
      "unassigned";

    for (const bucket of [
      overall,
      (byDataset[s.dataset] ||= { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 }),
      (byDimension[dim] ||= { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 }),
    ]) {
      bucket.total += 1;
      if (isPos && predPos) bucket.tp += 1;
      else if (!isPos && predPos) bucket.fp += 1;
      else if (!isPos && !predPos) bucket.tn += 1;
      else bucket.fn += 1;
    }

    if (isPos && !predPos) {
      missedSamples.push({ id: s.id, dataset: s.dataset, dimension: dim, expectedRuleIds: s.expectedRuleIds || [] });
    }
    if (!isPos && predPos) {
      falsePositives.push({ id: s.id, dataset: s.dataset, dimension: dim, triggeredRules: nodeRuleIds });
    }

    for (const rid of nodeRuleIds) {
      const angle = byRuleId[rid]?.detectionAngle || patFindings.find((f) => f.ruleId === rid)?.detectionAngle || "unknown";
      byAngleHits[angle] = (byAngleHits[angle] || 0) + 1;
    }
  }

  const elapsedMs = Number((performance.now() - t0).toFixed(1));
  return {
    loadedFiles,
    elapsedMs,
    packsOnly: metricPack(packsOnly),
    overall: metricPack(overall),
    parityRate: Number(((parityMatches / Math.max(1, samples.length)) * 100).toFixed(1)),
    byDataset: Object.fromEntries(Object.entries(byDataset).map(([k, v]) => [k, metricPack(v)])),
    byDimension: Object.fromEntries(Object.entries(byDimension).map(([k, v]) => [k, metricPack(v)])),
    byAngleHits,
    missedCount: missedSamples.length,
    missedSamples,
    falsePositiveCount: falsePositives.length,
    falsePositives,
    parityMismatches,
  };
}

function recordRound(roundNum, label, focus) {
  const verify = verifyPatternLibrary();
  const ab = runAblation();
  const historyPath = path.join(RESULTS_DIR, "round-history.json");
  let history = { schema: "dislop.pattern-rounds/1", rounds: [] };
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
  }
  const entry = {
    round: Number(roundNum),
    label,
    focus,
    patternLibrary: {
      totalPatterns: verify.totalPatterns,
      activeRules: verify.activePackRules,
      byStatus: verify.byStatus,
      verifiedOk: verify.ok,
    },
    overall: ab.overall,
    parityRate: ab.parityRate,
    byDataset: ab.byDataset,
    byDimension: ab.byDimension,
    byAngleHits: ab.byAngleHits,
    missedCount: ab.missedCount,
    falsePositiveCount: ab.falsePositiveCount,
    elapsedMs: ab.elapsedMs,
  };
  history.rounds = history.rounds.filter((r) => r.round !== entry.round);
  history.rounds.push(entry);
  history.rounds.sort((a, b) => a.round - b.round);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n", "utf8");
  return entry;
}

function runDogfoodPatterns() {
  const banks = loadPatternBanksNode();
  const skipDirs = new Set([".git", "node_modules", "packs", "patterns", "tests", "benchmarks", "__pycache__", ".private"]);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (skipDirs.has(entry.name)) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && detectModality(p)) files.push(p);
    }
  }
  walk(ROOT);
  const t0 = performance.now();
  const allFindings = [];
  for (const abs of files) {
    const mod = detectModality(abs);
    if (!["markdown", "text", "html", "css", "jsx"].includes(mod)) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const text = fs.readFileSync(abs, "utf8");
    const res = auditPatterns(text, { filename: rel, modality: mod, banks });
    allFindings.push(...res.findings);
  }
  const elapsedMs = Number((performance.now() - t0).toFixed(1));
  return { checkedFiles: files.length, elapsedMs, findings: allFindings };
}

function evaluateAngleSubset(samples, packs, banks, activeAngles) {
  const bucket = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
  const challengeBucket = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };
  const holdout2Bucket = { tp: 0, fp: 0, tn: 0, fn: 0, total: 0 };

  for (const s of samples) {
    const pack = resolveEffectivePack(s.pack || "business-brief", packs);
    const fn = s.filename || `s.${s.modality || "md"}`;
    const mod = s.modality || "markdown";
    const packRes =
      mod === "pptx" || mod === "docx"
        ? auditOoxmlEntries(s.ooxml || {}, { filename: fn, modality: mod, pack })
        : auditText(String(s.text || ""), { filename: fn, modality: mod, pack });

    const patRes =
      activeAngles.length > 0
        ? auditPatterns(String(s.text || ""), {
            filename: fn,
            modality: mod,
            banks,
            angles: activeAngles,
            ooxml: s.ooxml || null,
          })
        : { findings: [] };

    const predPos = (packRes.findings || []).length + (patRes.findings || []).length > 0;
    const isPos = s.expected === "slop";
    const targets = [bucket];
    if (s.dataset === "pattern-challenge-v2") targets.push(challengeBucket);
    if (s.dataset === "holdout-v2") targets.push(holdout2Bucket);
    for (const b of targets) {
      b.total += 1;
      if (isPos && predPos) b.tp += 1;
      else if (!isPos && predPos) b.fp += 1;
      else if (!isPos && !predPos) b.tn += 1;
      else b.fn += 1;
    }
  }
  return {
    overall: metricPack(bucket),
    challengeV2: metricPack(challengeBucket),
    holdoutV2: metricPack(holdout2Bucket),
  };
}

function runIncrementalAngleAblation() {
  const packs = loadPacksById();
  const banks = loadPatternBanksNode();
  const { samples } = loadAllDetectionDatasets();
  let packRuleTotal = 0;
  for (const p of Object.values(packs)) packRuleTotal += (p.rules || []).length;
  const stages = [
    { id: "packs-only", label: `Packs Only (${packRuleTotal} core/pack rules)`, angles: [] },
    { id: "plus-rhythm-discourse", label: "+ Rhythm & Discourse Bank", angles: ["rhythm-statistics", "discourse-structure"] },
    {
      id: "plus-lexical-syntactic",
      label: "+ Lexical Calque & Syntactic Frames Bank",
      angles: ["rhythm-statistics", "discourse-structure", "lexicon-cluster", "syntactic-frame"],
    },
    {
      id: "plus-visual-deck",
      label: "+ Visual/UI & PPTX Structural Bank",
      angles: ["rhythm-statistics", "discourse-structure", "lexicon-cluster", "syntactic-frame", "visual-markup-ooxml"],
    },
    {
      id: "full-pattern-library",
      label: "+ Composite Multi-Signal Fusion (Full 7 Angles)",
      angles: [
        "rhythm-statistics",
        "discourse-structure",
        "lexicon-cluster",
        "syntactic-frame",
        "visual-markup-ooxml",
        "composite-cooccurrence",
      ],
    },
  ];
  return stages.map((st) => ({
    id: st.id,
    label: st.label,
    ...evaluateAngleSubset(samples, packs, banks, st.angles),
  }));
}

function buildPatternBenchmarkMarkdown(verify, ab, angleStages, history) {
  const roundRows = (history.rounds || [])
    .map((r) => {
      const ch = r.byDataset?.["pattern-challenge-v2"];
      const h2 = r.byDataset?.["holdout-v2"];
      return (
        `| Round ${r.round} | ${r.label} | ${r.overall.total} | ${r.overall.precision}% | ${r.overall.recall}% | **${r.overall.f1}%** | ` +
        `${ch ? `${ch.recall}%` : "-"} | ${h2 ? `${h2.f1}%` : "-"} | ${r.overall.cleanFpr}% | ${r.parityRate}% |`
      );
    })
    .join("\n");

  const datasetRows = Object.entries(ab.byDataset)
    .map(
      ([ds, m]) =>
        `| \`${ds}\` | ${m.total} | ${m.tp} | ${m.fp} | ${m.tn} | ${m.fn} | ${m.precision}% | ${m.recall}% | **${m.f1}%** | ${m.cleanFpr}% |`
    )
    .join("\n");

  const dimRows = Object.entries(ab.byDimension)
    .filter(([k]) => k !== "unassigned")
    .map(
      ([dim, m]) =>
        `| \`${dim}\` | ${m.total} | ${m.tp} | ${m.fp} | ${m.tn} | ${m.fn} | ${m.precision}% | ${m.recall}% | **${m.f1}%** |`
    )
    .join("\n");

  const stageRows = angleStages
    .map(
      (st) =>
        `| ${st.label} | ${st.overall.precision}% | ${st.overall.recall}% | **${st.overall.f1}%** | ${st.challengeV2.recall}% | ${st.holdoutV2.recall}% | ${st.overall.cleanFpr}% |`
    )
    .join("\n");

  return `# AI-Slop Pattern Library Benchmark Report (\`dislop-bench v2\`)

Generated offline by \`node scripts/pattern_lab.mjs write-report\`. Zero network calls or external model APIs were used.

## 1. Asset Coverage Summary

- **Total Cataloged Patterns**: **${verify.totalPatterns}** patterns across **${Object.keys(verify.byDimension).length}** dimensions and **7** detection angles (\`patterns/taxonomy.json\`, \`patterns/dimensions/*.json\`, \`patterns/banks/*.json\`)
- **Executable Pack Rules**: **${verify.activePackRules}** rules in \`packs/*/pack.json\`
- **Data-Driven Pattern-Bank Rules**: **${verify.byStatus["active-bank"] || 0}** declarative rules in \`patterns/banks/*.json\` (\`src/pattern-engine.mjs\` + \`src/dislop/pattern_engine.py\`)
- **Cross-Runtime Parity (Node.js vs. Python)**: **${ab.parityRate}%** across all **${ab.overall.total}** samples (${ab.elapsedMs} ms)

## 2. Five-Round Closed-Loop Progression

| Round | Milestone | Samples | Precision | Recall | Overall F1 | Challenge v2 Recall | Holdout v2 F1 | Clean FPR | Node/Py Parity |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
${roundRows}

## 3. Dataset Breakdown (${ab.overall.total} Samples)

| Dataset | Samples | TP | FP | TN | FN | Precision | Recall | F1 | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${datasetRows}

## 4. Pattern Dimension Breakdown

| Dimension | Samples | TP | FP | TN | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${dimRows}

## 5. Multi-Angle Incremental Ablation (${ab.overall.total} Samples)

| Detection Configuration | Precision | Recall | Overall F1 | Challenge v2 Recall | Holdout v2 Recall | Clean FPR |
|---|---:|---:|---:|---:|---:|---:|
${stageRows}

## 6. Reproduce Locally

\`\`\`bash
node scripts/pattern_lab.mjs verify
node scripts/pattern_lab.mjs ablation
node scripts/pattern_lab.mjs assert
node scripts/pattern_lab.mjs dogfood
\`\`\`
`;
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "verify") {
  const res = verifyPatternLibrary();
  if (!res.ok) {
    console.error(`pattern-lab verify: FAILED (${res.errors.length} error(s))`);
    for (const e of res.errors) console.error("  -", e);
    process.exit(1);
  }
  console.log(
    `pattern-lab verify: ok (${res.totalPatterns} patterns across ${Object.keys(res.byDimension).length} dimensions; ` +
      `active=${res.byStatus.active || 0}, planned=${res.byStatus.planned || 0}, packRules=${res.activePackRules})`
  );
} else if (cmd === "ablation") {
  const res = runAblation();
  if (rest.includes("--json")) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(
      `[All Datasets (${res.overall.total} samples)] P=${res.overall.precision}% R=${res.overall.recall}% F1=${res.overall.f1}% ` +
        `CleanFPR=${res.overall.cleanFpr}% Parity=${res.parityRate}% (${res.elapsedMs} ms)`
    );
    for (const [ds, m] of Object.entries(res.byDataset)) {
      console.log(`  dataset ${ds.padEnd(22)} total=${String(m.total).padStart(3)} TP=${String(m.tp).padStart(2)} FN=${String(m.fn).padStart(2)} FP=${String(m.fp).padStart(2)} P=${m.precision}% R=${m.recall}% F1=${m.f1}%`);
    }
    for (const [dim, m] of Object.entries(res.byDimension)) {
      console.log(`  dim     ${dim.padEnd(22)} total=${String(m.total).padStart(3)} TP=${String(m.tp).padStart(2)} FN=${String(m.fn).padStart(2)} FP=${String(m.fp).padStart(2)} P=${m.precision}% R=${m.recall}%`);
    }
    if (res.missedCount > 0) {
      console.log(`  missed (${res.missedCount}): ${res.missedSamples.map((x) => `${x.id}[${x.expectedRuleIds.join(",")}]`).join(", ")}`);
    }
    if (res.falsePositiveCount > 0) {
      console.log(`  false-positives (${res.falsePositiveCount}): ${res.falsePositives.map((x) => `${x.id}->${x.triggeredRules.join(",")}`).join(", ")}`);
    }
  }
} else if (cmd === "record-round") {
  const roundNum = rest[0];
  const labelIdx = rest.indexOf("--label");
  const focusIdx = rest.indexOf("--focus");
  const label = labelIdx !== -1 ? rest[labelIdx + 1] : `Round ${roundNum}`;
  const focus = focusIdx !== -1 ? rest[focusIdx + 1] : "";
  const entry = recordRound(roundNum, label, focus);
  console.log(
    `Recorded Round ${entry.round} (${entry.label}): activeRules=${entry.patternLibrary.activeRules}/${entry.patternLibrary.totalPatterns}, ` +
      `overall F1=${entry.overall.f1}% (P=${entry.overall.precision}%, R=${entry.overall.recall}%, FPR=${entry.overall.cleanFpr}%), ` +
      `challenge-v2 R=${entry.byDataset["pattern-challenge-v2"]?.recall ?? "n/a"}%, parity=${entry.parityRate}%`
  );
} else if (cmd === "dogfood") {
  const res = runDogfoodPatterns();
  console.log(`pattern-lab dogfood: ${res.findings.length} finding(s) across ${res.checkedFiles} repo file(s) in ${res.elapsedMs} ms`);
  for (const f of res.findings) {
    console.log(`  [${f.severity.toUpperCase()}] ${f.file}:${f.location}  ${f.ruleId}  (${f.metric})`);
    console.log(`    match: "${f.match}"`);
  }
} else if (cmd === "write-report") {
  const verify = verifyPatternLibrary();
  const ab = runAblation();
  const stages = runIncrementalAngleAblation();
  const historyPath = path.join(RESULTS_DIR, "round-history.json");
  const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, "utf8")) : { rounds: [] };
  const md = buildPatternBenchmarkMarkdown(verify, ab, stages, history);
  const reportPath = path.join(ROOT, "benchmarks", "PATTERN-BENCHMARK.md");
  fs.writeFileSync(reportPath, md, "utf8");
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RESULTS_DIR, "pattern-ablation-latest.json"),
    JSON.stringify({ schema: "dislop.pattern-ablation/1", verify, ablation: ab, angleStages: stages }, null, 2) + "\n",
    "utf8"
  );
  console.log(`Wrote benchmarks/PATTERN-BENCHMARK.md and benchmarks/results/pattern-ablation-latest.json (${ab.overall.total} samples, F1=${ab.overall.f1}%)`);
} else if (cmd === "assert") {
  const verify = verifyPatternLibrary();
  const ab = runAblation();
  const failures = [];
  if (!verify.ok) failures.push(`Pattern library verify failed (${verify.errors.length} errors)`);
  if (ab.overall.precision < 95) failures.push(`Overall Precision ${ab.overall.precision}% < 95%`);
  if (ab.overall.recall < 95) failures.push(`Overall Recall ${ab.overall.recall}% < 95%`);
  if (ab.overall.f1 < 95) failures.push(`Overall F1 ${ab.overall.f1}% < 95%`);
  if (ab.overall.cleanFpr > 3) failures.push(`Clean FPR ${ab.overall.cleanFpr}% > 3%`);
  if (ab.parityRate < 100) failures.push(`Node/Python Parity ${ab.parityRate}% < 100%`);
  const h2 = ab.byDataset["holdout-v2"];
  if (!h2 || h2.f1 < 95 || h2.cleanFpr > 0) {
    failures.push(`Holdout v2 gate failed (F1=${h2?.f1 ?? 0}%, CleanFPR=${h2?.cleanFpr ?? 100}%)`);
  }
  if (failures.length > 0) {
    console.error("pattern-lab assert: FAILED");
    for (const f of failures) console.error("  -", f);
    process.exit(1);
  }
  console.log(
    `pattern-lab assert: ok (${verify.totalPatterns} patterns, ${ab.overall.total} samples, ` +
      `P=${ab.overall.precision}% R=${ab.overall.recall}% F1=${ab.overall.f1}% CleanFPR=${ab.overall.cleanFpr}% ` +
      `HoldoutV2 F1=${h2.f1}% Parity=${ab.parityRate}%)`
  );
} else {
  console.log("Usage: node scripts/pattern_lab.mjs <verify|ablation|dogfood|record-round|write-report|assert>");
}
