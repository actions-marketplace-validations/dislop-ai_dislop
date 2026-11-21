import {
  detectModality,
  resolveEffectivePack,
  auditText,
  auditOoxmlEntries,
  auditPdfStructure,
  extractProtectedFacts,
  verifyRevision,
} from "./engine/core.mjs";
import { PACKS_BY_ID } from "./engine/packs-data.mjs";

const I18N = {
  en: {
    "nav.workbench": "Workbench",
    "nav.dogfood": "Dogfooding",
    "nav.rules": "Rules (29)",
    "nav.design": "Design System",
    "nav.cli": "CLI & MCP",
    "lead.index": "00 / PRE-PUBLICATION QUALITY GATE",
    "lead.titleStrong": "Lint deliverables before you publish.",
    "lead.titleMuted": "Catch leaked paths, stock filler, and overloaded slides—then verify edits kept numbers, dates, links, and citations intact.",
    "lead.sub":
      "Deterministic probes for Markdown, HTML/CSS/SVG, Word (.docx), PowerPoint (.pptx), and PDF metadata. Runs offline in Node.js, Python, or this browser sheet with zero text uploaded.",
    "lead.runLabel": "RUN IMMEDIATELY (NODE 20+ OR PYTHON 3.10+)",
    "lead.zeroDeps": "0 runtime dependencies · Exit 1 on invariant errors",
    "btn.copy": "Copy",
    "btn.copied": "Copied",
    "wb.heading": "01 / INTERACTIVE GALLEY PROOF WORKBENCH (SHARED src/core.mjs)",
    "wb.packLabel": "Taste Pack:",
    "wb.openFile": "Inspect local file (.md/.html/.docx/.pptx/.pdf)",
    "wb.specimensTitle": "SPECIMENS",
    "wb.privacyNote":
      "Runs 100% in browser memory via ./engine/core.mjs. Network egress is locked by CSP (connect-src 'none').",
    "wb.modeProof": "Proof Sheet",
    "wb.modeEdit": "Edit & Recheck",
    "wb.applyClean": "Load Clean Revision",
    "wb.tryTrap": "Try 2nd-Order Trap",
    "wb.reset": "Reset",
    "legend.error": "error: core invariant (solid red)",
    "legend.warn": "warn/info: taste query (dashed blue)",
    "legend.stet": "stet: protected fact locked by verify",
    "dogfood.title": "What an unguarded prompt wrote vs. what shipped",
    "dogfood.desc":
      "Every Markdown file, SVG banner, and HTML/CSS template in this repository runs through `dislop check . --fail-on warning` in CI. Left is a raw model-generated pitch; right is the factual copy after applying the Deletion Test.",
    "dogfood.badTag": "RAW GENERATED DRAFT · FLAGGED BY DISLOP",
    "dogfood.goodTag": "SHIPPED REPOSITORY COPY · 0 FINDINGS",
    "dogfood.goodMeta": "Checked by business-brief + deck-and-ui · 0 errors, 0 warnings",
    "rules.title": "29 rules across Core Invariants and 3 Genre Packs",
    "rules.desc":
      "Generated directly from packs/*/pack.json. Objective publication failures live in core (error); genre conventions live in modular Taste Packs (warning / info) paired with a Deletion Test and before/after exemplars.",
    "rules.filterAll": "All Packs (29)",
    "rules.colId": "Rule ID",
    "rules.colPack": "Pack / Tier",
    "rules.colMod": "Modalities",
    "rules.colWhy": "What It Catches & Deletion Test",
    "rules.colEx": "Before → After Exemplar",
    "ds.title": "Architectural Galley Tokens & Two-Pencil Semantics",
    "ds.desc":
      "Neutral cotton press stock in light mode and rising dark-mode surface lightness (L* 4.6 → 8.1 → 12.6)—avoiding both neon purple gradients and warm-stone cream templates.",
    "ds.readSpec": "Full Design Spec →",
    "ds.tokensHeading": "LIVE SURFACE & PENCIL TOKENS (WCAG AA VERIFIED)",
    "ds.typeHeading": "TYPOGRAPHIC ROLES (ZERO EXTERNAL FONT CDN)",
    "cli.title": "Wire into local agents and pull requests",
    "cli.desc":
      "Use `dislop check --changed` to gate only modified lines on existing repositories, or attach `dislop --mcp` so Claude Code, Codex, and Cursor run `check → edit → verify` automatically.",
    "footer.audit": "Self-audit: dislop check site/ --pack deck-and-ui --fail-on warning → 0 findings",
  },
  zh: {
    "nav.workbench": "校样工作台",
    "nav.dogfood": "自审对照",
    "nav.rules": "规则索引 (29)",
    "nav.design": "设计规范",
    "nav.cli": "CLI 与 MCP",
    "lead.index": "00 / 发稿前确定性质量门禁",
    "lead.titleStrong": "发稿前，用确定性规则审校交付物。",
    "lead.titleMuted": "本地检出路径泄露、空话套词与超载幻灯片，并复检改稿未篡改任何数字与引用。",
    "lead.sub":
      "覆盖 Markdown、HTML/CSS/SVG、Word (.docx)、PowerPoint (.pptx) 与 PDF 元数据。支持 Node.js、Python 或当前浏览器离线运行，零文本外传。",
    "lead.runLabel": "零配置直接运行（NODE 20+ 或 PYTHON 3.10+）",
    "lead.zeroDeps": "零第三方运行时依赖 · 客观错误默认退出码 1",
    "btn.copy": "复制",
    "btn.copied": "已复制",
    "wb.heading": "01 / 交互式清样审校台（与 CLI 共用 src/core.mjs）",
    "wb.packLabel": "审美包：",
    "wb.openFile": "本地检查文件 (.md/.html/.docx/.pptx/.pdf)",
    "wb.specimensTitle": "校样标本",
    "wb.privacyNote":
      "100% 在浏览器内存中调用 ./engine/core.mjs 执行，并由 CSP (connect-src 'none') 物理锁死外发请求。",
    "wb.modeProof": "清样批注视图",
    "wb.modeEdit": "编辑并复检",
    "wb.applyClean": "载入合规改写稿",
    "wb.tryTrap": "测试二阶套话陷阱",
    "wb.reset": "重置原稿",
    "legend.error": "error：客观交付底线（朱红实线）",
    "legend.warn": "warn/info：文体商榷提示（群青虚线）",
    "legend.stet": "stet：verify 锁定的受保护事实（墨绿虚线）",
    "dogfood.title": "未加约束的生成初稿 vs. 仓库实发定稿",
    "dogfood.desc":
      "本仓库所有文档、SVG 横幅与网页模板均在 CI 中执行 `dislop check . --fail-on warning`。左侧为典型模型宣传初稿，右侧为执行“删除测试”后的上线正文。",
    "dogfood.badTag": "原始生成初稿 · 命中多项规则",
    "dogfood.goodTag": "仓库实发定稿 · 0 命中",
    "dogfood.goodMeta": "经 business-brief 与 deck-and-ui 双重检查 · 0 错误，0 警告",
    "rules.title": "覆盖基础底线与三大文体包的 29 条确定性规则",
    "rules.desc":
      "直接由 packs/*/pack.json 渲染生成。客观发布事故归入 core（error）；文体与界面惯例归入可插拔审美包（warning / info），逐条配套删除测试与正反改稿对照。",
    "rules.filterAll": "全部规则 (29)",
    "rules.colId": "规则 ID",
    "rules.colPack": "所属包 / 层级",
    "rules.colMod": "适用模态",
    "rules.colWhy": "检出问题与删除测试",
    "rules.colEx": "改稿对照（Before → After）",
    "ds.title": "建筑标尺网格、色彩令牌与双铅笔校对语义",
    "ds.desc":
      "浅色采用中性棉浆清样纸，深色表面明度逐层递增（L* 4.6 → 8.1 → 12.6），同时避开紫粉霓虹渐变与暖米白人文模板。",
    "ds.readSpec": "查看完整设计规范 →",
    "ds.tokensHeading": "实时表面与校对铅笔令牌（全部通过 WCAG AA）",
    "ds.typeHeading": "三级字体分工（零外部字体 CDN 请求）",
    "cli.title": "接入本地 Agent 与 Git 提交流水线",
    "cli.desc":
      "存量仓库可用 `dislop check --changed` 仅检查本次改动行；在 Claude Code、Codex 或 Cursor 中挂载 `dislop --mcp` 即可执行“检查 → 局部改稿 → 事实复检”闭环。",
    "footer.audit": "自检结果：dislop check site/ --pack deck-and-ui --fail-on warning → 0 findings",
  },
};

