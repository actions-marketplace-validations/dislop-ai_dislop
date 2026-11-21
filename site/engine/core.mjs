/**
 * dislop core engine (zero Node.js or DOM globals).
 * Shared identically by Node CLI, Node MCP server, and Browser Workbench (`site/`).
 */

export const ENGINE_VERSION = "0.2.0";

export const SEVERITY_RANK = {
  info: 1,
  warning: 2,
  error: 3,
  never: 99,
};

export const DISPLACEMENT_FAMILIES = new Set([
  "frame/negation-pivot",
  "frame/staccato",
  "frame/triad",
  "frame/ending",
  "frame/list-wall",
]);

const EXT_TO_MODALITY = {
  ".md": "markdown",
  ".mdx": "markdown",
  ".txt": "text",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".jsx": "jsx",
  ".tsx": "jsx",
  ".svg": "svg",
  ".docx": "docx",
  ".pptx": "pptx",
  ".pdf": "pdf",
};

export function detectModality(filename = "") {
  if (!filename || filename === "<memory>") return "markdown";
  const base = String(filename).split(/[\\/]/).pop().toLowerCase();
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  return EXT_TO_MODALITY[base.slice(dot)] || null;
}

export function defaultPackForModality(modality) {
  if (modality === "html" || modality === "css" || modality === "jsx" || modality === "svg" || modality === "pptx") {
    return "deck-and-ui";
  }
  return "business-brief";
}

export function resolveEffectivePack(packId, packsById, config = {}) {
  const target = packsById[packId];
  if (!target) {
    const available = Object.keys(packsById).sort().join(", ");
    throw new Error(`Unknown Taste Pack '${packId}'. Available packs: ${available}`);
  }
  const chain = [];
  const visited = new Set();
  function collect(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const p = packsById[id];
    if (!p) return;
    for (const parentId of p.extends || []) {
      collect(parentId);
    }
    chain.push(p);
  }
  collect(packId);

  const mergedThresholds = {};
  const rulesById = new Map();
  for (const p of chain) {
    Object.assign(mergedThresholds, p.thresholds || {});
    for (const rule of p.rules || []) {
      const override = config?.rules?.[rule.id];
      if (override === "off" && rule.tier !== "invariant") {
        rulesById.delete(rule.id);
        continue;
      }
      const effectiveRule = { ...rule };
      if (typeof override === "string" && SEVERITY_RANK[override] && rule.tier !== "invariant") {
        effectiveRule.severity = override;
      }
      rulesById.set(rule.id, effectiveRule);
    }
  }

  if (Array.isArray(config?.forbid) && config.forbid.length > 0) {
    rulesById.set("local-custom-forbid", {
      id: "local-custom-forbid",
      tier: "invariant",
      severity: "error",
      family: "hygiene/forbid",
      probe: "regex",
      zones: ["raw"],
      modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
      patterns: config.forbid,
      message: {
        en: "Matched forbidden pattern from local `.dislop.local.json` policy.",
        zh: "命中本地 `.dislop.local.json` 私有禁止词规则。",
      },
      deletionTest: {
        en: "Remove or de-identify the forbidden private term before committing.",
        zh: "提交前删除或脱敏该私有敏感词。",
      },
      exemplar: null,
    });
  }

  return {
    ...target,
    thresholds: mergedThresholds,
    rules: Array.from(rulesById.values()),
  };
}

const UTF8_ENCODER = new TextEncoder();

export function fnv1aHex(input) {
  const bytes = UTF8_ENCODER.encode(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function preserveLinesBlank(segment) {
  return segment.replace(/[^\r\n]/g, " ");
}

export function buildLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

export function offsetToLineCol(text, lineStarts, offset) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= offset) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const lineIdx = Math.max(0, hi);
  const lineStart = lineStarts[lineIdx];
  // Unified Unicode codepoint column (1-based) so Node, Browser, and Python agree on emoji/CJK
  const slice = text.slice(lineStart, offset);
  const col = Array.from(slice).length + 1;
  return { line: lineIdx + 1, col };
}

function enclosingSentence(text, start, end) {
  let left = start;
  while (left > 0 && !/[\n.!?。！？]/.test(text[left - 1])) {
    left -= 1;
  }
  let right = end;
  while (right < text.length && !/[\n.!?。！？]/.test(text[right])) {
    right += 1;
  }
  if (right < text.length && /[.!?。！？]/.test(text[right])) {
    right += 1;
  }
  return text.slice(left, right).trim().slice(0, 240);
}

/**
 * Parse inline suppressions:
 * <!-- dislop-ignore-next-line rule-id -- reason -->
 * /* dislop-ignore-next-line rule-id -- reason *\/
 */
export function parseSuppressions(text) {
  const lines = text.split(/\r?\n/);
  const byTargetLine = new Map();
  const directives = [];
  const patterns = [
    /<!--\s*dislop-(?:ignore|disable)-next-line\s+([a-z0-9_*, -]+?)\s*--\s*(.+?)\s*-->/i,
    /\/\*\s*dislop-(?:ignore|disable)-next-line\s+([a-z0-9_*, -]+?)\s*--\s*(.+?)\s*\*\//i,
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const ruleIds = m[1]
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const reason = m[2].trim();
        let targetLine = i + 2;
        while (targetLine <= lines.length && lines[targetLine - 1].trim() === "") {
          targetLine += 1;
        }
        const entry = {
          directiveLine: i + 1,
          targetLine,
          ruleIds,
          reason,
          used: false,
        };
        directives.push(entry);
        if (!byTargetLine.has(targetLine)) {
          byTargetLine.set(targetLine, []);
        }
        byTargetLine.get(targetLine).push(entry);
      }
    }
  }
  return { byTargetLine, directives };
}

/**
 * Build length-preserving masked views so character offsets match raw text 1:1.
 */
export function buildZones(rawText, modality) {
  // Raw zone masks only inline dislop-ignore comment directives themselves
  const raw = rawText
    .replace(/<!--\s*dislop-[\s\S]*?-->/gi, preserveLinesBlank)
    .replace(/\/\*\s*dislop-[\s\S]*?\*\//gi, preserveLinesBlank);

  let uiText = raw;
  // Mask quote-specimen blocks for taste rules
  uiText = uiText.replace(
    /<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi,
    preserveLinesBlank
  );
  // Mask HTML comments, script, style, code, pre, del
  uiText = uiText
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/<(script|style|code|pre|del|kbd)\b[^>]*>[\s\S]*?<\/\1>/gi, preserveLinesBlank);

  let prose = uiText;
  if (modality === "markdown" || modality === "text") {
    // YAML frontmatter
    prose = prose.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/, preserveLinesBlank);
    // Fenced code blocks
    prose = prose.replace(/```[\s\S]*?```/g, preserveLinesBlank);
    prose = prose.replace(/~~~[\s\S]*?~~~/g, preserveLinesBlank);
    // Inline code spans & strikethrough
    prose = prose.replace(/`[^`\n]+`/g, preserveLinesBlank);
    prose = prose.replace(/~~[^~\n]+~~/g, preserveLinesBlank);
    // Blockquotes (quoted external material)
    prose = prose.replace(/^[ \t]*>.*$/gm, preserveLinesBlank);
    // Markdown link targets ](url) while keeping visible [label]
    prose = prose.replace(/\]\([^)\n]+\)/g, (m) => "]" + preserveLinesBlank(m.slice(1)));
  } else if (modality === "html" || modality === "jsx" || modality === "svg") {
    // Strip tags in prose zone while preserving inner text offsets
    prose = prose.replace(/<[^>]+>/g, preserveLinesBlank);
  }
  // Mask bare URLs in prose
  prose = prose.replace(/https?:\/\/[^\s)>"'`]+/g, preserveLinesBlank);

  if (modality === "html" || modality === "jsx" || modality === "svg") {
    uiText = uiText.replace(/<[^>]+>/g, (tag) => {
      // Preserve aria-label / title / alt attribute text? Keep tag masked so regex checks visible text cleanly
      return preserveLinesBlank(tag);
    });
  }

  return { raw, prose, "ui-text": uiText };
}

