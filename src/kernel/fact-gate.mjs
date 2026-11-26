const SENTENCE_INITIAL_STOPWORDS = new Set([
  "A",
  "An",
  "And",
  "Are",
  "As",
  "At",
  "After",
  "Although",
  "Also",
  "Assign",
  "Based",
  "Because",
  "Before",
  "Beyond",
  "Both",
  "But",
  "By",
  "Certainly",
  "Despite",
  "During",
  "Each",
  "Even",
  "Every",
  "Finally",
  "First",
  "For",
  "From",
  "Furthermore",
  "Generally",
  "Given",
  "Here",
  "However",
  "If",
  "Importantly",
  "In",
  "Indeed",
  "Instead",
  "It",
  "Its",
  "Let",
  "Looking",
  "Many",
  "Meanwhile",
  "Moreover",
  "Most",
  "Naturally",
  "Needless",
  "Nevertheless",
  "Next",
  "No",
  "Nor",
  "Not",
  "Notably",
  "Now",
  "Of",
  "Often",
  "On",
  "Once",
  "One",
  "Only",
  "Or",
  "Overall",
  "Perhaps",
  "Please",
  "Rather",
  "Second",
  "Simply",
  "Since",
  "So",
  "Some",
  "Specifically",
  "Still",
  "Such",
  "Sure",
  "That",
  "The",
  "Their",
  "Then",
  "There",
  "Therefore",
  "These",
  "They",
  "This",
  "Those",
  "Though",
  "Through",
  "Thus",
  "To",
  "Today",
  "Ultimately",
  "Under",
  "Unless",
  "Unlike",
  "Until",
  "Upon",
  "Use",
  "Using",
  "We",
  "What",
  "When",
  "Where",
  "Whether",
  "Which",
  "While",
  "Who",
  "Why",
  "With",
  "Within",
  "Without",
  "Yet",
  "You",
  "Your",
  "Zero",
]);

function normalizeNumericToken(raw) {
  return raw.replace(/,/g, "");
}

const ZH_DIGIT_MAP = {
  "\u96f6": 0,
  "\u3007": 0,
  "\u4e00": 1,
  "\u4e8c": 2,
  "\u4e24": 2,
  "\u4e09": 3,
  "\u56db": 4,
  "\u4e94": 5,
  "\u516d": 6,
  "\u4e03": 7,
  "\u516b": 8,
  "\u4e5d": 9,
};

function parseChineseNumeral(str) {
  const s = String(str || "").trim();
  if (!s) return null;
  if (/^[\u96f6\u3007\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d]+$/.test(s)) {
    return Number(Array.from(s).map((c) => ZH_DIGIT_MAP[c]).join(""));
  }
  const m = s.match(
    /^([\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])?\u5341([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])?$/,
  );
  if (m) {
    const tens = m[1] ? ZH_DIGIT_MAP[m[1]] : 1;
    const ones = m[2] ? ZH_DIGIT_MAP[m[2]] : 0;
    return tens * 10 + ones;
  }
  const m2 = s.match(
    /^([\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])\u767e(?:([\u96f6\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])?\u5341?([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])?)?$/,
  );
  if (m2) {
    const hundreds = ZH_DIGIT_MAP[m2[1]] * 100;
    if (!m2[2] && !m2[3]) return hundreds;
    if (s.includes("\u5341")) {
      const tens = m2[2] && m2[2] !== "\u96f6" ? ZH_DIGIT_MAP[m2[2]] * 10 : 10;
      const ones = m2[3] ? ZH_DIGIT_MAP[m2[3]] : 0;
      return hundreds + tens + ones;
    }
    const last = m2[3] || m2[2];
    return hundreds + (last && last !== "\u96f6" ? ZH_DIGIT_MAP[last] : 0);
  }
  return null;
}

