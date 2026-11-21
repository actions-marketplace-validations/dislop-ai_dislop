---
content-type: reference-data
version: 0.4.0
---

# Local MCP, Hosted Remote MCP & HTTP API

## 1. Local Offline Stdio MCP (Open Source, Zero LLM, Zero Upload)

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}
```

Local deterministic tools:
- `dislop_check`: Checks `text` or workspace-relative `path`, returning flagged spans, check questions, and examples (0 network calls).
- `dislop_explain`: Returns rationale and `bad -> trap -> good` examples for a `ruleId`.
- `dislop_packs`: Lists installed packs (`core`, `business-brief`, `literary-essay`, `deck-and-ui`).

## 2. Hosted Remote HTTP MCP (Cloud LLM, Free 30 Credits/Month)

Claim a free Bearer token (`dslp_...`) at `https://dislop.com/#pricing` (only its SHA-256 hash is stored; paid-tier zero-training model endpoint, no draft logging):

```json
{
  "mcpServers": {
    "dislop-cloud": {
      "url": "https://dislop.com/mcp",
      "headers": {
        "Authorization": "Bearer dslp_YOUR_FREE_TOKEN"
      }
    }
  }
}
```

Remote MCP tools:
- `dislop_check`, `dislop_explain`, `dislop_packs` (0 credits, no token required).
- `dislop_review` (1 credit): hybrid deterministic + 3rd-order structural + LLM review.
- `dislop_deslop` (2 credits): self-healing rewrite with deterministic post-check, numeric fidelity guard, and automatic repair pass.
- `dislop_voice_extract` (2 credits): extract a reusable `dislop.voice/1` style profile from 1-5 human samples.

## 3. Cloud HTTP API & JS Core Export

- Same-origin HTTP endpoints: `GET /api/health`, `POST /api/v1/check`, `POST /api/v1/review`, `POST /api/v1/deslop`, `POST /api/v1/voice/extract`, `POST /api/v1/auth/register`, `GET /api/v1/account/me`, and `POST /api/v1/waitlist`.
- `package.json` exports the zero-I/O pure ES module `src/core.mjs` (`auditText`, `auditOoxmlEntries`, `resolveEffectivePack`).
