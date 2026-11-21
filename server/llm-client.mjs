// Zero-dependency OpenAI-compatible LLM client for dislop self-hosted / official backend.
// Supports tiered review/deslop routing, self-healing repair pass, voice profile extraction,
// token usage reporting, and strict API key redaction.

export function redactSecrets(input, secrets = []) {
  let out = String(input ?? "");
  for (const s of secrets) {
    if (typeof s === "string" && s.length >= 6) {
      out = out.split(s).join("[REDACTED]");
    }
  }
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer [REDACTED]");
  out = out.replace(/\b(?:sk-[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9_-]{16,})\b/g, "[REDACTED]");
  return out;
}

export function buildReviewMessages({ text, modality = "markdown", lang = "zh", findings = [], thirdOrderHits = [] }) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你是 dislop 的去 AI 味审校助手。只关注文案和设计里的 AI 味（包括确定性规则容易漏掉的三阶结构性 AI 味：三段对称分号推销句、段尾金句/说教、校对/老师戏服、过度端庄的公关腔、网页紫粉渐变/毛玻璃/套盒模板味）。",
        "只输出严格 JSON，不要包含 Markdown 代码块围栏，字段：",
        '{"summary":"一句直白判断","aiFlavorLevel":"low|medium|high","issues":[{"quote":"原句片段","layer":"artifact|1st-order|2nd-order|3rd-order|design","why":"为什么像 AI","fix":"具体怎么改（不编造新数字或事实）"}]}',
      ].join("\n")
    : [
        "You are dislop's anti-slop reviewer. Focus strictly on AI slop in writing and design, especially 3rd-order structural habits deterministic rules miss (3-part balanced semicolon pitches, pull-quote closers, performative roleplay, press-release tone, and generic AI UI chrome).",
        "Return strict JSON with no Markdown fences:",
        '{"summary":"one plain sentence","aiFlavorLevel":"low|medium|high","issues":[{"quote":"exact span","layer":"artifact|1st-order|2nd-order|3rd-order|design","why":"why it feels AI-generated","fix":"concrete edit without inventing facts"}]}',
      ].join("\n");

  const detSummary =
    findings.length > 0
      ? findings.slice(0, 12).map((f) => `- [${f.severity}] ${f.ruleId}: "${f.match || ""}"`).join("\n")
      : "(0 deterministic findings)";
  const thirdSummary =
    thirdOrderHits.length > 0
      ? thirdOrderHits.map((h) => `- [3rd-order] ${h.probeId}: ${h.detail}`).join("\n")
      : "(0 structural probe hits)";

  const user = [
    `Modality: ${modality} | Language: ${lang}`,
    `Deterministic pre-check findings:\n${detSummary}`,
    `3rd-order structural probe hints:\n${thirdSummary}`,
    `Draft to review:\n<<<DRAFT\n${text}\nDRAFT`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildDeslopMessages({
  text,
  modality = "markdown",
  lang = "zh",
  findings = [],
  thirdOrderHits = [],
  lockedNumbers = [],
  voiceProfile = null,
}) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你是 dislop 的去 AI 味改稿助手。按平实、直接、不端着的表达重写给定内容（参考 80% 简化技术表达），守住六条硬底线：",
        "1. 删掉 AI 开头寒暄、占位符、公文黑话（如值得注意的是/抓手/全面赋能/闭环）、无出处“研究表明/数据显示”与满屏加粗清单；",
        "2. 严禁换成“不是 A，而是 B”、四字排比串、三段对称分号推销句（同句不出现两个以上分号）、5 逗号连环长句或段尾金句/说教；",
        "3. 中文段落里禁止汉字间混半角逗号/分号，全部改用全角中文标点；",
        "4. 原文里的所有数字、单位、时间、URL 与代码标识必须原样保留，绝不删改数值，也绝不编造原文没有的数字；",
        "5. 如果是 HTML/CSS/JSX，彻底去掉紫粉渐变（from-indigo/purple/pink）、AI 强力驱动/零幻觉徽章、毛玻璃（backdrop-blur）、粗左彩条（border-l-4）、满屏圆角胶囊与三层套盒，把 href=\"#\" 改为真实相对路径（如 ./report.html）或移除无效按钮，保留原有标题与数字；",
        "6. 只输出严格 JSON（无 Markdown 围栏）：{\"revised\":\"改干净后的完整内容\",\"changes\":[\"简短说明每项改动\"]}",
      ].join("\n")
    : [
        "You are dislop's anti-slop editor. Rewrite the draft into plain, direct, relaxed prose (Karpathy 80% simplified technical English) under six hard rules:",
        "1. Remove AI chat wrappers, filler openers ('It is worth noting'), buzzwords ('game-changer', 'unlocks the full potential'), unsourced 'Studies show', and bold-lead bullet walls;",
        "2. Never introduce 2nd-order slogans ('Not X, but Y', staccato three-word chains) or 3rd-order 3-part balanced semicolon pitches, 5-comma run-on sentences, or pull-quote/moralizing closers;",
        "3. Keep em-dashes restrained (at most 1 per paragraph);",
        "4. Preserve every concrete number, unit, time, URL, and code identifier from the source verbatim; never drop or invent numbers;",
        "5. For HTML/CSS/JSX, strip indigo/purple/pink gradients, 'AI-Powered'/'Zero Hallucination' badges, backdrop-blur glassmorphism, thick border-l-4 stripes, pill-badge walls (>6 rounded-full), and 3-level nested boxes; replace dead href=\"#\" with a clean relative link (e.g. ./report.html) while keeping all real headings and numbers;",
        "6. Return strict JSON only (no Markdown fences): {\"revised\":\"full cleaned draft\",\"changes\":[\"short note per change\"]}",
      ].join("\n");

  const parts = [`Modality: ${modality} | Language: ${lang}`];
  if (lockedNumbers.length > 0) {
    parts.push(`Locked source numbers (MUST preserve verbatim, do NOT invent new numbers): ${lockedNumbers.join(", ")}`);
  }
  if (findings.length > 0) {
    parts.push(
      `Deterministic findings to fix:\n${findings.slice(0, 12).map((f) => `- [${f.severity}] ${f.ruleId}: "${f.match || ""}"`).join("\n")}`
    );
  }
  if (thirdOrderHits.length > 0) {
    parts.push(
      `3rd-order structural issues to fix:\n${thirdOrderHits.map((h) => `- ${h.probeId}: ${h.detail}`).join("\n")}`
    );
  }
  if (voiceProfile && typeof voiceProfile === "object") {
    parts.push(`Target author voice profile (match this tone & rhythm):\n${JSON.stringify(voiceProfile)}`);
  }
  parts.push(`Source draft:\n<<<DRAFT\n${text}\nDRAFT`);

  return [
    { role: "system", content: system },
    { role: "user", content: parts.join("\n\n") },
  ];
}

