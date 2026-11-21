#!/usr/bin/env node
// Zero-dependency Human + Agent Dual-Native static compiler for site/.
// Single Source of Truth (SSOT):
//   - src/core.mjs
//   - assets/logo.svg
//   - packs/*/pack.json
//   - docs/research/anti-slop-radar-index.json
//   - docs/research/positive-divergence/{verified-positive-sources,positive-design-card.example,voice-profile.example}.json
//
// Outputs:
//   - Human workbench & directory: site/index.html (pre-rendered), site/radar/index.html, site/engine/*, site/assets/*
//   - Agent-native static service: site/llms.txt, site/llms-full.txt, site/catalog.json, site/index.md,
//     site/{methodology,cases,tools,tasks,packs,rules,radar}/*.md, site/radar/index.json
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "site");
const ENGINE_OUT = path.join(SITE_DIR, "engine");
const ASSETS_OUT = path.join(SITE_DIR, "assets");
const RADAR_OUT = path.join(SITE_DIR, "radar");

const BASE_URL = "https://dislop.com";
const PACK_ORDER = ["core", "business-brief", "literary-essay", "deck-and-ui"];

// ---------- Helpers & Sanitizer ----------

function sha256Full(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function approxTokens(text) {
  const bytes = Buffer.byteLength(text, "utf8");
  return Math.max(20, Math.round(bytes / 4));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitize illustrative local paths in public documentation & pre-rendered HTML
 * so published docs never contain personal-looking paths or trigger local-path-leak.
 */
function sanitizePublicExemplar(str) {
  if (!str) return "";
  return String(str)
    .replace(/file:\/\/\/Users\/[A-Za-z0-9._-]+\//g, "file:///Users/example/")
    .replace(/(?<![A-Za-z0-9_])\/Users\/(?!example\/)[A-Za-z0-9._-]+\//g, "/Users/example/");
}

/**
 * Format quoted anti-pattern phrases inside rule messages/summaries as inline code spans
 * so Markdown readers clearly distinguish literal quoted triggers from descriptive prose.
 */
function formatRuleProseHtml(str) {
  return escapeHtml(str)
    .replace(/'(AI-Powered|Zero Hallucination|Overview|Background|studies show)'/g, "<code>$1</code>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function formatRuleProseMd(str) {
  if (!str) return "";
  return String(str)
    .replace(/'(studies show|业内人士指出|Not X, but Y|不是 A，而是 B|AI-Powered|Zero Hallucination|Overview|Background|背景)'/g, "`$1`")
    .replace(/“([^”]{2,30})”/g, "`$1`");
}

/**
 * Strip HTML comments and invisible/bidi Unicode characters (including U+2066-U+2069 isolates)
 * to defend against indirect prompt injection (IPI).
 */
const INVISIBLE_BIDI_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

function stripInvisibleBidi(str) {
  return String(str ?? "").replace(INVISIBLE_BIDI_RE, "");
}

function assertSafeExternalUrl(url, label) {
  const s = String(url || "").trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(s)) {
    throw new Error(`Unsafe or non-HTTPS external URL for ${label}: ${s}`);
  }
  return s;
}

function sanitizeJsonStrings(val) {
  if (typeof val === "string") return stripInvisibleBidi(val);
  if (Array.isArray(val)) return val.map(sanitizeJsonStrings);
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = sanitizeJsonStrings(v);
    }
    return out;
  }
  return val;
}

function sanitizeAgentText(text) {
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(INVISIBLE_BIDI_RE, "")
    .replace(/\r\n/g, "\n")
    .trimEnd() + "\n";
}

function writeCleanFile(relPath, content, { isAgentText = false } = {}) {
  const fullPath = path.join(SITE_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const finalContent = isAgentText ? sanitizeAgentText(content) : content;
  fs.writeFileSync(fullPath, finalContent, "utf8");
  return finalContent;
}

function replaceBuildBlock(html, markerName, replacement) {
  const startTag = `<!-- BUILD:${markerName} -->`;
  const endTag = `<!-- /BUILD:${markerName} -->`;
  const startIdx = html.indexOf(startTag);
  const endIdx = html.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Missing build marker <!-- BUILD:${markerName} --> in site/index.html`);
  }
  if (html.indexOf(startTag, startIdx + startTag.length) !== -1 || html.indexOf(endTag, endIdx + endTag.length) !== -1) {
    throw new Error(`Duplicate build marker <!-- BUILD:${markerName} --> in site/index.html`);
  }
  const before = html.slice(0, startIdx + startTag.length);
  const after = html.slice(endIdx);
  return `${before}\n${replacement}\n${after}`;
}

function fencedExemplar(ex) {
  if (!ex) return "";
  const lines = [
    "```text",
    `bad:  ${sanitizePublicExemplar(ex.bad)}`,
  ];
  if (ex.trap) {
    lines.push(`trap: ${sanitizePublicExemplar(ex.trap)}`);
  }
  lines.push(`good: ${sanitizePublicExemplar(ex.good)}`);
  lines.push("```");
  return lines.join("\n");
}

// ---------- Load SSOT Inputs ----------

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version || "0.2.0";

const packsDir = path.join(ROOT, "packs");
const packsById = {};
for (const entry of fs.readdirSync(packsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const p = path.join(packsDir, entry.name, "pack.json");
  if (fs.existsSync(p)) {
    const manifest = JSON.parse(fs.readFileSync(p, "utf8"));
    packsById[manifest.id] = manifest;
  }
}

const allRules = [];
for (const pid of PACK_ORDER) {
  const pack = packsById[pid];
  if (!pack) continue;
  for (const r of pack.rules || []) {
    allRules.push({ packId: pid, pack, rule: r });
  }
}

const radarData = sanitizeJsonStrings(
  JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "research", "anti-slop-radar-index.json"), "utf8"))
);
for (const entry of radarData.entries || []) {
  assertSafeExternalUrl(entry.url, `radar:${entry.id}:url`);
  if (entry.homepage) assertSafeExternalUrl(entry.homepage, `radar:${entry.id}:homepage`);
}
const SNAPSHOT_DATE = radarData.snapshotDate || "2026-11-21";

const positiveSources = sanitizeJsonStrings(
  JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs", "research", "positive-divergence", "verified-positive-sources.json"), "utf8")
  )
);
for (const entry of positiveSources.entries || []) {
  assertSafeExternalUrl(entry.url, `positive:${entry.id}:url`);
}
const positiveDesignCard = sanitizeJsonStrings(
  JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "docs", "research", "positive-divergence", "positive-design-card.example.json"),
      "utf8"
    )
  )
);
const voiceProfileExample = sanitizeJsonStrings(
  JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs", "research", "positive-divergence", "voice-profile.example.json"), "utf8")
  )
);
const canonicalSkillMd = fs.readFileSync(path.join(ROOT, "skills", "dislop", "SKILL.md"), "utf8");

// ---------- 1. Sync Core Engine, Brand Assets & JS Data Modules ----------

fs.mkdirSync(ENGINE_OUT, { recursive: true });
fs.mkdirSync(ASSETS_OUT, { recursive: true });
fs.mkdirSync(RADAR_OUT, { recursive: true });

fs.copyFileSync(path.join(ROOT, "src", "core.mjs"), path.join(ENGINE_OUT, "core.mjs"));
fs.copyFileSync(path.join(ROOT, "assets", "logo.svg"), path.join(ASSETS_OUT, "logo.svg"));
fs.copyFileSync(path.join(ROOT, "assets", "og-card.svg"), path.join(ASSETS_OUT, "og-card.svg"));
fs.copyFileSync(path.join(ROOT, "assets", "og-card.png"), path.join(ASSETS_OUT, "og-card.png"));

// Build browser packs bundle WITHOUT shipping bulk test fixtures; preserve only minimal
// sanitized demo samples for the rules whose exemplar.bad is prose rather than raw markup.
const DEMO_FALLBACK_RULES = new Set(["zh-essay-moralizing-ending", "ui-pill-soup"]);
const browserPacksById = {};
for (const [pid, pack] of Object.entries(packsById)) {
  browserPacksById[pid] = {
    ...pack,
    rules: (pack.rules || []).map((r) => {
      const { fixtures, ...rest } = r;
      const sanitizedEx = rest.exemplar
        ? {
            ...rest.exemplar,
            bad: sanitizePublicExemplar(rest.exemplar.bad),
            ...(rest.exemplar.trap ? { trap: sanitizePublicExemplar(rest.exemplar.trap) } : {}),
            good: sanitizePublicExemplar(rest.exemplar.good),
          }
        : undefined;
      const outRule = { ...rest, ...(sanitizedEx ? { exemplar: sanitizedEx } : {}) };
      if (r.id === "local-path-leak") {
        outRule.demo = {
          bad: "See [Architecture Diagram](file:///tmp/build-42/arch-v2.png) for the 3-node layout.",
          good: "See [Architecture Diagram](./docs/assets/arch-v2.png) for the 3-node layout.",
        };
      } else if (DEMO_FALLBACK_RULES.has(r.id) && fixtures?.hit?.[0]) {
        outRule.demo = {
          bad: sanitizePublicExemplar(fixtures.hit[0]),
          ...(fixtures.clean?.[0] ? { good: sanitizePublicExemplar(fixtures.clean[0]) } : {}),
        };
      }
      return outRule;
    }),
  };
}

const packsModule = `// Auto-generated by scripts/build_site.mjs from packs/*/pack.json (test fixtures stripped) — do not hand-edit.\nexport const PACKS_BY_ID = ${JSON.stringify(browserPacksById, null, 2)};\n`;
fs.writeFileSync(path.join(ENGINE_OUT, "packs-data.mjs"), packsModule, "utf8");

const radarModule = `// Auto-generated by scripts/build_site.mjs from docs/research/anti-slop-radar-index.json — do not hand-edit.\nexport const RADAR_DATA = ${JSON.stringify(radarData, null, 2)};\n`;
fs.writeFileSync(path.join(RADAR_OUT, "radar-data.mjs"), radarModule, "utf8");

// ---------- 2. Compile Agent-Native Static Documents ----------

