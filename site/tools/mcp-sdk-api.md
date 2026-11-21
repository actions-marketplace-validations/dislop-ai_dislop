---
content-type: reference-data
version: 0.2.0
---

# MCP Server, SDK & Planned HTTP API

## Stdio MCP Server (Shipped `v0.2.0`)

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

Shipped MCP tools:
- `dislop_check`: Audits `text` or workspace-relative `path`, returning flagged spans, `protectedFacts`, Deletion Tests, and exemplars.
- `dislop_verify`: Compares `before` and `after` text and rejects dropped facts or second-order slogan displacement.
- `dislop_explain`: Returns rationale and `bad -> trap -> good` exemplar for a `ruleId`.
- `dislop_packs`: Lists installed packs (`core`, `business-brief`, `literary-essay`, `deck-and-ui`).

## JavaScript Core Export (Shipped `v0.2.0`)

`package.json` exports the zero-I/O pure ES module `src/core.mjs` (`auditText`, `auditOoxmlEntries`, `auditPdfStructure`, `extractProtectedFacts`, `verifyRevision`, `resolveEffectivePack`).

## Roadmap (Not Yet Shipped)

- `P0`: npm & PyPI package releases, typed JS/Python SDK facades (`checkFile` / `checkBytes`), MCP `dislop_catalog`, Resources, and Prompts.
- `P1`: Stateless Web-Standard Fetch HTTP API (`/v1/check`, `/v1/verify`, OpenAPI 3.1) sharing `src/core.mjs`.