export function buildRepairMessages({
  sourceText,
  previousRevised,
  modality = "markdown",
  lang = "zh",
  remainingFindings = [],
  remainingThirdOrder = [],
  numericDiff = { missing: [], added: [] },
}) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你是 dislop 的改稿修复器。上一版改稿未通过自动化检查门禁，请只做最小手术式修复，消除下面列出的全部残留问题，并保持平实自然。",
        '只输出严格 JSON（无围栏）：{"revised":"修复后的完整内容","changes":["本次修复项"]}',
      ].join("\n")
    : [
        "You are dislop's surgical revision repair pass. The previous edit failed automated anti-slop gates. Fix every listed issue minimally while keeping prose plain and grounded.",
        'Return strict JSON only (no fences): {"revised":"repaired full draft","changes":["fix applied"]}',
      ].join("\n");

  const violations = [];
  for (const f of remainingFindings) {
    violations.push(`- Deterministic rule [${f.ruleId}] hit on "${f.match || ""}": ${f.deletionTest || f.message || ""}`);
  }
  for (const h of remainingThirdOrder) {
    violations.push(`- 3rd-order structural probe [${h.probeId}]: ${h.detail}`);
  }
  if (numericDiff.missing?.length > 0) {
    violations.push(`- Dropped source numbers (restore them accurately): ${numericDiff.missing.join(", ")}`);
  }
  if (numericDiff.added?.length > 0) {
    violations.push(`- Invented numbers not in source (remove them): ${numericDiff.added.join(", ")}`);
  }

  const user = [
    `Modality: ${modality} | Language: ${lang}`,
    `Gate failures to fix:\n${violations.join("\n")}`,
    `Original source:\n<<<SOURCE\n${sourceText}\nSOURCE`,
    `Previous revision to repair:\n<<<PREV\n${previousRevised}\nPREV`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildVoiceExtractMessages({ samples = [], lang = "zh", stylometrics = {} }) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你负责从作者提供的真实历史样稿中提炼可复用的个人写作声纹卡（dislop.voice/1），不要空洞夸赞，只总结具体可执行的表达特征。",
        '只输出严格 JSON（无围栏）：{"tone":"一句话概括语气","sentenceHabits":["具体句式与节奏习惯"],"preferredPatterns":["作者常用的实在写法"],"avoidPatterns":["与该作者风格冲突的 AI 套话或腔调"]}',
      ].join("\n")
    : [
        "Extract a reusable author voice profile (dislop.voice/1) from the provided human writing samples. Be concrete and actionable.",
        'Return strict JSON only (no fences): {"tone":"one-line tone summary","sentenceHabits":["concrete rhythm habits"],"preferredPatterns":["grounded patterns used"],"avoidPatterns":["AI habits that clash with this voice"]}',
      ].join("\n");

  const user = [
    `Language: ${lang}`,
    `Measured offline stylometrics: ${JSON.stringify(stylometrics)}`,
    `Author samples:\n${samples.map((s, i) => `--- Sample ${i + 1} ---\n${s}`).join("\n\n")}`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseJsonFromLlm(rawContent) {
  const s = String(rawContent || "").trim();
  const unfenced = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1));
    }
    throw new Error("Upstream LLM returned non-JSON content.");
  }
}

