# dislop 开源后台与在线远程 MCP 服务（`server/`）

[English](./README.md)

`dislop` 的核心分成两层：

- **本地零依赖层（不涉及大模型）**：CLI、`skills/dislop/SKILL.md`、本地 stdio MCP 与浏览器离线工作台，不需要 API Key、不联网。
- **大模型支撑后台（本目录，开源可自托管 / 官方可部署）**：提供 HTTP API 和在线远程 MCP（`/mcp`），在确定性检查之上补齐三阶结构性 AI 味审校（`dislop_review`）与事实守恒去 AI 味改写（`dislop_deslop`，改完自动回跑确定性复检）。

## 密钥、成本分级与安全约定

- API Key **只能通过服务端环境变量**（`DISLOP_LLM_API_KEY`）注入，绝不进前端代码、仓库或日志。
- **隐私要求**：对外提供服务时，请使用明确不将请求数据用于模型训练的付费端点（例如 Google Cloud Vertex AI 付费层或 AI Studio 付费层），不要用免费层跑未发布的用户稿件。
- **按任务分级路由与权重计量**：支持分别配置轻量审校模型（`DISLOP_LLM_MODEL_REVIEW`，如 `gemini-2.5-flash-lite`）与改稿模型（`DISLOP_LLM_MODEL_DESLOP`，如 `gemini-2.5-flash`）。响应返回 `creditWeight` 与 `X-Dislop-Credits-Used`（`check = 0`、`review = 1`、`deslop = 2`），方便对接云端计量。
- **硬配额保护**：内置单请求体积限制（默认 64 KB）、按 IP 每分钟限流（默认 30 次）、全局每日硬预算上限（`DISLOP_DAILY_LLM_LIMIT`，超限返回 `429 daily_limit_reached`，确定性 `/v1/check` 不受影响）、CORS 白名单，以及私有部署可选的 `DISLOP_SERVER_AUTH_TOKEN`。
- 服务端默认不落盘用户稿件内容；所有上游错误在返回前都会经过密钥脱敏（`redactSecrets`）。未配置 `DISLOP_LLM_API_KEY` 时，`/health`、`/v1/check` 与确定性 MCP 工具照常工作，LLM 接口安全返回 `503 llm_not_configured`。

## 1. 本地或自托管启动（用你自己的 Key）

支持任意 OpenAI 兼容接口（OpenAI、DeepSeek、Gemini 兼容端点、OpenRouter、本地 Ollama）：

```bash
cp server/.env.example server/.env
# 编辑 server/.env 填入你自己的 DISLOP_LLM_API_KEY / BASE_URL / MODEL

set -a && source server/.env && set +a
node server/index.mjs
```

Docker 一键启动（零 npm 依赖安装）：

```bash
docker build -f server/Dockerfile -t dislop-server .
docker run --rm -p 8787:8787 \
  -e DISLOP_LLM_API_KEY="YOUR_KEY" \
  -e DISLOP_LLM_BASE_URL="https://api.openai.com/v1" \
  -e DISLOP_LLM_MODEL="gpt-4o-mini" \
  dislop-server
```

## 2. 接口与大模型能力一览

| 路径 | 方法 | 权重 | 用途 |
|---|---|---|---|
| `/health` | `GET` | `0` | 健康检查与能力状态（不返回密钥） |
| `/v1/check` | `POST` | `0` | 确定性检查（同 `src/core.mjs`，免 Key） |
| `/v1/review` | `POST` | `1` | 确定性检查 + 三阶结构探针 + 大模型深度审校（默认路由 `gemini-3.5-flash-lite`） |
| `/v1/deslop` | `POST` | `2` | **自愈去 AI 味流水线**：预检 → 按规矩改写 → 确定性/三阶/数字保真门禁 → 未过自动定点修复（默认路由 `gemini-3.5-flash`） |
| `/v1/voice/extract` | `POST` | `2` | 从 1–5 篇人类样稿提取可复用的个人声纹卡（`dislop.voice/1`：离线句长节奏 + 大模型语气/习惯），可传入 `/v1/deslop` |
| `/mcp` | `POST` | 按工具 | 远程 HTTP MCP（`dislop_check`、`dislop_review`、`dislop_deslop`、`dislop_voice_extract`、`dislop_explain`、`dislop_packs`） |

跨 5 款真实模型的在线对比实测（裸 Prompt vs. 本后台自愈流水线，含延迟与千次成本）见 [benchmarks/MODEL-COMPARISON.md](../benchmarks/MODEL-COMPARISON.md)。

## 3. 远程 HTTP MCP 接入示例

在支持远程 HTTP MCP 的客户端里指向你部署的 `/mcp` 地址（私有部署可附加 `Authorization: Bearer ...`）：

```json
{
  "mcpServers": {
    "dislop-remote": {
      "url": "https://your-domain.example/mcp"
    }
  }
}
```

## 4. 官方或自托管 Nginx 反代参考

把静态站和同源 `/api/`、`/mcp` 挂在同一域名下，前端零第三方外链、密钥永远留在后端进程：

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