const catalogResources = [];
function registerResource({ id, pillar, kind, titleEn, titleZh, relPath, modalities, languages, packs = [], relatedTools = [], content }) {
  const written = writeCleanFile(relPath, content, { isAgentText: true });
  const bytes = Buffer.byteLength(written, "utf8");
  catalogResources.push({
    id,
    pillar,
    kind,
    title: { en: titleEn, zh: titleZh },
    path: `/${relPath}`,
    modalities,
    languages,
    packs,
    bytes,
    approxTokens: approxTokens(written),
    relatedTools,
    sha256: sha256Full(written),
  });
  return written;
}

// 2a. Homepage Pure Markdown Mirror (/index.md)
registerResource({
  id: "site-index",
  pillar: "methodology",
  kind: "site-mirror",
  titleEn: "dislop — Complete Multi-Modal De-Slop Toolkit",
  titleZh: "dislop — 全场景多模态去 AI 味工具箱",
  relPath: "index.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["browser-workbench", "cli", "mcp", "skill"],
  content: `---
content-type: reference-data
version: ${VERSION}
snapshot: ${SNAPSHOT_DATE}
---

# dislop — De-slop AI outputs

Complete multi-modal de-slop toolkit for writing, Markdown, HTML/CSS/JSX/SVG, Word (\`.docx\`), PowerPoint (\`.pptx\`), PDF structural metadata, and agent handoffs. Works with any AI model (Claude, GPT, Gemini, DeepSeek, Qwen, local), any agent (Claude Code, Codex, Cursor, Windsurf, custom), and any dev or publishing environment.

- Runtime dependencies: 0 (Node.js 20+ and Python 3.10+ parity verified by 101 pack fixtures and \`tests/test_conformance.py\`)
- Live browser workbench: ${BASE_URL}/#workbench (offline in RAM, \`CSP: connect-src 'none'\`)
- Agent routing index: ${BASE_URL}/llms.txt
- Machine-readable catalog: ${BASE_URL}/catalog.json
- Ecosystem radar (87 verified entries): ${BASE_URL}/radar/

## Coverage & Honest Boundaries

| Target | Formats / Scope | Status |
|---|---|---|
| Writing, Copy & Longform | \`.md\`, \`.mdx\`, \`.txt\` (EN & ZH) | LIVE \`v${VERSION}\` |
| Office Docs & Decks | \`.docx\`, \`.pptx\`, \`.pdf\` metadata/URI/fonts | LIVE \`v${VERSION}\` |
| Web UI, Layout & SVG | \`.html\`, \`.css\`, \`.jsx\`, \`.tsx\`, \`.svg\` | LIVE \`v${VERSION}\` |
| Code Repos & Agent PRs | \`--changed\` / \`--staged\` hygiene & SARIF 2.1.0 | LIVE (hygiene/diff) · Roadmap (code AST) |
| Rhythm, Layout Monotony & Voice | 5 prototype probes, \`dislop.voice/1\`, \`dislop.taste/1\`, optional local ONNX/GGUF | Prototype / Spec \`v0.3+\` |

## Complete De-Slop System

1. **Negative Defense + Fact Guard (Shipped \`v${VERSION}\`)**:
   - Core Invariants (\`packs/core\`, \`error\`): leaked workstation paths, unfilled placeholders, unstripped chatbot wrappers, raw Markdown inside Office docs, dead \`href="#"\` controls, WCAG AA contrast failures, dark-mode Z-luminance inversions, and off-slide PPTX text frames.
   - Genre Taste Packs (\`warning\` / \`info\`): \`business-brief\`, \`literary-essay\`, and \`deck-and-ui\`, each pairing rules with a Deletion Test and \`bad -> trap -> good\` exemplars.
   - Revision Guard (\`dislop verify\`): checks that numbers, qualifiers (\`up to\`, \`at least\`, \`最多\`, \`至少\`), units, dates, URLs, code spans, and citations survived an edit while blocking second-order slogan displacement.
2. **Positive Pull (Draft Protocols, Roadmap P0/P1)**:
   - Three-Band Entropy Partition: lock factual and WCAG invariants at zero entropy, vary mid-layer argument skeletons and cadence (\`dislop.voice/1\`, \`dislop.taste/1\`), and prune drift deterministically.

## Resource Pillars

- [Methodology](./methodology/index.md): Deletion Test, anti-pattern map, positive divergence, and visual design system.
- [Cases](./cases/index.md): \`bad -> trap -> good\` revision contrasts, repository self-dogfooding audit, and non-mainstream design references.
- [Tools](./tools/index.md): Browser workbench, raw \`SKILL.md\`, lightweight prompts, CLI, MCP, Hooks, SDK, and planned HTTP API.
- [Radar](./radar/index.md): 87 verified de-slop tools, standards, benchmarks, and policies (\`dislop.radar/2\`).
`,
});

