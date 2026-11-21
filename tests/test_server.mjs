#!/usr/bin/env node
// Offline deterministic unit tests for server/ (REST API, Remote HTTP MCP, self-healing auto-repair,
// voice profile extraction, tiered model routing, credit weights, daily caps & key redaction).
import assert from "node:assert/strict";
import { createDislopServer } from "../server/index.mjs";
import { redactSecrets } from "../server/llm-client.mjs";

async function startServer(options) {
  const server = createDislopServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function postJson(url, body, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: resp.status, headers: resp.headers, json: await resp.json() };
}

// 1. Secret redaction test
const leaked = "Upstream error 401 for key sk-test-secret-99999999 and Bearer tok_abcdef123456";
const redacted = redactSecrets(leaked, ["sk-test-secret-99999999"]);
assert.equal(redacted.includes("sk-test-secret-99999999"), false, "Failed to redact explicit API key");
assert.equal(redacted.includes("tok_abcdef123456"), false, "Failed to redact Bearer token");

// 2. Deterministic-only mode (NO API key configured)
{
  const { server, baseUrl } = await startServer({ apiKey: "", rateLimitPerMin: 100 });
  try {
    const health = await (await fetch(`${baseUrl}/health`)).json();
    assert.equal(health.ok, true);
    assert.equal(health.deterministic, true);
    assert.equal(health.llmConfigured, false);
    assert.equal(health.model, null);

    const chk = await postJson(`${baseUrl}/v1/check`, {
      text: "好的，以下是修改后的上线说明。本次改造全面赋能业务。",
      pack: "business-brief",
    });
    assert.equal(chk.status, 200);
    assert.equal(chk.json.summary.errors, 1);
    assert.ok(chk.json.summary.warnings >= 1);

    const revNoKey = await postJson(`${baseUrl}/v1/review`, { text: "hello" });
    assert.equal(revNoKey.status, 503);
    assert.equal(revNoKey.json.error, "llm_not_configured");
  } finally {
    server.close();
  }
}

