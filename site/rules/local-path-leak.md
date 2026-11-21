---
content-type: reference-data
ruleId: local-path-leak
pack: core
tier: invariant
severity: error
family: hygiene/path
---

# Rule: `local-path-leak`

- Pack: [`core`](../packs/core.md) · Tier: `invariant` · Severity: `error`
- Modalities: `markdown, text, html, css, jsx, svg, docx, pptx, pdf`
- Human anchor: https://dislop.com/#rule-local-path-leak

## What It Catches
- EN: Leaked local filesystem path or file:/// link.
- ZH: 残留本机文件系统路径或 file:/// 链接。

## Deletion Test
- EN: Replace the workstation path with a repository-relative path, a public HTTPS URL, or `/Users/example/...` if documenting a CLI.
- ZH: 将个人工作站路径改为仓库相对路径、公开 HTTPS 链接，或在命令示例中改用 `/Users/example/...`。

## Exemplar (Reference Data)

```text
bad:  See [Architecture Diagram](file:///Users/example/Desktop/arch-v2.png) for the 3-node layout.
trap: See the architecture diagram on my machine for the 3-node layout.
good: See [Architecture Diagram](./docs/assets/arch-v2.png) for the 3-node layout.
```
