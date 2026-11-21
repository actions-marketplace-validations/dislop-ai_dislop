# dislop 开源后台与在线远程 MCP 服务（`server/`）

[English](./README.md)

`dislop` 的核心分成两层：

- **本地零依赖层（不涉及大模型）**：CLI、`skills/dislop/SKILL.md`、本地 stdio MCP 与浏览器离线工作台，不需要 API Key、不联网。
- **大模型支撑后台（本目录，开源可自托管 / 官方可部署）**：提供 HTTP API 和在线远程 MCP（`/mcp`），在确定性检查之上补齐三阶结构性 AI 味审校（`dislop_review`）与事实守恒去 AI 味改写（`dislop_deslop`，改完自动回跑确定性复检）。

## 密钥与安全约定

- API Key **只能通过服务端环境变量**（`DISLOP_LLM_API_KEY`）注入，绝不进前端代码、仓库或日志。
- 服务端默认不落盘用户稿件内容；所有上游错误在返回前都会经过密钥脱敏（`redactSecrets`）。
- 未配置 `DISLOP_LLM_API_KEY` 时，`/health`、`/v1/check` 与确定性 MCP 工具照常工作，LLM 接口安全返回 `503 llm_not_configured`。
- 自带单请求体积限制（默认 64 KB）、按 IP 每分钟限流（默认 30 次）、CORS 白名单，以及私有部署可选的 `DISLOP_SERVER_AUTH_TOKEN`。

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

## 2. 接口一览

| 路径 | 方法 | 是否需要大模型 Key | 用途 |
|---|---|---|---|
| `/health` | `GET` | 否 | 健康检查与能力状态（不返回密钥） |
| `/v1/check` | `POST` | 否 | 确定性检查（同 `src/core.mjs`） |
| `/v1/review` | `POST` | 是 | 确定性检查 + 大模型三阶结构味/设计味审校 |
| `/v1/deslop` | `POST` | 是 | 大模型去 AI 味改写 + 自动确定性复检 + 数字变动核对 |
| `/mcp` | `POST` | 按工具区分 | 远程 HTTP MCP（`dislop_check`、`dislop_review`、`dislop_deslop`、`dislop_explain`、`dislop_packs`） |

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