function stripMarkupForFacts(text) {
  const raw = String(text || "");
  if (!/<[a-zA-Z/][^>]*>/.test(raw)) return raw;
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function normalizeProperNounKey(noun) {
  if (/^[A-Z]{2,}s$/.test(noun)) {
    return noun.slice(0, -1);
  }
  return noun;
}

const GENERIC_NON_ENTITY_CAPS = new Set(["AI", "TODO", "TBD", "FIXME", "XXX", "OK"]);

/**
 * Extract protected factual anchors from a text span:
 * - Numbers, decimals, percentages, currencies, version tags, Chinese classifier quantities
 * - Measurement units paired with numbers (`ms`, `KB`, `GB`, `%`, `hours`, etc.)
 * - URLs (`https://...`, `http://...`, `mailto:...`)
 * - Inline code spans (`` `...` ``)
 * - Mid-clause proper nouns, mixed-case identifiers, and ALL-CAPS / alphanumeric acronyms (`OAuth`, `PostgreSQL`, `GDPR`, `Q3`)
 */
export function extractProtectedFacts(text) {
  const input = stripMarkupForFacts(text);

  // 1. Inline code spans
  const codeSpans = [];
  const codeMask = new Uint8Array(input.length);
  const codeRe = /`+([^`]+)`+/g;
  let m;
  while ((m = codeRe.exec(input)) !== null) {
    codeSpans.push(m[1].trim());
    codeMask.fill(1, m.index, m.index + m[0].length);
  }

  // 2. URLs
  const urls = [];
  const urlRe = /\bhttps?:\/\/[^\s)>\]"']+/gi;
  while ((m = urlRe.exec(input)) !== null) {
    if (codeMask[m.index]) continue;
    const cleanUrl = m[0].replace(/[.,;:!?]+$/, "");
    urls.push(cleanUrl);
    codeMask.fill(1, m.index, m.index + cleanUrl.length);
  }

  // Mask unfilled placeholder tokens ([TODO], [Company Name], {{var}}, [oaicite:1]) so resolving/deleting artifacts is never flagged
  const placeholderRe =
    /\[(?:TODO|TBD|FIXME|XXX|oaicite:\d+|turn\d+search\d+|citation:[^\]]+|Company Name|Recipient Name|Client Name|Author Name|Project Name|insert\s+[^\]]+|add\s+[^\]]+|placeholder[^\]]*|\u5f85\u8865\u5145[^\]]*|\u5f85\u586b\u5199[^\]]*|\u6b64\u5904\u63d2\u5165[^\]]*)\](?!\s*\()|\{\{\s*[A-Za-z_][A-Za-z0-9_.-]*\s*\}\}/gi;
  while ((m = placeholderRe.exec(input)) !== null) {
    codeMask.fill(1, m.index, m.index + m[0].length);
  }

  const unmasked = Array.from(input)
    .map((ch, idx) => (codeMask[idx] ? " " : ch))
    .join("");

  // 3. Numbers & numeric-unit compounds
  const numbers = [];
  const units = [];
  const numUnitRe =
    /(?:[$€£¥]\s*)?\b\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s*(?:%|ms|s|sec|mins?|hrs?|hours?|days?|weeks?|months?|years?|kb|mb|gb|tb|bps|kbps|mbps|gbps|hz|khz|mhz|ghz|px|pt|x))?\b|(?:[$€£¥]\s*)?\b\d+(?:\.\d+)?(?:\s*(?:%|ms|s|sec|mins?|hrs?|hours?|days?|weeks?|months?|years?|kb|mb|gb|tb|bps|kbps|mbps|gbps|hz|khz|mhz|ghz|px|pt|x))?(?![A-Za-z0-9_])/gi;

  while ((m = numUnitRe.exec(unmasked)) !== null) {
    const token = m[0].trim();
    const numPart = token.match(/\d[\d,]*(?:\.\d+)?/);
    if (numPart) {
      numbers.push(normalizeNumericToken(numPart[0]));
    }
    const unitPart = token.match(
      /(?:[$€£¥]|%|ms|s|sec|mins?|hrs?|hours?|days?|weeks?|months?|years?|kb|mb|gb|tb|bps|kbps|mbps|gbps|hz|khz|mhz|ghz|px|pt|x)$/i,
    );
    if (unitPart) {
      units.push(unitPart[0].toLowerCase());
    }
    const prefixCurrency = token.match(/^[$€£¥]/);
    if (prefixCurrency) {
      units.push(prefixCurrency[0]);
    }
  }

  // CJK numeric units via Unicode escapes so src/ remains strictly English/ASCII
  const cjkUnitRe =
    /\d+(?:\.\d+)?\s*(?:\u4e07|\u4ebf|\u500d|\u6beb\u79d2|\u79d2|\u5206\u949f|\u5c0f\u65f6|\u5929|\u5468|\u4e2a\u6708|\u5e74|%|\u4e2a\u767e\u5206\u70b9)/g;
  while ((m = cjkUnitRe.exec(unmasked)) !== null) {
    const u = m[0].replace(/[\d.\s]+/g, "");
    if (u) units.push(u);
  }

  // CJK spelled quantities followed by explicit classifiers (2+ always count; standalone "\u4e00" only counts with explicit quantifier or measurement unit)
  const cjkQtyRe =
    /(?:[\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e]{1,4}\s*(?=\u4e2a|\u6b21|\u6761|\u9879|\u6a21\u5757|\u53f0|\u5957|\u5f20|\u4efd|\u9875|\u5468|\u5929|\u5c0f\u65f6|\u5206\u949f|\u79d2|\u500d|\u6735|\u679a|\u5bb6|\u4eba|\u5904|\u5c42|\u9636\u6bb5)|(?<=\u5171|\u4ec5|\u53ea\u6709|\u81f3\u5c11|\u6700\u591a|\u7b2c)\u4e00\s*(?=\u4e2a|\u6b21|\u6761|\u9879|\u6a21\u5757|\u53f0|\u5957|\u5f20|\u4efd|\u9875|\u5468|\u5929|\u5c0f\u65f6|\u5206\u949f|\u79d2|\u500d|\u6735|\u679a|\u5bb6|\u4eba|\u5904|\u5c42|\u9636\u6bb5)|\u4e00(?=\s*(?:\u5c0f\u65f6|\u5206\u949f|\u79d2|\u5468|\u5929|\u500d)))/g;
  while ((m = cjkQtyRe.exec(unmasked)) !== null) {
    const val = parseChineseNumeral(m[0]);
    if (val !== null) {
      numbers.push(String(val));
    }
  }

  // 4. Proper nouns: always protect ALL-CAPS/mixed-case/alphanumeric tokens (excluding generic badges like 'AI'),
  // and protect plain TitleCase words only when they appear mid-clause (never solely at sentence/heading/label starts)
  const properNouns = [];
  const plainStartOnly = new Set();
  const plainMidClause = new Set();
  const wordRe = /\b(?:[A-Z][a-zA-Z0-9]+|[A-Z]{2,}[0-9]*|[a-z]+[A-Z][a-zA-Z0-9]*)\b/g;
  while ((m = wordRe.exec(unmasked)) !== null) {
    const word = m[0];
    if (GENERIC_NON_ENTITY_CAPS.has(word)) continue;

    const idx = m.index;
    const beforeRaw = unmasked.slice(0, idx);
    const beforeSlice = beforeRaw.trimEnd();
    const isBoundaryStart =
      beforeSlice.length === 0 ||
      /[.!?\u3002\uff01\uff1f:\uff1a"\u201c\u201d'(\[\n\r\-*•·\u2014\u2013\/]$/.test(beforeSlice) ||
      /\*\*$/.test(beforeSlice);

    const isAllCapsOrMixed =
      /^[A-Z]{2,}[0-9]*$/.test(word) ||
      /[a-z][A-Z]/.test(word) ||
      /[A-Z].*\d|\d.*[A-Z]/.test(word);

    if (!isAllCapsOrMixed) {
      if (SENTENCE_INITIAL_STOPWORDS.has(word)) continue;
      if (isBoundaryStart) {
        plainStartOnly.add(word);
        continue;
      }
      const prevTokenMatch = beforeSlice.match(/([A-Za-z]+)$/);
      const prevIsStopwordTitle = prevTokenMatch && SENTENCE_INITIAL_STOPWORDS.has(prevTokenMatch[1]);
      // Mid-clause single-capital word: protect when preceded by lowercase word, CJK, comma, or non-stopword entity
      if (!prevIsStopwordTitle && /(?:^|\s)[a-z][a-z0-9,)\-]*\s+$|[\u4e00-\u9fff,)]\s+$|[A-Z][A-Za-z0-9]+\s+$/.test(beforeRaw)) {
        plainMidClause.add(word);
        properNouns.push(word);
      }
      continue;
    }

    properNouns.push(word);
  }

  for (const w of plainStartOnly) {
    if (plainMidClause.has(w)) {
      properNouns.push(w);
    }
  }

  return {
    numbers,
    units,
    urls,
    codeSpans,
    properNouns: Array.from(new Set(properNouns)),
  };
}

function setMissing(expectedList, actualList) {
  const actualSet = new Set(actualList);
  const missing = [];
  for (const req of expectedList) {
    if (!actualSet.has(req)) {
      missing.push(req);
    }
  }
  return Array.from(new Set(missing));
}

function missingProperNouns(origNouns, candNouns, candRaw) {
  const candNormSet = new Set(candNouns.map(normalizeProperNounKey));
  const candLower = candRaw.toLowerCase();
  const missing = [];
  for (const noun of origNouns) {
    const norm = normalizeProperNounKey(noun);
    if (candNouns.includes(noun) || candNormSet.has(norm) || candRaw.includes(noun)) {
      continue;
    }
    if (noun === "RAM" && /\bmemory\b/.test(candLower)) {
      continue;
    }
    missing.push(noun);
  }
  return Array.from(new Set(missing));
}

/**
 * Run the Kernel Baseline Fact Gate comparing `originalText` against `candidateText`.
 * When `checkFabrication` is true (used on automated LLM `suggestedReplacement`s), also blocks
 * newly injected URLs, inline code spans, or fabricated numbers absent from `originalText`.
 */
export function verifyBaselineFacts(originalText, candidateText, { checkFabrication = false } = {}) {
  const orig = extractProtectedFacts(originalText);
  const cand = extractProtectedFacts(candidateText);
  const origRaw = stripMarkupForFacts(originalText);
  const candRaw = stripMarkupForFacts(candidateText);

  const reasons = [];

  const missingNums = setMissing(orig.numbers, cand.numbers);
  if (missingNums.length > 0) {
    reasons.push(`dropped number(s): ${missingNums.join(", ")}`);
  }

  const missingUnits = setMissing(orig.units, cand.units);
  if (missingUnits.length > 0) {
    reasons.push(`dropped unit/symbol(s): ${missingUnits.join(", ")}`);
  }

  const missingUrls = orig.urls.filter((u) => !cand.urls.includes(u) && !candRaw.includes(u));
  if (missingUrls.length > 0) {
    reasons.push(`dropped URL(s): ${missingUrls.join(", ")}`);
  }

  const missingCode = orig.codeSpans.filter(
    (c) => !cand.codeSpans.includes(c) && !candRaw.includes(c),
  );
  if (missingCode.length > 0) {
    reasons.push(`dropped inline code: ${missingCode.map((c) => `\`${c}\``).join(", ")}`);
  }

  const missingNouns = missingProperNouns(orig.properNouns, cand.properNouns, candRaw);
  if (missingNouns.length > 0) {
    reasons.push(`dropped proper noun/entity: ${missingNouns.join(", ")}`);
  }

  // Deterministic anti-injection / anti-fabrication check for automated replacements
  if (checkFabrication && candRaw.trim() !== "") {
    const fabricatedUrls = cand.urls.filter((u) => !orig.urls.includes(u) && !origRaw.includes(u));
    if (fabricatedUrls.length > 0) {
      reasons.push(`injected unverified URL(s): ${fabricatedUrls.join(", ")}`);
    }

    const fabricatedCode = cand.codeSpans.filter(
      (c) => !orig.codeSpans.includes(c) && !origRaw.includes(c),
    );
    if (fabricatedCode.length > 0) {
      reasons.push(`injected unverified inline code: ${fabricatedCode.map((c) => `\`${c}\``).join(", ")}`);
    }

    const fabricatedNums = setMissing(cand.numbers, orig.numbers);
    if (fabricatedNums.length > 0) {
      reasons.push(`fabricated number(s): ${fabricatedNums.join(", ")}`);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    summary: reasons.join("; "),
  };
}

/**
 * Execute Step 5 Dual Post-LLM Fact Gate across all candidate items:
 * 1. Kernel Baseline Fact Gate (`verifyBaselineFacts`)
 * 2. Originating Pack Custom Gate (`pack.verifyFix(item, candidateText, doc)`)
 *
 * Items that fail either gate have `suggestedReplacement` cleared, `fixSafety` downgraded
 * to `"manual"`, and `verificationNote` attached.
 */
export async function applyDualFactGate(items, doc, activePacks) {
  const packMap = new Map(activePacks.map((p) => [p.name, p]));
  const gated = [];

  for (const item of items) {
    // Only gate items that propose an automatic/reviewable edit or deletion
    const hasReplacement = Boolean(item.suggestedReplacement && item.suggestedReplacement.trim() !== "");
    const isAutoDelete = item.actionType === "delete" && item.fixSafety !== "manual";
    if (!hasReplacement && !isAutoDelete) {
      gated.push(item);
      continue;
    }

    // Deterministic `defect` artifact deletions (chatbot wrappers & leaked tool citations) intentionally strip meta-wrappers
    if (
      item.kind === "defect" &&
      item.actionType === "delete" &&
      (item.ruleId.endsWith("/chatbot-artifact") || item.ruleId.endsWith("/chatbot-citation-leak"))
    ) {
      gated.push(item);
      continue;
    }

    const candidateText = hasReplacement ? item.suggestedReplacement : "";
    const baseline = verifyBaselineFacts(item.originalQuote, candidateText, {
      checkFabrication: hasReplacement,
    });

    if (!baseline.ok) {
      gated.push({
        ...item,
        suggestedReplacement: "",
        fixSafety: "manual",
        actionType: item.rewritePrompt ? "prompt" : item.actionType,
        verificationNote: `Fact Gate withheld replacement (${baseline.summary}).`,
        _factGateDowngraded: true,
        _factGateReasons: baseline.reasons,
      });
      continue;
    }

    const pack = packMap.get(item.pack);
    let customRejected = null;
    if (pack) {
      if (typeof pack.verifyFix === "function") {
        const res = pack.verifyFix(item, candidateText, doc);
        if (res && res.ok === false) customRejected = res;
      } else if (pack.hasScripts && typeof pack.loadScripts === "function") {
        const scriptModules = await pack.loadScripts();
        for (const sm of scriptModules) {
          if (typeof sm.verifyFix === "function") {
            const res = sm.verifyFix(item, candidateText, doc);
            if (res && res.ok === false) {
              customRejected = res;
              break;
            }
          }
        }
      }
    }

    if (customRejected) {
      gated.push({
        ...item,
        suggestedReplacement: "",
        fixSafety: "manual",
        actionType: item.rewritePrompt ? "prompt" : item.actionType,
        verificationNote: `Pack '${pack.name}' withheld replacement (${customRejected.reason || "failed custom verifyFix"}).`,
        _factGateDowngraded: true,
        _factGateReasons: ["pack_verify_fix"],
      });
      continue;
    }

    gated.push(item);
  }

  return gated;
}

/**
 * Standalone revision verification used by `dislop verify <before> <after>` and local MCP `dislop_verify`.
 */
export function verifyDocumentRevision(beforeText, afterText) {
  const factCheck = verifyBaselineFacts(beforeText, afterText);
  const secondOrderSlopHits = [];

  const regressions = [
    {
      id: "introduced-negation-slogan",
      re: /\b(?:this )?(?:isn't|is not) (?:just|merely|simply)\b[\s\S]{1,60}\bit(?:'s| is)\b/i,
      beforeRe: /\b(?:isn't|is not) (?:just|merely|simply)\b/i,
      message: "Introduced a 'not just X — it's Y' slogan frame not present in original.",
    },
    {
      id: "introduced-zh-negation-slogan",
      re: /(?:\u8fd9)?(?:\u4e0d\u662f|\u5e76\u975e)(?:\u5355\u7eaf\u7684?|\u7b80\u5355\u7684?)?[^\uff0c\u3002\uff1b\n]{1,24}[\uff0c,]\s*\u800c\u662f[^\u3002\uff01\uff1f\n]{1,36}/,
      beforeRe: /(?:\u4e0d\u662f|\u5e76\u975e)[^\uff0c\u3002\uff1b\n]{1,24}[\uff0c,]\s*\u800c\u662f/,
      message: "Introduced an unprompted Chinese 'not X, but Y' slogan pivot.",
    },
    {
      id: "introduced-placeholder",
      re: /\[(?:TODO|TBD|FIXME|insert [^\]]+)\]/i,
      beforeRe: /\[(?:TODO|TBD|FIXME|insert [^\]]+)\]/i,
      message: "Introduced an unfilled bracketed placeholder into revised text.",
    },
  ];

  for (const rule of regressions) {
    if (rule.re.test(afterText) && !rule.beforeRe.test(beforeText)) {
      secondOrderSlopHits.push({ id: rule.id, message: rule.message });
    }
  }

  // Metric direction reversal guard (`from A to B` -> `from B to A`, `\u4ece A \u964d\u81f3 B` -> `\u4ece B \u5347\u81f3 A`)
  const normBefore = String(beforeText || "").replace(/,/g, "");
  const normAfter = String(afterText || "").replace(/,/g, "");
  const dirPairs = [];
  const enDirRe = /\bfrom\s+(\d+(?:\.\d+)?)\s*(?:%|ms|s|sec|mins?|hrs?|hours?|kb|mb|gb|x)?(?![A-Za-z0-9_])\s+to\s+(\d+(?:\.\d+)?)\s*(?:%|ms|s|sec|mins?|hrs?|hours?|kb|mb|gb|x)?(?![A-Za-z0-9_])/gi;
  let dm;
  while ((dm = enDirRe.exec(normBefore)) !== null) {
    if (dm[1] !== dm[2]) dirPairs.push({ fromVal: dm[1], toVal: dm[2], lang: "en" });
  }
  const zhDirRe = /\u4ece\s*(\d+(?:\.\d+)?)\s*(?:%|ms|s|\u6beb\u79d2|\u79d2|\u5206\u949f|\u5c0f\u65f6|\u500d)?[^\u3002\uff01\uff1f\n]{0,12}?(?:\u964d\u5230|\u964d\u81f3|\u5347\u5230|\u5347\u81f3|\u5230|\u81f3|\u53d8\u4e3a)\s*(\d+(?:\.\d+)?)/g;
  while ((dm = zhDirRe.exec(normBefore)) !== null) {
    if (dm[1] !== dm[2]) dirPairs.push({ fromVal: dm[1], toVal: dm[2], lang: "zh" });
  }
  for (const pair of dirPairs) {
    const escA = pair.fromVal.replace(/\./g, "\\.");
    const escB = pair.toVal.replace(/\./g, "\\.");
    const revRe =
      pair.lang === "en"
        ? new RegExp(`\\bfrom\\s+${escB}[^.\\n]{0,20}?\\bto\\s+${escA}(?:\\s*(?:%|ms|s|sec|mins?|hrs?|hours?|kb|mb|gb|x))?(?![A-Za-z0-9_])`, "i")
        : new RegExp(`\\u4ece\\s*${escB}[^\\u3002\\uff01\\uff1f\\n]{0,12}?(?:\\u964d\\u5230|\\u964d\\u81f3|\\u5347\\u5230|\\u5347\\u81f3|\\u5230|\\u81f3|\\u53d8\\u4e3a)\\s*${escA}`);
    if (revRe.test(normAfter)) {
      secondOrderSlopHits.push({
        id: "metric-direction-reversed",
        message: `Reversed metric direction from '${pair.fromVal} -> ${pair.toVal}' to '${pair.toVal} -> ${pair.fromVal}'.`,
      });
      break;
    }
  }

  // Hard negation / prohibition polarity flip guard
  const enNegClaim = String(beforeText || "").match(
    /\b([A-Za-z][A-Za-z0-9_-]{2,24}(?:\s+[A-Za-z0-9_-]{2,20}){0,2})\s+(?:does not|do not|cannot|can't|must not|never)\s+([a-z]{3,20})\b/i,
  );
  if (enNegClaim) {
    const subj = enNegClaim[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const verb = enNegClaim[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flippedEn = new RegExp(`\\b${subj}\\s+${verb}s?\\b`, "i");
    const hasNegInAfter = /\b(?:not|never|no|zero|without|cannot|can't|won't|don't|doesn't|mustn't)\b/i.test(
      afterText,
    );
    if (flippedEn.test(afterText) && !hasNegInAfter) {
      secondOrderSlopHits.push({
        id: "polarity-negation-dropped",
        message: `Dropped mandatory negation around '${enNegClaim[1]} ... ${enNegClaim[2]}'.`,
      });
    }
  }

  const zhProhibClaim = String(beforeText || "").match(
    /(?:\u4e25\u7981|\u7981\u6b62|\u4e0d\u5f97|\u5207\u52ff|\u7edd\u4e0d|\u4e0d(?:\u4f1a|\u518d)?)([^\uff0c\u3002\uff1b\n]{0,12}?(?:\u4e0a\u4f20|\u5916\u53d1|\u8054\u7f51|\u5199\u5165|\u53d1\u9001|\u4fee\u6539|\u5220\u9664))/,
  );
  if (zhProhibClaim) {
    const action = zhProhibClaim[1].slice(-2);
    const hasZhNegAfter = /(?:\u4e25\u7981|\u7981\u6b62|\u4e0d\u5f97|\u5207\u52ff|\u7edd\u4e0d|\u4e0d|\u672a|\u96f6|\u65e0)/.test(
      afterText,
    );
    if (action && afterText.includes(action) && !hasZhNegAfter) {
      secondOrderSlopHits.push({
        id: "polarity-prohibition-dropped",
        message: "Dropped mandatory Chinese prohibition/negation marker from revised claim.",
      });
    }
  }

  // Verb / guarantee / bound polarity reversal checks
  const hadEnNoGuarantee = /\b(?:not\s+guaranteed|no\s+guarantee|does\s+not\s+guarantee|without\s+guarantee)\b/i.test(
    beforeText,
  );
  const afterHasEnNoGuarantee =
    /\b(?:not\s+guaranteed|no\s+guarantee|does\s+not\s+guarantee|never\s+guaranteed|without\s+guarantee)\b/i.test(
      afterText,
    );
  if (hadEnNoGuarantee && /\bguarantees?\b|\bguaranteed\b/i.test(afterText) && !afterHasEnNoGuarantee) {
    secondOrderSlopHits.push({
      id: "polarity-guarantee-flipped",
      message: "Flipped non-guarantee disclaimer into an unqualified guarantee.",
    });
  }

  const hadZhNoGuarantee = /(?:\u4e0d\u4fdd\u8bc1|\u65e0\u6cd5\u4fdd\u8bc1|\u5e76\u975e\u4fdd\u8bc1)/.test(
    beforeText,
  );
  const afterHasZhNoGuarantee = /(?:\u4e0d\u4fdd\u8bc1|\u65e0\u6cd5\u4fdd\u8bc1|\u5e76\u975e\u4fdd\u8bc1)/.test(
    afterText,
  );
  if (hadZhNoGuarantee && /(?:\u4fdd\u8bc1|\u786e\u4fdd)/.test(afterText) && !afterHasZhNoGuarantee) {
    secondOrderSlopHits.push({
      id: "polarity-zh-guarantee-flipped",
      message: "Flipped Chinese non-guarantee hedge into an unqualified guarantee.",
    });
  }

  // Subject-scoped trend polarity guard (`Revenue rose` -> `Revenue fell`, while allowing `Revenue rose. Expenses fell.`)
  const extractSubjectTrends = (text) => {
    const map = new Map();
    const enTrendRe =
      /\b([A-Za-z][A-Za-z0-9_-]{1,24})\s+(?:have\s+|has\s+)?(rose|increased|grew|gained|climbed|expanded|fell|decreased|dropped|declined|shrank|reduced)\b/gi;
    let tm;
    while ((tm = enTrendRe.exec(text)) !== null) {
      const subj = tm[1].toLowerCase();
      if (["that", "which", "they", "it", "this", "there"].includes(subj)) continue;
      const dir = /^(?:rose|increased|grew|gained|climbed|expanded)$/i.test(tm[2]) ? "up" : "down";
      if (!map.has(subj)) map.set(subj, new Set());
      map.get(subj).add(dir);
    }
    const zhTrendRe =
      /([\u4E00-\u9FFF]{2,12})(?:\u5927\u5e45|\u6301\u7eed|\u660e\u663e)?(\u4e0a\u5347|\u589e\u957f|\u589e\u52a0|\u4e0b\u964d|\u51cf\u5c11|\u964d\u4f4e)/g;
    while ((tm = zhTrendRe.exec(text)) !== null) {
      const subj = tm[1];
      const dir = /^(?:\u4e0a\u5347|\u589e\u957f|\u589e\u52a0)$/.test(tm[2]) ? "up" : "down";
      if (!map.has(subj)) map.set(subj, new Set());
      map.get(subj).add(dir);
    }
    return map;
  };
  const beforeTrends = extractSubjectTrends(beforeText);
  const afterTrends = extractSubjectTrends(afterText);
  let subjectTrendFlipped = false;
  for (const [subj, dirs] of beforeTrends.entries()) {
    const afterDirs = afterTrends.get(subj);
    if (!afterDirs) continue;
    for (const d of dirs) {
      const opp = d === "up" ? "down" : "up";
      if (!dirs.has(opp) && afterDirs.has(opp)) {
        secondOrderSlopHits.push({
          id: /[\u4E00-\u9FFF]/.test(subj) ? "polarity-zh-trend-flipped" : "polarity-trend-flipped",
          message: `Flipped trend verb polarity for '${subj}' (${d} -> ${opp}).`,
        });
        subjectTrendFlipped = true;
        break;
      }
    }
    if (subjectTrendFlipped) break;
  }

  const polarityPairs = [
    {
      id: "polarity-permission-flipped",
      a: /\b(?:allows|permits|enables|supports)\b/i,
      b: /\b(?:prohibits|forbids|blocks|prevents|disallows)\b/i,
      message: "Flipped permission/prohibition verb polarity.",
    },
    {
      id: "bound-qualifier-flipped",
      a: /\b(?:up\s+to|at\s+most|no\s+more\s+than)\b/i,
      b: /\b(?:at\s+least|more\s+than|always)\b/i,
      message: "Flipped upper bound ('up to' / 'at most') into lower bound or unconditional quantifier.",
    },
    {
      id: "bound-zh-qualifier-flipped",
      a: /(?:\u4e0d\u8d85\u8fc7|\u6700\u591a)/,
      b: /(?:\u81f3\u5c11|\u8d85\u8fc7)/,
      message: "Flipped Chinese bound qualifier between upper and lower limits.",
    },
  ];
  for (const pp of polarityPairs) {
    if (pp.a.test(beforeText) && !pp.b.test(beforeText)) {
      if (pp.b.test(afterText)) {
        secondOrderSlopHits.push({ id: pp.id, message: pp.message });
      }
    } else if (pp.b.test(beforeText) && !pp.a.test(beforeText) && pp.a.test(afterText)) {
      secondOrderSlopHits.push({ id: pp.id, message: pp.message });
    }
  }

  // Dropped "up to X" / "at most X" / "at least X" upper/lower bound qualifier around preserved numbers
  const enBoundRe = /\b(up\s+to|at\s+most|no\s+more\s+than|at\s+least)\s+([$€¥£]?\d[\d.,]*(?:\s*%|\s*[a-zA-Z]{1,6})?)/gi;
  let bm;
  while ((bm = enBoundRe.exec(beforeText)) !== null) {
    const qual = bm[1].replace(/\s+/g, "\\s+");
    const val = bm[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const origNumPresent = new RegExp(val, "i").test(afterText);
    const qualStillPresent = new RegExp(`\\b${qual}\\s+${val}`, "i").test(afterText);
    if (origNumPresent && !qualStillPresent) {
      secondOrderSlopHits.push({
        id: "bound-qualifier-dropped",
        message: `Dropped bound qualifier '${bm[1]}' before '${bm[2]}' in revised text.`,
      });
    }
  }

  // Currency or percentage fabrication check in revised copy
  const moneyOrPctRe = /(?:[$€¥£]\s*\d[\d.,]*|\bHK\$\s*\d[\d.,]*|\b\d+(?:\.\d+)?%)/gi;
  const beforeMoneyOrPct = new Set(
    (String(beforeText || "").match(moneyOrPctRe) || []).map((t) => t.replace(/[,\s]+/g, "").toLowerCase()),
  );
  const afterMoneyOrPct = String(afterText || "").match(moneyOrPctRe) || [];
  for (const tok of afterMoneyOrPct) {
    const norm = tok.replace(/[,\s]+/g, "").toLowerCase();
    if (!beforeMoneyOrPct.has(norm)) {
      secondOrderSlopHits.push({
        id: "fabricated-currency-or-percent",
        message: `Introduced unanchored currency/percentage figure '${tok}' not found in original.`,
      });
    }
  }

  // Swapped Label: <value> row check (`Alpha: 10 ... Beta: 20` vs `Alpha: 20 ... Beta: 10`)
  const rowPairRe = /(?:^|[\n.;\u3002])\s*([A-Za-z0-9_\u4E00-\u9FFF][A-Za-z0-9_\s\u4E00-\u9FFF/()-]{1,30}?)\s*[:\uff1a]\s*([$€¥£]?\d[\d.,]*(?:\s*(?:%|ms|s|x|k|m|b))?)/gi;
  const beforePairs = new Map();
  let pm;
  while ((pm = rowPairRe.exec(beforeText)) !== null) {
    const key = pm[1].replace(/\s+/g, " ").trim().toLowerCase();
    const val = pm[2].replace(/[,\s]+/g, "").toLowerCase();
    if (!beforePairs.has(key)) beforePairs.set(key, new Set());
    beforePairs.get(key).add(val);
  }
  rowPairRe.lastIndex = 0;
  while ((pm = rowPairRe.exec(afterText)) !== null) {
    const key = pm[1].replace(/\s+/g, " ").trim().toLowerCase();
    const val = pm[2].replace(/[,\s]+/g, "").toLowerCase();
    const expected = beforePairs.get(key);
    if (expected && !expected.has(val)) {
      secondOrderSlopHits.push({
        id: "swapped-labeled-metric",
        message: `Metric value for '${pm[1].trim()}' changed from '${Array.from(expected).join("/")}' to '${pm[2]}'.`,
      });
    }
  }

  const ok = factCheck.ok && secondOrderSlopHits.length === 0;
  return {
    ok,
    droppedFacts: factCheck.reasons,
    regressions: secondOrderSlopHits,
  };
}