function isAllowedMatch(matchText, allowList = []) {
  if (!allowList || allowList.length === 0) return false;
  const lower = matchText.toLowerCase();
  return allowList.some((item) => lower.includes(String(item).toLowerCase()));
}

// ---------- Structural Prose Probes ----------

function probeNegationPivot(proseText, rawText) {
  const hits = [];
  // Chinese: 这不是 A，而是 B / 不仅仅是 A，更是 B / 与其说 A，不如说 B
  const zhRegex = /(?:(?:这|那|它)?(?:并)?不(?:是|只是|仅仅?是)|与其说是?)([^，。！？；\n]{1,22})[，,；—]+\s*(?:而是|更是|不如说是?)([^。！？；\n]{1,28})/gu;
  let m;
  while ((m = zhRegex.exec(proseText)) !== null) {
    const clauseA = m[1] || "";
    const clauseB = m[2] || "";
    const rawSlice = rawText.slice(m.index, m.index + m[0].length);
    const bothHaveConcrete =
      (/\d/.test(clauseA) && /\d/.test(clauseB)) ||
      /`/.test(rawSlice) ||
      /\.[a-z]{2,4}\b/i.test(rawSlice) ||
      /(?:第一次|第二次|站台|号楼|排第|星期|周[一二三四五六日天])/.test(rawSlice);
    if (bothHaveConcrete || clauseB.trim().length > 26) {
      continue;
    }
    if (clauseA.trim().length === 0 || clauseB.trim().length === 0) continue;
    hits.push({ index: m.index, length: m[0].length });
  }

  // English: It's not (just) X — it's Y / This isn't a X (. / —) it's Y
  const enRegex = /\b(?:(?:it|this|that)(?:'s| is| was| isn't| wasn't)|they(?:'re| are| aren't))\s+(?:not\s+)?(?:just|merely|simply|only)\s+([^.;!?\n—–]{2,50}?)(?:[,;—–-]\s*(?:but|it(?:'s| is| was)|that(?:'s| is| was)|they(?:'re| are))\s+)([^.!?\n]{2,70})|\b(?:It|This|That)\s+(?:isn't|wasn't|is not|was not)\s+(?:a\s+|an\s+|just\s+)?([A-Za-z][A-Za-z0-9 -]{1,32}?)\s*(?:[.!]\s+|[—–-]\s*)(?:it's|it is|it was|that's)\s+([^.!?\n]{2,70})/giu;
  while ((m = enRegex.exec(proseText)) !== null) {
    const clauseA = m[1] || m[3] || "";
    const clauseB = m[2] || m[4] || "";
    const rawSlice = rawText.slice(m.index, m.index + m[0].length);
    if ((/\d/.test(clauseA) && /\d/.test(clauseB)) || /`/.test(rawSlice) || /\.[a-z]{2,4}\b/i.test(rawSlice)) {
      continue;
    }
    hits.push({ index: m.index, length: m[0].length });
  }
  return hits;
}

function probeStaccatoRun(proseText) {
  const hits = [];
  // Inspect paragraph by paragraph
  const paraRegex = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  let pm;
  while ((pm = paraRegex.exec(proseText)) !== null) {
    const para = pm[0];
    const trimmed = para.trim();
    if (!trimmed) continue;
    // Skip headings, lists, tables
    if (/^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(trimmed)) continue;

    // Collect sentences with offsets inside paragraph
    const sentRegex = /[^.!?。！？\n]+[.!?。！？]/gu;
    const sentences = [];
    let sm;
    while ((sm = sentRegex.exec(para)) !== null) {
      const s = sm[0].trim();
      if (!s) continue;
      const body = s.replace(/[.!?。！？]+$/u, "").trim();
      if (!body) continue;
      const cjkCount = (body.match(/[\u4e00-\u9fff]/gu) || []).length;
      const enWords = body.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
      const isShort =
        (cjkCount >= 2 && cjkCount <= 6 && enWords <= 1 && !/[，,：:；;]/.test(body)) ||
        (cjkCount === 0 && enWords >= 2 && enWords <= 4 && !/[,:;]/.test(body));
      sentences.push({
        start: pm.index + sm.index + sm[0].indexOf(s),
        end: pm.index + sm.index + sm[0].indexOf(s) + s.length,
        isShort,
      });
    }

    let runStart = -1;
    let runCount = 0;
    for (let i = 0; i <= sentences.length; i += 1) {
      const cur = sentences[i];
      if (cur && cur.isShort) {
        if (runCount === 0) runStart = i;
        runCount += 1;
      } else {
        if (runCount >= 3) {
          const first = sentences[runStart];
          const last = sentences[i - 1];
          hits.push({ index: first.start, length: last.end - first.start });
        }
        runCount = 0;
      }
    }
  }
  return hits;
}

function probeZhFourCharTriad(proseText) {
  const hits = [];
  const triadRegex = /(?:^|[，。！？；：、“‘（\s]|(?:实现|具备|坚持|保持|做到|形成|打造|追求|提供|确保|了|是|的|以|向|为))([\u4e00-\u9fff]{4})[、，,]\s*([\u4e00-\u9fff]{4})[、，,]\s*([\u4e00-\u9fff]{4})(?=$|[，。！？；：、”’）\s]|[的地等])/gu;
  const entitySuffix = /(?:大学|学院|学校|公司|集团|银行|医院|中心|委员|政府|部门|机场|车站|高速|铁路|[省市区县镇乡])$/u;
  const brokenSlice = /[的了在或与及把被]/u;
  let m;
  while ((m = triadRegex.exec(proseText)) !== null) {
    const items = [m[1], m[2], m[3]];
    if (items.some((w) => entitySuffix.test(w) || brokenSlice.test(w))) continue;
    const triadStr = `${m[1]}${proseText.slice(m.index).match(/[、，,]/)[0]}${m[2]}`;
    const startOffset = m.index + m[0].indexOf(m[1]);
    const prevChar = startOffset > 0 ? proseText[startOffset - 1] : "";
    if (prevChar === "《") continue;
    void triadStr;
    hits.push({ index: startOffset, length: m.index + m[0].length - startOffset });
  }
  return hits;
}

function probeUnsourcedAttribution(proseText, rawText) {
  const hits = [];
  const attrRegex = /\b(?:[Ss]tudies|[Rr]esearch|[Ii]ndustry\s+research|[Ee]xperts|[Dd]ata)\s+(?:shows?|suggests?|indicates?|proves?)\b|(?:研究|数据|专家|业内人士|行业报告)(?:表明|显示|指出|认为)[，,]?/gu;
  let m;
  while ((m = attrRegex.exec(proseText)) !== null) {
    // Inspect enclosing + lookahead window in rawText for citation markers, links, years, or《report》
    const winStart = Math.max(0, m.index - 30);
    const winEnd = Math.min(rawText.length, m.index + 180);
    const windowRaw = rawText.slice(winStart, winEnd);
    const hasSource =
      /\[\^?\d+\]/.test(windowRaw) ||
      /\]\([^)]+\)/.test(windowRaw) ||
      /https?:\/\//.test(windowRaw) ||
      /\([^()\n]{2,40},\s*(?:19|20)\d{2}[a-z]?\)/.test(windowRaw) ||
      /《[^》\n]{2,30}》/.test(windowRaw) ||
      /(?:见|参见|详见)\s*\[/.test(windowRaw);
    if (!hasSource) {
      hits.push({ index: m.index, length: m[0].length });
    }
  }
  return hits;
}

