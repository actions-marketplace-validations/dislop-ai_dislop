// Shared zero-dependency structural probes, numeric fidelity helpers, and offline stylometrics
// used by server/ (LLM self-healing gate & voice extraction) and scripts/run_benchmark.mjs.

export function extractPlainTextForScoring(payload, modality = "markdown") {
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

  // 2. Pull-quote / slogan closer
  if (
    /(?:笔(?:一直|始终)在你手里|这才是[^。！？\n]{2,18}真正的[^。！？\n]{1,10}|the pen stays in your hand|built for the future|quality ships\.)/i.test(
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

export function extractKeyNumbers(text) {
  const cleaned = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:from|via|to|p|px|py|mt|mb|rounded|border|slate|indigo|purple|pink|gray|zinc)-\d+(?:\/\d+)?\b/gi, " ");
  const nums = [];
  for (const m of cleaned.matchAll(/\b\d+(?:[.,]\d+)?%?\b/g)) {
    nums.push(m[0].replace(/,/g, ""));
  }
  return Array.from(new Set(nums));
}

export function summarizeNumericDiff(beforePayload, afterPayload, modality = "markdown") {
  const srcNums = extractKeyNumbers(extractPlainTextForScoring(beforePayload, modality));
  const candNums = extractKeyNumbers(extractPlainTextForScoring(afterPayload, modality));
  const candSet = new Set(candNums);
  const srcSet = new Set(srcNums);
  const missing = srcNums.filter((n) => !candSet.has(n));
  const added = candNums.filter((n) => !srcSet.has(n));
  return {
    sourceCount: srcNums.length,
    retainedCount: srcNums.length - missing.length,
    retentionRate: srcNums.length > 0 ? (srcNums.length - missing.length) / srcNums.length : 1,
    missing,
    added,
  };
}

export function computeOfflineStylometrics(samples = [], lang = "zh") {
  const joined = (Array.isArray(samples) ? samples : [samples]).filter(Boolean).join("\n\n");
  const isZh = lang === "zh";
  const sentences = joined
    .split(isZh ? /[。！？\n]+/ : /[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= (isZh ? 4 : 8));

  const lengths = sentences.map((s) =>
    isZh ? (s.match(/[\u4E00-\u9FFF]/g) || []).length : s.split(/\s+/).filter(Boolean).length
  ).filter((n) => n > 0);

  if (lengths.length === 0) {
    return { sentenceCount: 0, meanLength: 0, lengthCV: 0, emDashCount: 0 };
  }
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const emDashCount = (joined.match(/——|—/g) || []).length;

  return {
    sentenceCount: lengths.length,
    meanLength: Number(mean.toFixed(1)),
    lengthCV: Number(cv.toFixed(2)),
    emDashCount,
  };
}
