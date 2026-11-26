# Installing dislop for AI Coding Agents

Use this specification to install and verify `dislop` in Cline, Roo Code, Cursor, Claude Code, Codex, Antigravity, or Gemini CLI.

## 1. Remote Streamable HTTP MCP (No Local Dependencies)

Connect directly to the hosted MCP endpoint at `https://dislop.com/mcp` using OAuth 2.1 discovery at `https://dislop.com/.well-known/oauth-authorization-server`.

```json
{
  "mcpServers": {
    "dislop": {
      "type": "http",
      "url": "https://dislop.com/mcp"
    }
  }
}
```

## 2. Local Offline stdio MCP (Zero Network Uploads, Node.js 20+)

Run the micro-kernel locally over stdio when drafts cannot leave the machine (`dislop_check`, `dislop_fix_safe`, `dislop_verify`, and `dislop_packs`):

```json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "dislop-mcp"]
    }
  }
}
```

## 3. Pure-Markdown Agent Skills

Install the router skill or individual workflow skills directly into agent skill directories:

```bash
npx --yes skills add dislop-ai/dislop --skill dislop
```

Focused workflow skills in `dislop-ai/dislop`:

- `deslop-docs`: Markdown docs, READMEs, RFCs, and release notes
- `deslop-slides-docx`: PowerPoint (`.pptx`), Word (`.docx`), PDF, and image deliverables
- `deslop-web-ui`: HTML, CSS, JSX, TSX, and SVG web interfaces
- `deslop-verify`: Fact preservation, direction-reversal, polarity, and anti-degradation checks against original text or git `HEAD`

## 4. Verify Installation

Run a local CLI check against any Markdown file:

```bash
npx --yes dislop check README.md --no-llm --format agent
```

Exit codes:

- `0`: Pass (zero unresolved `Defect: error` items; prose `Suggestion`s never fail CI)
- `1`: Unresolved `Defect: error` found (or Fact Gate failure in `dislop verify`)
- `2`: Invalid CLI arguments, configuration error, or unreadable file

For edits to an existing tracked file, verify that all numbers, units, URLs, code spans, proper nouns, and polarities survived:

```bash
npx --yes dislop verify --git HEAD README.md
```