function probeBoldLeadListWall(proseText, rawText, minRun = 4) {
  const hits = [];
  const lines = rawText.split(/\r?\n/);
  let offset = 0;
  let runStartOffset = 0;
  let runEndOffset = 0;
  let runCount = 0;

  for (let i = 0; i <= lines.length; i += 1) {
    const line = i < lines.length ? lines[i] : "";
    const proseLine = i < lines.length ? proseText.slice(offset, offset + line.length) : "";
    const isBullet =
      proseLine.trim().length > 0 &&
      /^\s*(?:[-*+]|\d+[.)])\s+\*\*([^*\n`]{2,36})\*\*\s*[:：—-]/.test(line);
    if (isBullet) {
      if (runCount === 0) runStartOffset = offset + line.search(/\S/);
      runCount += 1;
      runEndOffset = offset + line.length;
    } else if (i === lines.length || line.trim() !== "") {
      if (runCount >= minRun) {
        hits.push({ index: runStartOffset, length: runEndOffset - runStartOffset });
      }
      runCount = 0;
    }
    offset += line.length + 1;
  }
  return hits;
}

function probeEmDashDensity(proseText, maxPer300 = 4) {
  const hits = [];
  const paraRegex = /[^\n]+(?:\n(?!\s*\n)[^\n]+)*/g;
  let pm;
  while ((pm = paraRegex.exec(proseText)) !== null) {
    const para = pm[0];
    if (/^\s*\|/.test(para)) continue;
    // Normalize Chinese `——` as ONE logical dash
    const normalized = para.replace(/——/g, "—");
    const dashes = (normalized.match(/—/g) || []).length;
    if (dashes < 5) continue;
    const cjk = (normalized.match(/[\u4e00-\u9fff]/gu) || []).length;
    const enWords = normalized.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    const units = Math.max(1, enWords + cjk * 0.6);
    const density = (dashes / units) * 300;
    if (density > maxPer300) {
      const firstDash = para.indexOf("—");
      hits.push({ index: pm.index + Math.max(0, firstDash), length: Math.min(para.length, 48) });
    }
  }
  return hits;
}

function probeZhHalfwidthPunctuation(proseText) {
  const hits = [];
  const re = /[\u4e00-\u9fff][,;:!?][\u4e00-\u9fff]/gu;
  let m;
  while ((m = re.exec(proseText)) !== null) {
    hits.push({ index: m.index, length: m[0].length });
  }
  return hits;
}

// ---------- UI, CSS, HTML & SVG Probes ----------

function parseColorRgb(raw) {
  if (!raw) return null;
  const val = raw.trim().toLowerCase();
  const hex6 = val.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex3 = val.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const [r, g, b] = hex3[1].split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  const rgb = val.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  if (val === "white") return [255, 255, 255];
  if (val === "black") return [0, 0, 0];
  return null;
}

export function relativeLuminance([r, g, b]) {
  const chan = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

export function contrastRatio(rgbA, rgbB) {
  const l1 = relativeLuminance(rgbA);
  const l2 = relativeLuminance(rgbB);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function lightnessStar(rgb) {
  const y = relativeLuminance(rgb);
  return y <= 0.008856 ? y * 903.3 : Math.cbrt(y) * 116 - 16;
}

function rgbToHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function probeUiDeadControl(rawText) {
  const clean = rawText
    .replace(/<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi, preserveLinesBlank)
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/<(script|style|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, preserveLinesBlank);

  const hits = [];
  // 1. Dead anchors: <a href="#"> / href="" / href="javascript:..." without click handler
  const anchorRe = /<a\b([^>]*)>/gi;
  let m;
  while ((m = anchorRe.exec(clean)) !== null) {
    const attrs = m[1] || "";
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? "").trim() : null;
    const hasHandler = /\b(?:onClick|onclick|@click|hx-get|hx-post)\b/.test(attrs);
    if (!hasHandler && (href === "#" || href === "" || (href && /^javascript:/i.test(href)))) {
      hits.push({ index: m.index, length: m[0].length, severity: "error" });
    }
  }

  // 2. Empty or unexplained static disabled <button>
  const btnRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  while ((m = btnRe.exec(clean)) !== null) {
    const attrs = m[1] || "";
    const inner = (m[2] || "").replace(/<[^>]+>/g, "").trim();
    const hasLabel = inner.length > 0 || /\b(?:aria-label|aria-labelledby|title)\s*=\s*["'][^"']+["']/i.test(attrs);
    if (!hasLabel && !/\{\.\.\./.test(attrs)) {
      hits.push({ index: m.index, length: m[0].length, severity: "error" });
      continue;
    }
    const staticDisabled = /\bdisabled(?:\s*=\s*(?:""|"disabled"|'disabled'|\{true\}))?(?=[\s/>]|$)/i.test(attrs);
    const hasReason = /\b(?:title|aria-describedby|data-allow-disabled)\b/i.test(attrs);
    if (staticDisabled && !hasReason) {
      hits.push({ index: m.index, length: m[0].length, severity: "warning" });
    }
  }
  return hits;
}

function collectCssVars(cssText) {
  const vars = new Map();
  const rootRe = /:root\s*\{([^}]*)\}/gi;
  let m;
  while ((m = rootRe.exec(cssText)) !== null) {
    const body = m[1];
    const declRe = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g;
    let dm;
    while ((dm = declRe.exec(body)) !== null) {
      const rgb = parseColorRgb(dm[2]);
      if (rgb) vars.set(dm[1], rgb);
    }
  }
  return vars;
}

function resolveColorToken(rawVal, vars) {
  if (!rawVal) return null;
  const direct = parseColorRgb(rawVal);
  if (direct) return direct;
  const vm = rawVal.trim().match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
  if (vm && vars.has(vm[1])) return vars.get(vm[1]);
  return null;
}

function probeUiContrastAndDarkInversion(rawText) {
  const clean = rawText
    .replace(/<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi, preserveLinesBlank)
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/\/\*[\s\S]*?\*\//g, preserveLinesBlank);

  const hits = [];
  const rootVars = collectCssVars(clean);

  // 1. Check CSS declaration blocks and inline style="..." pairs
  const blockRe = /([^{};>\n][^{};\n]*)\{([^{}]+)\}|style\s*=\s*"([^"]+)"/gi;
  let bm;
  while ((bm = blockRe.exec(clean)) !== null) {
    const selector = (bm[1] || "").trim();
    const body = bm[2] || bm[3] || "";
    const props = new Map();
    const localVars = new Map(rootVars);

    const declRe = /([A-Za-z_-][A-Za-z0-9_-]*|--[A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g;
    let dm;
    while ((dm = declRe.exec(body)) !== null) {
      const key = dm[1].trim().toLowerCase();
      const val = dm[2].trim();
      props.set(key, val);
      if (key.startsWith("--")) {
        const rgb = parseColorRgb(val);
        if (rgb) localVars.set(dm[1].trim(), rgb);
      }
    }

    const fg = resolveColorToken(props.get("color"), localVars);
    const bg = resolveColorToken(props.get("background-color") || props.get("background"), localVars);
    if (fg && bg) {
      const ratio = contrastRatio(fg, bg);
      const fsMatch = (props.get("font-size") || "").match(/^(\d+(?:\.\d+)?)px$/i);
      const fontPx = fsMatch ? Number(fsMatch[1]) : 16;
      const isBold = /^(?:bold|[6789]00)$/i.test((props.get("font-weight") || "").trim());
      const minRatio = fontPx >= 24 || (fontPx >= 18.66 && isBold) ? 3.0 : 4.5;
      if (ratio < minRatio) {
        hits.push({ index: bm.index, length: bm[0].length });
      }
    }

    // 2. Dark-mode Z-luminance inversion check on custom property blocks
    if (/(?:\.dark\b|data-theme\s*=\s*["']?dark|theme-dark)/i.test(selector)) {
      checkDarkElevationBlock(localVars, body, bm.index, bm[0].length, hits);
    }
  }

  // Also check @media (prefers-color-scheme: dark) { :root { ... } }
  const mediaDarkRe = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?\})\s*\}/gi;
  let mm;
  while ((mm = mediaDarkRe.exec(clean)) !== null) {
    const innerVars = new Map();
    const declRe = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);?/g;
    let dm;
    while ((dm = declRe.exec(mm[1])) !== null) {
      const rgb = parseColorRgb(dm[2]);
      if (rgb) innerVars.set(dm[1], rgb);
    }
    checkDarkElevationBlock(innerVars, mm[1], mm.index, mm[0].length, hits);
  }

  return hits;
}

function checkDarkElevationBlock(varMap, bodyText, index, length, hits) {
  const baseRoles = [];
  const raisedRoles = [];
  for (const [name, rgb] of varMap.entries()) {
    if (!bodyText.includes(name)) continue;
    const lower = name.toLowerCase();
    if (/(?:inset|well|sunken|input|code|backdrop|overlay|shadow)/.test(lower)) continue;
    if (/^--(?:bg|background|page|paper|canvas|stage|ground)$/.test(lower)) {
      baseRoles.push({ name, lStar: lightnessStar(rgb) });
    } else if (/^--(?:surface|card|sheet|raised|panel|elevated|popover|modal)(?:-[12])?$/.test(lower)) {
      raisedRoles.push({ name, lStar: lightnessStar(rgb) });
    }
  }
  for (const base of baseRoles) {
    for (const raised of raisedRoles) {
      if (base.lStar > raised.lStar + 1.5) {
        hits.push({ index, length });
        return;
      }
    }
  }
}

function probeUiAiGradient(rawText) {
  const clean = rawText
    .replace(/<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi, preserveLinesBlank)
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/\/\*[\s\S]*?\*\//g, preserveLinesBlank)
    .replace(/<(script|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, preserveLinesBlank);

  const hits = [];
  // 1. Tailwind purple/indigo/violet + pink/fuchsia/purple gradient or gradient-clipped text
  const twRe = /\b(?:from-(?:indigo|purple|violet)-\d{2,3}[^"'\n>]{0,60}(?:to|via)-(?:purple|pink|fuchsia|violet)-\d{2,3}|bg-clip-text\s+text-transparent|text-transparent\s+bg-clip-text)\b/gi;
  let m;
  while ((m = twRe.exec(clean)) !== null) {
    hits.push({ index: m.index, length: m[0].length });
  }

  // 2. CSS gradient with purple-pink hex stops or background-clip: text
  const cssGradRe = /(?:linear|radial)-gradient\(([^)]+)\)/gi;
  while ((m = cssGradRe.exec(clean)) !== null) {
    const hexes = m[1].match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    let purplePinkStops = 0;
    for (const hx of hexes) {
      const rgb = parseColorRgb(hx);
      if (!rgb) continue;
      const [h, s] = rgbToHsl(rgb);
      if (h >= 245 && h <= 345 && s >= 45) purplePinkStops += 1;
    }
    const nearSlice = clean.slice(m.index, Math.min(clean.length, m.index + m[0].length + 120));
    const isClipText = /background-clip\s*:\s*text/i.test(nearSlice);
    if (purplePinkStops >= 2 || isClipText) {
      hits.push({ index: m.index, length: m[0].length });
    }
  }
  return hits;
}

function probeUiPillSoup(rawText, maxPills = 6) {
  const clean = rawText
    .replace(/<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi, preserveLinesBlank)
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/<(script|style|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, preserveLinesBlank);

  const pillRe = /<([a-z0-9]+)\b([^>]*(?:\brounded-full\b|border-radius\s*:\s*999\d*px)[^>]*)>([^<]{1,48})<\/\1>/gi;
  const matches = [];
  let m;
  while ((m = pillRe.exec(clean)) !== null) {
    const attrs = m[2] || "";
    const text = (m[3] || "").trim();
    if (!text) continue;
    // Exempt square dots/avatars (`w-6 h-6`, `size-2`)
    if (/\bsize-\d/.test(attrs)) continue;
    const wh = attrs.match(/\bw-(\d+)\b.*\bh-(\d+)\b/);
    if (wh && wh[1] === wh[2]) continue;
    matches.push({ index: m.index, length: m[0].length });
  }
  if (matches.length > maxPills) {
    return [matches[0]];
  }
  return [];
}

function probeUiBoxInBox(rawText) {
  const clean = rawText
    .replace(/<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->/gi, preserveLinesBlank)
    .replace(/<!--[\s\S]*?-->/g, preserveLinesBlank)
    .replace(/<(script|style|code|pre|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, preserveLinesBlank);

  const tokenRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>/g;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  const stack = [];
  const hits = [];
  let m;
  while ((m = tokenRe.exec(clean)) !== null) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    const attrs = m[2] || "";
    const selfClose = m[3] === "/" || voidTags.has(tag);
    if (full.startsWith("</")) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const hasBorderOrShadow = /\b(?:border(?:-[a-z0-9]+)?| ring-1|shadow(?:-[a-z]+)?)\b|border\s*:/i.test(attrs) && !/\bborder-(?:t|b|l|r|0|none)\b/.test(attrs);
    const hasRadius = /\brounded(?:-[a-z0-9]+)?\b|border-radius\s*:/i.test(attrs) && !/\brounded-none\b/.test(attrs);
    const hasPad = /\bp[xy]?-\d|padding\s*:/i.test(attrs);
    const isBox = hasBorderOrShadow && hasRadius && hasPad;
    const boxDepth = (stack.length > 0 ? stack[stack.length - 1].boxDepth : 0) + (isBox ? 1 : 0);

    if (isBox && boxDepth >= 3 && hits.length === 0) {
      hits.push({ index: m.index, length: full.length });
    }
    if (!selfClose) {
      stack.push({ tag, boxDepth });
    }
  }
  return hits;
}

function probeSvgTextOverflow(rawText) {
  const hits = [];
  const svgMatch = rawText.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!svgMatch) return hits;
  const svgAttrs = svgMatch[1] || "";
  const svgBody = svgMatch[2] || "";
  const isDecorative = /\baria-hidden\s*=\s*["']true["']/i.test(svgAttrs);
  const hasA11y = /<title\b[^>]*>[^<]+<\/title>/i.test(svgBody) || /\baria-label\s*=\s*["'][^"']+["']/i.test(svgAttrs);
  if (!isDecorative && !hasA11y) {
    hits.push({ index: svgMatch.index, length: Math.min(svgMatch[0].length, 80) });
  }

  const vb = svgAttrs.match(/\bviewBox\s*=\s*["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*["']/i);
  if (!vb) return hits;
  const minX = Number(vb[1]);
  const vbWidth = Number(vb[3]);
  const maxX = minX + vbWidth;

  const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let tm;
  while ((tm = textRe.exec(rawText)) !== null) {
    const attrs = tm[1] || "";
    const content = (tm[2] || "").replace(/<[^>]+>/g, "").trim();
    if (!content) continue;
    const xMatch = attrs.match(/\bx\s*=\s*["']([\d.-]+)["']/i);
    const fsMatch = attrs.match(/\bfont-size\s*=\s*["']([\d.]+)(?:px)?["']/i);
    const x = xMatch ? Number(xMatch[1]) : 0;
    const fontSize = fsMatch ? Number(fsMatch[1]) : 16;
    const anchor = (attrs.match(/\btext-anchor\s*=\s*["']([a-z]+)["']/i) || [])[1] || "start";
    let estWidth = 0;
    for (const ch of content) {
      estWidth += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/u.test(ch) ? fontSize * 1.02 : fontSize * 0.58;
    }
    const rightEdge = anchor === "middle" ? x + estWidth / 2 : anchor === "end" ? x : x + estWidth;
    const leftEdge = anchor === "middle" ? x - estWidth / 2 : anchor === "end" ? x - estWidth : x;
    if (rightEdge > maxX * 0.99 || leftEdge < minX) {
      hits.push({ index: tm.index, length: tm[0].length });
    }
  }
  return hits;
}

// ---------- Core Text Auditor ----------

export function auditText(text, { filename = "<memory>", modality = null, pack, config = {}, allowSyntheticFixtures = false } = {}) {
  const mod = modality || detectModality(filename) || "markdown";
  const lineStarts = buildLineStarts(text);
  const zones = buildZones(text, mod);
  const { byTargetLine, directives } = parseSuppressions(text);
  const allowList = config?.allow || [];
  const findings = [];

  for (const rule of pack.rules || []) {
    if (rule.modalities && !rule.modalities.includes(mod)) continue;

    // Synthetic Office/PDF fixture tokens ONLY during `dislop pack-test`
    if (allowSyntheticFixtures && (text.startsWith("DOCX_") || text.startsWith("PPTX_"))) {
      const synthHits = evaluateSyntheticBinaryFixture(text, rule, pack.thresholds || {});
      for (const h of synthHits) {
        findings.push(makeFinding({ rule, filename, modality: mod, location: h.location, match: h.match, sentence: text, span: { start: 0, end: text.length } }));
      }
      continue;
    }

    let rawHits = [];
    const primaryZoneName = (rule.zones && rule.zones[0]) || "prose";
    const zoneText = zones[primaryZoneName] ?? zones.prose;

    if (rule.probe === "regex") {
      for (const pattern of rule.patterns || []) {
        const re = new RegExp(pattern, "gimu");
        let m;
        while ((m = re.exec(zoneText)) !== null) {
          if (m[0].length === 0) {
            re.lastIndex += 1;
            continue;
          }
          let idx = m.index;
          let len = m[0].length;
          if (primaryZoneName === "prose") {
            const lead = m[0].match(/^[.!?。！？\s]+/);
            if (lead && lead[0].length < len) {
              idx += lead[0].length;
              len -= lead[0].length;
            }
          }
          rawHits.push({ index: idx, length: len });
        }
      }
    } else if (rule.probe === "negation-pivot") {
      rawHits = probeNegationPivot(zoneText, text);
    } else if (rule.probe === "staccato-run") {
      rawHits = probeStaccatoRun(zoneText);
    } else if (rule.probe === "zh-four-char-triad") {
      rawHits = probeZhFourCharTriad(zoneText);
    } else if (rule.probe === "unsourced-attribution") {
      rawHits = probeUnsourcedAttribution(zoneText, text);
    } else if (rule.probe === "bold-lead-list-wall") {
      rawHits = probeBoldLeadListWall(zoneText, text, pack.thresholds?.boldLeadListRun || 4);
    } else if (rule.probe === "em-dash-density") {
      rawHits = probeEmDashDensity(zoneText, pack.thresholds?.maxEmDashesPer300Words || 4);
    } else if (rule.probe === "zh-halfwidth-punctuation") {
      rawHits = probeZhHalfwidthPunctuation(zoneText);
    } else if (rule.probe === "ui-dead-control") {
      rawHits = probeUiDeadControl(text);
    } else if (rule.probe === "ui-contrast-and-dark-inversion") {
      rawHits = probeUiContrastAndDarkInversion(text);
    } else if (rule.probe === "ui-ai-gradient") {
      rawHits = probeUiAiGradient(text);
    } else if (rule.probe === "ui-pill-soup") {
      rawHits = probeUiPillSoup(text, pack.thresholds?.maxPillsPerFile || 6);
    } else if (rule.probe === "ui-box-in-box") {
      rawHits = probeUiBoxInBox(text);
    } else if (rule.probe === "svg-text-overflow") {
      rawHits = probeSvgTextOverflow(text);
    }

    // Sort and deduplicate overlapping spans emitted by multiple patterns of the same rule
    rawHits.sort((a, b) => a.index - b.index || b.length - a.length);
    const dedupHits = [];
    for (const h of rawHits) {
      const prev = dedupHits[dedupHits.length - 1];
      if (prev && h.index < prev.index + prev.length) continue;
      dedupHits.push(h);
    }

    for (const hit of dedupHits) {
      const start = hit.index;
      const end = hit.index + hit.length;
      const matchedRaw = text.slice(start, end);
      if (isAllowedMatch(matchedRaw, allowList)) continue;

      const { line, col } = offsetToLineCol(text, lineStarts, start);
      const lineSuppressions = byTargetLine.get(line) || [];
      let suppressed = false;
      for (const sup of lineSuppressions) {
        if (sup.ruleIds.includes("all") || sup.ruleIds.includes("*") || sup.ruleIds.includes(rule.id)) {
          sup.used = true;
          suppressed = true;
        }
      }
      if (suppressed) continue;

      const sentence = enclosingSentence(text, start, end);
      findings.push(
        makeFinding({
          rule: hit.severity ? { ...rule, severity: hit.severity } : rule,
          filename,
          modality: mod,
          location: `${line}:${col}`,
          line,
          col,
          span: { start, end },
          match: matchedRaw.replace(/\s+/g, " ").trim().slice(0, 140),
          sentence,
        })
      );
    }
  }

  const unusedSuppressions = directives
    .filter((d) => !d.used)
    .map((d) => ({
      file: filename,
      line: d.directiveLine,
      ruleIds: d.ruleIds,
      reason: d.reason,
    }));

  findings.sort((a, b) => (a.line || 0) - (b.line || 0) || (a.col || 0) - (b.col || 0));
  return { findings, unusedSuppressions };
}

function evaluateSyntheticBinaryFixture(fixture, rule, thresholds) {
  if (rule.probe === "office-markdown-leak" && fixture.startsWith("DOCX_RAW_MARKDOWN:")) {
    return [{ location: "para 1", match: "**Key Milestone**" }];
  }
  if (rule.probe === "office-pdf-hygiene") {
    if (fixture === "PPTX_OFF_SLIDE:1") return [{ location: "slide 1", match: "off-slide shape" }];
    if (fixture === "DOCX_TRACKED_CHANGE:1") return [{ location: "para 1", match: "tracked change <w:ins>" }];
  }
  if (rule.probe === "slide-word-wall" && fixture.startsWith("PPTX_WORD_WALL:")) {
    const count = Number(fixture.split(":")[1] || 0);
    if (count > (thresholds.maxSlideWords || 120)) return [{ location: "slide 1", match: `${count} words` }];
  }
  if (rule.probe === "slide-bullet-overload" && fixture.startsWith("PPTX_BULLETS:")) {
    const count = Number(fixture.split(":")[1] || 0);
    if (count > (thresholds.maxSlideBullets || 6)) return [{ location: "slide 1", match: `${count} bullets` }];
  }
  if (rule.probe === "slide-autofit-shrink" && fixture.startsWith("PPTX_AUTOFIT:")) {
    const scale = Number(fixture.split(":")[1] || 100000);
    if (scale < (thresholds.minAutofitScale || 80000)) return [{ location: "slide 1", match: `fontScale=${scale}` }];
  }
  if (rule.probe === "slide-weak-topic-title" && fixture.startsWith("PPTX_WEAK_TITLE:")) {
    return [{ location: "slide 1", match: fixture.split(":")[1] }];
  }
  return [];
}

export function makeFinding({ rule, filename, modality, location, line = 1, col = 1, span = null, match, sentence = "" }) {
  const normMatch = String(match || "").toLowerCase().trim();
  const normSent = String(sentence || normMatch).toLowerCase().replace(/\s+/g, " ").trim();
  const fingerprint = `${rule.id}:${fnv1aHex(`${rule.id}|${normMatch}|${normSent}`)}`;
  return {
    fingerprint,
    ruleId: rule.id,
    tier: rule.tier || "taste",
    severity: rule.severity || "warning",
    family: rule.family || "general",
    file: filename,
    modality,
    location,
    line,
    col,
    span,
    match,
    message: rule.message,
    deletionTest: rule.deletionTest || null,
    exemplar: rule.exemplar || null,
  };
}

// ---------- Structured DOCX / PPTX / PDF Document Auditor ----------

function decodeXmlEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Audit an already-extracted map of archive entries `{ [entryPath]: string }` for `.docx` or `.pptx`.
 * Shared between Node (`zlib.inflateRawSync`) and Browser (`DecompressionStream('deflate-raw')`).
 */
export function auditOoxmlEntries(entries, { filename, modality, pack, config = {} }) {
  const findings = [];
  const skipped = [];
  const rulesById = new Map((pack.rules || []).map((r) => [r.id, r]));

  // Check all .rels files for leaked external `file:` links
  const pathRule = rulesById.get("local-path-leak");
  if (pathRule) {
    for (const [entryName, xml] of Object.entries(entries)) {
      if (!entryName.endsWith(".rels")) continue;
      const relRe = /Target\s*=\s*"([^"]+)"[^>]*TargetMode\s*=\s*"External"|TargetMode\s*=\s*"External"[^>]*Target\s*=\s*"([^"]+)"/gi;
      let rm;
      while ((rm = relRe.exec(xml)) !== null) {
        const target = rm[1] || rm[2] || "";
        if (/^(?:file:|\\\\|\/Users\/|[A-Za-z]:\\)/i.test(target)) {
          findings.push(makeFinding({ rule: pathRule, filename, modality, location: entryName, match: target.slice(0, 120) }));
        }
      }
    }
  }

  if (modality === "docx") {
    const docXml = entries["word/document.xml"];
    if (!docXml) {
      return { findings, skipped: [{ file: filename, reason: "Missing word/document.xml inside DOCX archive" }] };
    }
    const hygieneRule = rulesById.get("office-pdf-hygiene");
    if (hygieneRule) {
      if (/<w:(?:ins|del)\b/.test(docXml)) {
        findings.push(makeFinding({ rule: hygieneRule, filename, modality, location: "document", match: "Unaccepted tracked changes (<w:ins>/<w:del>)" }));
      }
      if (entries["word/comments.xml"] && /<w:comment\b/.test(entries["word/comments.xml"])) {
        findings.push(makeFinding({ rule: hygieneRule, filename, modality, location: "comments", match: "Unremoved review comments in word/comments.xml" }));
      }
    }

    // Extract paragraphs joining <w:t> runs cleanly while excluding <w:delText>
    const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pm;
    let paraIndex = 0;
    const mdLeakRule = rulesById.get("markdown-leak");
    while ((pm = paraRe.exec(docXml)) !== null) {
      const pBody = pm[1].replace(/<w:del\b[\s\S]*?<\/w:del>/g, "");
      const runs = [];
      const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let tm;
      while ((tm = tRe.exec(pBody)) !== null) {
        runs.push(decodeXmlEntities(tm[1]));
      }
      const paraText = runs.join("").trim();
      if (!paraText) continue;
      paraIndex += 1;

      if (mdLeakRule && (/\*\*[^*\n]{1,80}\*\*/.test(paraText) || /^#{1,6}\s+\S/.test(paraText))) {
        findings.push(makeFinding({ rule: mdLeakRule, filename, modality, location: `para ${paraIndex}`, line: paraIndex, match: paraText.slice(0, 100) }));
      }

      const sub = auditText(paraText, { filename, modality: "markdown", pack, config });
      for (const f of sub.findings) {
        if (f.ruleId === "markdown-leak") continue;
        findings.push({ ...f, modality: "docx", location: `para ${paraIndex}`, line: paraIndex });
      }
    }
    return { findings, skipped };
  }

  if (modality === "pptx") {
    const presXml = entries["ppt/presentation.xml"] || "";
    const presRels = entries["ppt/_rels/presentation.xml.rels"] || "";

    // Parse slide size (default 9144000 x 6858000 EMU)
    const szMatch = presXml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    const slideCx = szMatch ? Number(szMatch[1]) : 9144000;
    const slideCy = szMatch ? Number(szMatch[2]) : 6858000;

    // Resolve presentation slide order via p:sldIdLst -> r:id -> Target
    const relMap = new Map();
    const relRe = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"|<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g;
    let rm;
    while ((rm = relRe.exec(presRels)) !== null) {
      const id = rm[1] || rm[4];
      const rawTarget = (rm[2] || rm[3] || "").replace(/^\/+/, "").replace(/^\.\.\//, "ppt/");
      const target = rawTarget.startsWith("ppt/") ? rawTarget : `ppt/${rawTarget}`;
      relMap.set(id, target);
    }

    const orderedSlides = [];
    const sldIdRe = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
    let sm;
    while ((sm = sldIdRe.exec(presXml)) !== null) {
      const target = relMap.get(sm[1]);
      if (target && entries[target]) orderedSlides.push(target);
    }
    if (orderedSlides.length === 0) {
      const fallback = Object.keys(entries)
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
        .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
      orderedSlides.push(...fallback);
    }
    if (orderedSlides.length === 0) {
      return { findings, skipped: [{ file: filename, reason: "Missing ppt/slides/*.xml inside PPTX archive" }] };
    }

    const hygieneRule = rulesById.get("office-pdf-hygiene");
    const mdLeakRule = rulesById.get("markdown-leak");
    const wordWallRule = rulesById.get("slide-word-wall");
    const bulletRule = rulesById.get("slide-bullet-overload");
    const autofitRule = rulesById.get("slide-autofit-shrink");
    const weakTitleRule = rulesById.get("slide-weak-topic-title");
    const thresholds = pack.thresholds || {};

    orderedSlides.forEach((slideEntry, idx) => {
      const slideNum = idx + 1;
      const xml = entries[slideEntry];
      const isHidden = /<p:sld\b[^>]*\bshow="0"/.test(xml);
      if (isHidden) {
        skipped.push({ file: `${filename}#slide-${slideNum}`, reason: "Hidden slide (show=0) skipped for density rules" });
      }

      // Autofit shrink check
      if (autofitRule && !isHidden) {
        const afMatch = xml.match(/<a:normAutofit\b[^>]*\bfontScale="(\d+)"/);
        if (afMatch && Number(afMatch[1]) < (thresholds.minAutofitScale || 80000)) {
          const pct = Math.round(Number(afMatch[1]) / 1000);
          findings.push(makeFinding({ rule: autofitRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: `normAutofit fontScale=${pct}%` }));
        }
      }

      // Inspect shapes (<p:sp>) for off-slide text, title, bullets, and joined paragraphs
      const spRe = /<p:sp\b[\s\S]*?<\/p:sp>/g;
      const slideParagraphs = [];
      let titleText = "";
      let bulletCount = 0;
      let spm;
      while ((spm = spRe.exec(xml)) !== null) {
        const sp = spm[0];
        const isTitle = /<p:ph\b[^>]*\btype="(?:title|ctrTitle)"/.test(sp);
        const isFooterOrNum = /<p:ph\b[^>]*\btype="(?:sldNum|ftr|dt)"/.test(sp);
        const paras = [];
        const apRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
        let apm;
        while ((apm = apRe.exec(sp)) !== null) {
          const pInner = apm[1];
          const runs = [];
          const atRe = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
          let atm;
          while ((atm = atRe.exec(pInner)) !== null) {
            runs.push(decodeXmlEntities(atm[1]));
          }
          const joined = runs.join("").trim();
          if (!joined) continue;
          paras.push(joined);
          if (!isTitle && !isFooterOrNum && (/<a:buChar\b|<a:buAutoNum\b/.test(pInner) || (!/<a:buNone\b/.test(pInner) && paras.length > 1))) {
            if (/<a:buChar\b|<a:buAutoNum\b/.test(pInner)) bulletCount += 1;
          }
        }
        if (paras.length === 0) continue;
        if (isTitle && !titleText) titleText = paras.join(" ");
        if (!isFooterOrNum) slideParagraphs.push(...paras);

        // Off-slide text shape geometry check
        if (hygieneRule) {
          const xfrm = sp.match(/<a:xfrm\b[^>]*>[\s\S]*?<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"[\s\S]*?<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
          if (xfrm) {
            const x = Number(xfrm[1]);
            const y = Number(xfrm[2]);
            const cx = Number(xfrm[3]);
            const cy = Number(xfrm[4]);
            if (x + cx > slideCx * 1.02 || y + cy > slideCy * 1.02 || x < -slideCx * 0.02 || y < -slideCy * 0.02) {
              findings.push(makeFinding({ rule: hygieneRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: `Off-slide text frame: "${paras[0].slice(0, 48)}"` }));
            }
          }
        }
      }

      const fullSlideText = slideParagraphs.join("\n");
      if (mdLeakRule && (/\*\*[^*\n]{1,80}\*\*/.test(fullSlideText) || /^#{1,6}\s+\S/m.test(fullSlideText))) {
        findings.push(makeFinding({ rule: mdLeakRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: fullSlideText.slice(0, 90) }));
      }

      if (!isHidden) {
        const cjkChars = (fullSlideText.match(/[\u4e00-\u9fff]/gu) || []).length;
        const latinWords = fullSlideText.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
        const maxWords = thresholds.maxSlideWords || 120;
        const maxZh = thresholds.maxSlideCharsZh || 280;
        if (wordWallRule && (latinWords > maxWords || cjkChars > maxZh)) {
          findings.push(makeFinding({ rule: wordWallRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: `${latinWords} words / ${cjkChars} CJK chars` }));
        }
        if (bulletRule && bulletCount > (thresholds.maxSlideBullets || 6)) {
          findings.push(makeFinding({ rule: bulletRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: `${bulletCount} bullet items` }));
        }
        if (weakTitleRule && titleText && (latinWords > 25 || cjkChars > 50)) {
          if (/^(?:overview|background|agenda|summary|introduction|context|背景|项目背景|概述|数据概述|总结|目录)$/i.test(titleText.trim())) {
            findings.push(makeFinding({ rule: weakTitleRule, filename, modality, location: `slide ${slideNum}`, line: slideNum, match: `Title: "${titleText.trim()}"` }));
          }
        }
      }

      // Run text/invariant rules on slide text
      const sub = auditText(fullSlideText, { filename, modality: "markdown", pack, config });
      for (const f of sub.findings) {
        findings.push({ ...f, modality: "pptx", location: `slide ${slideNum}`, line: slideNum });
      }
    });

    return { findings, skipped };
  }

  return { findings, skipped };
}

