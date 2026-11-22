# dislop for VS Code & Open VSX

Zero-dependency offline anti-slop linter and Agent tool built on `src/core.mjs`.

## Features

- Checks `.md`, `.mdx`, `.txt`, `.html`, `.css`, `.jsx`, and `.tsx` offline with 7 built-in packs (42 rules).
- Marks AI delivery artifacts (`error`) and cliché/template patterns (`warning`) with hover examples (`Original` / `Overcorrected` / `Clean`).
- Quick Fix (`Cmd+.`) inserts a documented `dislop-ignore-next-line` comment.
- Registers the local `dislop` stdio MCP server (`dislop.mcp`) and `dislop_check_document` language model tool automatically.

## Build & Test

```bash
node integrations/vscode/scripts/build.mjs
node integrations/vscode/test_extension.mjs
```
