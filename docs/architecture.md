# Architecture Specification

**English** · [简体中文](./architecture.zh-CN.md)

## 1. Design Premise: Audit First, Rewrite Only Under Guardrails

`dislop` replaces opaque one-shot "humanizers" with a three-stage, inspectable pipeline:

```text
Input (Markdown / HTML / SVG / DOCX / PPTX)
  │
  ▼
[Stage 1: Deterministic Audit]  ──► Exact line / slide coordinates, rule ID, severity
  │
  ▼
[Stage 2: Exemplar Retrieval]   ──► Domain-matched bad -> good rewrites & rationale
  │
  ▼
[Stage 3: Guarded Revision]     ──► Minimal span edit + fact/number invariant check
```

1. **Stage 1 (`dislop check`)** runs locally in milliseconds with zero API calls and zero network egress. Code fences and inline code spans in Markdown are masked automatically so technical documentation does not trigger false positives on quoted examples.
2. **Stage 2 (`dislop explain` / `dislop_exemplars`)** supplies human-edited before/after pairs from the active Taste Pack so an author or local coding agent sees *how* a seasoned editor fixes the issue rather than receiving vague advice.
3. **Stage 3 (Guarded Revision)** keeps every number, date, identifier, URL, and citation immutable, re-running Stage 1 afterward to confirm net defect reduction.

## 2. Cross-Modal Probe Matrix

| Modality | Deterministic Probes (Zero API Cost) | Planned Deep Probes |
| :--- | :--- | :--- |
| **Prose (`.md`, `.txt`)** | Filler transitions, buzzword verbs, moralizing endings, em-dash density (`>10` per `1,000` chars), placeholder remnants, local path leaks | Clause-length monotony, unsupported round-number claims |
| **Web & Cards (`.html`, `.svg`, `.css`)** | Default purple-indigo-pink gradient palettes, generic SaaS hero slogans, decorative emoji clusters | Headless DOM bounding-box overlap & contrast ratio checks |
| **Word (`.docx`)** | Pure-stdlib OOXML paragraph & table extraction, embedded media inventory (`word/media/*`), prose & hygiene checks | Heading hierarchy & style-sheet drift |
| **Slides (`.pptx`)** | Pure-stdlib per-slide XML inspection, slide word-wall detection (`>120` words or `>280` CJK chars per slide), slide-indexed prose checks | Action-title specificity & text-box overflow |

## 3. Taste Pack Manifest (`packs/<id>/pack.json`)

Each Taste Pack is a self-contained JSON manifest encoding editorial standards for a specific genre:

- `id`, `name`, `version`, `languages`, `modalities`, `description`
- `structural`: numeric density thresholds (for example `maxSlideWords`, `maxSlideCjkChars`)
- `rules[]`: `id`, `severity` (`error` | `warning` | `info`), `category`, `description`, `patterns[]`
- `exemplars[]`: `ruleId`, `bad`, `good`, `rationale`