// 2b. Methodology Pillar
registerResource({
  id: "methodology-index",
  pillar: "methodology",
  kind: "pillar-index",
  titleEn: "Methodology Index",
  titleZh: "方法论导航",
  relPath: "methodology/index.md",
  modalities: ["markdown", "text", "html", "css", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["cli", "mcp", "skill"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# dislop Methodology

Read only the focused document matching your current task:

- [Deletion Test & Fact-Preserving Rewrites](./deletion-test.md): Why banning flat word lists causes second-order slogans, and how the three-stage \`check -> edit -> verify\` loop works.
- [Cross-Modality Anti-Pattern Map](./anti-pattern-map.md): Four-tier problem model (L0 objective bugs through L3 factual density) across prose, UI, Office, and PDF.
- [Positive Divergence & Personalization (Draft)](./positive-divergence.md): Three-band entropy partition, \`dislop.voice/1\` offline stylometrics, and \`dislop.taste/1\` positive design cards.
- [Visual & Typographic Design System](./design-system.md): Architectural Galley Proof Sheet tokens, WCAG AA contrast table, and monotonic dark-mode luminance rules.
`,
});

registerResource({
  id: "methodology-deletion-test",
  pillar: "methodology",
  kind: "guide",
  titleEn: "Deletion Test & Fact-Preserving Rewrites",
  titleZh: "删除测试与事实守恒改写原则",
  relPath: "methodology/deletion-test.md",
  modalities: ["markdown", "text", "docx", "pptx"],
  languages: ["en", "zh"],
  packs: ["core", "business-brief", "literary-essay"],
  relatedTools: ["cli", "mcp", "browser-workbench"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Deletion Test & Fact-Preserving Rewrites

## Why Flat Banned-Word Lists Fail

1. **False positives on real domain nouns**: Flat word lists flag \`Delve\` (Go debugger), \`wool tapestry\`, or literal numeric corrections (\`重试窗口不是 5 秒，而是 60 秒\`).
2. **Second-order displacement**: When models lose stock adjectives, they pivot to structural templates such as binary contrast slogans (\`"It's not just X — it's Y"\`) or three-word staccato chains (\`"Signals drop. Photos vanish. Trust dies."\`).
3. **Silent fact drift**: Blind "humanizer" rewrites frequently drop qualifiers (\`up to 12 minutes\` -> \`12 minutes\`), alter units, or break links.

## Three-Stage Loop

1. **Stage 1 — Deterministic Audit (\`check\`)**:
   - Resolve every \`packs/core\` \`error\` first (leaked paths, unfilled placeholders, chat residue, Office revisions, dead controls, contrast, off-slide shapes).
   - Treat Taste Pack \`warning\` / \`info\` findings as localized editorial queries.
2. **Stage 2 — Deletion Test**:
   - Apply each rule's Deletion Test question to the flagged span only.
   - Ask what concrete mechanism, measurement, or boundary remains if the filler phrase is deleted.
   - Keep code blocks, inline code, URLs, and quoted primary sources intact.
3. **Stage 3 — Revision Verification (\`verify\`)**:
   - Compare before and after multisets for numbers (including qualifiers and units), dates, URLs, code spans, code blocks, and citation markers.
   - Reject edits that introduce core errors, drop protected facts, or shift hits into second-order slogan families (\`frame/negation-pivot\`, \`frame/staccato\`, \`frame/triad\`, \`frame/ending\`, \`frame/list-wall\`).
`,
});

registerResource({
  id: "methodology-anti-pattern-map",
  pillar: "methodology",
  kind: "guide",
  titleEn: "Cross-Modality Anti-Pattern Map",
  titleZh: "跨媒介反模式图谱",
  relPath: "methodology/anti-pattern-map.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["cli", "mcp"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Cross-Modality Anti-Pattern Map

| Layer | Definition | Shipped \`v${VERSION}\` Deterministic Coverage | Roadmap Extensions (\`v0.3+\` Spec) |
|---|---|---|---|
| **L0 Objective Delivery Defects** | Hard publication bugs (\`severity: error\`) | Leaked local paths, unfilled placeholders, AI chat residue, raw Markdown in DOCX/PPTX, unaccepted Office revisions/comments, dead \`href="#"\`, WCAG AA contrast (\`< 4.5:1\`), dark Z-elevation inversion, off-slide PPTX, PDF font/title/URI checks | Expanded PDF metadata checks and baseline suppression ledgers |
| **L1 First-Order Lexicon & Default UI** | Stock filler words and default generator chrome | \`en-cliche-lexicon\`, \`zh-bureaucratic-padding\`, \`ui-ai-gradient\`, \`ui-pill-soup\`, \`ui-box-in-box\`, \`ui-prompt-echo-badge\`, \`svg-text-overflow-or-a11y\` | \`ui-glassmorphism-overuse\`, \`ui-accent-stripe-card\` |
| **L2 Second-Order Cadence & Layout** | Structural fallback after banning stock words | \`negation-pivot-frame\`, \`staccato-slogan-run\`, \`zh-four-char-triad\`, \`zh/en-essay-moralizing-ending\`, \`bold-lead-list-wall\`, \`excessive-em-dash-density\`, \`zh-halfwidth-punctuation\`, slide word-walls/bullets/autofit | 5 prototype-verified probes (\`comma-chain-cadence\`, \`sentence-length-monotony\`, \`discourse-marker-cluster\`, \`ui-glassmorphism-overuse\`, \`ui-accent-stripe-card\`) + \`pptx-layout-monotony\` in v0.3 spec |
| **L3 Deep Context & Visual Composition** | Subtle semantic padding or page-level visual balance | Requires primary facts and human judgment | Optional decoupled local small-model plugins (P2: \`mmBERT\` / \`Qwen3\` / lightweight VLM), always \`info\` advisory only |

## Coverage Honesty Principle

Uninspectable artifacts (encrypted PDFs, corrupted archives, non-UTF-8 files) are reported explicitly as \`[SKIP]\` and exit \`2\` on single-file checks. \`dislop\` never reports an uninspected artifact as clean.
`,
});

registerResource({
  id: "methodology-positive-divergence",
  pillar: "methodology",
  kind: "guide",
  titleEn: "Positive Divergence & Personalization (Draft Protocols)",
  titleZh: "正向差异化与个性化协议（草案）",
  relPath: "methodology/positive-divergence.md",
  modalities: ["markdown", "text", "html", "css", "pptx"],
  languages: ["en", "zh"],
  packs: ["core", "business-brief", "literary-essay", "deck-and-ui"],
  relatedTools: ["browser-workbench", "skill"],
  content: `---
content-type: reference-data
version: ${VERSION}
status: draft-protocol
---

# Positive Divergence & Personalization (Draft Spec)

Empirical studies (Padmakumar & He, ICLR 2024; Doshi & Hauser, Science Advances 2024; Jiang et al., NeurIPS 2025 *Artificial Hivemind*) show post-trained LLMs exhibit both intra-model repetition and inter-model homogeneity. Swapping models or banning stock words alone pushes outputs toward safe statistical means or second-order templates.

## Three-Band Entropy Partition

1. **Band 1 — Zero-Entropy Invariants**: Lock numbers, units, qualifiers, dates, URLs, code spans, citations, WCAG AA contrast, dark-mode luminance order, and slide bounds (\`dislop core\` + \`dislop verify\`).
2. **Band 2 — Bounded Divergence Band**: Vary mid-layer structure using Verbalized Sampling (Zhang et al., 2025) and orthogonal prose skeletons:
   - \`S1 Decision Ledger\`: 1-sentence conclusion -> measured sample & metrics -> explicit limitation -> concrete next action.
   - \`S2 Mechanism Teardown\`: observed anomaly -> flawed intuition -> underlying mechanism -> bounded fix.
   - \`S3 Field Note\`: time/place/physical detail -> direct quote or observation -> stop on final concrete image.
   - \`S4 Technical Spec\`: capability matrix -> explicit non-goals -> failure modes/exit codes -> minimal example.
3. **Band 3 — Deterministic Pruning**: Filter out core errors, dropped facts, second-order slogan displacement, and cross-document template repetition.

## Draft Schemas (Zero-LLM Core)

- **\`dislop.voice/1\` (Local Voice Profile)**: Offline stylometric target bands computed from an author's own historical drafts (e.g., EN sentence-length CV \`[${voiceProfileExample.stylometricTargetBands.en.sentenceLengthCV.join(", ")}]\`, ZH sentence-length CV \`[${voiceProfileExample.stylometricTargetBands.zh.sentenceLengthCV.join(", ")}]\`, max em-dashes, private bans in \`.dislop.local/voice.json\`).
- **\`dislop.taste/1\` (Positive Design Card)**: Abstract grid ratios, typography role stacks, color budgets (e.g., \`maxBorderRadiusPx: ${positiveDesignCard.layout.borderRadiusPx.max}\`, \`externalFontCdnAllowed: ${positiveDesignCard.typography.externalFontCdnAllowed}\`), and static assertions derived from print, Swiss editorial, and independent foundry traditions without copying third-party DOM or CSS.
`,
});

registerResource({
  id: "methodology-design-system",
  pillar: "methodology",
  kind: "guide",
  titleEn: "Visual & Typographic Design System (Galley Proof)",
  titleZh: "视觉与排版设计规范（印刷校样体系）",
  relPath: "methodology/design-system.md",
  modalities: ["html", "css", "jsx", "svg"],
  languages: ["en", "zh"],
  packs: ["core", "deck-and-ui"],
  relatedTools: ["browser-workbench", "cli"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Architectural Galley Proof Design System

\`dislop\` rejects both Generator Default #1 (dark slate + indigo/purple/pink neon gradients + pill soup) and Generator Default #2 (warm cream \`#F7F5F0\` + stone + terracotta fallback).

## Verified Surface & Pencil Tokens (WCAG 2.2 AA)

| Token | Role | Light | Dark | Dark Lightness / Contrast |
|---|---|---|---|---|
| \`--stage\` | Outer ground | \`#F6F7F5\` | \`#0E1012\` | \`L* = 4.6\` |
| \`--sheet\` | Primary column | \`#FFFFFF\` | \`#15181C\` | \`L* = 8.1\` (> stage) |
| \`--raised\` | Controls & hover | \`#ECEEE9\` | \`#1D2127\` | \`L* = 12.6\` (> sheet) |
| \`--inset\` | Code / input well | \`#F1F3F0\` | \`#0A0C0E\` | \`L* = 3.2\` (recessed) |
| \`--control-border\` | Inputs, selects & buttons | \`#767C85\` | \`#6F7784\` | \`4.2:1\` light / \`3.9:1\` dark (WCAG >= 3:1) |
| \`--ink\` | Primary ink | \`#14171A\` | \`#ECEEF0\` | \`18.0:1\` light / \`15.3:1\` dark |
| \`--mark-error\` | Invariant error (\`dele\`) | \`#B42318\` | \`#FF7A6B\` | \`6.6:1\` / \`7.0:1\` (2px solid) |
| \`--mark-warn\` | Taste query (\`query\`) | \`#1B52B0\` | \`#85B4FF\` | \`7.3:1\` / \`8.5:1\` (1.5px dashed) |
| \`--mark-stet\` | Protected fact (\`stet\`) | \`#1E6B47\` | \`#6CD49B\` | \`6.5:1\` / \`9.8:1\` (1.5px dashed) |

## Structural Rules Enforced on \`site/\`

- Zero external font CDNs or analytics (\`CSP: connect-src 'none'\`).
- Continuous \`1px\` structural rails (\`max-width: 1200px\`); \`0px\` shared cell radii, \`4px\` control radii; zero \`rounded-full\` badge soup.
- Red (\`--mark-error\`) is reserved strictly for objective invariant defects.
- Measure capped at \`65ch\` (Latin) / \`36\` Han chars; line height \`1.68\` EN / \`1.82\` ZH; \`tabular-nums\` on coordinates and metrics.
`,
});

// 2c. Cases Pillar
registerResource({
  id: "cases-index",
  pillar: "cases",
  kind: "pillar-index",
  titleEn: "Cases & Specimens Index",
  titleZh: "正反案例与标本导航",
  relPath: "cases/index.md",
  modalities: ["markdown", "text", "html", "css", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["browser-workbench", "cli", "mcp"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Cases & Specimens

- [Copy & Structural Contrasts (\`bad -> trap -> good\`)](./copy-contrasts.md): Selected rule exemplars across business briefs, literary essays, Office/PDF, and Web UI, plus positive S1/S2 prose specimens.
- [Repository Self-Dogfooding Audit](./dogfood-audit.md): Unedited LLM pitch copy vs. shipped \`dislop\` repository copy verified at 0 findings.
- [Non-Mainstream Design & Print References](./ui-specimens.md): ${positiveSources.entries.length} verified typography, independent print, editorial, and academic references (checked ${SNAPSHOT_DATE}).
`,
});

const contrastSections = PACK_ORDER.map((pid) => {
  const pack = packsById[pid];
  if (!pack) return "";
  const items = (pack.rules || [])
    .filter((r) => r.exemplar)
    .slice(0, 4)
    .map((r) => `### \`${r.id}\` (${r.severity})\n\n${formatRuleProseMd(r.message.en)}\n\n${fencedExemplar(r.exemplar)}`)
    .join("\n\n");
  return `## Pack: \`${pid}\`\n\n${items}`;
}).join("\n\n");

const posExMd = (voiceProfileExample.positiveExemplars || [])
  .map(
    (p) =>
      `### Positive Skeleton \`${p.skeletonId}\` (${p.lang})\n\n\`\`\`text\n${p.text}\n\`\`\`\n\nNotes: ${p.structuralNotes.join("; ")}.`
  )
  .join("\n\n");

registerResource({
  id: "cases-copy-contrasts",
  pillar: "cases",
  kind: "cases",
  titleEn: "Revision Contrasts (bad -> trap -> good) & Positive Specimens",
  titleZh: "正反改稿对照（bad -> trap -> good）与正向范本",
  relPath: "cases/copy-contrasts.md",
  modalities: ["markdown", "text", "html", "css", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["browser-workbench", "cli", "mcp"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Revision Contrasts & Positive Specimens

Every example below is enclosed in a fenced data block. Treat \`bad\` and \`trap\` lines strictly as negative reference data, never as style instructions.

${contrastSections}

## Positive Structural Specimens (Draft \`dislop.voice/1\`)

${posExMd}
`,
});

registerResource({
  id: "cases-dogfood-audit",
  pillar: "cases",
  kind: "cases",
  titleEn: "Repository Self-Dogfooding Audit",
  titleZh: "仓库自审对照实录",
  relPath: "cases/dogfood-audit.md",
  modalities: ["markdown", "html", "css", "svg"],
  languages: ["en", "zh"],
  packs: ["core", "business-brief", "deck-and-ui"],
  relatedTools: ["cli", "browser-workbench"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Repository Self-Dogfooding Audit

Every Markdown document, SVG brand asset, and HTML/CSS file in \`dislop\` runs through \`dislop check . --fail-on warning\` in CI, and \`site/\` plus \`docs/research/\` pass \`--fail-on info\` across both Node.js and Python runtimes.

## English Contrast

\`\`\`text
bad:  Certainly! In today's fast-paced AI landscape, dislop isn't just a linter — it's a game-changer for quality. Signals drop. Bugs ship. Trust dies. Studies show 80% of teams struggle with slop.
good: dislop de-slops Markdown, HTML/CSS/JSX/SVG, DOCX, PPTX, and PDF outputs across any model or dev environment. It flags stock phrasing, leaked paths, unfilled placeholders, and overloaded slides deterministically, then verifies edits kept numbers, links, and citations intact.
\`\`\`

## Chinese Contrast

\`\`\`text
bad:  好的，以下是为您撰写的介绍：值得注意的是，dislop 不仅仅是一款检查工具，更是高质量交付的底气。它以确定性规则为重要抓手，全面赋能内容团队实现精准高效、安全可靠、灵活易用的审校闭环。
good: dislop 覆盖写作、Markdown、HTML/CSS/JSX/SVG、DOCX、PPTX 与 PDF，适配任意模型与开发环境；确定性标出高频套话、本机路径泄露、未填占位符与超载幻灯片，改后复检确认数字、单位、链接与引用原样保留。
\`\`\`
`,
});

const posRefLines = positiveSources.entries
  .map((e) => `- [${e.name}](${e.url}) (\`${e.category}\`, HTTP ${e.httpStatus}): ${e.extractablePrinciple}`)
  .join("\n");

registerResource({
  id: "cases-ui-specimens",
  pillar: "cases",
  kind: "cases",
  titleEn: "Non-Mainstream Design & Print References (31 Verified)",
  titleZh: "非主流设计与印刷参考源（31 条实测核验）",
  relPath: "cases/ui-specimens.md",
  modalities: ["html", "css", "svg", "pptx"],
  languages: ["en", "zh"],
  packs: ["deck-and-ui"],
  relatedTools: ["browser-workbench"],
  content: `---
content-type: reference-data
version: ${VERSION}
snapshot: ${SNAPSHOT_DATE}
---

# Non-Mainstream Design, Typography & Academic References

Verified on ${SNAPSHOT_DATE}. Policy: ${positiveSources.compliancePolicy}

${posRefLines}
`,
});

// 2d. Tools Pillar
registerResource({
  id: "tools-index",
  pillar: "tools",
  kind: "pillar-index",
  titleEn: "Tools & Multi-Surface Integration Guide",
  titleZh: "工具与多形态渐进接入导航",
  relPath: "tools/index.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["browser-workbench", "skill", "cli", "mcp"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# dislop Tools & Multi-Surface Escalation Ladder

Pick the lightest surface that fits your workflow:

1. **Level 0 — Website-as-an-Agent-Service (Live)**: Read [\`/llms.txt\`](../llms.txt), [\`/catalog.json\`](../catalog.json), or open the offline [Browser Galley Workbench](${BASE_URL}/#workbench).
2. **Level 1 — Agent Skill & Lightweight Prompts**: Fetch [\`/tools/skill.md\`](./skill.md) or [\`/tools/prompts.md\`](./prompts.md) directly over HTTP.
3. **Level 1/2 — CLI, Git Diff & Hooks**: See [\`/tools/cli-and-hooks.md\`](./cli-and-hooks.md) for Node (\`npx\`), Python (\`uvx\`), SARIF, GitHub Actions, and hook templates.
4. **Level 2/3 — MCP Server, SDK & Planned HTTP API**: See [\`/tools/mcp-sdk-api.md\`](./mcp-sdk-api.md) for shipped stdio MCP tools and roadmap SDK/API specs.
`,
});

registerResource({
  id: "tools-skill",
  pillar: "tools",
  kind: "skill",
  titleEn: "dislop Agent Skill Workflow (SKILL.md)",
  titleZh: "dislop Agent 技能剧本（SKILL.md）",
  relPath: "tools/skill.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["skill", "cli", "mcp"],
  content: canonicalSkillMd,
});

registerResource({
  id: "tools-prompts",
  pillar: "tools",
  kind: "prompts",
  titleEn: "Zero-Install Prompt Snippets for External Agents",
  titleZh: "零安装轻量审校提示片段",
  relPath: "tools/prompts.md",
  modalities: ["markdown", "text", "html", "css", "pptx"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["browser-workbench", "skill"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# Zero-Install Audit Checklists (When Local CLI/MCP Is Unavailable)

## Prose & Technical Brief Checklist

\`\`\`text
1. Remove leaked workstation paths, unfilled placeholders, and chatbot wrappers.
2. Cut throat-clearing openers, stock promotional adjectives, and moralizing endings.
3. Preserve every number, qualifier (up to / at least / 最多 / 至少), unit, date, URL, code span, and citation verbatim.
4. Do not replace cut filler with binary negation slogans ("Not X, but Y") or three-word staccato fragments.
5. Verify the revised draft locally with: npx --yes github:dislop-ai/dislop verify before.md after.md
\`\`\`

## Web UI & Slide Deck Checklist

\`\`\`text
1. Verify zero dead controls (<a href="#"> or unexplained disabled buttons) and WCAG AA text contrast (>= 4.5:1).
2. Keep dark-mode surface luminance strictly monotonic (outer stage < sheet < raised control).
3. Avoid default purple-pink neon gradients, pill-badge soup (> 6 pills per view), and 3-level nested bordered boxes.
4. Cap slide copy at <= 120 English words (<= 280 Chinese chars), <= 6 bullets, and 100% font scale (no autofit shrink).
\`\`\`
`,
});

registerResource({
  id: "tools-cli-hooks",
  pillar: "tools",
  kind: "guide",
  titleEn: "CLI, Git Diff, Hooks & GitHub Actions",
  titleZh: "CLI、Git 增量、Hooks 与 CI 接入",
  relPath: "tools/cli-and-hooks.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["cli"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# CLI, Git Diff, Hooks & CI (\`v${VERSION}\`)

## Node.js 20+ & Python 3.10+ (Shipped, Zero Dependencies)

\`\`\`bash
# Audit directory (exits 1 on core invariant errors)
npx --yes github:dislop-ai/dislop check .

# Gate only modified git lines and output GitHub PR annotations or SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format github
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect DOCX/PPTX/PDF with Python
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Verify revision preserved protected facts
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
\`\`\`

## Exit Codes

- \`0\`: Checked cleanly with zero findings at or above \`--fail-on\`.
- \`1\`: Findings met or exceeded \`--fail-on\` (or \`verify\` rejected the edit).
- \`2\`: Invalid flags, missing path, or explicitly specified file was uninspectable (e.g., encrypted PDF).

## Claude Code PostToolUse Hook Template (Using Shipped CLI)

Note: \`PostToolUse\` fires **after** \`Write\`/\`Edit\` completes and receives tool context as JSON on stdin (\`tool_input.file_path\`). Parse and validate that path before invoking \`dislop check\` so empty values never scan the entire working directory; map CLI exit \`1\` to exit \`2\` to return structured post-write feedback to Claude Code.

\`\`\`json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node -e 'const d=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));const f=d.tool_input?.file_path;if(!f)process.exit(0);const r=require(\"child_process\").spawnSync(\"npx\",[\"--yes\",\"github:dislop-ai/dislop\",\"check\",f,\"--fail-on\",\"error\"],{stdio:\"inherit\"});process.exit(r.status===1?2:(r.status??0));'"
          }
        ]
      }
    ]
  }
}
\`\`\`
`,
});

registerResource({
  id: "tools-mcp-sdk-api",
  pillar: "tools",
  kind: "guide",
  titleEn: "MCP Server, SDK & Planned HTTP API",
  titleZh: "MCP 服务、SDK 与规划中的 HTTP API",
  relPath: "tools/mcp-sdk-api.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: PACK_ORDER,
  relatedTools: ["mcp", "cli"],
  content: `---
content-type: reference-data
version: ${VERSION}
---

# MCP Server, SDK & Planned HTTP API

## Stdio MCP Server (Shipped \`v${VERSION}\`)

\`\`\`json
{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}
\`\`\`

Shipped MCP tools:
- \`dislop_check\`: Audits \`text\` or workspace-relative \`path\`, returning flagged spans, \`protectedFacts\`, Deletion Tests, and exemplars.
- \`dislop_verify\`: Compares \`before\` and \`after\` text and rejects dropped facts or second-order slogan displacement.
- \`dislop_explain\`: Returns rationale and \`bad -> trap -> good\` exemplar for a \`ruleId\`.
- \`dislop_packs\`: Lists installed packs (\`core\`, \`business-brief\`, \`literary-essay\`, \`deck-and-ui\`).

## JavaScript Core Export (Shipped \`v${VERSION}\`)

\`package.json\` exports the zero-I/O pure ES module \`src/core.mjs\` (\`auditText\`, \`auditOoxmlEntries\`, \`auditPdfStructure\`, \`extractProtectedFacts\`, \`verifyRevision\`, \`resolveEffectivePack\`).

## Roadmap (Not Yet Shipped)

- \`P0\`: npm & PyPI package releases, typed JS/Python SDK facades (\`checkFile\` / \`checkBytes\`), MCP \`dislop_catalog\`, Resources, and Prompts.
- \`P1\`: Stateless Web-Standard Fetch HTTP API (\`/v1/check\`, \`/v1/verify\`, OpenAPI 3.1) sharing \`src/core.mjs\`.
`,
});

// 2e. Pack Pure Markdown Views (/packs/<id>.md) — ZERO fixtures, ZERO raw regex patterns!
for (const pid of PACK_ORDER) {
  const pack = packsById[pid];
  if (!pack) continue;
  const rulesBody = (pack.rules || [])
    .map((r) => {
      const parts = [
        `## \`${r.id}\``,
        `- Tier: \`${r.tier}\` · Severity: \`${r.severity}\` · Family: \`${r.family}\``,
        `- Modalities: \`${(r.modalities || []).join(", ")}\``,
        `- EN: ${formatRuleProseMd(r.message.en)}`,
        `- ZH: ${formatRuleProseMd(r.message.zh)}`,
        `- Deletion Test (EN): ${formatRuleProseMd(r.deletionTest.en)}`,
        `- Deletion Test (ZH): ${formatRuleProseMd(r.deletionTest.zh)}`,
      ];
      if (r.exemplar) {
        parts.push("", fencedExemplar(r.exemplar));
      }
      parts.push("", `Atomic card: [${r.id}.md](../rules/${r.id}.md)`);
      return parts.join("\n");
    })
    .join("\n\n");

  registerResource({
    id: `pack-${pid}`,
    pillar: "methodology",
    kind: "pack",
    titleEn: `Pack: ${pack.name.en} (${(pack.rules || []).length} rules)`,
    titleZh: `规则包：${pack.name.zh}（${(pack.rules || []).length} 条）`,
    relPath: `packs/${pid}.md`,
    modalities: pack.modalities || [],
    languages: ["en", "zh"],
    packs: [pid],
    relatedTools: ["browser-workbench", "cli", "mcp"],
    content: `---
content-type: reference-data
pack: ${pid}
tier: ${pack.tier}
version: ${pack.version}
---

# Pack: \`${pid}\` — ${pack.name.en}

> ${formatRuleProseMd(pack.summary.en)}

${formatRuleProseMd(pack.summary.zh)}

${rulesBody}
`,
  });
}

// 2f. Atomic Rule Cards (/rules/<id>.md) — 29 compact cards (<= 1.6 KB each), ZERO fixtures, ZERO raw patterns!
for (const { packId, rule: r } of allRules) {
  const parts = [
    `---`,
    `content-type: reference-data`,
    `ruleId: ${r.id}`,
    `pack: ${packId}`,
    `tier: ${r.tier}`,
    `severity: ${r.severity}`,
    `family: ${r.family}`,
    `---`,
    ``,
    `# Rule: \`${r.id}\``,
    ``,
    `- Pack: [\`${packId}\`](../packs/${packId}.md) · Tier: \`${r.tier}\` · Severity: \`${r.severity}\``,
    `- Modalities: \`${(r.modalities || []).join(", ")}\``,
    `- Human anchor: ${BASE_URL}/#rule-${r.id}`,
    ``,
    `## What It Catches`,
    `- EN: ${formatRuleProseMd(r.message.en)}`,
    `- ZH: ${formatRuleProseMd(r.message.zh)}`,
    ``,
    `## Deletion Test`,
    `- EN: ${formatRuleProseMd(r.deletionTest.en)}`,
    `- ZH: ${formatRuleProseMd(r.deletionTest.zh)}`,
  ];
  if (r.exemplar) {
    parts.push("", "## Exemplar (Reference Data)", "", fencedExemplar(r.exemplar));
  }
  registerResource({
    id: `rule-${r.id}`,
    pillar: "cases",
    kind: "rule",
    titleEn: `Rule: ${r.id}`,
    titleZh: `规则：${r.id}`,
    relPath: `rules/${r.id}.md`,
    modalities: r.modalities || [],
    languages: r.id.startsWith("zh-") ? ["zh"] : r.id.startsWith("en-") ? ["en"] : ["en", "zh"],
    packs: [packId],
    relatedTools: ["browser-workbench", "cli", "mcp"],
    content: parts.join("\n"),
  });
}

// 2g. Task Bundles (/tasks/*.md) — ~1,000 tokens each, combining Methodology + Cases + Tools
function renderTaskRuleSummary(packIds) {
  const lines = [];
  for (const pid of packIds) {
    const pack = packsById[pid];
    if (!pack) continue;
    lines.push(`### Pack \`${pid}\``);
    for (const r of pack.rules || []) {
      lines.push(`- [\`${r.id}\`](../rules/${r.id}.md) (\`${r.severity}\`): ${formatRuleProseMd(r.message.en)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

registerResource({
  id: "task-business-doc",
  pillar: "methodology",
  kind: "task-bundle",
  titleEn: "Task Bundle: Business Brief & Technical Proposal",
  titleZh: "任务组合：商业简报与技术方案审校",
  relPath: "tasks/business-doc.md",
  modalities: ["markdown", "text", "docx", "pptx"],
  languages: ["en", "zh"],
  packs: ["core", "business-brief"],
  relatedTools: ["browser-workbench", "skill", "cli", "mcp"],
  content: `---
content-type: reference-data
task: business-doc
version: ${VERSION}
---

# Task Bundle: Business Brief & Technical Proposal

Use this bundle when auditing or revising PRDs, architecture specs, memos, Word (\`.docx\`) reports, or bilingual executive briefs.

## 1. Core Principles

1. Clear all \`core\` invariant errors first (paths, placeholders, chatbot residue, Office revisions/raw Markdown).
2. Apply the Deletion Test to flagged prose phrases rather than swapping synonyms.
3. Preserve every number, qualifier (\`up to\`, \`at least\`, \`最多\`, \`至少\`), unit, date, URL, code span, and citation verbatim.
4. Reject second-order slogans (\`"Not X, but Y"\`, three-word staccato chains, 4-char Chinese slogan triads).

## 2. Active Rules

${renderTaskRuleSummary(["core", "business-brief"])}

## 3. Reference Contrast

${fencedExemplar(packsById["business-brief"].rules[2].exemplar)}

## 4. Deterministic Verification Command

\`\`\`bash
npx --yes github:dislop-ai/dislop check brief.md --pack business-brief
npx --yes github:dislop-ai/dislop verify brief.before.md brief.after.md
\`\`\`

Deep dives: [Pack \`business-brief\`](../packs/business-brief.md) · [Deletion Test](../methodology/deletion-test.md) · [Skill](../tools/skill.md)
`,
});

registerResource({
  id: "task-web-and-deck",
  pillar: "methodology",
  kind: "task-bundle",
  titleEn: "Task Bundle: Web UI, SVG & Slide Decks",
  titleZh: "任务组合：前端 UI、SVG 与演示文稿审校",
  relPath: "tasks/web-and-deck.md",
  modalities: ["html", "css", "jsx", "svg", "pptx"],
  languages: ["en", "zh"],
  packs: ["core", "deck-and-ui"],
  relatedTools: ["browser-workbench", "skill", "cli", "mcp"],
  content: `---
content-type: reference-data
task: web-and-deck
version: ${VERSION}
---

# Task Bundle: Web UI, SVG & Slide Decks

Use this bundle when building or auditing HTML/CSS/JSX pages, SVG diagrams, or PowerPoint (\`.pptx\`) presentations.

## 1. Hard Invariants & Layout Guards

1. Zero dead controls (\`<a href="#">\`, unlabeled buttons, unexplained \`<button disabled>\`).
2. Meet WCAG 2.2 AA contrast (\`>= 4.5:1\` normal text) and strictly monotonic dark-mode elevation (\`stage < sheet < raised\`).
3. Reject both Generator Default #1 (purple-pink neon gradients, pill soup > 6, 3-level nested boxes) and Generator Default #2 (warm cream + terracotta fallback).
4. Keep PowerPoint slides readable: \`<= 120\` Latin words (\`<= 280\` Han chars), \`<= 6\` bullets, zero off-slide text shapes, and \`normAutofit >= 80%\`.

## 2. Active Rules

${renderTaskRuleSummary(["core", "deck-and-ui"])}

## 3. Reference Contrast

${fencedExemplar(packsById["deck-and-ui"].rules[4].exemplar)}

## 4. Deterministic Verification Command

\`\`\`bash
npx --yes github:dislop-ai/dislop check site/ --pack deck-and-ui --fail-on warning
uvx --from git+https://github.com/dislop-ai/dislop dislop check deck.pptx
\`\`\`

Deep dives: [Pack \`deck-and-ui\`](../packs/deck-and-ui.md) · [Design System](../methodology/design-system.md) · [UI References](../cases/ui-specimens.md)
`,
});

registerResource({
  id: "task-editorial-writing",
  pillar: "methodology",
  kind: "task-bundle",
  titleEn: "Task Bundle: Editorial & Literary Writing",
  titleZh: "任务组合：散文随笔与非虚构长文审校",
  relPath: "tasks/editorial-writing.md",
  modalities: ["markdown", "text", "html", "docx"],
  languages: ["en", "zh"],
  packs: ["core", "literary-essay"],
  relatedTools: ["browser-workbench", "skill", "cli", "mcp"],
  content: `---
content-type: reference-data
task: editorial-writing
version: ${VERSION}
---

# Task Bundle: Editorial & Literary Writing

Use this bundle for longform essays, non-fiction reporting, and narrative drafts in English or Chinese.

## 1. Editorial Principles

1. Stop on the concrete physical detail or direct observation instead of adding a moralizing closing sentence.
2. Cut formulaic \`"Not X, but Y"\` / \`"不是 A，而是 B"\` aphorisms unless stating a literal factual correction.
3. Keep em-dash density restrained (\`<= 4\` per 300 words) and avoid half-width ASCII punctuation wedged between Chinese characters.
4. Preserve natural sentence-length burstiness rather than flattening every sentence to uniform length.

## 2. Active Rules

${renderTaskRuleSummary(["core", "literary-essay"])}

## 3. Reference Contrast

${fencedExemplar(packsById["literary-essay"].rules[0].exemplar)}

## 4. Deterministic Verification Command

\`\`\`bash
npx --yes github:dislop-ai/dislop check essay.md --pack literary-essay --lang zh
npx --yes github:dislop-ai/dislop verify essay.before.md essay.after.md --pack literary-essay
\`\`\`

Deep dives: [Pack \`literary-essay\`](../packs/literary-essay.md) · [Positive Divergence](../methodology/positive-divergence.md)
`,
});

registerResource({
  id: "task-pre-release-gate",
  pillar: "tools",
  kind: "task-bundle",
  titleEn: "Task Bundle: Pre-Release Objective Gate & CI",
  titleZh: "任务组合：发布前客观质量门禁与 CI",
  relPath: "tasks/pre-release-gate.md",
  modalities: ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
  languages: ["en", "zh"],
  packs: ["core"],
  relatedTools: ["cli", "mcp"],
  content: `---
content-type: reference-data
task: pre-release-gate
version: ${VERSION}
---

# Task Bundle: Pre-Release Objective Gate & CI

Use this bundle when gating pull requests, release docs, or agent-produced Office/PDF deliverables with zero subjective style noise.

## 1. Objective Invariants (\`packs/core\`, \`error\`)

${renderTaskRuleSummary(["core"])}

## 2. Incremental CI & Local Verification

\`\`\`bash
# Gate only git-changed lines against main (exit 1 on core error)
npx --yes github:dislop-ai/dislop check --changed origin/main --fail-on error --format github

# Emit SARIF 2.1.0 for GitHub Code Scanning
npx --yes github:dislop-ai/dislop check . --fail-on error --format sarif > dislop.sarif

# Verify revision preserved numbers, qualifiers, units, dates, URLs, code, and citations
npx --yes github:dislop-ai/dislop verify before.md after.md
\`\`\`

Deep dives: [Pack \`core\`](../packs/core.md) · [CLI & Hooks](../tools/cli-and-hooks.md) · [MCP & SDK](../tools/mcp-sdk-api.md)
`,
});

// 2h. Ecosystem Radar Static Outputs (/radar/index.json, /radar/index.md, /radar/index.html)
const radarJsonStr = JSON.stringify(radarData, null, 2) + "\n";
fs.writeFileSync(path.join(RADAR_OUT, "index.json"), radarJsonStr, "utf8");

const SECTION_META = [
  { id: "standards-research-policy", en: "Standards, Research & Policy", zh: "标准、研究与平台政策" },
  { id: "prose-en-multilingual", en: "Prose (EN & Multilingual)", zh: "英文与多语种写作" },
  { id: "prose-zh", en: "Chinese Writing & Localization", zh: "中文写作与去翻译腔" },
  { id: "deterministic-prose-linters", en: "Deterministic Linters", zh: "确定性检查工具" },
  { id: "ui-design-and-media", en: "UI, Design & Diagrams", zh: "前端 UI、设计与图表" },
  { id: "code-and-pr-governance", en: "Code & PR Governance", zh: "代码与 PR 治理" },
  { id: "contrast-and-detection", en: "Contrast Watch (Evasion / Detectors)", zh: "对照观察区（规避/检测）" },
  { id: "awesome-and-registries", en: "Awesome Lists & Registries", zh: "目录与注册中心" },
];

const radarMdSections = SECTION_META.map((sec) => {
  const items = radarData.entries.filter((e) => e.section === sec.id);
  const rows = items
    .map((e) => {
      const meta = [
        typeof e.stars === "number" ? `${e.stars}★` : null,
        e.pushedAt || null,
        e.modality,
        e.locale,
        e.hasDeterministicCheck ? "deterministic" : "prompt/policy",
      ]
        .filter(Boolean)
        .join(" · ");
      return `- [${e.name}](${e.url}) (${meta}): ${e.summary}`;
    })
    .join("\n");
  return `## ${sec.en} / ${sec.zh} (${items.length})\n\n${rows}`;
}).join("\n\n");

registerResource({
  id: "radar-index-md",
  pillar: "cases",
  kind: "radar",
  titleEn: `Anti-Slop Resource Radar (${radarData.entries.length} Verified Entries)`,
  titleZh: `反 AI 味生态资源雷达（${radarData.entries.length} 条实测核验）`,
  relPath: "radar/index.md",
  modalities: ["prose", "ui-design", "diagram-media", "code-pr", "academic", "multi-modal"],
  languages: ["en", "zh"],
  packs: [],
  relatedTools: ["browser-workbench"],
  content: `---
content-type: reference-data
schema: ${radarData.schema}
snapshot: ${SNAPSHOT_DATE}
entries: ${radarData.entries.length}
---

# Anti-Slop Resource Radar (\`${radarData.schema}\`)

Verified on ${SNAPSHOT_DATE} via GitHub REST API and HTTP status checks. Machine-readable JSON: [\`/radar/index.json\`](./index.json). Interactive filter page: [\`/radar/\`](${BASE_URL}/radar/).

> Neutrality boundary: \`contrast-and-detection\` isolates both probabilistic AI-text detectors (e.g., Fast-DetectGPT, Pangram) and adversarial evasion tools strictly for ecosystem contrast.

${radarMdSections}
`,
});

// Pre-render site/radar/index.html (full 87-entry static HTML + interactive JS filter)
const radarSectionButtonsHtml = [
  `<button type="button" class="ctrl-btn is-active" aria-pressed="true" data-section-filter="all">All Sections (${radarData.entries.length})</button>`,
  ...SECTION_META.map((sec) => {
    const cnt = radarData.entries.filter((e) => e.section === sec.id).length;
    return `<button type="button" class="ctrl-btn" aria-pressed="false" data-section-filter="${sec.id}">${escapeHtml(sec.en)} (${cnt})</button>`;
  }),
].join("\n          ");

const radarPreRenderedRows = radarData.entries
  .map((e) => {
    const secObj = SECTION_META.find((s) => s.id === e.section);
    const secLabel = secObj ? secObj.en : e.section;
    const isContrast = e.section === "contrast-and-detection";
    const hasZhSummary = /[\u4E00-\u9FFF]/.test(e.summary || "");
    const metaParts = [];
    if (typeof e.stars === "number") metaParts.push(`${e.stars.toLocaleString("en-US")}★`);
    if (e.pushedAt) metaParts.push(e.pushedAt);
    if (e.license && e.license !== "NOASSERTION") metaParts.push(e.license);
    if (e.archived) metaParts.push("archived");
    return `<tr>
              <td><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(e.name)}</strong></a>${
      e.repo ? `<div style="font-family:var(--font-mono);font-size:0.73rem;color:var(--ink-3);margin-top:2px;">${escapeHtml(e.repo)}</div>` : ""
    }</td>
              <td><span class="${isContrast ? "sev-error" : ""}" style="font-family:var(--font-mono);font-size:0.74rem;font-weight:600;">${escapeHtml(secLabel)}</span><div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--ink-3);margin-top:2px;">${escapeHtml(e.format)}</div></td>
              <td style="font-family:var(--font-mono);font-size:0.74rem;"><div>${escapeHtml(e.modality)} · ${escapeHtml(e.locale)}</div><div style="color:${e.hasDeterministicCheck ? "var(--mark-stet)" : "var(--ink-3)"};margin-top:2px;">${e.hasDeterministicCheck ? "deterministic: yes" : "deterministic: no"}</div></td>
              <td${hasZhSummary ? ' lang="zh-CN"' : ""}>${escapeHtml(e.summary)}</td>
              <td style="font-family:var(--font-mono);font-size:0.74rem;white-space:nowrap;">${escapeHtml(metaParts.join(" · ") || "—")}</td>
            </tr>`;
  })
  .join("\n");

const radarHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>dislop Radar — ${radarData.entries.length} Verified De-Slop Resources (${radarData.schema})</title>
  <meta name="description" content="Neutral cross-modality index of ${radarData.entries.length} verified anti-slop linters, writing skills, UI design rules, code governance policies, and research papers.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="dislop">
  <meta property="og:url" content="https://dislop.com/radar/">
  <meta property="og:title" content="dislop Radar — ${radarData.entries.length} Verified De-Slop Resources">
  <meta property="og:description" content="Neutral cross-modality index of ${radarData.entries.length} verified anti-slop tools, skills, design rules, and standards (${radarData.schema}).">
  <meta property="og:image" content="https://dislop.com/assets/og-card.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://dislop.com/assets/og-card.png">
  <link rel="canonical" href="https://dislop.com/radar/">
  <link rel="alternate" type="text/markdown" href="./index.md" title="Radar Markdown Directory">
  <link rel="alternate" type="application/json" href="./index.json" title="Radar JSON (${radarData.schema})">
  <link rel="alternate" type="text/plain" href="../llms.txt" title="LLMs Resource Index">
  <link rel="icon" type="image/svg+xml" href="../assets/logo.svg">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <a class="skip-link" href="#main-content" data-i18n="nav.skip">Skip to main content</a>
  <div class="rail-shell">
    <header class="topbar band-rule">
      <a class="brand-lockup" href="../">
        <img src="../assets/logo.svg" width="28" height="28" alt="dislop dele mark">
        <span class="brand-wordmark">dislop</span>
        <span class="brand-meta">radar · ${radarData.schema}</span>
      </a>

      <nav class="nav-links" aria-label="Radar navigation">
        <a href="../" data-i18n="nav.workbench">De-Slop Home</a>
        <a href="./" aria-current="page" data-i18n="nav.radar">Radar (${radarData.entries.length})</a>
        <a href="./index.json" class="nav-agent-link">index.json</a>
        <a href="./index.md" class="nav-agent-link">index.md</a>
        <a href="../llms.txt" class="nav-agent-link">llms.txt</a>
        <a href="https://github.com/dislop-ai/dislop" target="_blank" rel="noopener">GitHub</a>
      </nav>

      <div class="top-controls">
        <button type="button" id="lang-toggle" class="ctrl-btn" aria-label="Switch language">中文</button>
        <button type="button" id="theme-toggle" class="ctrl-btn" aria-label="Toggle color theme">Dark</button>
      </div>
    </header>

    <main id="main-content">
    <section class="section-block band-rule">
      <p class="section-index" data-i18n="radar.index">DE-SLOP ECOSYSTEM RADAR · SCHEMA ${radarData.schema} · SNAPSHOT ${SNAPSHOT_DATE}</p>
      <h1 class="lead-heading" style="max-width:34ch;" data-i18n="radar.heading">${radarData.entries.length} verified de-slop resources across writing, UI, decks, code, and standards.</h1>
      <p class="section-desc" data-i18n="radar.sub">
        Compiled offline from docs/research/anti-slop-radar-index.json with zero runtime network calls (CSP: connect-src 'none'). Every GitHub star count, push date, and URL was checked on ${SNAPSHOT_DATE}. Evasion tools are isolated in the Contrast Watch section.
      </p>

      <div class="catalog-controls" style="margin-top:20px;">
        <input type="search" id="radar-search" class="search-input" placeholder="Search name, repo, mechanism, or keyword..." aria-label="Search radar resources">
        <select id="radar-modality" class="filter-select" aria-label="Filter by modality">
          <option value="all" data-i18n="radar.allModalities">All modalities</option>
          ${radarData.taxonomy.modalities.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}
        </select>
        <select id="radar-locale" class="filter-select" aria-label="Filter by locale">
          <option value="all" data-i18n="radar.allLocales">All locales</option>
          ${radarData.taxonomy.locales.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("")}
        </select>
        <button type="button" id="radar-det-btn" class="ctrl-btn" aria-pressed="false" data-i18n="radar.detOnly">Deterministic check only</button>
        <button type="button" id="radar-reset-btn" class="ctrl-btn" data-i18n="radar.reset">Reset filters</button>
      </div>

      <div class="filter-bar">
        <div class="filter-group" role="group" aria-label="Filter by section">
          ${radarSectionButtonsHtml}
        </div>
        <span class="catalog-count" id="radar-count" aria-live="polite">${radarData.entries.length} / ${radarData.entries.length} entries</span>
      </div>

      <div class="table-scroll" tabindex="0" role="region" aria-label="Verified anti-slop ecosystem radar table">
        <table class="radar-table">
          <thead>
            <tr>
              <th data-i18n="radar.colName">Resource &amp; Repository</th>
              <th data-i18n="radar.colSection">Section &amp; Format</th>
              <th data-i18n="radar.colTags">Modality / Locale / Check</th>
              <th data-i18n="radar.colSummary">Objective Summary</th>
              <th data-i18n="radar.colMeta">Snapshot Meta</th>
            </tr>
          </thead>
          <tbody id="radar-tbody">
${radarPreRenderedRows}
          </tbody>
        </table>
      </div>

      <div class="contrast-notice" data-i18n="radar.contrastNote">
        Neutrality &amp; Ethics Boundary: Contrast Watch (contrast-and-detection) isolates both probabilistic AI-text detectors (e.g., Fast-DetectGPT, Pangram) and adversarial evasion or bypass tools strictly for ecosystem contrast. dislop removes AI slop and preserves factual integrity rather than helping evade AI disclosure rules.
      </div>
    </section>
    </main>

    <footer class="colophon">
      <div>
        <span data-i18n="footer.snapshot">Snapshot: ${SNAPSHOT_DATE} · Zero runtime network calls (CSP: connect-src 'none')</span>
      </div>
      <div class="colophon-links">
        <a href="../" data-i18n="footer.home">Home &amp; Workbench</a>
        <a href="./index.json" data-i18n="footer.json">Raw JSON</a>
        <a href="./index.md">Markdown</a>
        <a href="../llms.txt">llms.txt</a>
        <a href="https://github.com/dislop-ai/dislop">GitHub (Apache-2.0)</a>
      </div>
    </footer>
  </div>

  <script type="module" src="./radar.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(RADAR_OUT, "index.html"), radarHtml, "utf8");

// 2i. /llms.txt (L0 Routing Index, <= 2.6 KB, ~500-600 tokens)
const llmsTxt = writeCleanFile(
  "llms.txt",
  `# dislop

> Complete multi-modal de-slop toolkit for writing, Markdown, HTML/CSS/JSX/SVG, Word (.docx), PowerPoint (.pptx), PDF, and agent deliverables. Works with any model, agent, or dev environment — 0 runtime deps, offline-first, deterministic checks + fact-preserving verify.

Use this site directly as a static Level 0 de-slop service: fetch the smallest matching task bundle below (Methodology + Cases + Tools), or load \`/catalog.json\` to filter by modality, language, and token budget.

## Quick Start by Task (~800-1,500 tokens each)
- [Business Brief & Tech Proposal](${BASE_URL}/tasks/business-doc.md): Core invariants, \`business-brief\` pack, and fact-guard verification.
- [Web UI, SVG & Slide Decks](${BASE_URL}/tasks/web-and-deck.md): Contrast and dark-elevation invariants, \`deck-and-ui\` rules, and design system tokens.
- [Editorial & Literary Writing](${BASE_URL}/tasks/editorial-writing.md): \`literary-essay\` pack, prose contrasts, and positive voice notes.
- [Pre-Release Objective Gate](${BASE_URL}/tasks/pre-release-gate.md): Core \`error\` probes, git diff CI gating, and \`verify\` workflow.

## Resource Pillars
- [Methodology](${BASE_URL}/methodology/index.md): Deletion Test, anti-pattern map, positive divergence (draft), and galley design system.
- [Cases](${BASE_URL}/cases/index.md): \`bad -> trap -> good\` contrasts, self-dogfooding audit, and 31 verified design/typography/academic references.
- [Tools](${BASE_URL}/tools/index.md): Browser workbench, raw \`SKILL.md\` (draft), prompt checklists, shipped CLI (\`npx\`/\`uvx\`) and MCP, plus roadmap Hooks/SDK/API.
- [Ecosystem Radar](${BASE_URL}/radar/index.md): ${radarData.entries.length} verified de-slop resources (\`dislop.radar/2\`, raw JSON at \`/radar/index.json\`).

## Packs & Machine-Readable Index
- [Structured Catalog (JSON)](${BASE_URL}/catalog.json): Versioned manifest (\`dislop.catalog/1\`) with sha256 and token estimates.
- [Agent Skill Workflow](${BASE_URL}/tools/skill.md): Three-step \`check -> targeted edit -> verify\` instruction card.
- [Pack Docs](${BASE_URL}/packs/core.md): Also \`/packs/business-brief.md\`, \`/packs/literary-essay.md\`, \`/packs/deck-and-ui.md\`, and 29 atomic \`/rules/<id>.md\` cards.
- [Optional Full Bundle](${BASE_URL}/llms-full.txt): Single-fetch compilation of methodology and all 29 rules without test fixtures.
`,
  { isAgentText: true }
);

// 2j. /llms-full.txt (L2 Curated Single-Fetch Compilation, <= 45 KB, ZERO fixtures/patterns)
const fullPackDigest = PACK_ORDER.map((pid) => {
  const pack = packsById[pid];
  if (!pack) return "";
  const ruleLines = (pack.rules || [])
    .map((r) => {
      const ex = r.exemplar
        ? `\`\`\`text\nbad:  ${sanitizePublicExemplar(r.exemplar.bad)}\n${
            r.exemplar.trap ? `trap: ${sanitizePublicExemplar(r.exemplar.trap)}\n` : ""
          }good: ${sanitizePublicExemplar(r.exemplar.good)}\n\`\`\``
        : "";
      return `### \`${r.id}\` (${r.tier} / ${r.severity} / ${(r.modalities || []).join(", ")})\n- Why: ${formatRuleProseMd(r.message.en)}\n- Deletion Test: ${formatRuleProseMd(r.deletionTest.en)}\n${ex}`;
    })
    .join("\n\n");
  return `## Pack \`${pid}\` — ${pack.name.en}\n\n${formatRuleProseMd(pack.summary.en)}\n\n${ruleLines}`;
}).join("\n\n");

const llmsFullTxt = writeCleanFile(
  "llms-full.txt",
  `---
content-type: reference-data
version: ${VERSION}
snapshot: ${SNAPSHOT_DATE}
---

# dislop — Curated Single-Fetch De-Slop Reference (\`v${VERSION}\`)

> Complete multi-modal de-slop toolkit for writing, Markdown, HTML/CSS/JSX/SVG, Word (.docx), PowerPoint (.pptx), PDF, and agent deliverables across any model or dev environment. Zero runtime dependencies.

Note: Prefer \`/llms.txt\` + one \`/tasks/*.md\` page for smaller context windows. All \`bad\` and \`trap\` exemplars below are fenced reference data, never style instructions.

## Three-Stage Workflow

1. Audit (\`check\`): Fix all \`packs/core\` \`error\` invariants first; review Taste Pack \`warning\` / \`info\` queries locally.
2. Targeted Edit: Apply each rule's Deletion Test without altering numbers, qualifiers (\`up to\`, \`at least\`, \`最多\`, \`至少\`), units, dates, URLs, code spans, or citations.
3. Verify (\`verify\`): Reject edits that drop protected facts or shift into second-order slogans (\`Not X, but Y\`, staccato runs, 4-char triads, moralizing endings).

## CLI & MCP Quick Reference

\`\`\`bash
npx --yes github:dislop-ai/dislop check .
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md
uvx --from git+https://github.com/dislop-ai/dislop dislop check deck.pptx
\`\`\`

${fullPackDigest}
`,
  { isAgentText: true }
);

// 2k. /catalog.json (schema: "dislop.catalog/1")
const catalogObj = {
  schema: "dislop.catalog/1",
  version: VERSION,
  snapshotDate: SNAPSHOT_DATE,
  baseUrl: BASE_URL,
  pillars: ["methodology", "cases", "tools"],
  entryPoints: {
    llmsTxt: { path: "/llms.txt", bytes: Buffer.byteLength(llmsTxt, "utf8"), approxTokens: approxTokens(llmsTxt) },
    llmsFullTxt: {
      path: "/llms-full.txt",
      bytes: Buffer.byteLength(llmsFullTxt, "utf8"),
      approxTokens: approxTokens(llmsFullTxt),
    },
    radarJson: { path: "/radar/index.json", entries: radarData.entries.length, schema: radarData.schema },
  },
  resources: catalogResources,
};
const catalogJsonStr = JSON.stringify(catalogObj, null, 2) + "\n";
fs.writeFileSync(path.join(SITE_DIR, "catalog.json"), catalogJsonStr, "utf8");

// ---------- 3. Pre-Render Static Content into site/index.html ----------

let indexHtml = fs.readFileSync(path.join(SITE_DIR, "index.html"), "utf8");

// 3a. Pre-rendered Rules Table (all 29 rules, #rule-<id> anchors, 3-state exemplars inside <code>)
const textMods = new Set(["markdown", "text", "html", "css", "jsx", "svg"]);
const preRenderedRules = allRules
  .map(({ packId, rule: r }) => {
    const sevCls = r.severity === "error" ? "sev-error" : "sev-warning";
    const canTry = r.exemplar && (r.modalities || []).some((m) => textMods.has(m));
    const ex = r.exemplar;
    const exLines = ex
      ? [
          `<div class="ex-stack">`,
          `                 <div class="ex-row-bad"><strong>bad:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.bad))}</code></div>`,
          ...(ex.trap
            ? [`                 <div class="ex-row-trap"><strong>trap:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.trap))}</code></div>`]
            : []),
          `                 <div class="ex-row-good"><strong>good:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.good))}</code></div>`,
          `               </div>`,
        ].join("\n")
      : "—";
    const actionLines = [];
    if (canTry) {
      actionLines.push(
        `                  <button type="button" class="ctrl-btn ctrl-btn-sm" data-try-rule="${escapeHtml(r.id)}" aria-label="Try ${escapeHtml(r.id)} in Workbench">Try ↑</button>`
      );
    }
    actionLines.push(
      `                  <a class="rule-md-link" href="./rules/${escapeHtml(r.id)}.md" aria-label="Open ${escapeHtml(r.id)} Markdown rule card">.md</a>`
    );
    return `            <tr id="rule-${escapeHtml(r.id)}" class="rule-row">
              <td class="rule-id-cell">
                <code>${escapeHtml(r.id)}</code>
                <div class="rule-id-actions">
${actionLines.join("\n")}
                </div>
              </td>
              <td><code>${escapeHtml(packId)}</code><br><span class="sev-tag ${sevCls}" style="font-family:var(--font-mono);font-size:0.73rem;">${escapeHtml(r.tier)} · ${escapeHtml(r.severity)}</span></td>
              <td><code>${escapeHtml((r.modalities || []).join(", "))}</code></td>
              <td><div>${formatRuleProseHtml(r.message.en)}</div><div style="color:var(--ink-2);font-size:0.8rem;margin-top:4px;"><strong>Test:</strong> ${formatRuleProseHtml(r.deletionTest.en)}</div></td>
              <td>${exLines}</td>
            </tr>`;
  })
  .join("\n");

indexHtml = replaceBuildBlock(indexHtml, "RULES_TABLE", preRenderedRules);

// 3b. Pre-rendered Progressive-Disclosure Agent Endpoints Ledger
const featuredEndpoints = [
  { path: "./llms.txt", label: "/llms.txt", i18nKey: "ep.llms", desc: "L0 routing index (llmstxt.org) for external agents", bytes: Buffer.byteLength(llmsTxt, "utf8"), tok: approxTokens(llmsTxt) },
  { path: "./catalog.json", label: "/catalog.json", i18nKey: "ep.catalog", desc: "L0 versioned machine catalog (dislop.catalog/1)", bytes: Buffer.byteLength(catalogJsonStr, "utf8"), tok: approxTokens(catalogJsonStr) },
  { path: "./tasks/business-doc.md", label: "/tasks/business-doc.md", i18nKey: "ep.taskBiz", desc: "L1 bundle: business brief & tech proposal", resId: "task-business-doc" },
  { path: "./tasks/web-and-deck.md", label: "/tasks/web-and-deck.md", i18nKey: "ep.taskWeb", desc: "L1 bundle: Web UI, SVG & slide decks", resId: "task-web-and-deck" },
  { path: "./tasks/editorial-writing.md", label: "/tasks/editorial-writing.md", i18nKey: "ep.taskEdit", desc: "L1 bundle: editorial & literary essays", resId: "task-editorial-writing" },
  { path: "./tasks/pre-release-gate.md", label: "/tasks/pre-release-gate.md", i18nKey: "ep.taskGate", desc: "L1 bundle: core error gate & verify CI", resId: "task-pre-release-gate" },
  { path: "./tools/skill.md", label: "/tools/skill.md", i18nKey: "ep.skill", desc: "L2 canonical SKILL.md workflow (check -> edit -> verify)", resId: "tools-skill" },
  { path: "./radar/index.json", label: "/radar/index.json", i18nKey: "ep.radar", desc: `L1 raw JSON of ${radarData.entries.length} verified ecosystem entries`, bytes: Buffer.byteLength(radarJsonStr, "utf8"), tok: approxTokens(radarJsonStr) },
  { path: "./methodology/index.md", label: "/methodology/index.md", i18nKey: "ep.method", desc: "L1 methodology pillar (Deletion Test & Positive Pull)", resId: "methodology-index" },
  { path: "./llms-full.txt", label: "/llms-full.txt", i18nKey: "ep.full", desc: "L2 single-fetch curated bundle (zero test fixtures)", bytes: Buffer.byteLength(llmsFullTxt, "utf8"), tok: approxTokens(llmsFullTxt) },
];

const endpointsHtml = featuredEndpoints
  .map((ep) => {
    let bytes = ep.bytes;
    let tok = ep.tok;
    if (ep.resId) {
      const found = catalogResources.find((r) => r.id === ep.resId);
      if (found) {
        bytes = found.bytes;
        tok = found.approxTokens;
      }
    }
    const kb = (bytes / 1024).toFixed(1);
    return `          <div class="endpoint-row">
            <div class="endpoint-main">
              <a class="endpoint-path" href="${ep.path}">${escapeHtml(ep.label)}</a>
              <div class="endpoint-desc" data-i18n="${ep.i18nKey}">${escapeHtml(ep.desc)}</div>
            </div>
            <span class="endpoint-meta">${kb} KB · ~${tok} tok</span>
          </div>`;
  })
  .join("\n");

indexHtml = replaceBuildBlock(indexHtml, "ENDPOINTS", endpointsHtml);

// 3c. Default CLI snippet pre-rendered
const defaultSnippet = `# Audit current directory (blocks on core invariant errors, prints taste warnings)
npx --yes github:dislop-ai/dislop check .

# Gate only git-modified lines in a pull request and emit SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect a PowerPoint deck or Word file with Python 3.10+ (zero external deps)
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Stage-3 Verification: ensure an edit preserved all numbers, qualifiers, links & code
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md`;

indexHtml = replaceBuildBlock(indexHtml, "DEFAULT_SNIPPET", escapeHtml(defaultSnippet));

// 3d. Radar live stats computed directly from SSOT
const detCount = radarData.entries.filter((e) => e.hasDeterministicCheck).length;
const zhCount = radarData.entries.filter((e) => e.locale === "zh" || e.locale === "multilingual").length;
const radarStatsHtml = `          <div class="stat-strip">
            <div class="stat-cell"><span class="stat-num">${radarData.entries.length}</span><span class="stat-label">verified entries</span></div>
            <div class="stat-cell"><span class="stat-num">${radarData.taxonomy.sections.length}</span><span class="stat-label">taxonomy sections</span></div>
            <div class="stat-cell"><span class="stat-num">${detCount}</span><span class="stat-label">deterministic checks</span></div>
            <div class="stat-cell"><span class="stat-num">${zhCount}</span><span class="stat-label">zh / multilingual</span></div>
          </div>`;

indexHtml = replaceBuildBlock(indexHtml, "RADAR_STATS", radarStatsHtml);

// 3e. Positive Non-Mainstream Design References compiled directly from verified-positive-sources.json
const featuredPosIds = ["norm-zurich", "stiftung-buchkunst", "fonts-in-use", "dinamo", "the-type", "arena"];
const featuredPos = featuredPosIds
  .map((id) => positiveSources.entries.find((e) => e.id === id))
  .filter(Boolean);

const posRefsHtml = `          <ul class="ref-list">
${featuredPos
  .map(
    (e) =>
      `            <li><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.name)}</a> <span style="font-family:var(--font-mono);font-size:0.71rem;color:var(--ink-3);">(${escapeHtml(e.category)})</span><span class="ref-note">${escapeHtml(e.extractablePrinciple)}</span></li>`
  )
  .join("\n")}
          </ul>`;

indexHtml = replaceBuildBlock(indexHtml, "POSITIVE_REFS", posRefsHtml);

fs.writeFileSync(path.join(SITE_DIR, "index.html"), indexHtml, "utf8");

// ---------- 4. Build-Time Security, Budget & Link Assertions ----------

const errors = [];

const llmsBytes = Buffer.byteLength(llmsTxt, "utf8");
if (llmsBytes > 2600) {
  errors.push(`site/llms.txt exceeds 2600-byte budget (${llmsBytes} bytes)`);
}
const llmsFullBytes = Buffer.byteLength(llmsFullTxt, "utf8");
if (llmsFullBytes > 45000) {
  errors.push(`site/llms-full.txt exceeds 45000-byte budget (${llmsFullBytes} bytes)`);
}

// Verify zero fixtures.hit strings or raw regex patterns leaked into Agent endpoints
const forbiddenFixtureSamples = [
  "file:///Users/alice/Documents/spec.pdf",
  "PPTX_WORD_WALL:145",
  "DOCX_RAW_MARKDOWN:",
  "<!--",
];
for (const res of catalogResources) {
  const diskPath = path.join(SITE_DIR, res.path.replace(/^\//, ""));
  if (!fs.existsSync(diskPath)) {
    errors.push(`Missing catalog target on disk: ${res.path}`);
    continue;
  }
  const body = fs.readFileSync(diskPath, "utf8");
  if (res.kind === "rule" && Buffer.byteLength(body, "utf8") > 1800) {
    errors.push(`Atomic rule card ${res.path} exceeds 1800 bytes (${Buffer.byteLength(body, "utf8")} bytes)`);
  }
  if (INVISIBLE_BIDI_RE.test(body)) {
    INVISIBLE_BIDI_RE.lastIndex = 0;
    errors.push(`Hidden Unicode/bidi character detected in ${res.path}`);
  }
  INVISIBLE_BIDI_RE.lastIndex = 0;
  for (const leak of forbiddenFixtureSamples) {
    if (body.includes(leak)) {
      errors.push(`Forbidden fixture/comment marker "${leak}" leaked into ${res.path}`);
    }
  }
}

// Verify every dislop.com URL in llms.txt resolves to a file in site/
for (const m of llmsTxt.matchAll(/https:\/\/dislop\.com(\/[^\s)]+)/g)) {
  const target = m[1].replace(/\/$/, "/index.html");
  const full = path.join(SITE_DIR, target.replace(/^\//, ""));
  if (!fs.existsSync(full)) {
    errors.push(`Broken URL in llms.txt: ${m[0]} (missing site${target})`);
  }
}

if (errors.length > 0) {
  console.error("Site build assertions failed:");
  for (const err of errors) console.error(" -", err);
  process.exit(1);
}

console.log(
  `Built dual-native site: core.mjs, logo.svg, ${Object.keys(packsById).length} packs (${allRules.length} rules), ` +
    `${radarData.entries.length} radar entries, ${catalogResources.length} catalog resources, ` +
    `llms.txt (${llmsBytes} B), llms-full.txt (${llmsFullBytes} B).`
);
