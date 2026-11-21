#!/usr/bin/env node
// Open-source, zero-dependency HTTP API + Remote Streamable HTTP MCP server for dislop.
// Supports deterministic checks (zero LLM) plus LLM-backed services:
//   - /v1/review & dislop_review: deterministic + 3rd-order structural + LLM critique
//   - /v1/deslop & dislop_deslop: self-healing Check -> Rewrite -> Re-Check & Auto-Repair pipeline
//   - /v1/voice/extract & dislop_voice_extract: offline stylometrics + LLM dislop.voice/1 extraction
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditText, detectModality, resolveEffectivePack } from "../src/core.mjs";
import { createLlmClient, redactSecrets } from "./llm-client.mjs";
import {
  computeOfflineStylometrics,
  extractKeyNumbers,
  runThirdOrderProbes,
  summarizeNumericDiff,
} from "./probes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadPacksById() {
  const packsDir = path.join(ROOT, "packs");
  const out = {};
  for (const entry of fs.readdirSync(packsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const p = path.join(packsDir, entry.name, "pack.json");
    if (fs.existsSync(p)) {
      const manifest = JSON.parse(fs.readFileSync(p, "utf8"));
      out[manifest.id] = manifest;
    }
  }
  return out;
}

const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const PACKS_BY_ID = loadPacksById();

export const CREDIT_WEIGHTS = {
  dislop_check: 0,
  dislop_explain: 0,
  dislop_packs: 0,
  dislop_review: 1,
  dislop_deslop: 2,
  dislop_voice_extract: 2,
};

function addUsage(a, b) {
  return {
    promptTokens: (a?.promptTokens || 0) + (b?.promptTokens || 0),
    completionTokens: (a?.completionTokens || 0) + (b?.completionTokens || 0),
    totalTokens: (a?.totalTokens || 0) + (b?.totalTokens || 0),
  };
}

function createDailyCounter(limitPerDay) {
  let dayKey = new Date().toISOString().slice(0, 10);
  let used = 0;
  return {
    consume(credits = 1) {
      if (!limitPerDay || limitPerDay <= 0) return { allowed: true, used, limit: 0 };
      const today = new Date().toISOString().slice(0, 10);
      if (today !== dayKey) {
        dayKey = today;
        used = 0;
      }
      if (used + credits > limitPerDay) {
        return { allowed: false, used, limit: limitPerDay };
      }
      used += credits;
      return { allowed: true, used, limit: limitPerDay };
    },
    status() {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== dayKey) {
        dayKey = today;
        used = 0;
      }
      return { used, limit: limitPerDay || 0 };
    },
  };
}

function createRateLimiter(limitPerMin) {
  const buckets = new Map();
  return function allow(ip) {
    if (!limitPerMin || limitPerMin <= 0) return true;
    const now = Date.now();
    const cutoff = now - 60_000;
    const list = (buckets.get(ip) || []).filter((t) => t > cutoff);
    if (list.length >= limitPerMin) {
      buckets.set(ip, list);
      return false;
    }
    list.push(now);
    buckets.set(ip, list);
    if (buckets.size > 5000) {
      for (const [k, v] of buckets.entries()) {
        if (v.length === 0 || v[v.length - 1] <= cutoff) buckets.delete(k);
      }
    }
    return true;
  };
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        const err = new Error(`Payload exceeds ${maxBytes} byte limit.`);
        err.statusCode = 413;
        err.code = "payload_too_large";
        reject(err);
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error("Invalid JSON request body.");
        err.statusCode = 400;
        err.code = "invalid_json";
        reject(err);
      }
    });
    req.on("error", (err) => reject(err));
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(body);
}

function buildCorsHeaders(req, allowedOrigin) {
  if (!allowedOrigin) return {};
  const origin = req.headers.origin;
  if (allowedOrigin === "*") {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
    };
  }
  const allowedList = allowedOrigin.split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowedList.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
    };
  }
  return {};
}

// ---------- Core Operation Handlers (Shared by REST API, Remote HTTP MCP & Live Benchmark) ----------

export function runDeterministicCheck({ text, filename = "draft.md", modality, pack = "business-brief" }) {
  if (typeof text !== "string") {
    const err = new Error("'text' must be a string.");
    err.statusCode = 400;
    err.code = "invalid_input";
    throw err;
  }
  const effPack = resolveEffectivePack(pack, PACKS_BY_ID);
  const resolvedMod = modality || detectModality(filename) || "markdown";
  const res = auditText(text, { filename, modality: resolvedMod, pack: effPack });
  return {
    pack: effPack.id,
    modality: resolvedMod,
    findings: res.findings || [],
    summary: {
      errors: (res.findings || []).filter((f) => f.severity === "error").length,
      warnings: (res.findings || []).filter((f) => f.severity !== "error").length,
      total: (res.findings || []).length,
    },
  };
}