/**
 * Structural PDF inspector over Latin1-decoded raw PDF bytes + optional inflated stream strings.
 * Explicitly marks prose extraction as skipped unless extracted text is supplied (honest coverage!).
 */
export function auditPdfStructure(rawLatin1, inflatedStreams = [], { filename, pack }) {
  const findings = [];
  const skipped = [];
  const rulesById = new Map((pack.rules || []).map((r) => [r.id, r]));
  const pathRule = rulesById.get("local-path-leak");
  const hygieneRule = rulesById.get("office-pdf-hygiene");

  if (!rawLatin1.startsWith("%PDF-")) {
    return {
      findings,
      skipped: [{ file: filename, reason: "File does not begin with a %PDF- header" }],
    };
  }
  if (/\/Encrypt\b/.test(rawLatin1)) {
    return {
      findings,
      skipped: [{ file: filename, reason: "Encrypted PDF cannot be inspected without password" }],
    };
  }

  const combined = [rawLatin1, ...inflatedStreams].join("\n");

  // 1. URI link annotations pointing to local files
  const uriRe = /\/URI\s*\(([^)]{1,240})\)/g;
  let um;
  while ((um = uriRe.exec(combined)) !== null) {
    const uri = um[1];
    if (/^(?:file:|\/Users\/|\/home\/|[A-Za-z]:\\)/i.test(uri)) {
      const rule = pathRule || hygieneRule;
      if (rule) {
        findings.push(makeFinding({ rule, filename, modality: "pdf", location: "PDF /URI", match: uri }));
      }
    }
  }

  if (hygieneRule) {
    // 2. Raw Word/PPTX filename left in /Title
    const titleMatch = combined.match(/\/Title\s*\(([^)]{1,200})\)/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (/^Microsoft (?:Word|PowerPoint)\s*-|\.(?:docx?|pptx?|key|pages)$/i.test(title)) {
        findings.push(
          makeFinding({
            rule: { ...hygieneRule, severity: "warning" },
            filename,
            modality: "pdf",
            location: "PDF /Info",
            match: `/Title (${title})`,
          })
        );
      }
    }

    // 3. FontDescriptor missing embedded /FontFile*
    const fdRe = /<<[\s\S]{0,600}?\/Type\s*\/FontDescriptor[\s\S]{0,600}?>>/g;
    let fm;
    while ((fm = fdRe.exec(combined)) !== null) {
      if (!/\/FontFile[23]?\b/.test(fm[0])) {
        const fn = (fm[0].match(/\/FontName\s*\/([^\s/>]+)/) || [])[1] || "unknown-font";
        findings.push(
          makeFinding({
            rule: { ...hygieneRule, severity: "warning" },
            filename,
            modality: "pdf",
            location: "PDF /FontDescriptor",
            match: `Unembedded font: ${fn}`,
          })
        );
        break;
      }
    }

    // 4. Mixed /MediaBox sizes across pages
    const mbRe = /\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g;
    const boxes = [];
    let mbm;
    while ((mbm = mbRe.exec(combined)) !== null) {
      boxes.push([Number(mbm[3]) - Number(mbm[1]), Number(mbm[4]) - Number(mbm[2])]);
    }
    if (boxes.length >= 2) {
      const [w0, h0] = boxes[0];
      if (boxes.some(([w, h]) => Math.abs(w - w0) > 4 || Math.abs(h - h0) > 4)) {
        findings.push(
          makeFinding({
            rule: { ...hygieneRule, severity: "warning" },
            filename,
            modality: "pdf",
            location: "PDF /MediaBox",
            match: "Inconsistent page dimensions across PDF pages",
          })
        );
      }
    }
  }

  skipped.push({
    file: `${filename}#prose`,
    reason: "PDF structural/URI/font metadata checked; full CID prose extraction skipped in zero-dep mode",
  });
  return { findings, skipped };
}