const localPathDemo = ["file:///", "Users/", "alex", "/Desktop/q3-topology.png"].join("");

const SPECIMENS = [
  {
    id: "brief",
    num: "01",
    label: { en: "Business Brief", zh: "商业方案简报" },
    pack: "business-brief",
    filename: "rollout-brief.md",
    modality: "markdown",
    bad: [
      "Certainly! Here is the Q3 settlement brief.",
      "",
      "It is worth noting that CSV exports take up to 12 minutes for workspaces above 500,000 rows.",
      `See [Topology Diagram](${localPathDemo}) for the 3-node failover layout.`,
      "本次改造以队列分级为重要抓手，全面赋能一线运维团队，将故障恢复时间压缩至 45 秒内。",
    ].join("\n"),
    trap: [
      "CSV exports take 12 minutes for workspaces above 500,000 rows.",
      "See [Topology Diagram](./docs/q3-topology.png) for the 3-node failover layout.",
      "这不是一次简单的队列改造，而是运维团队 45 秒内恢复服务的底气。",
    ].join("\n"),
    good: [
      "Q3 settlement brief.",
      "",
      "CSV exports take up to 12 minutes for workspaces above 500,000 rows.",
      `See [Topology Diagram](${localPathDemo.replace("file:///Users/alex/Desktop/", "./docs/")}) for the 3-node failover layout.`,
      "本次改造按故障等级拆分告警队列，一线运维恢复时间压缩至 45 秒内。",
    ].join("\n"),
  },
  {
    id: "second-order",
    num: "02",
    label: { en: "2nd-Order Slop", zh: "二阶反套话过矫" },
    pack: "business-brief",
    filename: "field-sync.md",
    modality: "markdown",
    bad: [
      "Signals drop. Photos vanish. Audits stall.",
      "This isn't a sync queue. It's field peace of mind for 120 inspection photos.",
      "这不是一款普通的离线工具，而是地下机房巡检的底气，支持每 30 秒自动重连。",
    ].join("\n"),
    trap: [
      "It is worth noting that our game-changing sync queue buffers 100 inspection photos every 30 seconds.",
    ].join("\n"),
    good: [
      "When cellular coverage drops in basement vaults, the local queue retains 120 inspection photos until connectivity returns.",
      "地下机房断网期间本地队列保留巡检照片，并每 30 秒自动尝试重连。",
    ].join("\n"),
  },
  {
    id: "literary",
    num: "03",
    label: { en: "Literary Essay", zh: "非虚构随笔" },
    pack: "literary-essay",
    filename: "watchmaker.md",
    modality: "markdown",
    bad: [
      "傍晚六点半,修表匠把拆下的 3 枚铜齿轮泡进煤油皿里;顺手关掉了台灯。",
      "那把旧镊子不是工具，而是手艺人的尊严。这或许就是慢工出细活在喧嚣时代真正的意义所在。",
    ].join("\n"),
    trap: [
      "傍晚六点半，修表匠把拆下的 3 枚铜齿轮泡进煤油皿里，星期四的橱窗空空荡荡。",
      "Ultimately, this reminds us that craft endures.",
    ].join("\n"),
    good: [
      "傍晚六点半，修表匠把拆下的 3 枚铜齿轮泡进煤油皿里；顺手关掉了台灯。",
      "他用鹿皮擦净那把跟了自己二十年的旧镊子，收进抽屉最里格。",
    ].join("\n"),
  },
  {
    id: "ui-chrome",
    num: "04",
    label: { en: "UI & HTML Slop", zh: "前端界面模板味" },
    pack: "deck-and-ui",
    filename: "hero-card.html",
    modality: "html",
    bad: [
      '<div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">',
      '  <span class="badge">AI-Powered · Zero Hallucination</span>',
      '  <h2>Audit 48 slide decks in 1.2 seconds</h2>',
      '  <a href="#">Download report</a>',
      "</div>",
    ].join("\n"),
    trap: [
      '<div class="surface-card p-6">',
      "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
      "  <button disabled>Download report</button>",
      "</div>",
    ].join("\n"),
    good: [
      '<section class="surface-card p-6">',
      "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
      '  <a href="./reports/deck-audit.json">Download JSON report</a>',
      "</section>",
    ].join("\n"),
  },
  {
    id: "clean-nearmiss",
    num: "05",
    label: { en: "Clean Near-Miss", zh: "零误报正例核验" },
    pack: "business-brief",
    filename: "clean-spec.md",
    modality: "markdown",
    bad: [
      "The museum lent a 16th-century wool tapestry for the 14-week exhibition.",
      "Run the Delve debugger to inspect goroutine stacks when timeouts occur.",
      "默认连接超时不是 30 秒，而是 300 秒；测试员单手抓手机拍摄了 24 张夜间条码样本。",
      "首批离线索引压测覆盖北京大学、清华大学、复旦大学三所高校公开目录。",
    ].join("\n"),
    trap: [
      "这不是普通展览，而是 14 周的文化盛宴。",
    ].join("\n"),
    good: [
      "The museum lent a 16th-century wool tapestry for the 14-week exhibition.",
      "Run the Delve debugger to inspect goroutine stacks when timeouts occur.",
      "默认连接超时不是 30 秒，而是 300 秒；测试员单手抓手机拍摄了 24 张夜间条码样本。",
      "首批离线索引压测覆盖北京大学、清华大学、复旦大学三所高校公开目录。",
    ].join("\n"),
  },
];