function runExplainRule({ ruleId, lang = "en" }) {
  for (const [packId, pack] of Object.entries(PACKS_BY_ID)) {
    const found = (pack.rules || []).find((r) => r.id === ruleId);
    if (found) {
      return {
        ruleId: found.id,
        pack: packId,
        severity: found.severity,
        modalities: found.modalities || [],
        message: found.message?.[lang] || found.message?.en || "",
        deletionTest: found.deletionTest?.[lang] || found.deletionTest?.en || "",
        exemplar: found.exemplar || null,
      };
    }
  }
  const err = new Error(`Unknown ruleId: ${ruleId}`);
  err.statusCode = 404;
  err.code = "not_found";
  throw err;
}

function runListPacks() {
  return {
    packs: Object.values(PACKS_BY_ID).map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      summary: p.summary,
      ruleCount: (p.rules || []).length,
    })),
  };
}

export async function runLlmReview(
  llm,
  dailyQuota,
  { text, filename = "draft.md", modality, pack = "business-brief", lang = "zh" }
) {
  const deterministic = runDeterministicCheck({ text, filename, modality, pack });
  const thirdOrderHits = runThirdOrderProbes(text, { modality: deterministic.modality, lang });
  if (llm.isConfigured && dailyQuota) {
    const q = dailyQuota.consume(CREDIT_WEIGHTS.dislop_review);
    if (!q.allowed) {
      const err = new Error("Daily LLM quota reached on this server. Self-host with your own key or retry tomorrow.");
      err.statusCode = 429;
      err.code = "daily_limit_reached";
      throw err;
    }
  }
  const llmReview = await llm.review({
    text,
    modality: deterministic.modality,
    lang,
    findings: deterministic.findings,
    thirdOrderHits,
  });
  return {
    mode: "hybrid",
    model: llmReview.model || llm.model,
    creditWeight: CREDIT_WEIGHTS.dislop_review,
    usage: llmReview.usage,
    deterministic,
    thirdOrderHits,
    llmReview: {
      summary: llmReview.summary,
      aiFlavorLevel: llmReview.aiFlavorLevel,
      issues: llmReview.issues,
    },
  };
}

export async function runLlmDeslop(
  llm,
  dailyQuota,
  {
    text,
    filename = "draft.md",
    modality,
    pack = "business-brief",
    lang = "zh",
    voiceProfile = null,
    autoRepair = true,
  }
) {
  const beforeCheck = runDeterministicCheck({ text, filename, modality, pack });
  const beforeThirdOrder = runThirdOrderProbes(text, { modality: beforeCheck.modality, lang });
  const lockedNumbers = extractKeyNumbers(text);

  if (llm.isConfigured && dailyQuota) {
    const q = dailyQuota.consume(CREDIT_WEIGHTS.dislop_deslop);
    if (!q.allowed) {
      const err = new Error("Daily LLM quota reached on this server. Self-host with your own key or retry tomorrow.");
      err.statusCode = 429;
      err.code = "daily_limit_reached";
      throw err;
    }
  }

  const pass1 = await llm.deslop({
    text,
    modality: beforeCheck.modality,
    lang,
    findings: beforeCheck.findings,
    thirdOrderHits: beforeThirdOrder,
    lockedNumbers,
    voiceProfile,
  });

  let revised = pass1.revised;
  let changes = [...pass1.changes];
  let totalUsage = pass1.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let afterCheck = runDeterministicCheck({ text: revised, filename, modality: beforeCheck.modality, pack });
  let thirdOrderHits = runThirdOrderProbes(revised, { modality: beforeCheck.modality, lang });
  let numericDiff = summarizeNumericDiff(text, revised, beforeCheck.modality);
  let attempts = 1;
  let repaired = false;

  const needsRepair =
    afterCheck.findings.length > 0 ||
    thirdOrderHits.length > 0 ||
    numericDiff.missing.length > 0 ||
    numericDiff.added.length > 0;

  if (autoRepair && needsRepair && typeof llm.repair === "function") {
    attempts = 2;
    const pass2 = await llm.repair({
      sourceText: text,
      previousRevised: revised,
      modality: beforeCheck.modality,
      lang,
      remainingFindings: afterCheck.findings,
      remainingThirdOrder: thirdOrderHits,
      numericDiff,
    });
    totalUsage = addUsage(totalUsage, pass2.usage);
    const repairedCheck = runDeterministicCheck({
      text: pass2.revised,
      filename,
      modality: beforeCheck.modality,
      pack,
    });
    const repairedThird = runThirdOrderProbes(pass2.revised, { modality: beforeCheck.modality, lang });
    const repairedNum = summarizeNumericDiff(text, pass2.revised, beforeCheck.modality);

    const scorePenalty = (c, t, n) =>
      c.findings.length * 10 + t.length * 10 + n.missing.length * 8 + n.added.length * 8;

    if (
      scorePenalty(repairedCheck, repairedThird, repairedNum) <=
      scorePenalty(afterCheck, thirdOrderHits, numericDiff)
    ) {
      revised = pass2.revised;
      changes = [...changes, ...pass2.changes];
      afterCheck = repairedCheck;
      thirdOrderHits = repairedThird;
      numericDiff = repairedNum;
      repaired = true;
    }
  }

  return {
    mode: "self-healing-pipeline",
    model: pass1.model || llm.model,
    creditWeight: CREDIT_WEIGHTS.dislop_deslop,
    attempts,
    repaired,
    usage: totalUsage,
    revised,
    changes,
    beforeFindingsCount: beforeCheck.findings.length,
    afterCheck,
    thirdOrderHits,
    numericDiff,
  };
}

