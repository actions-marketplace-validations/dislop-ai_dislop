---
content-type: reference-data
version: 0.3.0
---

# dislop Tools & Usage Options

Pick the lightest surface that fits your workflow:

| Surface | Status | How to start |
|---|---|---|
| Zero-Install Prompt & Static Pages | Live | Hand [`/llms.txt`](../llms.txt) or [`/catalog.json`](../catalog.json) to any web-capable AI, or test drafts offline in the [Browser Workbench](https://dislop.com/#workbench). |
| Agent Skill | Live | Install [`SKILL.md`](./skill.md) with `npx skills add dislop-ai/dislop` in Claude Code, Codex, Cursor, Windsurf, or Antigravity (or see [`/tools/prompts.md`](./prompts.md)). |
| Claude Code Plugin | Live | Install Skill + local stdio MCP in one step using `.claude-plugin/marketplace.json` (`/plugin marketplace add dislop-ai/dislop` then `/plugin install dislop@dislop-ai`). |
| CLI, Git Diff & Hooks | Live | See [`/tools/cli-and-hooks.md`](./cli-and-hooks.md) for Node (`npx`), Python (`uvx`), SARIF, GitHub Actions, and hook templates. |
| MCP Server & JS Export | Live | See [`/tools/mcp-sdk-api.md`](./mcp-sdk-api.md) for stdio MCP tools and `src/core.mjs`. |
