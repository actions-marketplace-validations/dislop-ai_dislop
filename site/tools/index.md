---
content-type: reference-data
version: 0.6.1
---

# dislop Tools & Usage Options

Pick the lightest surface that fits your workflow:

| Surface | Status | How to start |
|---|---|---|
| Zero-Install Prompt & Static Pages | Live | Hand [`/llms.txt`](../llms.txt) or [`/catalog.json`](../catalog.json) to any web-capable AI, or test drafts offline in the [Browser Workbench](https://dislop.com/#workbench). |
| Agent Skill (Local Progressive References) | Live | Install [`SKILL.md`](./skill.md) + bundled `references/*.md` with `npx skills add dislop-ai/dislop` in Claude Code, Codex, Cursor, Windsurf, or Antigravity (0 network calls). |
| CLI, Offline Voice & Local Models | Live | See [`/tools/cli-and-hooks.md`](./cli-and-hooks.md) for zero-network Node (`npx`), Python (`uvx`), all 7 built-in packs, 53 patterns, 14.6 KB `--ml`, `dislop voice`, and `dislop model`. |
| Hosted Remote HTTP MCP (Cloud) | Live | Connect `https://dislop.com/mcp` with a free 30-credit/month Bearer key from [`/#pricing`](https://dislop.com/#pricing) for `dislop_review`, self-healing `dislop_deslop`, and `dislop_voice_extract`. |
| Claude Code Plugin | Live | Install Skill + local offline stdio MCP in one step using `.claude-plugin/marketplace.json` (`/plugin marketplace add dislop-ai/dislop` then `/plugin install dislop@dislop-ai`; ~130 always-on tokens). |
| OpenAI Codex Plugin & Gemini CLI Extension | Live | Codex: `codex plugin marketplace add dislop-ai/dislop` then `codex plugin add dislop@dislop-ai`; Gemini CLI: `gemini extensions install https://github.com/dislop-ai/dislop`. |
| GitHub Action & pre-commit | Live | Gate modified PR lines with `uses: dislop-ai/dislop@main` (`action.yml`) or `.pre-commit-hooks.yaml`. |
| Local MCP, Remote MCP & JS Export | Live | See [`/tools/mcp-sdk-api.md`](./mcp-sdk-api.md) for compact local stdio MCP, hosted Remote HTTP MCP, HTTP API, and `src/core.mjs`. |