export async function runVoiceExtract(llm, dailyQuota, { samples, lang = "zh" }) {
  if (!Array.isArray(samples) || samples.length === 0 || samples.some((s) => typeof s !== "string" || !s.trim())) {
    const err = new Error("'samples' must be a non-empty array of writing sample strings.");
    err.statusCode = 400;
    err.code = "invalid_input";
    throw err;
  }
  const stylometrics = computeOfflineStylometrics(samples.slice(0, 5), lang);
  if (llm.isConfigured && dailyQuota) {
    const q = dailyQuota.consume(CREDIT_WEIGHTS.dislop_voice_extract);
    if (!q.allowed) {
      const err = new Error("Daily LLM quota reached on this server. Self-host with your own key or retry tomorrow.");
      err.statusCode = 429;
      err.code = "daily_limit_reached";
      throw err;
    }
  }
  const voiceCard = await llm.extractVoice({ samples: samples.slice(0, 5), lang, stylometrics });
  return {
    schema: "dislop.voice/1",
    lang,
    model: voiceCard.model || llm.model,
    creditWeight: CREDIT_WEIGHTS.dislop_voice_extract,
    usage: voiceCard.usage,
    stylometrics,
    profile: {
      tone: voiceCard.tone,
      sentenceHabits: voiceCard.sentenceHabits,
      preferredPatterns: voiceCard.preferredPatterns,
      avoidPatterns: voiceCard.avoidPatterns,
    },
  };
}

// ---------- Remote Streamable HTTP MCP Protocol Handler ----------

const MCP_TOOLS = [
  {
    name: "dislop_check",
    description: "Deterministic offline-grade check for AI artifacts, clichés, 2nd-order slogans, and AI UI templates (0 credits).",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string" },
        filename: { type: "string" },
        modality: { type: "string", enum: ["markdown", "text", "html", "css", "jsx", "svg"] },
        pack: { type: "string", enum: ["core", "business-brief", "literary-essay", "deck-and-ui"] },
      },
    },
  },
  {
    name: "dislop_review",
    description: "Hybrid deterministic + 3rd-order structural + LLM anti-slop review catching subtle pitch cadence and AI UI chrome (1 credit).",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string" },
        filename: { type: "string" },
        modality: { type: "string", enum: ["markdown", "text", "html", "css", "jsx", "svg"] },
        pack: { type: "string", enum: ["core", "business-brief", "literary-essay", "deck-and-ui"] },
        lang: { type: "string", enum: ["zh", "en"] },
      },
    },
  },
  {
    name: "dislop_deslop",
    description: "Self-healing LLM rewrite pipeline: pre-check -> plain-voice rewrite -> deterministic & 3rd-order gate -> numeric fidelity check -> auto-repair (2 credits).",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string" },
        filename: { type: "string" },
        modality: { type: "string", enum: ["markdown", "text", "html", "css", "jsx", "svg"] },
        pack: { type: "string", enum: ["core", "business-brief", "literary-essay", "deck-and-ui"] },
        lang: { type: "string", enum: ["zh", "en"] },
        voiceProfile: { type: "object" },
      },
    },
  },
  {
    name: "dislop_voice_extract",
    description: "Extract a reusable dislop.voice/1 author style profile (offline stylometrics + LLM tone/habit card) from 1-5 human drafts (2 credits).",
    inputSchema: {
      type: "object",
      required: ["samples"],
      properties: {
        samples: { type: "array", items: { type: "string" } },
        lang: { type: "string", enum: ["zh", "en"] },
      },
    },
  },
  {
    name: "dislop_explain",
    description: "Explain a dislop rule with its check question and before/overcorrected/after examples (0 credits).",
    inputSchema: {
      type: "object",
      required: ["ruleId"],
      properties: {
        ruleId: { type: "string" },
        lang: { type: "string", enum: ["zh", "en"] },
      },
    },
  },
  {
    name: "dislop_packs",
    description: "List available dislop rule packs (0 credits).",
    inputSchema: { type: "object", properties: {} },
  },
];