// ---------- Stage 3: Deterministic Revision Verifier (`dislop verify`) ----------

function multisetCounts(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  return map;
}

function diffMultisets(beforeItems, afterItems) {
  const bMap = multisetCounts(beforeItems);
  const aMap = multisetCounts(afterItems);
  const removed = [];
  const added = [];
  for (const [k, bCount] of bMap.entries()) {
    const aCount = aMap.get(k) || 0;
    for (let i = 0; i < bCount - aCount; i += 1) removed.push(k);
  }
  for (const [k, aCount] of aMap.entries()) {
    const bCount = bMap.get(k) || 0;
    for (let i = 0; i < aCount - bCount; i += 1) added.push(k);
  }
  return { removed, added };
}

export function extractProtectedFacts(text, { remediatedBasenames = new Set() } = {}) {
  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).map((s) => s.trim());
  const strippedBlocks = text.replace(/```[\s\S]*?```/g, " ");
  const codeSpans = (strippedBlocks.match(/`[^`\n]+`/g) || []).map((s) => s.trim());
  const strippedCode = strippedBlocks.replace(/`[^`\n]+`/g, " ");

  const urls = [
    ...(strippedCode.match(/https?:\/\/[^\s)>"'`]+/g) || []).map((u) => u.replace(/[.,;!?]+$/, "")),
    ...Array.from(strippedCode.matchAll(/\]\(([^)\s]+)\)/g), (m) => {
      const target = m[1].trim();
      const base = target.split(/[\\/]/).pop();
      if (/^(?:file:|\/Users\/|\/home\/|[A-Za-z]:\\)/i.test(target) || remediatedBasenames.has(base)) {
        return `asset:${base}`;
      }
      return target;
    }),
  ];

  const dates = (
    strippedCode.match(
      /\b\d{4}-\d{2}-\d{2}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b|\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{1,2}\s*月\s*\d{1,2}\s*日/giu
    ) || []
  ).map((d) => d.toLowerCase().replace(/\s+/g, " ").trim());

  // Mask ISO dates before number scan so 2026-11-21 isn't double-split
  const noDates = strippedCode.replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");

  const citations = (
    strippedCode.match(/\[\^?[A-Za-z0-9_.-]{1,32}\](?!\()|\([A-Z][A-Za-z\s.&]{1,30},\s*(?:19|20)\d{2}[a-z]?\)/g) || []
  ).map((s) => s.trim());

  // Extract numbers together with immediately attached qualifier ("up to", "最多") and unit ("%", "kg", "ms", "分钟")
  const numRe = /(?<![A-Za-z0-9_/])(?:(?:\b(?:up to|at least|under|over|above|below|max|min)\s+|(?:最多|至少|不超过|低于|高于|约)\s*))?(?:[$¥€£]\s*)?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[-–~]\s*\d+(?:,\d{3})*(?:\.\d+)?)?(?:\s*(?:%|(?:ms|s|sec|seconds?|min|minutes?|hrs?|hours?|days?|weeks?|months?|years?|kb|mb|gb|tb|qps|rps|bps|mbps|gbps|hz|khz|mhz|ghz|fps|kg|lb|lbs|g|mg|km|cm|mm|m|w|kw|px|pt|rows?|nodes?|decks?|x)(?![A-Za-z])|倍|秒|分钟|小时|天|个月|年|万|亿|公斤|千克|克|公里|米|厘米|毫米|行|页|张|枚|条|个|所|人|次))?/giu;
  const numbers = [];
  let nm;
  while ((nm = numRe.exec(noDates)) !== null) {
    const normalized = nm[0]
      .toLowerCase()
      .replace(/(\d),(\d{3})/g, "$1$2")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized) numbers.push(normalized);
  }

  return {
    numbers,
    dates,
    urls,
    codeSpans,
    codeBlocks,
    citations,
  };
}

