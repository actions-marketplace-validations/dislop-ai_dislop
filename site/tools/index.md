---
content-type: reference-data
version: 0.4.0
---

# dislop Tools & Usage Options

Pick the lightest surface that fits your workflow:

| Surface | Status | How to start |
|---|---|---|
| Zero-Install Prompt & Static Pages | Live | Hand [`/llms.txt`](../llms.txt) or [`/catalog.json`](../catalog.json) to any web-capable AI, or test drafts offline in the [Browser Workbench](https://dislop.com/#workbench). |
| Agent Skill | Live | Install [`SKILL.md`](./skill.md) with `npx skills add dislop-ai/dislop` in Claude Code, Codex, Cursor, Windsurf, or Antigravity (or see [`/tools/prompts.md`](./prompts.md)). |
| Hosted Remote HTTP MCP (Cloud) | Live | Connect `https://dislop.com/mcp` with a free 30-credit/month Bearer token from [`/#pricing`](https://dislop.com/#pricing) for `dislop_review`, self-healing `dislop_deslop`, and `dislop_voice_extract`. |
| Claude Code Plugin | Live | Install Skill + local offline stdio MCP in one step using `.claude-plugin/marketplace.json` (`/plugin marketplace add dislop-ai/dislop` then `/plugin install dislop@dislop-ai`). |
| CLI, Git Diff & Hooks | Live | See [`/tools/cli-and-hooks.md`](./cli-and-hooks.md) for zero-network Node (`npx`), Python (`uvx`), `dislop resources`, SARIF, GitHub Actions, and hook templates. |
| Local MCP, Remote MCP & JS Export | Live | See [`/tools/mcp-sdk-api.md`](./mcp-sdk-api.md) for local stdio MCP, hosted Remote HTTP MCP, HTTP API, and `src/core.mjs`. |