const SNIPPETS = {
  cli: `# Audit current directory (blocks on core invariant errors, prints taste warnings)
npx --yes github:dislop-ai/dislop check .

# Gate only git-modified lines in a pull request and emit SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect a PowerPoint deck or Word file with Python 3.10+ (zero external deps)
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Stage-3 Verification: ensure an edit preserved all numbers, qualifiers, links & code
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md`,
  mcp: `{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}

// Exposed MCP Tools:
// 1. dislop_check   -> returns flagged spans + protectedFacts + Deletion Test + exemplars
// 2. dislop_verify  -> rejects dropped numbers/qualifiers or 2nd-order slop displacement
// 3. dislop_explain -> inspects rationale & before/trap/after for a ruleId
// 4. dislop_packs   -> lists core + genre Taste Packs`,
  ci: `name: Deliverable Quality Gate
on: [push, pull_request]
jobs:
  dislop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npx --yes github:dislop-ai/dislop check . --fail-on error --format github`,
  config: `{
  "failOn": "error",
  "ignore": ["vendor/**", "dist/**", "tests/fixtures/**"],
  "overrides": [
    { "files": ["docs/**/*.md"], "pack": "business-brief" },
    { "files": ["essays/**/*.md"], "pack": "literary-essay" },
    { "files": ["site/**/*.{html,css,svg}"], "pack": "deck-and-ui" }
  ],
  "allow": ["Delve", "Bayeux Tapestry"],
  "rules": {
    "bold-lead-list-wall": "info"
  }
}`,
};

