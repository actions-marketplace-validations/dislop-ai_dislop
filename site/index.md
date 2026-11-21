---
content-type: reference-data
version: 0.2.0
snapshot: 2026-11-21
---

# dislop — De-slop AI outputs

Complete multi-modal de-slop toolkit for writing, Markdown, HTML/CSS/JSX/SVG, Word (`.docx`), PowerPoint (`.pptx`), PDF structural metadata, and agent handoffs. Works with any AI model (Claude, GPT, Gemini, DeepSeek, Qwen, local), any agent (Claude Code, Codex, Cursor, Windsurf, custom), and any dev or publishing environment.

- Runtime dependencies: 0 (Node.js 20+ and Python 3.10+ parity verified by 101 pack fixtures and `tests/test_conformance.py`)
- Live browser workbench: https://dislop.com/#workbench (offline in RAM, `CSP: connect-src 'none'`)
- Agent routing index: https://dislop.com/llms.txt
- Machine-readable catalog: https://dislop.com/catalog.json
- Ecosystem radar (87 verified entries): https://dislop.com/radar/

## Coverage & Honest Boundaries

| Target | Formats / Scope | Status |
|---|---|---|
| Writing, Copy & Longform | `.md`, `.mdx`, `.txt` (EN & ZH) | LIVE `v0.2.0` |
| Office Docs & Decks | `.docx`, `.pptx`, `.pdf` metadata/URI/fonts | LIVE `v0.2.0` |
| Web UI, Layout & SVG | `.html`, `.css`, `.jsx`, `.tsx`, `.svg` | LIVE `v0.2.0` |
| Code Repos & Agent PRs | `--changed` / `--staged` hygiene & SARIF 2.1.0 | LIVE (hygiene/diff) · Roadmap (code AST) |
| Rhythm, Layout Monotony & Voice | 5 prototype probes, `dislop.voice/1`, `dislop.taste/1`, optional local ONNX/GGUF | Prototype / Spec `v0.3+` |

## Complete De-Slop System

1. **Negative Defense + Fact Guard (Shipped `v0.2.0`)**:
   - Core Invariants (`packs/core`, `error`): leaked workstation paths, unfilled placeholders, unstripped chatbot wrappers, raw Markdown inside Office docs, dead `href="#"` controls, WCAG AA contrast failures, dark-mode Z-luminance inversions, and off-slide PPTX text frames.
   - Genre Taste Packs (`warning` / `info`): `business-brief`, `literary-essay`, and `deck-and-ui`, each pairing rules with a Deletion Test and `bad -> trap -> good` exemplars.
   - Revision Guard (`dislop verify`): checks that numbers, qualifiers (`up to`, `at least`, `最多`, `至少`), units, dates, URLs, code spans, and citations survived an edit while blocking second-order slogan displacement.
2. **Positive Pull (Draft Protocols, Roadmap P0/P1)**:
   - Three-Band Entropy Partition: lock factual and WCAG invariants at zero entropy, vary mid-layer argument skeletons and cadence (`dislop.voice/1`, `dislop.taste/1`), and prune drift deterministically.

## Resource Pillars

- [Methodology](./methodology/index.md): Deletion Test, anti-pattern map, positive divergence, and visual design system.
- [Cases](./cases/index.md): `bad -> trap -> good` revision contrasts, repository self-dogfooding audit, and non-mainstream design references.
- [Tools](./tools/index.md): Browser workbench, raw `SKILL.md`, lightweight prompts, CLI, MCP, Hooks, SDK, and planned HTTP API.
- [Radar](./radar/index.md): 87 verified de-slop tools, standards, benchmarks, and policies (`dislop.radar/2`).