export function verifyRevision(beforeText, afterText, { filename = "draft.md", modality = null, pack, config = {}, allowFactDrop = false } = {}) {
  const beforeAudit = auditText(beforeText, { filename, modality, pack, config });
  const afterAudit = auditText(afterText, { filename, modality, pack, config });

  const leakedBasenames = new Set(
    Array.from(beforeText.matchAll(/\]\(((?:file:|\/Users\/|\/home\/|[A-Za-z]:\\)[^)\s]+)\)/gi), (m) =>
      m[1].trim().split(/[\\/]/).pop()
    )
  );
  const beforeFacts = extractProtectedFacts(beforeText, { remediatedBasenames: leakedBasenames });
  const afterFacts = extractProtectedFacts(afterText, { remediatedBasenames: leakedBasenames });

  const invariants = {
    numbers: diffMultisets(beforeFacts.numbers, afterFacts.numbers),
    dates: diffMultisets(beforeFacts.dates, afterFacts.dates),
    urls: diffMultisets(beforeFacts.urls, afterFacts.urls),
    codeSpans: diffMultisets(beforeFacts.codeSpans, afterFacts.codeSpans),
    codeBlocks: diffMultisets(beforeFacts.codeBlocks, afterFacts.codeBlocks),
    citations: diffMultisets(beforeFacts.citations, afterFacts.citations),
  };

  const beforeRuleCounts = multisetCounts(beforeAudit.findings.map((f) => f.ruleId));
  const afterRuleCounts = multisetCounts(afterAudit.findings.map((f) => f.ruleId));
  const resolved = diffMultisets(
    Array.from(beforeAudit.findings, (f) => f.ruleId),
    Array.from(afterAudit.findings, (f) => f.ruleId)
  ).removed;
  const introduced = diffMultisets(
    Array.from(beforeAudit.findings, (f) => f.ruleId),
    Array.from(afterAudit.findings, (f) => f.ruleId)
  ).added;

  const beforeFamilies = new Set(beforeAudit.findings.map((f) => f.family));
  const displaced = afterAudit.findings
    .filter((f) => DISPLACEMENT_FAMILIES.has(f.family) && !beforeFamilies.has(f.family))
    .map((f) => ({ ruleId: f.ruleId, family: f.family, match: f.match }));

  const reasons = [];
  if (!allowFactDrop) {
    for (const [category, delta] of Object.entries(invariants)) {
      if (delta.removed.length > 0) {
        reasons.push(`Protected ${category} removed or altered: ${delta.removed.join(", ")}`);
      }
      if (delta.added.length > 0) {
        reasons.push(`Unverified ${category} invented in revision: ${delta.added.join(", ")}`);
      }
    }
  }

  const afterCoreErrors = afterAudit.findings.filter((f) => f.tier === "invariant" || f.severity === "error");
  if (afterCoreErrors.length > 0) {
    reasons.push(`Revision contains ${afterCoreErrors.length} invariant error(s): ${afterCoreErrors.map((f) => f.ruleId).join(", ")}`);
  }

  if (displaced.length > 0) {
    reasons.push(
      `Second-order slop displacement detected (${displaced.map((d) => `${d.ruleId}: "${d.match}"`).join("; ")})`
    );
  }

  if (beforeAudit.findings.length > 0 && afterAudit.findings.length >= beforeAudit.findings.length) {
    reasons.push(
      `Finding count did not improve (before: ${beforeAudit.findings.length}, after: ${afterAudit.findings.length})`
    );
  }

  for (const [ruleId, count] of afterRuleCounts.entries()) {
    if (count > (beforeRuleCounts.get(ruleId) || 0)) {
      reasons.push(`Introduced new finding '${ruleId}'`);
    }
  }

  const ok = reasons.length === 0;
  return {
    ok,
    status: ok ? "accepted" : "rejected",
    beforeCount: beforeAudit.findings.length,
    afterCount: afterAudit.findings.length,
    invariants,
    resolved,
    introduced,
    displaced,
    reasons,
    afterFindings: afterAudit.findings,
  };
}

