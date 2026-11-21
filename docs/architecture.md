# Architecture (`v0.2.0`)

[简体中文](./architecture.zh-CN.md)

`dislop` is structured around three deterministic stages and one shared rule manifest format (`schema: "dislop.pack/2"`).

## 1. Three-Stage Review Loop

```text
Draft / Binary (.md, .html, .css, .svg, .docx, .pptx, .pdf)
   │
   ▼
Stage 1: Deterministic Inspection (`auditText`, `auditOoxmlEntries`, `auditPdfStructure`)
   ├── Core Invariants (`packs/core/`, severity: error)
   └── Genre Taste Pack (`business-brief` | `literary-essay` | `deck-and-ui`, warning/info)
   │
   ▼
Stage 2: Editorial Context (`deletionTest` + `bad -> trap -> good` exemplar + `protectedFacts`)
   │   Author or local agent edits ONLY the flagged spans
   ▼
Stage 3: Guarded Revision Verification (`dislop verify` / MCP `dislop_verify`)
   ├── Multiset equality on numbers (+ qualifiers & units), URLs, code spans/blocks, citations
   ├── Zero new `core` invariant errors and net finding reduction
   └── Displacement guard against 2nd-order slogan frames (`negation-pivot`, `staccato`, `triad`, `ending`)
```

### Why Separate Stage 1 and Stage 3?

- **Stage 1 (`check`)** never modifies user files. It computes length-preserving masked views (`raw`, `prose`, `ui-text`) so code blocks, inline code, URLs, HTML tags, comments, and quoted specimens do not trigger prose false positives while line and Unicode codepoint column coordinates match the original source 1:1.
- **Stage 2 (`explain` / inline finding metadata)** gives humans and MCP agents the exact **Deletion Test** question and a `bad -> trap -> good` rewrite instead of a raw banned-word list. Handing frontier models a banned-word list causes literal substitution (swapping corporate clichés for staccato slogans).
- **Stage 3 (`verify`)** enforces zero fact degradation mechanically. Dropping `"up to"` from `"up to 12 minutes"` or replacing `"game-changer"` with `"It's not just indexing — it's instant recall"` fails verification with an explicit rejection reason.

## 2. Shared Engine & Runtime Parity

| Component | Path | Role |
|---|---|---|
| Shared JS Core | `src/core.mjs` | Pure ES module with zero `node:*` or DOM globals; shared identically by CLI, MCP, and `site/` browser workbench |
| Node Binary Reader | `src/binary-node.mjs` | Zero-dependency ZIP central-directory reader (`zlib.inflateRawSync`) for `.docx`/`.pptx` and stream inflater for `.pdf` |
| Node CLI & MCP | `bin/dislop.mjs`, `bin/dislop-mcp.mjs` | CLI (`check`, `verify`, `explain`, `packs`, `pack-test`, `init`) and stdio MCP server |
| Python Core, CLI & MCP | `src/dislop/{engine,cli,mcp_server}.py` | Pure Python 3.10+ stdlib implementation kept in lockstep via `tests/test_conformance.py` |
| Rule Manifests | `packs/{core,business-brief,literary-essay,deck-and-ui}/pack.json` | Declarative `dislop.pack/2` rules, thresholds, Deletion Tests, exemplars, and `hit`/`clean` fixtures |
| Browser Workbench | `site/` (`scripts/build_site.mjs`) | Static HTML/CSS/JS galley sheet using `DecompressionStream('deflate-raw')` for client-side `.docx`/`.pptx` inspection |

## 3. Coverage Honesty & Exit Codes

Uninspected inputs never masquerade as clean:

- `0` — Completed inspection with zero findings at or above `--fail-on` (default `error`).
- `1` — One or more findings met or exceeded `--fail-on` (or stale suppressions under `--report-unused`).
- `2` — Invalid CLI flags, missing target path, or an explicitly requested file that could not be inspected (e.g., encrypted PDF or non-UTF-8 text).

When inspecting PDFs without external OCR/CID font decoders, `dislop` audits `/URI` links, `/Info` titles, `/FontDescriptor` embedding, and `/MediaBox` consistency, and explicitly records `[SKIP] <file>#prose` in the report.

## 4. Dual-Origin Static Hosting

`site/` builds to plain static files with relative asset URLs and zero backend processes:

1. **Primary (`https://dislop.com`)**: Served directly by overseas static Nginx (`server_tokens off`, `Content-Security-Policy` locking `connect-src 'none'`, zero third-party font/analytics requests) so visitors in both mainland China and overseas reach the workbench directly.
2. **Independent Public Mirror (`https://dislop-ai.github.io`)**: Published from the `dislop-ai.github.io` organization Pages repository without attaching the custom domain, preserving an independent HTTPS fallback with `<link rel="canonical" href="https://dislop.com/">`.