const DOGFOOD_SAMPLES = {
  en: {
    bad: "Certainly! In today's fast-paced AI landscape, dislop isn't just a linter — it's a game-changer for quality. Signals drop. Bugs ship. Trust dies. Studies show 80% of teams struggle with slop.",
    good: "dislop checks Markdown, HTML/CSS/SVG, DOCX, PPTX, and PDF files before publication. It reports leaked local paths, unfilled placeholders, overloaded slides, and stock phrasing, then verifies revisions keep numbers, links, and citations intact.",
  },
  zh: {
    bad: "好的，以下是为您撰写的介绍：值得注意的是，dislop 不仅仅是一款检查工具，更是高质量交付的底气。它以确定性规则为重要抓手，全面赋能内容团队实现精准高效、安全可靠、灵活易用的审校闭环。",
    good: "dislop 在发稿前检查 Markdown、HTML/CSS/SVG、DOCX、PPTX 与 PDF 文件，标出本机路径泄露、未填占位符、超载幻灯片与高频套话，并在改稿后核对数字、单位、链接与引用未被篡改。",
  },
};

// ---------- State ----------

let currentLang = "en";
let currentTheme = "light";
let activeSpecimen = SPECIMENS[0];
let baselineText = activeSpecimen.bad;
let currentText = activeSpecimen.bad;
let currentFilename = activeSpecimen.filename;
let currentModality = activeSpecimen.modality;
let currentPackId = activeSpecimen.pack;
let viewMode = "proof"; // "proof" | "edit"
let focusedFindingIdx = 0;
let binaryAuditResult = null; // non-null when inspecting binary .docx/.pptx/.pdf
let lastUploadedFile = null;
let activeRuleFilter = "all";
let activeSnippet = "cli";

// ---------- Browser-Native ZIP / PDF Reader (`DecompressionStream`) ----------

async function readBrowserZipXmlEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("Invalid ZIP header");
  }
  let eocd = -1;
  const minOff = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOff; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Missing ZIP central directory");
  const total = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries = {};
  let ptr = cdOffset;

  for (let i = 0; i < total && ptr + 46 <= bytes.length; i += 1) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOff = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (!/\.(?:xml|rels)$/i.test(name)) continue;
    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const slice = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) {
      entries[name] = decoder.decode(slice);
    } else if (method === 8 && typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(slice);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      entries[name] = decoder.decode(buf);
    }
  }
  return entries;
}

// ---------- Rendering ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectStetRanges(text, findingSpans) {
  const ranges = [];
  const numRe = /(?<![A-Za-z0-9_/-])(?:(?:\b(?:up to|at least|under|over|above|below)\s+|(?:最多|至少|不超过|低于|高于)\s*))?(?:[$¥€£]\s*)?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|(?:ms|s|sec|seconds?|min|minutes?|hours?|weeks?|rows?|nodes?|decks?)(?![A-Za-z])|秒|分钟|小时|周|行|枚|张|所))?/giu;
  let m;
  while ((m = numRe.exec(text)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    const overlapsFinding = findingSpans.some((fs) => start < fs.end && end > fs.start);
    if (!overlapsFinding) {
      ranges.push({ start, end, kind: "stet" });
    }
  }
  return ranges;
}