export function createLlmClient({
  apiKey = process.env.DISLOP_LLM_API_KEY || "",
  baseUrl = process.env.DISLOP_LLM_BASE_URL || "https://api.openai.com/v1",
  model = process.env.DISLOP_LLM_MODEL || "gpt-4o-mini",
  reviewModel = process.env.DISLOP_LLM_MODEL_REVIEW || "",
  deslopModel = process.env.DISLOP_LLM_MODEL_DESLOP || "",
  timeoutMs = Number(process.env.DISLOP_LLM_TIMEOUT_MS || 45000),
  transport = null,
} = {}) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const resolvedReviewModel = reviewModel || model;
  const resolvedDeslopModel = deslopModel || model;
  const isConfigured = Boolean(apiKey && normalizedBase && (resolvedReviewModel || resolvedDeslopModel));

  async function completeRaw(messages, { targetModel = model, temperature = 0.2, maxTokens = 2600, jsonMode = true } = {}) {
    if (!isConfigured) {
      const err = new Error("LLM backend is not configured (set DISLOP_LLM_API_KEY on the server).");
      err.code = "llm_not_configured";
      err.statusCode = 503;
      throw err;
    }

    const endpoint = `${normalizedBase}/chat/completions`;
    const body = {
      model: targetModel,
      temperature,
      max_tokens: maxTokens,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    };

    try {
      let data;
      if (typeof transport === "function") {
        data = await transport({ endpoint, model: targetModel, messages, temperature, maxTokens, jsonMode });
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          const text = await resp.text();
          if (!resp.ok) {
            throw new Error(`Upstream LLM HTTP ${resp.status}: ${text.slice(0, 240)}`);
          }
          data = JSON.parse(text);
        } finally {
          clearTimeout(timer);
        }
      }

      const choice = data?.choices?.[0];
      const content = choice?.message?.content;
      const usage = {
        promptTokens: Number(data?.usage?.prompt_tokens || 0),
        completionTokens: Number(data?.usage?.completion_tokens || 0),
        totalTokens: Number(data?.usage?.total_tokens || 0),
      };
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`Upstream LLM returned an empty completion (finish_reason=${choice?.finish_reason || "unknown"}).`);
      }
      return { content, usage, finishReason: choice?.finish_reason || "stop" };
    } catch (err) {
      const safeErr = new Error(redactSecrets(err?.message || "LLM request failed", [apiKey]));
      safeErr.code = err?.code || "llm_upstream_error";
      safeErr.statusCode = err?.statusCode || 502;
      throw safeErr;
    }
  }

  return {
    isConfigured,
    model: isConfigured ? resolvedDeslopModel : null,
    models: isConfigured ? { review: resolvedReviewModel, deslop: resolvedDeslopModel } : null,
    async completeText(messages, opts = {}) {
      return completeRaw(messages, { ...opts, jsonMode: false });
    },
    async review(params) {
      const { content, usage } = await completeRaw(buildReviewMessages(params), {
        targetModel: resolvedReviewModel,
        temperature: 0.2,
        maxTokens: 2000,
      });
      const parsed = parseJsonFromLlm(content);
      return {
        model: resolvedReviewModel,
        usage,
        summary: String(parsed?.summary || ""),
        aiFlavorLevel: ["low", "medium", "high"].includes(parsed?.aiFlavorLevel) ? parsed.aiFlavorLevel : "medium",
        issues: Array.isArray(parsed?.issues) ? parsed.issues.slice(0, 20) : [],
      };
    },
    async deslop(params) {
      const { content, usage } = await completeRaw(buildDeslopMessages(params), {
        targetModel: resolvedDeslopModel,
        temperature: 0.2,
        maxTokens: 2600,
      });
      const parsed = parseJsonFromLlm(content);
      if (typeof parsed?.revised !== "string" || !parsed.revised.trim()) {
        throw new Error("Upstream LLM response missing 'revised' text.");
      }
      return {
        model: resolvedDeslopModel,
        usage,
        revised: parsed.revised,
        changes: Array.isArray(parsed?.changes) ? parsed.changes.map(String).slice(0, 20) : [],
      };
    },
    async repair(params) {
      const { content, usage } = await completeRaw(buildRepairMessages(params), {
        targetModel: resolvedDeslopModel,
        temperature: 0.15,
        maxTokens: 2600,
      });
      const parsed = parseJsonFromLlm(content);
      if (typeof parsed?.revised !== "string" || !parsed.revised.trim()) {
        throw new Error("Upstream LLM repair response missing 'revised' text.");
      }
      return {
        model: resolvedDeslopModel,
        usage,
        revised: parsed.revised,
        changes: Array.isArray(parsed?.changes) ? parsed.changes.map(String).slice(0, 20) : [],
      };
    },
    async extractVoice(params) {
      const { content, usage } = await completeRaw(buildVoiceExtractMessages(params), {
        targetModel: resolvedReviewModel,
        temperature: 0.2,
        maxTokens: 1800,
      });
      const parsed = parseJsonFromLlm(content);
      return {
        model: resolvedReviewModel,
        usage,
        tone: String(parsed?.tone || ""),
        sentenceHabits: Array.isArray(parsed?.sentenceHabits) ? parsed.sentenceHabits.map(String).slice(0, 10) : [],
        preferredPatterns: Array.isArray(parsed?.preferredPatterns) ? parsed.preferredPatterns.map(String).slice(0, 10) : [],
        avoidPatterns: Array.isArray(parsed?.avoidPatterns) ? parsed.avoidPatterns.map(String).slice(0, 10) : [],
      };
    },
  };
}
