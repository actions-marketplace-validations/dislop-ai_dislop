# dislop Open-Source Backend & Remote HTTP MCP (`server/`)

[简体中文](./README.zh-CN.md)

`dislop` splits cleanly into two layers:

- **Local zero-LLM layer**: CLI, `skills/dislop/SKILL.md`, local stdio MCP, and the offline browser workbench require no API key and make no outbound calls.
- **LLM-backed server layer (this folder, open source for self-hosting or official hosting)**: Exposes HTTP endpoints and a Remote Streamable HTTP MCP endpoint (`/mcp`) that layer LLM-based 3rd-order review (`dislop_review`) and plain-voice rewriting (`dislop_deslop`, automatically re-checked by the deterministic engine) on top of `src/core.mjs`.

## Security, Tiered Routing & Key Safety

- API keys are read **strictly from server environment variables** (`DISLOP_LLM_API_KEY`)—never committed to Git, never shipped to the browser, and never echoed in `/health` or logs.
- **Privacy requirement**: For public or commercial hosting, use a paid API tier whose terms do **not** train on user prompts (for example Google Cloud Vertex AI or AI Studio Paid Tier), never a free training-eligible tier.
- **Tiered model routing & credit weights**: Configure a fast model for `review` (`DISLOP_LLM_MODEL_REVIEW`, e.g. `gemini-2.5-flash-lite`) and a stronger model for `deslop` (`DISLOP_LLM_MODEL_DESLOP`, e.g. `gemini-2.5-flash`). Responses include `creditWeight` and `X-Dislop-Credits-Used` (`check = 0`, `review = 1`, `deslop = 2`) for cloud metering gateways.
- **Hard budget & abuse caps**: Built-in 64 KB body limit (`DISLOP_MAX_BODY_BYTES`), per-IP rate limiting (`DISLOP_RATE_LIMIT_PER_MIN`), global daily hard credit cap (`DISLOP_DAILY_LLM_LIMIT`, returning `429 daily_limit_reached` while keeping `/v1/check` online), CORS allowlist, and optional bearer auth (`DISLOP_SERVER_AUTH_TOKEN`).
- User draft text is never written to disk or stdout logs; upstream error messages pass through `redactSecrets()` before returning. Without `DISLOP_LLM_API_KEY`, deterministic endpoints keep working while LLM endpoints return `503 llm_not_configured`.

## 1. Self-Host with Your Own Key (BYOK)

Works with any OpenAI-compatible API (OpenAI, DeepSeek, Gemini OpenAI-compat, OpenRouter, or local Ollama):

```bash
cp server/.env.example server/.env
# Edit server/.env with your own DISLOP_LLM_API_KEY, BASE_URL, and MODEL

set -a && source server/.env && set +a
node server/index.mjs
```

Or run with Docker (zero npm install):

```bash
docker build -f server/Dockerfile -t dislop-server .
docker run --rm -p 8787:8787 \
  -e DISLOP_LLM_API_KEY="YOUR_KEY" \
  -e DISLOP_LLM_BASE_URL="https://api.openai.com/v1" \
  -e DISLOP_LLM_MODEL="gpt-4o-mini" \
  dislop-server
```

## 2. Endpoints

| Path | Method | Needs LLM Key | Purpose |
|---|---|---|---|
| `/health` | `GET` | No | Health & capability check (never returns keys) |
| `/v1/check` | `POST` | No | Deterministic `src/core.mjs` anti-slop check |
| `/v1/review` | `POST` | Yes | Deterministic check + LLM 3rd-order prose & design review |
| `/v1/deslop` | `POST` | Yes | LLM plain-voice rewrite + automatic deterministic re-check + numeric diff |
| `/mcp` | `POST` | Per tool | Remote HTTP MCP (`dislop_check`, `dislop_review`, `dislop_deslop`, `dislop_explain`, `dislop_packs`) |

## 3. Connect Remote HTTP MCP

Point any remote-MCP-capable client at your deployed `/mcp` endpoint:

```json
{
  "mcpServers": {
    "dislop-remote": {
      "url": "https://your-domain.example/mcp"
    }
  }
}
```

## 4. Same-Origin Nginx Reverse Proxy Example

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8787;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location = /mcp {
  proxy_pass http://127.0.0.1:8787/mcp;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
