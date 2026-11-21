---
content-type: reference-data
version: 0.4.0
---

# Local MCP, Hosted Remote MCP & HTTP API

## 1. Local Offline Stdio MCP (Open Source, Zero LLM, Zero Upload)

Node.js 20+:
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

Python 3.10+ (zero external deps):
```json
{
  "mcpServers": {
    "dislop": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/dislop-ai/dislop", "dislop", "--mcp"]
    }
  }
}
```

Local deterministic tools:
- `dislop_check`: Arguments `{ "text"?: string, "path"?: string, "filename"?: string, "pack"?: "core"|"business-brief"|"literary-essay"|"deck-and-ui" }`. Returns `{ pack, modality, count, findings }` with 0 network calls.
- `dislop_explain`: Arguments `{ "ruleId": string, "lang"?: "en"|"zh" }`. Returns rationale and `bad -> trap -> good` examples.
- `dislop_packs`: Arguments `{}`. Lists installed packs.

## 2. Hosted Remote HTTP MCP (Cloud LLM, Free 30 Credits/Month)

Claim a free Bearer token (`dslp_...`) at `https://dislop.com/#cloud-token-box` (paid-tier zero-training Google Gemini endpoint, no draft logging; see [`/privacy.md`](../privacy.md)).

### Claude Code
```bash
claude mcp add --transport http dislop-cloud https://dislop.com/mcp --header "Authorization: Bearer dslp_YOUR_FREE_TOKEN"
```

### Cursor / Windsurf (`mcp.json`)
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

### Codex (`~/.codex/config.toml`)
```toml
[mcp_servers.dislop_cloud]
url = "https://dislop.com/mcp"
http_headers = { Authorization = "Bearer dslp_YOUR_FREE_TOKEN" }
```

### Remote MCP Tools & Example Payloads

- `dislop_check`, `dislop_explain`, `dislop_packs` (0 credits, no token required; note remote `dislop_check` accepts `text` only, not local filesystem `path`).
- `dislop_review` (1 credit, requires Bearer token):
  - Input: `{ "text": "...", "pack"?: "business-brief", "lang"?: "en"|"zh" }`
  - Output: `{ mode, model, deterministic, thirdOrderHits, llmReview: { summary, aiFlavorLevel, issues }, billing }`
- `dislop_deslop` (2 credits, requires Bearer token):
  - Input: `{ "text": "...", "pack"?: "business-brief", "lang"?: "en"|"zh", "voiceProfile"?: object }`
  - Output: `{ mode, model, revised, changes, afterCheck, numericDiff, attempts, repaired, billing }`
- `dislop_voice_extract` (2 credits, requires Bearer token):
  - Input: `{ "samples": ["Sample 1...", "Sample 2..."], "lang"?: "en"|"zh" }`
  - Output: `{ schema: "dislop.voice/1", stylometrics, profile }` — pass `output.profile` as `voiceProfile` in `dislop_deslop`.

## 3. Cloud HTTP API & JS Core Export

- Same-origin HTTP endpoints: `GET /api/health`, `POST /api/v1/check`, `POST /api/v1/review`, `POST /api/v1/deslop`, `POST /api/v1/voice/extract`, `POST /api/v1/auth/register`, `GET /api/v1/account/me`, and `POST /api/v1/waitlist`.
- `package.json` exports the zero-I/O pure ES module `src/core.mjs` (`auditText`, `auditOoxmlEntries`, `resolveEffectivePack`).
