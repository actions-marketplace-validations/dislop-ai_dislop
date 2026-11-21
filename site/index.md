---
content-type: reference-data
version: 0.3.0
snapshot: 2026-11-21
---

# dislop — Catch AI slop before you send it

Local, zero-dependency anti-slop linter for AI-written Markdown, plain text, HTML/CSS/JSX, Word (`.docx`), and PowerPoint (`.pptx`). Works with any AI model and any coding or writing agent.

- Runtime dependencies: 0 (Node.js 20+ and Python 3.10+ parity verified by 88 pack fixtures and `tests/test_conformance.py`)
- Live browser workbench: https://dislop.com/#workbench (offline in RAM, `CSP: connect-src 'none'`)
- Agent routing index: https://dislop.com/llms.txt
- Machine-readable catalog: https://dislop.com/catalog.json
- Awesome Anti-Slop (87 curated entries): https://dislop.com/awesome/

## Coverage & Honest Boundaries

| Target | Formats / Scope | Status |
|---|---|---|
| Writing, Copy & Longform | `.md`, `.mdx`, `.txt` (EN & ZH) | LIVE `v0.3.0` |
| Word & PowerPoint | `.docx`, `.pptx` | LIVE `v0.3.0` |
| Web UI & Components | `.html`, `.css`, `.jsx`, `.tsx` | LIVE `v0.3.0` |
| Git Diffs & PRs | `--changed` / `--staged` & SARIF 2.1.0 | LIVE (diff check) · Roadmap (code AST) |
| Rhythm, Layout Monotony & Voice | 5 prototype probes, `dislop.voice/1`, `dislop.taste/1` | Prototype / Spec `v0.3+` |

## Rule Layers

1. **AI Delivery Artifacts (`packs/core`, `error`)**: stray chatbot wrappers, unfilled placeholders, raw Markdown pasted into Word/PPT, and dead `href="#"` placeholder controls.
2. **Style & Template Packs (`warning` / `info`)**: `business-brief`, `literary-essay`, and `deck-and-ui` (25 rules total), each pairing a check question with `bad -> trap -> good` examples.

## Resource Pillars

- [Methodology](./methodology/index.md): Deletion Test, anti-pattern map, positive divergence, and visual design system.
- [Cases](./cases/index.md): `bad -> trap -> good` revision contrasts, repository self-dogfooding audit, and non-mainstream design references.
- [Tools](./tools/index.md): Browser workbench, canonical `SKILL.md`, lightweight prompts, CLI, MCP, Hooks, SDK, and planned HTTP API.
- [Awesome Anti-Slop](./awesome/index.md): 87 verified de-slop tools, standards, benchmarks, and policies (`dislop.radar/2`).