async function handleMcpRpc(rpc, llm, dailyQuota) {
  const id = rpc?.id ?? null;
  if (!rpc || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    return { rpcResp: { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid JSON-RPC 2.0 request" } }, creditsUsed: 0 };
  }

  if (rpc.method === "initialize") {
    return {
      rpcResp: {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "dislop-remote-mcp", version: PKG.version || "0.3.0" },
        },
      },
      creditsUsed: 0,
    };
  }

  if (rpc.method === "notifications/initialized" || rpc.method === "ping") {
    return { rpcResp: { jsonrpc: "2.0", id, result: {} }, creditsUsed: 0 };
  }

  if (rpc.method === "tools/list") {
    return { rpcResp: { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } }, creditsUsed: 0 };
  }

  if (rpc.method === "tools/call") {
    const name = rpc.params?.name;
    const args = rpc.params?.arguments || {};
    try {
      let data;
      let creditsUsed = 0;
      if (name === "dislop_check") data = { ...runDeterministicCheck(args), creditWeight: 0 };
      else if (name === "dislop_explain") data = { ...runExplainRule(args), creditWeight: 0 };
      else if (name === "dislop_packs") data = { ...runListPacks(), creditWeight: 0 };
      else if (name === "dislop_review") {
        data = await runLlmReview(llm, dailyQuota, args);
        creditsUsed = CREDIT_WEIGHTS.dislop_review;
      } else if (name === "dislop_deslop") {
        data = await runLlmDeslop(llm, dailyQuota, args);
        creditsUsed = CREDIT_WEIGHTS.dislop_deslop;
      } else if (name === "dislop_voice_extract") {
        data = await runVoiceExtract(llm, dailyQuota, args);
        creditsUsed = CREDIT_WEIGHTS.dislop_voice_extract;
      } else {
        return {
          rpcResp: { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown MCP tool: ${name}` } },
          creditsUsed: 0,
        };
      }
      return {
        rpcResp: {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          },
        },
        creditsUsed,
      };
    } catch (err) {
      return {
        rpcResp: {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: err.code || "error", message: err.message }) }],
          },
        },
        creditsUsed: 0,
      };
    }
  }

  return { rpcResp: { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${rpc.method}` } }, creditsUsed: 0 };
}

// ---------- Server Factory ----------

export function createDislopServer(options = {}) {
  const maxBodyBytes = Number(options.maxBodyBytes ?? process.env.DISLOP_MAX_BODY_BYTES ?? 65536);
  const rateLimitPerMin = Number(options.rateLimitPerMin ?? process.env.DISLOP_RATE_LIMIT_PER_MIN ?? 30);
  const dailyLlmLimit = Number(options.dailyLlmLimit ?? process.env.DISLOP_DAILY_LLM_LIMIT ?? 0);
  const corsOrigin = options.corsOrigin ?? process.env.DISLOP_CORS_ORIGIN ?? "";
  const authToken = options.authToken ?? process.env.DISLOP_SERVER_AUTH_TOKEN ?? "";
  const apiKey = options.apiKey ?? process.env.DISLOP_LLM_API_KEY ?? "";

  const llm =
    options.llm ||
    createLlmClient({
      apiKey,
      baseUrl: options.baseUrl ?? process.env.DISLOP_LLM_BASE_URL ?? "https://api.openai.com/v1",
      model: options.model ?? process.env.DISLOP_LLM_MODEL ?? "gpt-4o-mini",
      reviewModel: options.reviewModel ?? process.env.DISLOP_LLM_MODEL_REVIEW ?? "",
      deslopModel: options.deslopModel ?? process.env.DISLOP_LLM_MODEL_DESLOP ?? "",
      timeoutMs: options.timeoutMs ?? Number(process.env.DISLOP_LLM_TIMEOUT_MS || 45000),
      transport: options.transport || null,
    });

  const allowIp = createRateLimiter(rateLimitPerMin);
  const dailyQuota = createDailyCounter(dailyLlmLimit);

  return http.createServer(async (req, res) => {
    const cors = buildCorsHeaders(req, corsOrigin);
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (pathname === "/health" || pathname === "/api/health")) {
      sendJson(
        res,
        200,
        {
          ok: true,
          service: "dislop-server",
          version: PKG.version || "0.3.0",
          deterministic: true,
          llmConfigured: llm.isConfigured,
          model: llm.model,
          models: llm.models,
          creditWeights: CREDIT_WEIGHTS,
          dailyQuota: dailyQuota.status(),
          endpoints: ["/health", "/v1/check", "/v1/review", "/v1/deslop", "/v1/voice/extract", "/mcp"],
        },
        cors
      );
      return;
    }

    if (authToken) {
      const provided = String(req.headers.authorization || "");
      if (provided !== `Bearer ${authToken}`) {
        sendJson(res, 401, { error: "unauthorized", message: "Missing or invalid server bearer token." }, cors);
        return;
      }
    }

    const clientIp =
      String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
    if (!allowIp(clientIp)) {
      sendJson(res, 429, { error: "rate_limited", message: "Too many requests. Please wait a minute and retry." }, cors);
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "method_not_allowed", message: "Use POST for API and MCP endpoints." }, cors);
      return;
    }

    try {
      const body = await readJsonBody(req, maxBodyBytes);

      if (pathname === "/v1/check" || pathname === "/api/v1/check") {
        sendJson(
          res,
          200,
          { ...runDeterministicCheck(body), creditWeight: CREDIT_WEIGHTS.dislop_check },
          { ...cors, "X-Dislop-Credits-Used": "0" }
        );
        return;
      }
      if (pathname === "/v1/review" || pathname === "/api/v1/review") {
        const result = await runLlmReview(llm, dailyQuota, body);
        sendJson(res, 200, result, { ...cors, "X-Dislop-Credits-Used": String(CREDIT_WEIGHTS.dislop_review) });
        return;
      }
      if (pathname === "/v1/deslop" || pathname === "/api/v1/deslop") {
        const result = await runLlmDeslop(llm, dailyQuota, body);
        sendJson(res, 200, result, { ...cors, "X-Dislop-Credits-Used": String(CREDIT_WEIGHTS.dislop_deslop) });
        return;
      }
      if (pathname === "/v1/voice/extract" || pathname === "/api/v1/voice/extract") {
        const result = await runVoiceExtract(llm, dailyQuota, body);
        sendJson(res, 200, result, { ...cors, "X-Dislop-Credits-Used": String(CREDIT_WEIGHTS.dislop_voice_extract) });
        return;
      }
      if (pathname === "/mcp" || pathname === "/api/mcp") {
        const { rpcResp, creditsUsed } = await handleMcpRpc(body, llm, dailyQuota);
        sendJson(res, 200, rpcResp, { ...cors, "X-Dislop-Credits-Used": String(creditsUsed) });
        return;
      }

      sendJson(res, 404, { error: "not_found", message: `Unknown route: ${pathname}` }, cors);
    } catch (err) {
      const status = Number(err?.statusCode) || 500;
      const safeMessage = redactSecrets(err?.message || "Internal server error", [apiKey, authToken]);
      sendJson(res, status, { error: err?.code || "server_error", message: safeMessage }, cors);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.DISLOP_HOST || "127.0.0.1";
  const port = Number(process.env.DISLOP_PORT || 8787);
  const server = createDislopServer();
  server.listen(port, host, () => {
    const llmStatus = process.env.DISLOP_LLM_API_KEY
      ? `enabled (review=${process.env.DISLOP_LLM_MODEL_REVIEW || process.env.DISLOP_LLM_MODEL || "gpt-4o-mini"}, deslop=${process.env.DISLOP_LLM_MODEL_DESLOP || process.env.DISLOP_LLM_MODEL || "gpt-4o-mini"})`
      : "disabled (deterministic endpoints only; set DISLOP_LLM_API_KEY to enable LLM services)";
    console.log(`dislop-server listening on http://${host}:${port} | LLM: ${llmStatus}`);
  });
}