// ---------- Output Formatters (text, json, sarif, github, md) ----------

export function formatReport(report, format = "text", lang = "en") {
  const { findings, checkedCount, skipped = [], unusedSuppressions = [] } = report;
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }
  if (format === "sarif") {
    return JSON.stringify(buildSarif(report, lang), null, 2);
  }
  if (format === "github") {
    const lines = findings.map((f) => {
      const level = f.severity === "error" ? "error" : f.severity === "warning" ? "warning" : "notice";
      const msg = (f.message?.[lang] || f.message?.en || "").replace(/\r?\n/g, " ");
      return `::${level} file=${f.file},line=${f.line || 1},col=${f.col || 1},title=${f.ruleId}::${msg} (${f.match})`;
    });
    return lines.join("\n");
  }
  if (format === "md") {
    const rows = [
      `| Severity | File | Location | Rule | Match | Guidance |`,
      `|---|---|---|---|---|---|`,
      ...findings.map(
        (f) =>
          `| \`${f.severity}\` | \`${f.file}\` | \`${f.location}\` | \`${f.ruleId}\` | \`${String(f.match).replace(/\|/g, "\\|")}\` | ${f.message?.[lang] || f.message?.en || ""} |`
      ),
    ];
    return rows.join("\n");
  }

  // Default human text format
  const out = [];
  const skipNote = skipped.length > 0 ? `, ${skipped.length} skipped` : "";
  if (findings.length === 0 && unusedSuppressions.length === 0) {
    out.push(`dislop: ok (${checkedCount} checked${skipNote}, 0 findings)`);
  } else {
    out.push(`dislop: ${findings.length} finding(s) across ${checkedCount} checked file(s)${skipNote}`);
    for (const f of findings) {
      const msg = f.message?.[lang] || f.message?.en || "";
      out.push(`  [${f.severity.toUpperCase()}] ${f.file}:${f.location}  ${f.ruleId}`);
      out.push(`    match: "${f.match}"`);
      out.push(`    why:   ${msg}`);
      if (f.deletionTest) {
        out.push(`    test:  ${f.deletionTest[lang] || f.deletionTest.en}`);
      }
    }
    for (const u of unusedSuppressions) {
      out.push(`  [UNUSED] ${u.file}:${u.line}  stale dislop-ignore (${u.ruleIds.join(", ")})`);
    }
  }
  for (const s of skipped) {
    out.push(`  [SKIP] ${s.file} — ${s.reason}`);
  }
  return out.join("\n");
}