function renderAnnotatedLine(lineText, lineGlobalStart, findings, stetRanges) {
  const lineEnd = lineGlobalStart + lineText.length;
  const tokens = [];

  findings.forEach((f, idx) => {
    if (!f.span) return;
    const s = Math.max(lineGlobalStart, f.span.start);
    const e = Math.min(lineEnd, f.span.end);
    if (s < e) {
      tokens.push({
        start: s - lineGlobalStart,
        end: e - lineGlobalStart,
        cls: f.severity === "error" ? "mark-span mark-error" : "mark-span mark-warn",
        findingIdx: idx,
        title: `${f.ruleId} (${f.severity})`,
      });
    }
  });

  stetRanges.forEach((r) => {
    const s = Math.max(lineGlobalStart, r.start);
    const e = Math.min(lineEnd, r.end);
    if (s < e) {
      const overlaps = tokens.some((t) => s - lineGlobalStart < t.end && e - lineGlobalStart > t.start);
      if (!overlaps) {
        tokens.push({
          start: s - lineGlobalStart,
          end: e - lineGlobalStart,
          cls: "mark-span mark-stet",
          findingIdx: -1,
          title: "stet: protected fact locked by dislop verify",
        });
      }
    }
  });

  tokens.sort((a, b) => a.start - b.start);

  let cursor = 0;
  let html = "";
  for (const tok of tokens) {
    if (tok.start < cursor) continue;
    if (tok.start > cursor) {
      html += escapeHtml(lineText.slice(cursor, tok.start));
    }
    const focusCls = tok.findingIdx === focusedFindingIdx ? " is-focused" : "";
    const dataAttr = tok.findingIdx >= 0 ? ` data-finding-idx="${tok.findingIdx}"` : "";
    html += `<span class="${tok.cls}${focusCls}" title="${escapeHtml(tok.title)}"${dataAttr}>${escapeHtml(
      lineText.slice(tok.start, tok.end)
    )}</span>`;
    cursor = tok.end;
  }
  if (cursor < lineText.length) {
    html += escapeHtml(lineText.slice(cursor));
  }
  return html || " ";
}