// 3. Hybrid + Self-Healing Auto-Repair + Voice Extract + Remote HTTP MCP
{
  const fakeKey = "sk-fake-unit-test-key-1234567890";
  const seenModels = [];
  let deslopCalls = 0;

  const mockTransport = async ({ model, messages }) => {
    seenModels.push(model);
    const sys = messages[0].content;
    if (sys.includes("aiFlavorLevel")) {
      return {
        usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Has a 3-part semicolon pitch and pull-quote closer.",
                aiFlavorLevel: "high",
                issues: [
                  {
                    quote: "笔一直在你手里",
                    layer: "3rd-order",
                    why: "Pull-quote closing slogan",
                    fix: "Delete the closing slogan.",
                  },
                ],
              }),
            },
          },
        ],
      };
    }
    if (sys.includes("sentenceHabits")) {
      return {
        usage: { prompt_tokens: 140, completion_tokens: 70, total_tokens: 210 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                tone: "平实直接的工程师口吻",
                sentenceHabits: ["短句开场，不铺垫", "数据带单位和条件"],
                preferredPatterns: ["先说结论再说改动"],
                avoidPatterns: ["三段分号推销句", "不是 A 而是 B"],
              }),
            },
          },
        ],
      };
    }
    if (sys.includes("改稿修复器") || sys.includes("surgical revision repair")) {
      return {
        usage: { prompt_tokens: 160, completion_tokens: 55, total_tokens: 215 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                revised: "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
                changes: ["Removed 2nd-order negation pivot and restored 45"],
              }),
            },
          },
        ],
      };
    }
    deslopCalls += 1;
    // First deslop call intentionally slips into a 2nd-order slogan & drops '45' -> triggers auto-repair!
    if (deslopCalls === 1) {
      return {
        usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                revised: "队列分级已上线。这不是一次普通升级，而是一场效率革命。",
                changes: ["Removed chat greeting"],
              }),
            },
          },
        ],
      };
    }
    return {
      usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              revised: "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
              changes: ["Deleted AI chat opener", "Removed bureaucratic filler words"],
            }),
          },
        },
      ],
    };
  };

  const { server, baseUrl } = await startServer({
    apiKey: fakeKey,
    reviewModel: "mock-flash-lite",
    deslopModel: "mock-flash",
    dailyLlmLimit: 7,
    transport: mockTransport,
    rateLimitPerMin: 50,
  });
  try {
    const health = await (await fetch(`${baseUrl}/health`)).json();
    assert.equal(health.llmConfigured, true);
    assert.equal(health.model, "mock-flash");
    assert.deepEqual(health.models, { review: "mock-flash-lite", deslop: "mock-flash" });
    assert.equal(health.dailyQuota.limit, 7);
    assert.equal(JSON.stringify(health).includes(fakeKey), false, "Health endpoint leaked API key!");

    // 1. /v1/review (1 credit, mock-flash-lite)
    const rev = await postJson(`${baseUrl}/v1/review`, {
      text: "把稿子贴进来。硬伤划掉；套话问一句；改完再查。笔一直在你手里。",
      lang: "zh",
    });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.model, "mock-flash-lite");
    assert.equal(rev.json.creditWeight, 1);
    assert.equal(rev.headers.get("x-dislop-credits-used"), "1");
    assert.ok(rev.json.thirdOrderHits.length >= 2);
    assert.equal(rev.json.llmReview.aiFlavorLevel, "high");

    // 2. /v1/voice/extract (2 credits, mock-flash-lite)
    const voice = await postJson(`${baseUrl}/v1/voice/extract`, {
      samples: [
        "周二凌晨 02:14，华东机房缓存集群触发连接数上限，订单查询失败 11 分钟。值班工程师扩容 4 个节点后恢复。",
        "本周五前会把连接池告警阈值从 95% 下调到 75%，避免同样的问题再出现。",
      ],
      lang: "zh",
    });
    assert.equal(voice.status, 200);
    assert.equal(voice.json.schema, "dislop.voice/1");
    assert.equal(voice.json.creditWeight, 2);
    assert.ok(voice.json.stylometrics.sentenceCount >= 3);
    assert.ok(voice.json.profile.tone.length > 0);

    // 3. /v1/deslop with self-healing auto-repair triggered (2 credits, mock-flash)
    const deslop = await postJson(`${baseUrl}/v1/deslop`, {
      text: "好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。",
      lang: "zh",
      voiceProfile: voice.json.profile,
    });
    assert.equal(deslop.status, 200);
    assert.equal(deslop.json.model, "mock-flash");
    assert.equal(deslop.json.attempts, 2, "Expected self-healing auto-repair pass to run");
    assert.equal(deslop.json.repaired, true, "Expected auto-repair to rescue pass-1 slop");
    assert.equal(deslop.json.afterCheck.summary.total, 0);
    assert.equal(deslop.json.thirdOrderHits.length, 0);
    assert.deepEqual(deslop.json.numericDiff.missing, []);
    assert.deepEqual(deslop.json.numericDiff.added, []);
    assert.equal(deslop.json.usage.totalTokens, 415);

    // 4. Remote HTTP MCP handshake + tools/list + tools/call (2 more credits -> 7/7 used)
    const initResp = await postJson(`${baseUrl}/mcp`, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    assert.equal(initResp.status, 200);
    assert.equal(initResp.json.result.serverInfo.name, "dislop-remote-mcp");

    const listResp = await postJson(`${baseUrl}/mcp`, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const toolNames = listResp.json.result.tools.map((t) => t.name);
    assert.deepEqual(toolNames, [
      "dislop_check",
      "dislop_review",
      "dislop_deslop",
      "dislop_voice_extract",
      "dislop_explain",
      "dislop_packs",
    ]);

    const callDeslop = await postJson(`${baseUrl}/mcp`, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "dislop_deslop",
        arguments: {
          text: "好的，以下是修改后的上线说明。故障恢复时间最多 45 秒。",
          lang: "zh",
        },
      },
    });
    assert.equal(callDeslop.status, 200);
    assert.equal(callDeslop.headers.get("x-dislop-credits-used"), "2");
    const parsedTool = JSON.parse(callDeslop.json.result.content[0].text);
    assert.equal(parsedTool.attempts, 1);
    assert.equal(parsedTool.afterCheck.summary.total, 0);
    assert.deepEqual(seenModels, ["mock-flash-lite", "mock-flash-lite", "mock-flash", "mock-flash", "mock-flash"]);

    // 5. Exceeding hard daily credit limit -> 429 daily_limit_reached (deterministic /v1/check still works)
    const overDaily = await postJson(`${baseUrl}/v1/review`, { text: "hello" });
    assert.equal(overDaily.status, 429);
    assert.equal(overDaily.json.error, "daily_limit_reached");
    const stillWorks = await postJson(`${baseUrl}/v1/check`, { text: "Certainly! Here is your draft." });
    assert.equal(stillWorks.status, 200);
    assert.equal(stillWorks.json.creditWeight, 0);
  } finally {
    server.close();
  }
}

// 4. Security guards: upstream key-leak redaction, auth token, payload limit, rate limit
{
  const secretKey = "sk-must-never-leak-987654321";
  const serverToken = "srv-secret-bearer-token";
  const { server, baseUrl } = await startServer({
    apiKey: secretKey,
    authToken: serverToken,
    maxBodyBytes: 128,
    rateLimitPerMin: 2,
    transport: async () => {
      throw new Error(`Provider rejected Authorization: Bearer ${secretKey}`);
    },
  });
  try {
    const unauth = await postJson(`${baseUrl}/v1/check`, { text: "hi" });
    assert.equal(unauth.status, 401);

    const errResp = await postJson(
      `${baseUrl}/v1/review`,
      { text: "hi" },
      { Authorization: `Bearer ${serverToken}` }
    );
    assert.equal(errResp.status, 502);
    assert.equal(JSON.stringify(errResp.json).includes(secretKey), false, "Server response leaked LLM API key!");
    assert.ok(errResp.json.message.includes("[REDACTED]"));

    const big = await postJson(
      `${baseUrl}/v1/check`,
      { text: "a".repeat(300) },
      { Authorization: `Bearer ${serverToken}` }
    );
    assert.equal(big.status, 413);

    const limited = await postJson(
      `${baseUrl}/v1/check`,
      { text: "hi" },
      { Authorization: `Bearer ${serverToken}` }
    );
    assert.equal(limited.status, 429);
  } finally {
    server.close();
  }
}

console.log("dislop server-test: ok (health, check, review, voice-extract, self-healing auto-repair, remote HTTP MCP, daily cap, auth, rate-limit, payload cap & key redaction passed)");
