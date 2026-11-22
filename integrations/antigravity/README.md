# dislop for Antigravity

`dislop` checks Markdown, HTML/CSS/JSX, `.docx`, and `.pptx` files for AI filler, broken UI scaffolding, and rhythm monotony offline.

## Included

- Skill (`skills/dislop/SKILL.md`) and 4 progressive reference cards under `skills/dislop/references/`.
- Local stdio MCP server (`dislop`) exposing 7 offline tools (`dislop_check`, `dislop_voice_extract_offline`, `dislop_model_score`, `dislop_model_status`, `dislop_explain`, `dislop_packs`, `dislop_catalog`).

## Validation

```bash
agy plugin validate integrations/antigravity --strict
```