function renderWorkbench() {
  const t0 = performance.now();
  const pack = resolveEffectivePack(currentPackId, PACKS_BY_ID);

  let findings = [];
  let verifyState = null;

  if (binaryAuditResult) {
    findings = binaryAuditResult.findings;
  } else {
    const res = auditText(currentText, {
      filename: currentFilename,
      modality: currentModality,
      pack,
    });
    findings = res.findings;
    if (currentText !== baselineText) {
      verifyState = verifyRevision(baselineText, currentText, {
        filename: currentFilename,
        modality: currentModality,
        pack,
      });
    }
  }
  const elapsedMs = (performance.now() - t0).toFixed(1);

  if (focusedFindingIdx >= findings.length) {
    focusedFindingIdx = Math.max(0, findings.length - 1);
  }

  // Summary strip
  const errCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.length - errCount;
  const facts = binaryAuditResult ? { numbers: [] } : extractProtectedFacts(currentText);
  const summaryEl = document.getElementById("wb-summary");
  summaryEl.innerHTML =
    currentLang === "zh"
      ? `<span>${errCount} 错误 · ${warnCount} 警告 · ${facts.numbers.length} 项事实锁定</span><span>${elapsedMs} ms</span>`
      : `<span>${errCount} error(s) · ${warnCount} warning(s) · ${facts.numbers.length} stet fact(s)</span><span>${elapsedMs} ms</span>`;

  // Verify banner
  const verifyEl = document.getElementById("verify-box");
  if (verifyState) {
    verifyEl.hidden = false;
    verifyEl.className = `verify-banner ${verifyState.ok ? "is-accepted" : "is-rejected"}`;
    if (verifyState.ok) {
      verifyEl.innerHTML = `<div class="verify-title">dislop verify: ACCEPTED (${verifyState.beforeCount} → ${verifyState.afterCount})</div><div>${
        currentLang === "zh"
          ? "全部数值、限定词、链接与引用均完整保留，且未引入二阶套话。"
          : "All numbers, qualifiers, links, and code spans survived intact with zero displacement."
      }</div>`;
    } else {
      const items = verifyState.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
      verifyEl.innerHTML = `<div class="verify-title">dislop verify: REJECTED (${verifyState.beforeCount} → ${verifyState.afterCount})</div><ul class="verify-reasons">${items}</ul>`;
    }
  } else {
    verifyEl.hidden = true;
  }

  // Proof sheet vs textarea
  const proofOl = document.getElementById("proof-view");
  const editArea = document.getElementById("edit-textarea");
  if (viewMode === "proof") {
    proofOl.hidden = false;
    editArea.hidden = true;
    const lines = currentText.split("\n");
    const findingSpans = findings.map((f) => f.span).filter(Boolean);
    const stetRanges = binaryAuditResult ? [] : collectStetRanges(currentText, findingSpans);
    let globalOffset = 0;
    proofOl.innerHTML = lines
      .map((ln, idx) => {
        const html = renderAnnotatedLine(ln, globalOffset, findings, stetRanges);
        globalOffset += ln.length + 1;
        return `<li class="proof-line"><span class="line-num">${idx + 1}</span><span class="line-content">${html}</span></li>`;
      })
      .join("");

    proofOl.querySelectorAll("[data-finding-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        focusedFindingIdx = Number(el.getAttribute("data-finding-idx"));
        renderWorkbench();
      });
    });
  } else {
    proofOl.hidden = true;
    editArea.hidden = false;
    if (editArea.value !== currentText) {
      editArea.value = currentText;
    }
  }

  // Right-hand margin notes
  const notesEl = document.getElementById("notes-container");
  const hardSkips = (binaryAuditResult?.skipped || []).filter((s) => !String(s.file).endsWith("#prose"));
  if (findings.length === 0 && hardSkips.length > 0) {
    notesEl.innerHTML = hardSkips
      .map(
        (s) =>
          `<article class="note-card"><div class="note-head"><span class="sev-tag sev-error">uninspectable</span><span>${escapeHtml(
            s.file
          )}</span></div><p class="note-why">${escapeHtml(s.reason)}</p></article>`
      )
      .join("");
  } else if (findings.length === 0) {
    const softSkipNote =
      (binaryAuditResult?.skipped || []).length > 0
        ? `<div style="color:var(--ink-2);margin-top:6px;">[SKIP] ${escapeHtml(binaryAuditResult.skipped[0].reason)}</div>`
        : "";
    notesEl.innerHTML = `<div class="clean-sheet-msg">${
      currentLang === "zh"
        ? "✓ 清样无命中（0 findings）。受保护数字与专名已按保留号（stet）锁定。"
        : "✓ Clean proof sheet (0 findings). Protected facts remain locked under stet."
    }${softSkipNote}</div>`;
  } else {
    notesEl.innerHTML = findings
      .map((f, idx) => {
        const sevCls = `sev-${f.severity}`;
        const sevLabel = f.severity === "warning" ? "warn" : f.severity;
        const why = f.message?.[currentLang] || f.message?.en || "";
        const dt = f.deletionTest?.[currentLang] || f.deletionTest?.en || "";
        const ex = f.exemplar;
        const exHtml = ex
          ? `<div class="note-exemplar">
               <div><span class="ex-label">bad:</span> ${escapeHtml(ex.bad)}</div>
               ${ex.trap ? `<div><span class="ex-label">trap:</span> ${escapeHtml(ex.trap)}</div>` : ""}
               <div><span class="ex-label">good:</span> ${escapeHtml(ex.good)}</div>
             </div>`
          : "";
        return `<article class="note-card${idx === focusedFindingIdx ? " is-focused" : ""}" data-note-idx="${idx}">
          <div class="note-head">
            <span class="sev-tag ${sevCls}">${escapeHtml(sevLabel)} · ${escapeHtml(f.ruleId)}</span>
            <span>${escapeHtml(f.location)}</span>
          </div>
          <p class="note-why">${escapeHtml(why)}</p>
          ${dt ? `<p class="note-test"><strong>${currentLang === "zh" ? "删除测试：" : "Deletion test:"}</strong> ${escapeHtml(dt)}</p>` : ""}
          ${exHtml}
        </article>`;
      })
      .join("");

    notesEl.querySelectorAll("[data-note-idx]").forEach((card) => {
      card.addEventListener("click", () => {
        focusedFindingIdx = Number(card.getAttribute("data-note-idx"));
        renderWorkbench();
      });
    });
  }
}

