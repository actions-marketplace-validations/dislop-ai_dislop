#!/usr/bin/env node
/**
 * Standalone verification prototype for dislop v0.3 Anti-Pattern Catalog & Rhythm/UI Probes.
 * Zero external dependencies; reads packs/*.json and imports pure helpers from src/core.mjs
 * without modifying any core engine files.
 *
 * Usage:
 *   node scripts/prototype_antipattern_lab.mjs catalog [--query <q>] [--pack <id>] [--family <prefix>] [--modality <m>] [--severity <s>] [--lang en|zh] [--json]
 *   node scripts/prototype_antipattern_lab.mjs probe <file-or-dir> [--lang en|zh] [--json]
 *   node scripts/prototype_antipattern_lab.mjs self-test
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLineStarts, buildZones, detectModality, offsetToLineCol } from "../src/core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(REPO_ROOT, "packs");

// ---------- Part 1: Anti-Pattern Catalog & Query Engine ----------

const FAMILY_TAXONOMY = {
  "hygiene/": { category: "delivery-hygiene", label: { en: "Delivery Hygiene", zh: "客观交付卫生" } },
  "office/": { category: "office-structure", label: { en: "Office & PDF Structure", zh: "办公文档与 PDF 结构" } },
  "lexicon/": { category: "language-lexicon", label: { en: "Lexicon & Clichés", zh: "高频套词与官话" } },
  "frame/": { category: "language-template", label: { en: "Syntactic & Rhetorical Templates", zh: "句式与修辞模板" } },
  "rhythm/": { category: "language-rhythm", label: { en: "Cadence & Rhythm Metrics", zh: "节奏与韵律指标" } },
  "punctuation/": { category: "language-punctuation", label: { en: "Punctuation & Typography", zh: "标点与混排规范" } },
  "evidence/": { category: "evidence-rigor", label: { en: "Attribution & Evidence", zh: "出处与证据严谨度" } },
  "deck/": { category: "deck-layout", label: { en: "Slide Deck Layout", zh: "幻灯片版面与密度" } },
  "ui/": { category: "ui-design", label: { en: "Web UI & Visual Chrome", zh: "前端界面与视觉模板" } },
};

function classifyFamily(family = "") {
  for (const [prefix, meta] of Object.entries(FAMILY_TAXONOMY)) {
    if (family.startsWith(prefix)) return meta;
  }
  return { category: "general", label: { en: "General", zh: "通用规则" } };
}

export function loadCatalogEntries(packsDir = PACKS_DIR) {
  const entries = [];
  if (!fs.existsSync(packsDir)) return entries;
  const dirs = fs
    .readdirSync(packsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const manifestPath = path.join(packsDir, dir.name, "pack.json");
    if (!fs.existsSync(manifestPath)) continue;
    const pack = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const rule of pack.rules || []) {
      const tax = classifyFamily(rule.family || "");
      entries.push({
        id: rule.id,
        packId: pack.id,
        tier: rule.tier || pack.tier || "taste",
        severity: rule.severity || "warning",
        family: rule.family || "general",
        category: tax.category,
        categoryLabel: tax.label,
        probe: rule.probe || "regex",
        modalities: rule.modalities || pack.modalities || [],
        message: rule.message || { en: "", zh: "" },
        deletionTest: rule.deletionTest || null,
        exemplar: rule.exemplar || null,
        fixtureCounts: {
          hit: (rule.fixtures?.hit || []).length,
          clean: (rule.fixtures?.clean || []).length,
        },
        anchorUrl: `https://dislop.com/#rule-${rule.id}`,
      });
    }
  }
  return entries;
}

export function queryCatalog(entries, filters = {}) {
  const q = String(filters.query || "").trim().toLowerCase();
  const terms = q ? q.split(/\s+/).filter(Boolean) : [];
  return entries.filter((e) => {
    if (filters.pack && e.packId !== filters.pack) return false;
    if (filters.tier && e.tier !== filters.tier) return false;
    if (filters.severity && e.severity !== filters.severity) return false;
    if (filters.family && !e.family.toLowerCase().startsWith(String(filters.family).toLowerCase())) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.modality && !e.modalities.includes(filters.modality)) return false;
    if (terms.length > 0) {
      const haystack = [
        e.id,
        e.packId,
        e.family,
        e.category,
        e.categoryLabel?.en || "",
        e.categoryLabel?.zh || "",
        e.message?.en || "",
        e.message?.zh || "",
        e.deletionTest?.en || "",
        e.deletionTest?.zh || "",
        e.exemplar?.bad || "",
        e.exemplar?.trap || "",
        e.exemplar?.good || "",
      ]
        .join("\n")
        .toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

// ---------- Part 2: Candidate v0.3 Deterministic Rhythm & UI Probes ----------

export const CANDIDATE_RULES = [
  {
    id: "comma-chain-cadence",
    tier: "taste",
    severity: "info",
    family: "rhythm/comma-chain",
    modalities: ["markdown", "text", "html", "docx"],
    message: {
      en: "Single sentence chains 5+ comma-separated clauses in a flat list-like cadence.",
      zh: "单句连续串联 5 个及以上逗号分句，形成平铺拖沓的“逗号链”节奏。",
    },
    deletionTest: {
      en: "Split the comma chain into 2 sentences with distinct rhythm, or cut redundant parallel clauses.",
      zh: "将过长的逗号串句拆成两句主次分明的短句，或删去语义重复的并列分句。",
    },
  },
  {
    id: "sentence-length-monotony",
    tier: "taste",
    severity: "info",
    family: "rhythm/monotony",
    modalities: ["markdown", "text", "html", "docx"],
    message: {
      en: "Long paragraph shows metronome sentence-length uniformity (CV < 0.16 across >= 5 sentences).",
      zh: "长段落内连续 5 句以上句长高度均一（变异系数 CV < 0.16），呈现典型“节拍器”生成韵律。",
    },
    deletionTest: {
      en: "Vary sentence cadence by merging two related clauses or ending a point with a crisp short sentence.",
      zh: "合并两句相关陈述或用一句简短结论收束，打破均匀的机械句长节奏。",
    },
  },
  {
    id: "discourse-marker-cluster",
    tier: "taste",
    severity: "warning",
    family: "rhythm/discourse-signpost",
    modalities: ["markdown", "text", "html", "docx"],
    message: {
      en: "Consecutive paragraphs or sentences stack mechanical transition signposts (e.g., 首先/其次/此外/最后 or Furthermore/Moreover/Additionally).",
      zh: "连续段落或句子堆砌机械过渡路标词（如“首先/其次/此外/最后”或连续“Furthermore/Moreover/Additionally”）。",
    },
    deletionTest: {
      en: "Delete the mechanical transition words; let the logical order of facts carry paragraph flow.",
      zh: "删去机械过渡路标词，直接用事实之间的因果或先后关系串联段落。",
    },
  },
  {
    id: "ui-glassmorphism-overuse",
    tier: "taste",
    severity: "warning",
    family: "ui/slop-chrome",
    modalities: ["html", "css", "jsx"],
    message: {
      en: "Repeated `backdrop-blur` translucent panels (>= 3 per view) mimic default AI glassmorphism templates.",
      zh: "单视图重复堆砌 3 处及以上 `backdrop-blur` 毛玻璃半透明面板，呈现典型生成式模板特征。",
    },
    deletionTest: {
      en: "Reserve backdrop blur for a single sticky header or modal overlay; use solid surface tokens for body cards.",
      zh: "仅在顶栏吸顶或弹窗遮罩保留一处毛玻璃，正文卡片改用实色表面令牌与 1px 细线。",
    },
  },
  {
    id: "ui-accent-stripe-card",
    tier: "taste",
    severity: "warning",
    family: "ui/slop-chrome",
    modalities: ["html", "css", "jsx"],
    message: {
      en: "Repeated thick left accent-stripe cards (`border-l-4` / `border-left: 4px solid`, >= 3 per view) signal generic dashboard boilerplate.",
      zh: "单视图堆叠 3 处及以上左侧粗彩条卡片（`border-l-4` / `border-left: 4px solid`），呈现典型 AI 后台面板套路。",
    },
    deletionTest: {
      en: "Remove decorative thick side stripes; differentiate card status with concise labels or clean alignment.",
      zh: "移除纯装饰性粗彩条，改用清晰对齐、留白或极简状态文字区分信息层级。",
    },
  },
];

function stripFormattedNumbersAndCode(s) {
  return s
    .replace(/\d{1,3}(?:,\d{3})+/g, "0")
    .replace(/`[^`\n]+`/g, "CODE");
}

function detectPrimaryLang(s) {
  const cjk = (s.match(/[\u4e00-\u9fff]/gu) || []).length;
  const enWords = s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  return cjk >= enWords * 2 ? "zh" : "en";
}

function measureClauseUnits(clause, lang) {
  const clean = stripFormattedNumbersAndCode(clause).replace(/[.!?。！？]+$/u, "").trim();
  const cjk = (clean.match(/[\u4e00-\u9fff]/gu) || []).length;
  const enWords = clean.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return lang === "zh" ? cjk + Math.round(enWords * 1.5) : enWords + Math.round(cjk * 0.6);
}

function probeCommaChainCadence(proseText, rawText) {
  const hits = [];
  const paraRe = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  let pm;
  while ((pm = paraRe.exec(proseText)) !== null) {
    const para = pm[0];
    const trimmed = para.trim();
    if (!trimmed || /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(trimmed)) continue;

    const sentRe = /[^.!?。！？\n]+[.!?。！？]/gu;
    let sm;
    while ((sm = sentRe.exec(para)) !== null) {
      const sent = sm[0];
      const normalized = stripFormattedNumbersAndCode(sent);
      const lang = detectPrimaryLang(normalized);
      // Count commas (both CJK full-width and ASCII) outside parenthetical citations
      const noParens = normalized.replace(/\([^)\n]{1,60}\)|（[^）\n]{1,60}）/gu, "");
      const commas = noParens.match(/[，,]/g) || [];
      if (commas.length < 5) continue;

      const clauses = noParens.split(/[，,]/).map((c) => c.trim()).filter(Boolean);
      const minClauseUnits = lang === "zh" ? 4 : 3;
      const minAvgUnits = lang === "zh" ? 5.0 : 3.2;
      const longClauses = clauses.filter((c) => measureClauseUnits(c, lang) >= minClauseUnits);
      const avgClauseLen =
        clauses.reduce((acc, c) => acc + measureClauseUnits(c, lang), 0) / Math.max(1, clauses.length);

      // Exempt compact noun/format enumerations (e.g. "Markdown, HTML, CSS, SVG, DOCX, PPTX")
      if (longClauses.length >= 4 && avgClauseLen >= minAvgUnits) {
        const startOffset = pm.index + sm.index + sent.search(/\S/);
        const rawSlice = rawText.slice(startOffset, startOffset + sent.trim().length);
        if ((rawSlice.match(/\]\(/g) || []).length >= 3) continue;
        hits.push({
          index: startOffset,
          length: sent.trim().length,
          metric: `lang=${lang}, commas=${commas.length}, avgClauseUnits=${avgClauseLen.toFixed(1)}`,
        });
      }
    }
  }
  return hits;
}

function probeSentenceLengthMonotony(proseText) {
  const hits = [];
  const paraRe = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  let pm;
  while ((pm = paraRe.exec(proseText)) !== null) {
    const para = pm[0];
    const trimmed = para.trim();
    if (!trimmed || /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(trimmed)) continue;

    const lang = detectPrimaryLang(trimmed);
    const sentRe = /[^.!?。！？\n]+[.!?。！？]/gu;
    const lengths = [];
    let sm;
    while ((sm = sentRe.exec(para)) !== null) {
      const units = measureClauseUnits(sm[0], lang);
      if (units >= 4) lengths.push(units);
    }
    if (lengths.length < 5) continue;

    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const minMean = lang === "zh" ? 14 : 10;
    if (mean < minMean) continue;
    const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv < 0.16) {
      const startOffset = pm.index + para.search(/\S/);
      hits.push({
        index: startOffset,
        length: Math.min(trimmed.length, 100),
        metric: `lang=${lang}, sentences=${lengths.length}, mean=${mean.toFixed(1)}, cv=${cv.toFixed(3)}`,
      });
    }
  }
  return hits;
}

function probeDiscourseMarkerCluster(proseText) {
  const hits = [];
  const zhMarker = /^(?:首先|其次|再次|此外|另外|与此同时|最后|总而言之|综上所述|归根结底)[，,：:\s]/u;
  const enMarker = /^(?:Firstly|Secondly|Thirdly|Furthermore|Moreover|Additionally|In addition|Consequently|Ultimately|In conclusion|To summarize)[,\s]/i;

  const paraRe = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  const paras = [];
  let pm;
  while ((pm = paraRe.exec(proseText)) !== null) {
    const trimmed = pm[0].trim();
    if (!trimmed || /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(trimmed)) {
      paras.push({ isMarked: false, index: pm.index, length: 0, text: "" });
      continue;
    }
    const isMarked = zhMarker.test(trimmed) || enMarker.test(trimmed);
    paras.push({
      isMarked,
      index: pm.index + pm[0].search(/\S/),
      length: Math.min(trimmed.length, 80),
      text: trimmed,
    });
  }

  // Detect >= 3 consecutive marked paragraphs
  let runStart = -1;
  let runCount = 0;
  for (let i = 0; i <= paras.length; i += 1) {
    const cur = paras[i];
    if (cur && cur.isMarked) {
      if (runCount === 0) runStart = i;
      runCount += 1;
    } else {
      if (runCount >= 3) {
        hits.push({
          index: paras[runStart].index,
          length: paras[runStart].length,
          metric: `consecutiveMarkedParagraphs=${runCount}`,
        });
      }
      runCount = 0;
    }
  }

  // Also detect >= 3 mechanical transition markers inside a single paragraph
  for (const p of paras) {
    if (!p.text) continue;
    const innerZh = p.text.match(/(?:^|[。！？；\n]\s*)(?:首先|其次|此外|另外|最后|综上所述|总而言之)[，,]/gu) || [];
    const innerEn = p.text.match(/(?:^|[.!?;]\s+)(?:Furthermore|Moreover|Additionally|In addition|Consequently|In conclusion|To summarize),/gi) || [];
    const total = innerZh.length + innerEn.length;
    if (total >= 3 && !hits.some((h) => h.index === p.index)) {
      hits.push({
        index: p.index,
        length: p.length,
        metric: `markersInParagraph=${total}`,
      });
    }
  }
  return hits;
}

function probeUiGlassmorphismOveruse(rawText) {
  const clean = rawText
    .replace(/<!--[\s\S]*?-->/g, (s) => s.replace(/[^\r\n]/g, " "))
    .replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\r\n]/g, " "))
    .replace(/<(script|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, (s) => s.replace(/[^\r\n]/g, " "));

  const re = /\bbackdrop-blur(?:-[a-z0-9]+)?\b|backdrop-filter\s*:\s*blur\(/gi;
  const matches = [];
  let m;
  while ((m = re.exec(clean)) !== null) {
    matches.push({ index: m.index, length: m[0].length });
  }
  if (matches.length >= 3) {
    return [{ index: matches[0].index, length: matches[0].length, metric: `backdropBlurCount=${matches.length}` }];
  }
  return [];
}

function probeUiAccentStripeCard(rawText) {
  const clean = rawText
    .replace(/<!--[\s\S]*?-->/g, (s) => s.replace(/[^\r\n]/g, " "))
    .replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\r\n]/g, " "))
    .replace(/<(script|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, (s) => s.replace(/[^\r\n]/g, " "));

  const re = /\bborder-l-(?:4|8)\b|border-left\s*:\s*(?:[3-9]|\d{2,})px\s+solid\b/gi;
  const matches = [];
  let m;
  while ((m = re.exec(clean)) !== null) {
    // Ignore blockquote CSS rules
    const before = clean.slice(Math.max(0, m.index - 40), m.index);
    if (/\bblockquote\b/i.test(before)) continue;
    matches.push({ index: m.index, length: m[0].length });
  }
  if (matches.length >= 3) {
    return [{ index: matches[0].index, length: matches[0].length, metric: `accentStripeCount=${matches.length}` }];
  }
  return [];
}

export function runPrototypeProbes(text, { filename = "<memory>", modality = null } = {}) {
  const mod = modality || detectModality(filename) || "markdown";
  const lineStarts = buildLineStarts(text);
  const zones = buildZones(text, mod);
  const rulesById = new Map(CANDIDATE_RULES.map((r) => [r.id, r]));
  const findings = [];

  const emit = (ruleId, hits) => {
    const rule = rulesById.get(ruleId);
    if (!rule || !rule.modalities.includes(mod)) return;
    for (const h of hits) {
      const { line, col } = offsetToLineCol(text, lineStarts, h.index);
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        family: rule.family,
        file: filename,
        location: `${line}:${col}`,
        line,
        col,
        metric: h.metric,
        match: text.slice(h.index, h.index + h.length).replace(/\s+/g, " ").trim().slice(0, 100),
        message: rule.message,
        deletionTest: rule.deletionTest,
      });
    }
  };

  if (["markdown", "text", "html", "docx"].includes(mod)) {
    emit("comma-chain-cadence", probeCommaChainCadence(zones.prose, text));
    emit("sentence-length-monotony", probeSentenceLengthMonotony(zones.prose));
    emit("discourse-marker-cluster", probeDiscourseMarkerCluster(zones.prose));
  }
  if (["html", "css", "jsx"].includes(mod)) {
    emit("ui-glassmorphism-overuse", probeUiGlassmorphismOveruse(text));
    emit("ui-accent-stripe-card", probeUiAccentStripeCard(text));
  }

  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return findings;
}

// ---------- Part 3: Built-in Self-Test Matrix ----------

const SELF_TEST_CASES = [
  {
    ruleId: "comma-chain-cadence",
    modality: "markdown",
    hit: [
      "在项目初期，团队整理了接口文档，梳理了历史日志，核对了权限列表，补齐了监控告警，最终在周五前完成了灰度发布。",
      "During the quarterly review, the platform team audited latency logs, refreshed dashboard layouts, updated alerting policies, aligned vendor contracts, and prepared next quarter targets.",
    ],
    clean: [
      "系统在周五前完成灰度发布，覆盖 12,000,000 条历史日志与 4 个核心接口。",
      "支持的输入格式包括 Markdown, HTML, CSS, SVG, DOCX, PPTX 六类文件。",
      "During the review, the team audited 12,500 logs and cut p99 latency from 420 ms to 95 ms.",
    ],
  },
  {
    ruleId: "sentence-length-monotony",
    modality: "markdown",
    hit: [
      "系统每天定时拉取上游交易流水日志记录。系统随后按渠道编码拆分全部明细数据。系统接着校验每条记录的金额字段格式。系统最后生成标准日报并推送至审校群。系统同时保留三十天原始文件用于复查。",
      "The service reads incoming telemetry events from every regional gateway node quickly. The worker normalizes payload schemas across all supported client versions reliably. The storage engine writes compressed parquet shards into durable object buckets daily. The query layer indexes partition metadata for fast analytical dashboard lookups now. The alerting daemon checks error budgets against strict weekly service targets daily.",
    ],
    clean: [
      "服务每小时拉取一次上游流水。如果遇到单笔金额超过十万元且渠道编码未在白名单登记的异常记录，校验器会直接挂起批次并写明行号。其余正常数据进入日终归档。次日清晨六点推送复核表。零人工干预。",
      "Latency spiked at 02:14 UTC. After tracing three regional load balancers and checking upstream TLS handshake retries across twelve edge clusters, the on-call engineer isolated a stale certificate chain on eu-west-2. She rotated it in four minutes. Traffic recovered immediately. Postmortem is scheduled for Monday.",
    ],
  },
  {
    ruleId: "discourse-marker-cluster",
    modality: "markdown",
    hit: [
      "首先，我们需要统一数据采集口径。\n\n其次，研发团队要补齐自动化测试脚本。\n\n最后，运营侧同步更新交付检查清单。",
      "Furthermore, the parser checks heading levels. Moreover, it scans inline code fences. Additionally, it validates contrast tokens in local stylesheets.",
    ],
    clean: [
      "首先，本节仅讨论静态解析路径。\n\n静态解析器直接读取源码字节，不启动无头浏览器。",
      "The parser checks heading levels and scans inline code fences. In addition, it verifies contrast ratios in stylesheets.",
    ],
  },
  {
    ruleId: "ui-glassmorphism-overuse",
    modality: "html",
    hit: [
      '<header class="backdrop-blur-md bg-white/10">Nav</header><div class="backdrop-blur-lg bg-white/10">A</div><div class="backdrop-blur-lg bg-white/10">B</div>',
    ],
    clean: [
      '<header class="backdrop-blur-sm bg-white/90">Nav</header><section class="bg-white border">Body</section>',
    ],
  },
  {
    ruleId: "ui-accent-stripe-card",
    modality: "html",
    hit: [
      '<div class="border-l-4 border-indigo-500 p-4">KPI 1</div><div class="border-l-4 border-purple-500 p-4">KPI 2</div><div class="border-l-4 border-pink-500 p-4">KPI 3</div>',
    ],
    clean: [
      '<blockquote class="border-l-4 border-gray-300 pl-4">Quoted passage</blockquote><div class="border p-4">KPI 1</div>',
    ],
  },
];

function runSelfTest() {
  const errors = [];
  let assertions = 0;

  // 1. Verify catalog loads all packs cleanly
  const catalog = loadCatalogEntries();
  assertions += 1;
  if (catalog.length < 25) {
    errors.push(`Expected >= 25 rules in catalog, got ${catalog.length}`);
  }
  assertions += 1;
  const negHits = queryCatalog(catalog, { query: "不是" });
  if (!negHits.some((e) => e.id === "negation-pivot-frame")) {
    errors.push("Catalog query '不是' did not return negation-pivot-frame");
  }
  assertions += 1;
  const uiHits = queryCatalog(catalog, { modality: "html", severity: "warning" });
  if (!uiHits.some((e) => e.id === "ui-ai-gradient")) {
    errors.push("Catalog modality/severity filter did not return ui-ai-gradient");
  }

  // 2. Verify all candidate probe fixtures
  for (const tc of SELF_TEST_CASES) {
    for (const sample of tc.hit) {
      assertions += 1;
      const res = runPrototypeProbes(sample, { filename: `hit.${tc.modality}`, modality: tc.modality });
      if (!res.some((f) => f.ruleId === tc.ruleId)) {
        errors.push(`${tc.ruleId}: hit fixture missed -> ${sample.slice(0, 80)}`);
      }
    }
    for (const sample of tc.clean) {
      assertions += 1;
      const res = runPrototypeProbes(sample, { filename: `clean.${tc.modality}`, modality: tc.modality });
      if (res.some((f) => f.ruleId === tc.ruleId)) {
        errors.push(`${tc.ruleId}: clean fixture falsely triggered -> ${sample.slice(0, 80)}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`prototype self-test: FAILED (${errors.length} errors across ${assertions} assertions)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    `prototype self-test: ok (${catalog.length} catalog rules indexed, ${CANDIDATE_RULES.length} candidate probes, ${assertions} assertions passed)`
  );
}

// ---------- CLI Dispatch ----------

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (key === "json") {
        flags.json = true;
      } else if (i + 1 < args.length) {
        flags[key] = args[i + 1];
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function collectFiles(targetPath) {
  const abs = path.resolve(process.cwd(), targetPath);
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  const out = [];
  const skip = new Set([".git", "node_modules", "packs", "tests", "__pycache__"]);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && detectModality(p)) out.push(p);
    }
  }
  walk(abs);
  return out.sort();
}

const [, , subcmd, ...rest] = process.argv;
if (!subcmd || subcmd === "--help") {
  console.log(
    [
      "dislop Anti-Pattern Lab Prototype (standalone, read-only over packs/)",
      "Commands:",
      "  catalog [--query <q>] [--pack <id>] [--family <prefix>] [--modality <m>] [--severity <s>] [--lang en|zh] [--json]",
      "  probe <file-or-dir> [--lang en|zh] [--json]",
      "  self-test",
    ].join("\n")
  );
  process.exit(0);
}

if (subcmd === "self-test") {
  runSelfTest();
} else if (subcmd === "catalog") {
  const { flags } = parseFlags(rest);
  const lang = flags.lang || "zh";
  const all = loadCatalogEntries();
  const matched = queryCatalog(all, flags);
  if (flags.json) {
    console.log(JSON.stringify({ total: all.length, matched: matched.length, items: matched }, null, 2));
  } else {
    console.log(`Catalog matches: ${matched.length} / ${all.length}`);
    for (const e of matched) {
      const msg = e.message?.[lang] || e.message?.en || "";
      console.log(`  [${e.severity.padEnd(7)}] ${e.id.padEnd(32)} (${e.packId} · ${e.family}) — ${msg}`);
    }
  }
} else if (subcmd === "probe") {
  const { flags, positional } = parseFlags(rest);
  const lang = flags.lang || "zh";
  const target = positional[0] || ".";
  const files = collectFiles(target);
  const t0 = performance.now();
  const findings = [];
  for (const abs of files) {
    const mod = detectModality(abs);
    if (!["markdown", "text", "html", "css", "jsx"].includes(mod)) continue;
    const rel = path.relative(process.cwd(), abs).split(path.sep).join("/");
    const content = fs.readFileSync(abs, "utf8");
    findings.push(...runPrototypeProbes(content, { filename: rel, modality: mod }));
  }
  const elapsedMs = (performance.now() - t0).toFixed(1);
  if (flags.json) {
    console.log(JSON.stringify({ checkedFiles: files.length, elapsedMs: Number(elapsedMs), findings }, null, 2));
  } else {
    console.log(`Prototype probes: ${findings.length} finding(s) across ${files.length} file(s) in ${elapsedMs} ms`);
    for (const f of findings) {
      const msg = f.message?.[lang] || f.message?.en;
      console.log(`  [${f.severity.toUpperCase()}] ${f.file}:${f.location}  ${f.ruleId}  (${f.metric})`);
      console.log(`    match: "${f.match}"`);
      console.log(`    why:   ${msg}`);
    }
  }
} else {
  console.error(`Unknown subcommand: ${subcmd}`);
  process.exit(2);
}
