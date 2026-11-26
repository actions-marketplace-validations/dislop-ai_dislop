import { extractStructuredJson } from "../json-extract.mjs";

export const DEFAULT_CLOUD_REVIEW_URL = "https://dislop.com/api/v1/review";

/**
 * Tier 1 Official Cloud adapter (`POST https://dislop.com/api/v1/review`).
 */
export async function invokeCloudProvider({
  credentials,
  payload,
  doc,
  promptRules,
  timeoutMs = 45000,
  fetchImpl = globalThis.fetch,
  env = process.env,
}) {
  const endpoint = env.DISLOP_CLOUD_URL || credentials?.endpoint || DEFAULT_CLOUD_REVIEW_URL;
  const token = credentials?.accessToken || credentials?.token || credentials?.apiKey;
  if (!token) {
    const err = new Error("Missing Official Cloud token in credentials.json. Run 'dislop login'.");
    err.authError = true;
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "dislop-cli/1.0.0",
      },
      body: JSON.stringify({
        schema: "dislop.review-request/1",
        text: Array.isArray(doc?.segments)
          ? doc.segments.map((s) => s.text).join("\n\n")
          : String(payload?.userPrompt || ""),
        file: doc?.filePath || "",
        format: doc?.format || "md",
        modality: doc?.format || "md",
        language: doc?.language || "en",
        systemPrompt: payload.systemPrompt,
        userPrompt: payload.userPrompt,
        rules: promptRules,
      }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      const err = new Error(`Official Cloud authentication failed (HTTP ${res.status}). Run 'dislop login'.`);
      err.authError = true;
      throw err;
    }
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`Official Cloud request failed (HTTP ${res.status}): ${bodyText.slice(0, 240)}`);
    }

    const data = await res.json();
    if (data && typeof data === "object" && Array.isArray(data.items)) {
      return data;
    }
    if (data && typeof data === "object" && Array.isArray(data.findings)) {
      return adaptLegacyCloudFindings(data, doc, promptRules);
    }
    if (typeof data?.content === "string") {
      return extractStructuredJson(data.content);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function adaptLegacyCloudFindings(data, doc, promptRules = []) {
  const proseFallbackRule =
    promptRules.find((r) => r.ruleId.endsWith("/stealth-vapor"))?.ruleId ||
    promptRules[0]?.ruleId ||
    `${doc.language || "en"}/prose/stealth-vapor`;
  const mountedByFull = new Map(promptRules.map((r) => [r.ruleId, r.ruleId]));
  const mountedByBare = new Map();
  for (const r of promptRules) {
    const bare = r.ruleId.split("/").pop();
    if (!mountedByBare.has(bare)) mountedByBare.set(bare, r.ruleId);
  }

  const items = [];
  for (const f of data.findings || []) {
    if (!f || typeof f !== "object") continue;
    const rawQuote = String(f.anchor?.quote || f.revision?.find || "").trim();
    const seg =
      (rawQuote && doc.segments.find((s) => s.text.includes(rawQuote))) ||
      (rawQuote && doc.segments.find((s) => rawQuote.includes(s.text))) ||
      null;
    if (!seg) continue;

    const quote = seg.text.includes(rawQuote) ? rawQuote : seg.text;
    const bareId = f.ruleId ? String(f.ruleId).split("/").pop() : "";
    const ruleId =
      mountedByFull.get(f.ruleId) || mountedByBare.get(bareId) || proseFallbackRule;
    const priority = f.severity === "error" ? "strong" : f.severity === "warning" ? "moderate" : "hint";
    const rev = f.revision || {};

    let actionType = "prompt";
    let fixSafety = "manual";
    let suggestedReplacement = "";
    let rewritePrompt = String(rev.instruction || rev.question || f.why || "").trim();
    if (rev.kind === "edit") {
      const rep = String(rev.replace ?? "");
      actionType = rep === "" ? "delete" : "replace";
      fixSafety = "review";
      suggestedReplacement = rep;
      rewritePrompt = "";
    }

    items.push({
      ruleId,
      targetId: seg.id,
      priority,
      fixSafety,
      actionType,
      originalQuote: quote,
      suggestedReplacement,
      reason: String(f.why || "").trim() || "Editorial issue flagged by Official Cloud.",
      rewritePrompt,
    });
  }

  return {
    documentToneAnchor: String(data?.llmReview?.summary || "").trim(),
    items,
  };
}
