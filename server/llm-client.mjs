// Zero-dependency OpenAI-compatible LLM client for dislop self-hosted / official backend.
// Security rule: API keys are read ONLY from server environment variables and are strictly
// redacted from every error string and log message. Never embed or return keys in responses.

export function redactSecrets(input, secrets = []) {
  let out = String(input ?? "");
  for (const s of secrets) {
    if (typeof s === "string" && s.length >= 6) {
      out = out.split(s).join("[REDACTED]");
    }
  }
  // Also redact common key prefixes / Bearer tokens defensively
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer [REDACTED]");
  out = out.replace(/\b(?:sk-[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{20,})\b/g, "[REDACTED]");
  return out;
}

export function buildReviewMessages({ text, modality = "markdown", lang = "zh", findings = [] }) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你是 dislop 的去 AI 味审校助手。只关注文案和设计里的 AI 味（包括确定性规则容易漏掉的三阶结构性 AI 味：三段对称分号推销句、段尾金句/说教、校对/老师戏服、过度端庄的公关腔、网页紫粉渐变/毛玻璃/套盒模板味）。",
        "输出严格 JSON，不要包含 Markdown 代码块围栏，字段：",
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

  const user = [
    `Modality: ${modality} | Language: ${lang}`,
    `Deterministic pre-check findings:\n${detSummary}`,
    `Draft to review:\n<<<DRAFT\n${text}\nDRAFT`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildDeslopMessages({ text, modality = "markdown", lang = "zh", findings = [] }) {
  const isZh = lang === "zh";
  const system = isZh
    ? [
        "你是 dislop 的去 AI 味改稿助手。按平实、直接、不端着的表达重写给定内容（参考 80% 简化技术表达），守住五条底线：",
        "1. 删掉 AI 开头寒暄、占位符、公文黑话与空洞修饰；",
        "2. 严禁换成“不是 A，而是 B”、四字排比串、三段分号推销句或段尾金句；",
        "3. 原文里的数字、单位、日期、URL、行内代码与技术标识必须原样保留，绝不编造原文没有的数字或事实；",
        "4. 如果是 HTML/CSS/JSX，去掉紫粉渐变、AI 驱动徽章、空链接与多余套盒，保留语义结构与真实文案；",
        "5. 只输出严格 JSON（无代码块围栏）：{\"revised\":\"改干净后的完整内容\",\"changes\":[\"改了哪几处（简短列点）\"]}",
      ].join("\n")
    : [
        "You are dislop's anti-slop editor. Rewrite the draft into plain, direct, relaxed prose (Karpathy 80% simplified technical English) under five hard rules:",
        "1. Remove AI chat wrappers, clichés, throat-clearing openers, and filler;",
        "2. Never trade 1st-order clichés for 2nd-order slogans ('Not X, but Y', staccato chains) or 3rd-order 3-part semicolon pitches / pull-quote closers;",
        "3. Preserve every number, unit, date, URL, and code identifier from the source verbatim; never invent facts or metrics;",
        "4. For HTML/CSS/JSX, remove purple-pink gradients, prompt-echo badges, dead href='#' links, and excess nested boxes while preserving real copy;",
        "5. Return strict JSON only (no Markdown fences): {\"revised\":\"full cleaned draft\",\"changes\":[\"short note per change\"]}",
      ].join("\n");

  const detSummary =
    findings.length > 0
      ? findings.slice(0, 12).map((f) => `- [${f.severity}] ${f.ruleId}: "${f.match || ""}"`).join("\n")
      : "(0 deterministic findings — check for subtle 3rd-order structural AI flavor)";

  const user = [
    `Modality: ${modality} | Language: ${lang}`,
    `Deterministic findings to resolve:\n${detSummary}`,
    `Source draft:\n<<<DRAFT\n${text}\nDRAFT`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseJsonFromLlm(rawContent) {
  const s = String(rawContent || "").trim();
  const unfenced = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(unfenced);
}

export function createLlmClient({
  apiKey = process.env.DISLOP_LLM_API_KEY || "",
  baseUrl = process.env.DISLOP_LLM_BASE_URL || "https://api.openai.com/v1",
  model = process.env.DISLOP_LLM_MODEL || "gpt-4o-mini",
  reviewModel = process.env.DISLOP_LLM_MODEL_REVIEW || "",
  deslopModel = process.env.DISLOP_LLM_MODEL_DESLOP || "",
  timeoutMs = Number(process.env.DISLOP_LLM_TIMEOUT_MS || 30000),
  transport = null,
} = {}) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const resolvedReviewModel = reviewModel || model;
  const resolvedDeslopModel = deslopModel || model;
  const isConfigured = Boolean(apiKey && normalizedBase && (resolvedReviewModel || resolvedDeslopModel));

  async function completeJson(messages, { targetModel = model, temperature = 0.2, maxTokens = 1600 } = {}) {
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
    };

    try {
      let data;
      if (typeof transport === "function") {
        data = await transport({ endpoint, model: targetModel, messages, temperature, maxTokens });
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

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Upstream LLM returned an empty completion.");
      }
      return parseJsonFromLlm(content);
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
    async review(params) {
      const parsed = await completeJson(buildReviewMessages(params), {
        targetModel: resolvedReviewModel,
        temperature: 0.2,
        maxTokens: 1400,
      });
      return {
        model: resolvedReviewModel,
        summary: String(parsed?.summary || ""),
        aiFlavorLevel: ["low", "medium", "high"].includes(parsed?.aiFlavorLevel) ? parsed.aiFlavorLevel : "medium",
        issues: Array.isArray(parsed?.issues) ? parsed.issues.slice(0, 20) : [],
      };
    },
    async deslop(params) {
      const parsed = await completeJson(buildDeslopMessages(params), {
        targetModel: resolvedDeslopModel,
        temperature: 0.25,
        maxTokens: 2000,
      });
      if (typeof parsed?.revised !== "string" || !parsed.revised.trim()) {
        throw new Error("Upstream LLM response missing 'revised' text.");
      }
      return {
        model: resolvedDeslopModel,
        revised: parsed.revised,
        changes: Array.isArray(parsed?.changes) ? parsed.changes.map(String).slice(0, 20) : [],
      };
    },
  };
}