function renderSpecimenRail() {
  const rail = document.getElementById("specimen-list");
  rail.querySelectorAll(".specimen-btn").forEach((b) => b.remove());
  const privacyNote = rail.querySelector(".privacy-note");

  SPECIMENS.forEach((sp) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `specimen-btn${!binaryAuditResult && activeSpecimen.id === sp.id ? " is-active" : ""}`;
    btn.innerHTML = `
      <span class="spec-num">${sp.num} / ${sp.filename}</span>
      <span class="spec-label">${escapeHtml(sp.label[currentLang] || sp.label.en)}</span>
      <span class="spec-pack">${sp.pack}</span>
    `;
    btn.addEventListener("click", () => {
      binaryAuditResult = null;
      activeSpecimen = sp;
      baselineText = sp.bad;
      currentText = sp.bad;
      currentFilename = sp.filename;
      currentModality = sp.modality;
      currentPackId = sp.pack;
      focusedFindingIdx = 0;
      document.getElementById("pack-select").value = currentPackId;
      renderSpecimenRail();
      renderWorkbench();
    });
    rail.insertBefore(btn, privacyNote);
  });
}

function renderDogfood() {
  const sample = DOGFOOD_SAMPLES[currentLang] || DOGFOOD_SAMPLES.en;
  const pack = resolveEffectivePack("business-brief", PACKS_BY_ID);
  const badRes = auditText(sample.bad, { filename: "pitch.md", modality: "markdown", pack });
  document.getElementById("dogfood-bad-text").textContent = sample.bad;
  document.getElementById("dogfood-good-text").textContent = sample.good;
  const ruleNames = badRes.findings.map((f) => f.ruleId).join(", ");
  document.getElementById("dogfood-bad-meta").textContent =
    currentLang === "zh"
      ? `实测命中 ${badRes.findings.length} 处：${ruleNames}`
      : `Live engine caught ${badRes.findings.length} findings: ${ruleNames}`;
}

function renderRulesTable() {
  const tbody = document.getElementById("rules-tbody");
  const rows = [];
  const order = ["core", "business-brief", "literary-essay", "deck-and-ui"];
  for (const pid of order) {
    if (activeRuleFilter !== "all" && activeRuleFilter !== pid) continue;
    const pack = PACKS_BY_ID[pid];
    if (!pack) continue;
    for (const r of pack.rules || []) {
      const sevCls = r.severity === "error" ? "sev-error" : "sev-warning";
      const why = r.message?.[currentLang] || r.message?.en || "";
      const dt = r.deletionTest?.[currentLang] || r.deletionTest?.en || "";
      const ex = r.exemplar;
      rows.push(`<tr>
        <td><code>${escapeHtml(r.id)}</code></td>
        <td><code>${escapeHtml(pid)}</code><br><span class="sev-tag ${sevCls}" style="font-family:var(--font-mono);font-size:0.74rem;">${escapeHtml(r.tier)} · ${escapeHtml(r.severity)}</span></td>
        <td><code>${escapeHtml((r.modalities || []).join(", "))}</code></td>
        <td><div>${escapeHtml(why)}</div><div style="color:var(--ink-2);font-size:0.8rem;margin-top:4px;"><strong>${currentLang === "zh" ? "删除测试：" : "Test:"}</strong> ${escapeHtml(dt)}</div></td>
        <td style="font-size:0.8rem;">${
          ex
            ? `<div><strong>bad:</strong> ${escapeHtml(ex.bad)}</div><div style="margin-top:4px;"><strong>good:</strong> ${escapeHtml(ex.good)}</div>`
            : "—"
        }</td>
      </tr>`);
    }
  }
  tbody.innerHTML = rows.join("");
}

function renderSnippet() {
  document.getElementById("snippet-code").textContent = SNIPPETS[activeSnippet] || SNIPPETS.cli;
}

function applyI18n() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  const dict = I18N[currentLang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.getElementById("lang-toggle").textContent = currentLang === "en" ? "中文" : "EN";
  renderSpecimenRail();
  renderWorkbench();
  renderDogfood();
  renderRulesTable();
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").textContent = theme === "dark" ? "Light" : "Dark";
}

// ---------- Wire Events ----------