function buildSarif(report, lang = "en") {
  const rulesMap = new Map();
  for (const f of report.findings) {
    if (!rulesMap.has(f.ruleId)) {
      rulesMap.set(f.ruleId, {
        id: f.ruleId,
        shortDescription: { text: f.message?.[lang] || f.message?.en || f.ruleId },
        help: {
          text: f.deletionTest?.[lang] || f.deletionTest?.en || f.message?.en || f.ruleId,
        },
        helpUri: `https://dislop.com/#rule-${f.ruleId}`,
        defaultConfiguration: {
          level: f.severity === "error" ? "error" : f.severity === "warning" ? "warning" : "note",
        },
      });
    }
  }
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "dislop",
            version: ENGINE_VERSION,
            informationUri: "https://dislop.com",
            rules: Array.from(rulesMap.values()),
          },
        },
        results: report.findings.map((f) => ({
          ruleId: f.ruleId,
          level: f.severity === "error" ? "error" : f.severity === "warning" ? "warning" : "note",
          message: {
            text: `${f.message?.[lang] || f.message?.en} — "${f.match}"`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: String(f.file).replace(/^\.\//, "") },
                region: {
                  startLine: Math.max(1, f.line || 1),
                  startColumn: Math.max(1, f.col || 1),
                },
              },
            },
          ],
          partialFingerprints: {
            primaryLocationLineHash: f.fingerprint,
          },
        })),
      },
    ],
  };
}
