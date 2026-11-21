---
content-type: reference-data
version: 0.2.0
---

# CLI, Git Diff, Hooks & CI (`v0.2.0`)

## Node.js 20+ & Python 3.10+ (Shipped, Zero Dependencies)

```bash
# Audit directory (exits 1 on core invariant errors)
npx --yes github:dislop-ai/dislop check .

# Gate only modified git lines and output GitHub PR annotations or SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format github
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect DOCX/PPTX/PDF with Python
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Verify revision preserved protected facts
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
```

## Exit Codes

- `0`: Checked cleanly with zero findings at or above `--fail-on`.
- `1`: Findings met or exceeded `--fail-on` (or `verify` rejected the edit).
- `2`: Invalid flags, missing path, or explicitly specified file was uninspectable (e.g., encrypted PDF).

## Claude Code PostToolUse Hook Template (Using Shipped CLI)

Note: `PostToolUse` fires **after** `Write`/`Edit` completes and receives tool context as JSON on stdin (`tool_input.file_path`). Parse and validate that path before invoking `dislop check` so empty values never scan the entire working directory; map CLI exit `1` to exit `2` to return structured post-write feedback to Claude Code.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const f=d.tool_input?.file_path;if(!f)process.exit(0);const r=require("child_process").spawnSync("npx",["--yes","github:dislop-ai/dislop","check",f,"--fail-on","error"],{stdio:"inherit"});process.exit(r.status===1?2:(r.status??0));'"
          }
        ]
      }
    ]
  }
}
```