function init() {
  // Respect OS dark preference initially unless stored
  const savedTheme = localStorage.getItem("dislop-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("dislop-theme", next);
    applyTheme(next);
  });

  document.getElementById("lang-toggle").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "zh" : "en";
    applyI18n();
  });

  document.getElementById("pack-select").addEventListener("change", async (e) => {
    currentPackId = e.target.value;
    if (lastUploadedFile && binaryAuditResult) {
      await handleUploadedFile(lastUploadedFile, false);
    } else {
      renderWorkbench();
    }
  });

  document.getElementById("mode-proof-btn").addEventListener("click", () => {
    viewMode = "proof";
    document.getElementById("mode-proof-btn").classList.add("is-active");
    document.getElementById("mode-proof-btn").setAttribute("aria-pressed", "true");
    document.getElementById("mode-edit-btn").classList.remove("is-active");
    document.getElementById("mode-edit-btn").setAttribute("aria-pressed", "false");
    renderWorkbench();
  });

  document.getElementById("mode-edit-btn").addEventListener("click", () => {
    viewMode = "edit";
    document.getElementById("mode-edit-btn").classList.add("is-active");
    document.getElementById("mode-edit-btn").setAttribute("aria-pressed", "true");
    document.getElementById("mode-proof-btn").classList.remove("is-active");
    document.getElementById("mode-proof-btn").setAttribute("aria-pressed", "false");
    renderWorkbench();
    document.getElementById("edit-textarea").focus();
  });

  document.getElementById("edit-textarea").addEventListener("input", (e) => {
    binaryAuditResult = null;
    currentText = e.target.value;
    renderWorkbench();
  });

  document.getElementById("btn-apply-good").addEventListener("click", () => {
    binaryAuditResult = null;
    currentText = activeSpecimen.good;
    focusedFindingIdx = 0;
    renderWorkbench();
  });

  document.getElementById("btn-apply-trap").addEventListener("click", () => {
    binaryAuditResult = null;
    currentText = activeSpecimen.trap;
    focusedFindingIdx = 0;
    renderWorkbench();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    binaryAuditResult = null;
    lastUploadedFile = null;
    currentFilename = activeSpecimen.filename;
    currentModality = activeSpecimen.modality;
    currentPackId = activeSpecimen.pack;
    document.getElementById("pack-select").value = currentPackId;
    baselineText = activeSpecimen.bad;
    currentText = activeSpecimen.bad;
    focusedFindingIdx = 0;
    renderSpecimenRail();
    renderWorkbench();
  });

  async function handleUploadedFile(file, autoSelectPack = true) {
    lastUploadedFile = file;
    const mod = detectModality(file.name) || "markdown";
    currentFilename = file.name;
    currentModality = mod;
    if (autoSelectPack && (mod === "pptx" || mod === "html" || mod === "css" || mod === "svg")) {
      currentPackId = "deck-and-ui";
      document.getElementById("pack-select").value = "deck-and-ui";
    }
    const pack = resolveEffectivePack(currentPackId, PACKS_BY_ID);

    if (mod === "docx" || mod === "pptx") {
      try {
        const buf = await file.arrayBuffer();
        const entries = await readBrowserZipXmlEntries(buf);
        const res = auditOoxmlEntries(entries, { filename: file.name, modality: mod, pack });
        binaryAuditResult = res;
        currentText = `[Local ${mod.toUpperCase()} inspected in browser RAM: ${file.name}]\nFindings: ${res.findings.length}`;
        viewMode = "proof";
      } catch (err) {
        binaryAuditResult = { findings: [], skipped: [{ file: file.name, reason: `Uninspectable ${mod.toUpperCase()}: ${err.message}` }] };
        currentText = `Could not unpack ${file.name}: ${err.message}`;
      }
    } else if (mod === "pdf") {
      const buf = await file.arrayBuffer();
      const latin1 = new TextDecoder("latin1").decode(new Uint8Array(buf));
      const res = auditPdfStructure(latin1, [], { filename: file.name, pack });
      binaryAuditResult = res;
      currentText = `[Local PDF metadata/URI structure inspected in browser RAM: ${file.name}]\nFindings: ${res.findings.length}`;
      viewMode = "proof";
    } else {
      binaryAuditResult = null;
      lastUploadedFile = null;
      const text = await file.text();
      baselineText = text;
      currentText = text;
    }
    renderSpecimenRail();
    renderWorkbench();
  }

  // Local file inspection (.md, .html, .docx, .pptx, .pdf)
  document.getElementById("file-picker").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadedFile(file, true);
  });

  // Rule table filters
  document.querySelectorAll("[data-pack-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeRuleFilter = btn.getAttribute("data-pack-filter");
      document.querySelectorAll("[data-pack-filter]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderRulesTable();
    });
  });

  // Snippet tabs
  document.querySelectorAll("[data-snippet]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSnippet = btn.getAttribute("data-snippet");
      document.querySelectorAll("[data-snippet]").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      renderSnippet();
    });
  });

  // Copy buttons
  document.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-copy-target");
      const text = document.getElementById(targetId)?.textContent || "";
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = I18N[currentLang]["btn.copied"];
      setTimeout(() => {
        btn.textContent = prev;
      }, 1200);
    });
  });

  document.getElementById("copy-snippet-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const text = document.getElementById("snippet-code")?.textContent || "";
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = I18N[currentLang]["btn.copied"];
    setTimeout(() => {
      btn.textContent = prev;
    }, 1200);
  });

  renderSnippet();
  applyI18n();
}

init();
