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
    "page.title": "dislop — Complete Multi-Modal De-Slop Toolkit (Writing, Docs, Decks, UI & Agents)",
    "nav.skip": "Skip to main content",
    "nav.workbench": "Workbench",
    "nav.coverage": "Coverage",
    "nav.system": "System",
    "nav.rules": "Rules (29)",
    "nav.surfaces": "Integrate",
    "nav.awesome": "Awesome (87)",
    "lead.index": "00 / multi-modal de-slop toolkit · any model, agent, or dev stack",
    "lead.titleStrong": "De-slop AI outputs.",
    "lead.sub":
      "Paste a draft, a deck, or a page. dislop strikes what can't ship, asks about what sounds canned, and checks that your edit kept numbers, links, and citations.",
    "lead.humanLabel": "Human:",
    "lead.humanAction": "Live Workbench ↓",
    "lead.coverageAction": "Coverage ↓",
    "lead.awesomeAction": "Awesome Anti-Slop (87) →",
    "lead.agentLabel": "Agent (Level 0):",
    "lead.runLabel": "START IN 10 SECONDS (NODE 20+, PYTHON 3.10+, MCP, OR AGENT FETCH)",
    "lead.zeroDeps": "No runtime deps · 29 rules · 101 fixture assertions · Awesome (87)",
    "p1.kicker": "01 / full-chain de-slop",
    "p1.title": "Two pencils, edit guard & Awesome Anti-Slop",
    "p1.desc":
      "29 deterministic rules across 4 packs, Stage-3 revision comparison, draft voice/taste protocols, and 87 curated resources in /awesome/.",
    "p2.kicker": "02 / multi-modal scope",
    "p2.title": "Prose, Office docs, slides, Web UI & PR diffs",
    "p2.desc":
      "Live today on .md/.txt, .html/.css/.jsx/.svg, .docx, .pptx, .pdf metadata, and git diffs; 5 rhythm/chrome probes verified in the v0.3 prototype.",
    "p3.kicker": "03 / any model or host",
    "p3.title": "Model-agnostic across agents, IDEs & CI",
    "p3.desc":
      "Works on Claude, GPT, Gemini, DeepSeek, Qwen, and local outputs. Attach via browser, /llms.txt, SKILL.md, CLI, stdio MCP, or GitHub Actions.",
    "p4.kicker": "04 / honest boundaries",
    "p4.title": "Deterministic parity, never silent rewrites",
    "p4.desc":
      "Node and Python share 101 fixtures and 12 conformance tests with no external deps; verify compares edits against the original and catches overcorrection.",
    "btn.copy": "Copy",
    "btn.copied": "Copied",
    "wb.heading": "01 / LIVE DE-SLOP WORKBENCH (ZERO UPLOAD · SHARED src/core.mjs)",
    "wb.packLabel": "Taste Pack:",
    "wb.openFile": "Inspect local file (.md/.html/.docx/.pptx/.pdf)",
    "wb.specimensTitle": "SPECIMENS",
    "wb.privacyNote":
      "Your draft stays in this tab. The page's CSP sets connect-src 'none', so it couldn't phone home if it tried.",
    "wb.modeProof": "Proof Sheet",
    "wb.modeEdit": "Edit & Recheck",
    "wb.applyClean": "Show a clean edit",
    "wb.tryTrap": "Try an overcorrection",
    "wb.reset": "Reset",
    "wb.voiceTitle": "LOCAL VOICE METER (RAM ONLY)",
    "legend.error": "Red, solid: can't ship (error)",
    "legend.warn": "Blue, dashed: worth a second look (query)",
    "legend.stet": "Green, dotted: span kept as written (stet)",
    "cov.index": "02 / UNIVERSAL COVERAGE MATRIX · MODALITIES, MODELS, AGENTS & ENVIRONMENTS",
    "cov.title": "Multi-modal de-slop coverage across formats, models, and dev stacks — with honest boundaries",
    "cov.desc":
      "Every row separates capabilities shipped and runnable today in v0.2.0 from probes and protocols under active prototype validation or v0.3+ specification.",
    "cov.readMd": "Read Overview (.md) →",
    "cov.colTarget": "Target Deliverable",
    "cov.colFormat": "Formats & Scope",
    "cov.colScope": "What dislop De-Slops",
    "cov.colStatus": "Status",
    "cov.r1Name": "Writing, Copy & Longform",
    "cov.r1Scope":
      "Throat-clearing openers, buzzwords, Chinese bureaucratic padding, 2nd-order negation pivots, staccato runs, 4-char triads, moralizing endings, em-dash density, CJK half-width punctuation, and Stage-3 verify fact locks.",
    "cov.r2Name": "Word, PowerPoint & PDF",
    "cov.r2Scope":
      "Unaccepted tracked changes/comments, raw Markdown leaks, slide word-walls (> 120 words / > 280 Han chars), bullet overload (> 6), autofit shrink (< 80%), off-slide frames, weak topic titles, PDF local URIs, raw filename titles, and unembedded fonts.",
    "cov.r3Name": "Web UI, Visual Layout & SVG",
    "cov.r3Scope":
      "Dead href=\"#\" controls, static WCAG AA contrast (< 4.5:1), dark Z-elevation inversions, purple-pink AI gradients, pill-badge soup (> 6), 3-level nested boxes, prompt-echo badges, and SVG text clipping/a11y.",
    "cov.r4Name": "Code Repos & Agent Handoffs",
    "cov.r4Scope":
      "Blocks leaked workstation paths, unfilled placeholders, chatbot residue, and UI/doc slop inside PR diffs; Radar also indexes 8 external code/PR governance tools. Deeper code-slop AST rules remain on the roadmap.",
    "cov.r4Status": "LIVE (HYGIENE & DIFF) · ROADMAP (AST)",
    "cov.r5Name": "Cadence, Layout Monotony & Voice",
    "cov.r5Scope":
      "5 text/UI probes verified in scripts/prototype_antipattern_lab.mjs (comma chains, sentence-length CV, discourse-marker clusters, glassmorphism, accent-stripe cards), PPTX layout monotony spec, offline voice bands, and decoupled local small-model plugins.",
    "cov.r5Status": "PROTOTYPE · SPEC v0.3+",
    "cov.c1Title": "Any AI Model",
    "cov.c1Desc":
      "Model-agnostic probes target shared post-training patterns across frontier and local models, plus second-order slogan traps triggered when stock words are banned.",
    "cov.c2Title": "Any Agent Host",
    "cov.c2Desc":
      "Connect via local stdio MCP for structured check/verify loops, drop in the raw SKILL.md workflow, or let any web-capable agent fetch /llms.txt and /tasks/*.md with zero setup.",
    "cov.c3Title": "Any Dev & Publishing Stack",
    "cov.c3Desc":
      "Runs identically in browser memory, Node.js 20+, Python 3.10+, Git diff hooks, and GitHub Actions with zero external runtime dependencies and offline execution.",
    "sys.title": "De-slop deterministically, verify every fact, then pull drafts away from model averages",
    "sys.desc":
      "Post-trained LLMs exhibit intra-model repetition and inter-model homogeneity on open-ended tasks (Jiang et al., NeurIPS 2025 Artificial Hivemind); banning stock words alone often leaves flat prose or second-order templates. dislop keeps its core zero-LLM and pairs shipped v0.2.0 guardrails with Stage-3 fact verification and draft positive-divergence protocols.",
    "sys.readMd": "Read Methodology (.md) →",
    "sys.negTitle": "A. Negative Defense (Deterministic De-Slop Guardrails)",
    "sys.negStatus": "SHIPPED v0.2.0 · v0.3 SPEC",
    "sys.neg1Title": "Core Invariants (packs/core, error)",
    "sys.neg1Desc":
      "Blocks objective delivery bugs across text and binary outputs: leaked workstation paths, unfilled placeholders, AI chat residue, and unaccepted Office revisions or raw Markdown. On UI and decks, flags dead href=\"#\" controls, WCAG AA contrast failures, dark Z-elevation inversions, and off-slide PPTX frames.",
    "sys.neg2Title": "Genre Taste Packs + Deletion Tests (warning/info)",
    "sys.neg2Desc":
      "22 contextual prose, deck, and UI rules across business-brief, literary-essay, and deck-and-ui. Masks code blocks, URLs, and blockquotes so domain nouns (Delve, wool tapestry) stay clean.",
    "sys.neg3Title": "Stage-3 Revision Guard (dislop verify)",
    "sys.neg3Desc":
      "Compares before and after text multisets to confirm numbers, qualifiers (up to / at least), units, dates, URLs, code spans, and citations survived, while rejecting second-order slogan displacement.",
    "sys.neg4Title": "Rhythm Probes & Optional Local Small Models",
    "sys.neg4Desc":
      "5 text/UI probes verified in scripts/prototype_antipattern_lab.mjs (comma-chain cadence, sentence-length CV monotony, discourse-marker clusters, glassmorphism overuse, accent-stripe stacks) plus pptx-layout-monotony in the v0.3 spec. Optional local ONNX/GGUF plugins (mmBERT / Qwen3) remain strictly decoupled from the zero-dep core.",
    "sys.posTitle": "B. Positive Pull (Controlled Divergence & Voice)",
    "sys.posStatus": "DRAFT PROTOCOLS · P0/P1",
    "sys.pos1Title": "Three-Band Entropy Partition",
    "sys.pos1Desc":
      "Keep factual spans and WCAG bounds at zero entropy; inject controlled variance only into mid-layer argument skeletons, perspectives, and cadence (Verbalized Sampling + S1–S4 skeletons); prune drift deterministically.",
    "sys.pos2Title": "Local Voice Profile (dislop.voice/1)",
    "sys.pos2Desc":
      "Replaces vague \"write like X\" prompts with offline stylometric bands computed from your own drafts (sentence-length CV, punctuation spectrum, private local bans in .dislop.local/voice.json).",
    "sys.pos3Title": "Positive Design Cards (dislop.taste/1)",
    "sys.pos3Desc":
      "Encodes abstract grid geometry, typography roles, color budgets, and static assertions from independent print, Swiss editorial, and type foundry traditions—never copying third-party DOM or CSS.",
    "dogfood.badTag": "RAW GENERATED DRAFT · FLAGGED BY DISLOP",
    "dogfood.goodTag": "SHIPPED REPOSITORY COPY · 0 FINDINGS",
    "dogfood.goodMeta": "Checked by business-brief + deck-and-ui · 0 errors, 0 warnings, 0 info",
    "rules.title": "29 deterministic de-slop rules across Core Invariants and 3 Genre Packs",
    "rules.desc":
      "Pre-rendered statically from packs/*/pack.json so both browsers and external agents read the same catalog. Every row provides a stable #rule-<id> SARIF anchor, a Deletion Test, and full bad / trap / good contrasts. All 23 text/HTML/CSS/SVG rules include one-click Workbench loading (Try ↑); binary Office and PDF rules run via local file upload or CLI.",
    "rules.readCases": "All Contrasts (.md) →",
    "rules.modAll": "All modalities",
    "rules.sevAll": "All severities",
    "rules.filterAll": "All Packs (29)",
    "rules.colId": "Rule ID & Action",
    "rules.colPack": "Pack / Tier",
    "rules.colMod": "Modalities",
    "rules.colWhy": "What It Catches & Deletion Test",
    "rules.colEx": "Bad → Trap → Good Exemplar",
    "surf.title": "Plug into any workflow: browser, /llms.txt, CLI, MCP, Skill, Hooks, or CI",
    "surf.desc":
      "Start zero-install by opening the workbench or pointing any web-capable agent at dislop.com/llms.txt, or wire the exact same zero-dependency core into Node/Python CLI, MCP, CI pull requests, and upcoming Skill/Hooks/SDK layers.",
    "surf.readTools": "Tools Guide (.md) →",
    "surf.colLevel": "Level & Surface",
    "surf.colStatus": "Status",
    "surf.colUse": "When to Use",
    "surf.colEntry": "Entry Point",
    "status.live": "LIVE",
    "status.liveV02": "LIVE v0.2.0",
    "status.draftLive": "DRAFT MD LIVE · PKG P0",
    "status.tplReady": "TEMPLATES READY · PKG P0",
    "status.coreOnly": "CORE EXPORTED · API P1",
    "surf.l0Desc":
      "Zero-install browser workbench for humans; static progressive-disclosure Markdown and JSON endpoints for external agents.",
    "surf.l1CliDesc":
      "Local file/directory/stdin audits, git diff gating (--changed / --staged), SARIF/GitHub annotations, and Stage-3 verify.",
    "surf.l1SkillDesc":
      "Cross-host workflow instructing agents to run check, edit only flagged spans, and verify before handoff.",
    "surf.l2McpDesc":
      "Attach to Claude Code, Codex, Cursor, or Windsurf for dislop_check, dislop_verify, dislop_explain, and dislop_packs.",
    "surf.l2CiDesc":
      "Gate PR diffs or git commits on CLI exit code 1 with SARIF output, or attach a PostToolUse hook after Write/Edit (use a wrapper mapping exit 1 to 2 for hard Claude Code blocking).",
    "surf.l3Desc":
      "Zero-I/O src/core.mjs is already exported; typed JS/Python SDK facades and optional Fetch-standard REST service are planned next.",
    "surf.epTitle": "STATIC AGENT-NATIVE ENDPOINTS (PRE-BUILT, ZERO FIXTURES LEAKED, SANITIZED)",
    "ep.llms": "L0 routing index (llmstxt.org) for external agents",
    "ep.catalog": "L0 versioned machine catalog (dislop.catalog/1)",
    "ep.taskBiz": "L1 bundle: business brief & tech proposal",
    "ep.taskWeb": "L1 bundle: Web UI, SVG & slide decks",
    "ep.taskEdit": "L1 bundle: editorial & literary essays",
    "ep.taskGate": "L1 bundle: core error gate & verify CI",
    "ep.skill": "L2 canonical SKILL.md workflow (check -> edit -> verify)",
    "ep.awesome": "L1 raw JSON of 87 Awesome Anti-Slop entries",
    "ep.method": "L1 methodology pillar (Deletion Test, Brand Voice & Positive Pull)",
    "ep.full": "L2 single-fetch curated bundle (zero test fixtures)",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "awesome.index": "06 / awesome anti-slop (87) & brand specimen",
    "awesome.title": "Awesome Anti-Slop: 87 curated resources and 31 non-mainstream design references",
    "awesome.desc":
      "A standalone, bookmarkable directory for humans and agents—compiled offline from verified JSON snapshots checked on 2026-11-21. Built as a shared hub alongside dislop's own engine.",
    "awesome.openFull": "Open Awesome Anti-Slop (87) →",
    "awesome.ecoTitle": "Awesome Anti-Slop (87 Curated Entries)",
    "awesome.ecoDesc":
      "Neutral cross-modality directory spanning standards, English and Chinese writing tools, deterministic linters, UI/diagram rules, code/PR governance, and an isolated contrast-watch section for evasion tools.",
    "awesome.topologyNote":
      "Maintained inside dislop-ai/dislop (awesome/README.md) and served canonically at dislop.com/awesome/ so bookmarks, sharing, and workbench use stay together; structured for a standalone CC0-1.0 spin-out only if external PR volume justifies it.",
    "awesome.browseBtn": "Browse & Filter 87 Entries →",
    "awesome.posTitle": "Non-Mainstream Design & Anti-Convergence Sources",
    "awesome.posDesc":
      "Selected from verified-positive-sources.json to study grid proportions, typographic roles, and paper-ink contrast outside SaaS templates (abstract principles only, never copying source code):",
    "ds.tokensHeading": "LIVE GALLEY TOKENS (WCAG AA VERIFIED · MONOTONIC DARK L* 4.6 → 8.1 → 12.6)",
    "ds.typeHeading": "TYPOGRAPHIC ROLES (ZERO EXTERNAL FONT CDN)",
    "footer.audit": "Self-audit: dislop check site/ --fail-on info → 0 findings (Node & Python)",
  },
  zh: {
    "page.title": "dislop — 全场景多模态去 AI 味工具箱（写作、文档、PPT、前端 UI 与 Agent）",
    "nav.skip": "跳至正文",
    "nav.workbench": "去味工作台",
    "nav.coverage": "全场景覆盖",
    "nav.system": "核心体系",
    "nav.rules": "规则目录 (29)",
    "nav.surfaces": "接入方式",
    "nav.awesome": "Awesome (87)",
    "lead.index": "00 / 多模态去 AI 味工具箱 · 适配任意模型、Agent 与开发环境",
    "lead.titleStrong": "全面去 AI 味。",
    "lead.sub":
      "把稿子、PPT 或页面贴进来。不能发的硬伤，dislop 直接划掉；听着像套话的地方，它问你一句；改完再替你和原稿对一遍，数字、链接和引用一个不少。",
    "lead.humanLabel": "人类入口：",
    "lead.humanAction": "在线去味工作台 ↓",
    "lead.coverageAction": "全场景覆盖 ↓",
    "lead.awesomeAction": "Awesome Anti-Slop (87) →",
    "lead.agentLabel": "Agent 直读（Level 0）：",
    "lead.runLabel": "10 秒接入（NODE 20+、PYTHON 3.10+、MCP 或 AGENT 直读）",
    "lead.zeroDeps": "无运行时依赖 · 29 条规则 · 101 项断言 · Awesome (87)",
    "p1.kicker": "01 / 红蓝两笔 + 精选清单",
    "p1.title": "确定性批注、改稿核对与 Awesome Anti-Slop",
    "p1.desc":
      "4 套规则包 29 条规则、改后逐项核对、正向声纹协议草案，外加可独立收藏与转发的 87 条精选目录（/awesome/）。",
    "p2.kicker": "02 / 跨媒介交付覆盖",
    "p2.title": "写作、文档、PPT、PDF、前端 UI 与 PR 增量",
    "p2.desc":
      "现已覆盖 .md/.txt、.html/.css/.jsx/.svg、.docx、.pptx、.pdf 元数据与 Git 增量；5 条节奏/界面新探针已完成 v0.3 原型验证。",
    "p3.kicker": "03 / 不挑模型与宿主",
    "p3.title": "兼容主流模型、Agent、编辑器与 CI",
    "p3.desc":
      "Claude、GPT、Gemini、DeepSeek、Qwen 与本地模型产物通用；支持浏览器、/llms.txt、SKILL.md、CLI、MCP 与 GitHub Actions。",
    "p4.kicker": "04 / 诚实边界与双端一致",
    "p4.title": "双端确定性一致，绝不替人偷偷改稿",
    "p4.desc":
      "Node 与 Python 无外部依赖双端一致（101 项样本断言 + 12 项契约测试）；verify 对照原稿拦截删改数字与二阶口号过矫。",
    "btn.copy": "复制",
    "btn.copied": "已复制",
    "wb.heading": "01 / 在线去 AI 味工作台（就在这个标签页里跑 · 共用 src/core.mjs）",
    "wb.packLabel": "审美包：",
    "wb.openFile": "打开本地文件 (.md/.html/.docx/.pptx/.pdf)",
    "wb.specimensTitle": "校样标本",
    "wb.privacyNote":
      "稿子只留在这个标签页里。页面的 CSP 把 connect-src 设成了 'none'，想往外发也发不出去。",
    "wb.modeProof": "清样批注视图",
    "wb.modeEdit": "编辑并复检",
    "wb.applyClean": "看一版改好的",
    "wb.tryTrap": "试一版改过头的",
    "wb.reset": "重置原稿",
    "wb.voiceTitle": "本地声纹统计（纯内存计算）",
    "legend.error": "红实线：硬伤，不能发（error）",
    "legend.warn": "蓝虚线：商榷，你说了算（query）",
    "legend.stet": "绿点线：受保护片段，原样保留（stet）",
    "cov.index": "02 / 全覆盖矩阵 · 目标产物、AI 模型、Agent 与开发环境",
    "cov.title": "覆盖全场景产物、全模型与主流开发环境，并明示已实装与演进边界",
    "cov.desc": "下表逐项区分 v0.2.0 现已实装可立即运行的能力，以及处于原型验证或 v0.3+ 规格演进中的探针与协议。",
    "cov.readMd": "阅读能力总览 (.md) →",
    "cov.colTarget": "目标产物与场景",
    "cov.colFormat": "支持格式与范围",
    "cov.colScope": "确定性去 AI 味覆盖项",
    "cov.colStatus": "当前状态",
    "cov.r1Name": "写作、文案与深度长文",
    "cov.r1Scope":
      "铺垫开场白、英文公关词、中文汇报套话、二阶“不是 A，而是 B”口号、三连超短句、四字排比串、段尾说教升华、破折号过密、中文半角标点混排，以及 verify 事实锁定。",
    "cov.r2Name": "Word、PowerPoint 与 PDF",
    "cov.r2Scope":
      "未接受修订与批注、裸 Markdown 星号残留、单页字数墙（>120 词 / >280 汉字）、项目符号超限（>6）、自动缩排（<80%）、越界文本框、空泛名词标题、PDF 本机链接/原始文件名标题/未嵌入字体。",
    "cov.r3Name": "前端 UI、视觉版式与 SVG",
    "cov.r3Scope":
      "空跳转链接 href=\"#\"、静态 WCAG AA 对比度（<4.5:1）、深色 Z 轴亮度倒置、默认紫粉渐变、胶囊徽章堆砌（>6）、三层套盒、提示词回声标签，以及 SVG 文字越界与无障碍缺失。",
    "cov.r4Name": "代码仓与 Agent 交付物",
    "cov.r4Scope":
      "在 PR 增量（--changed / --staged）与 SARIF 门禁中拦截本机路径泄露、未填占位符、AI 寒暄残迹与 UI/文档瑕疵；生态雷达另收录 8 个代码与 PR 治理工具。深度代码 AST 探针列在后续路线图。",
    "cov.r4Status": "已上线（卫生与增量门禁）· 规划中（代码 AST）",
    "cov.r5Name": "节奏趋同、版式雷同与个人声纹",
    "cov.r5Scope":
      "原型脚本 prototype_antipattern_lab.mjs 已验证 5 条文本/UI 探针（连续逗号链、句长 CV 节拍器、过渡路标簇、毛玻璃滥用、侧边粗彩条），另有 v0.3 PPTX 版式趋同规格、离线声纹画像与严格解耦的端侧小模型插件。",
    "cov.r5Status": "原型已验 · v0.3+ 规格",
    "cov.c1Title": "适配任意 AI 模型",
    "cov.c1Desc":
      "不依赖特定模型厂商，针对前沿闭源与开源本地模型共有的后训练套话、模板结构与禁用词后的二阶改写陷阱做确定性检查。",
    "cov.c2Title": "适配任意 Agent 宿主",
    "cov.c2Desc":
      "既可通过本地 stdio MCP 接入自动检查与复检，也可直接加载静态 SKILL.md 剧本，或让任意联网 Agent 零安装按需拉取 /llms.txt 与任务文档。",
    "cov.c3Title": "适配任意开发与发稿环境",
    "cov.c3Desc":
      "在浏览器内存、Node.js 20+、Python 3.10+、Git 钩子与 GitHub Actions 中保持完全一致的零依赖离线行为。",
    "sys.title": "确定性清掉 AI 味并锁住事实，再把产物拉离模型均值",
    "sys.desc":
      "对齐后的大模型在开放任务上会出现单模型重复与跨模型趋同（Jiang 等人，NeurIPS 2025 Artificial Hivemind）；仅删高频套词往往滑向平庸均值或二阶模板。dislop 保持核心零 LLM，将 v0.2.0 确定性门禁、阶段 3 事实复检与正向差异化协议草案配合推进。",
    "sys.readMd": "阅读方法论 (.md) →",
    "sys.negTitle": "A. 负向防线（确定性去 AI 味规则与事实守卫）",
    "sys.negStatus": "已发布 v0.2.0 · v0.3 规格",
    "sys.neg1Title": "基础发布底线（packs/core，error）",
    "sys.neg1Desc":
      "阻断客观交付事故：本机路径泄露、未填占位符、AI 寒暄残迹、Office 修订与裸 Markdown、空链接 href=\"#\"、WCAG AA 对比度不达标、深色 Z 轴亮度倒置及 PPT 文本框越界。",
    "sys.neg2Title": "文体审美包与删除测试（warning / info）",
    "sys.neg2Desc":
      "覆盖 business-brief、literary-essay、deck-and-ui 共 22 条语境规则。自动遮蔽代码块、URL 与引用块，放行 Delve 调试器与正常专名。",
    "sys.neg3Title": "阶段 3 事实复检（dislop verify）",
    "sys.neg3Desc":
      "逐项比对改前与改后的数字、限定词（最多/至少/up to）、单位、日期、链接、代码与引用标记，同时拦截二阶口号漂移。",
    "sys.neg4Title": "节奏探针与可选端侧小模型",
    "sys.neg4Desc":
      "原型 scripts/prototype_antipattern_lab.mjs 已验证 5 条文本/UI 探针（连续逗号链、句长 CV 节拍器、机械过渡路标簇、毛玻璃滥用、侧边粗彩条卡片），外加 v0.3 Spec 中的 pptx-layout-monotony。未来可选本地 ONNX/GGUF 插件（mmBERT / Qwen3）与零依赖核心严格解耦。",
    "sys.posTitle": "B. 正向牵引（可控差异化与个人声纹）",
    "sys.posStatus": "协议草案 · P0/P1 规划",
    "sys.pos1Title": "三带可控熵边界",
    "sys.pos1Desc":
      "事实锚点与 WCAG 底线保持零熵锁死；仅在中层骨架、视角与句式节奏注入受控差异（Verbalized Sampling 与 S1–S4 骨架）；最后用确定性规则剪除漂移候选。",
    "sys.pos2Title": "本地离线声纹画像（dislop.voice/1）",
    "sys.pos2Desc":
      "用个人历史原稿的确定性统计区间（句长 CV、标点频谱、.dislop.local/voice.json 本地私有禁忌）替代空泛的“模仿某作家”形容词提示。",
    "sys.pos3Title": "正向设计参考卡（dislop.taste/1）",
    "sys.pos3Desc":
      "从独立印刷、瑞士编排与字厂样本中抽离抽象网格、字阶分工、色域预算与静态断言，绝不复制第三方站点的 DOM 或 CSS 源码。",
    "dogfood.badTag": "原始生成初稿 · 命中多项规则",
    "dogfood.goodTag": "仓库实发定稿 · 0 命中",
    "dogfood.goodMeta": "经 business-brief 与 deck-and-ui 检查 · 0 错误，0 警告，0 提示",
    "rules.title": "覆盖基础底线与三大文体包的 29 条确定性去 AI 味规则",
    "rules.desc":
      "由 packs/*/pack.json 构建期静态预渲染，浏览器与外部 Agent 读到同一份目录。每行带稳定 #rule-<id> SARIF 锚点、删除测试与完整 bad / trap / good 对照；23 条文本、HTML、CSS 与 SVG 规则支持一键载入工作台试跑（试跑 ↑），二进制 Office/PDF 规则通过本地文件上传或 CLI 运行。",
    "rules.readCases": "查看完整对照 (.md) →",
    "rules.modAll": "全部模态",
    "rules.sevAll": "全部级别",
    "rules.filterAll": "全部规则 (29)",
    "rules.colId": "规则 ID 与试跑",
    "rules.colPack": "所属包 / 层级",
    "rules.colMod": "适用模态",
    "rules.colWhy": "检出问题与删除测试",
    "rules.colEx": "三态对照（Bad → Trap → Good）",
    "surf.title": "按需选择最顺手的接入形态：浏览器、/llms.txt、CLI、MCP、Skill 或 CI",
    "surf.desc":
      "零安装起步可直接打开工作台或让联网 Agent 读取 dislop.com/llms.txt；需要自动化门禁时，将同一零依赖内核接入 Node/Python CLI、MCP、CI 与后续 Skill/Hooks/SDK。",
    "surf.readTools": "工具与接入文档 (.md) →",
    "surf.colLevel": "层级与形态",
    "surf.colStatus": "当前状态",
    "surf.colUse": "适用场景",
    "surf.colEntry": "直接入口",
    "status.live": "已上线",
    "status.liveV02": "已发布 v0.2.0",
    "status.draftLive": "静态草稿已上线 · 发包 P0",
    "status.tplReady": "配置模板就绪 · 封装 P0",
    "status.coreOnly": "内核已导出 · 门面与 API P1",
    "surf.l0Desc": "人类零上传在线去味工作台；外部 Agent 通过低 Token 渐进式静态 Markdown 与 JSON 端点自助读取。",
    "surf.l1CliDesc": "本地文件、目录与 stdin 检查，支持 Git 增量行门禁（--changed / --staged）、SARIF/GitHub 注解与 verify 复检。",
    "surf.l1SkillDesc": "跨宿主 SKILL.md 剧本，编排 Agent 按「先查 -> 局部改稿 -> verify 复检」三步交付。",
    "surf.l2McpDesc": "接入 Claude Code、Codex、Cursor 或 Windsurf，提供 dislop_check、dislop_verify、dislop_explain 与 dislop_packs。",
    "surf.l2CiDesc": "在 PR 或 Git 提交中直接以退出码 1 与 SARIF 阻断；Claude Code PostToolUse 钩子在写入后触发，硬阻断需将退出码 1 映射为 2。",
    "surf.l3Desc": "零 I/O 的 src/core.mjs 已作为包导出；强类型 JS/Python SDK 门面与可选无状态 HTTP API 列入下一阶段。",
    "surf.epTitle": "静态 Agent 原生端点（构建期预生成，已剔除负例 fixtures 与隐藏字符）",
    "ep.llms": "L0 路由总索引（llmstxt.org 规范），供外部 Agent 低 Token 发现",
    "ep.catalog": "L0 版本化机读目录（dislop.catalog/1），含字节数与 SHA-256",
    "ep.taskBiz": "L1 场景组合包：商业简报与技术方案审校",
    "ep.taskWeb": "L1 场景组合包：前端 UI、SVG 与演示文稿",
    "ep.taskEdit": "L1 场景组合包：非虚构散文与深度长文",
    "ep.taskGate": "L1 场景组合包：发布前客观底线门禁与 CI",
    "ep.skill": "L2 仓内标准 SKILL.md 工作流（先查 -> 局部改稿 -> verify 复检）",
    "ep.awesome": "L1 Awesome Anti-Slop 87 条精选清单原始 JSON 数据",
    "ep.method": "L1 方法论导航（删除测试、品牌声纹基准与正向差异化）",
    "ep.full": "L2 单次抓取精选合集（剔除负例 fixtures）",
    "theme.dark": "深色",
    "theme.light": "浅色",
    "awesome.index": "06 / awesome anti-slop (87) 与品牌视觉标本",
    "awesome.title": "Awesome Anti-Slop：87 条去 AI 味精选资源与 31 条非主流设计参考",
    "awesome.desc":
      "适合收藏、转发，也支持外部 Agent 直读的跨媒介目录（2026-11-21 实测核验）；作为独立可传播子模块与 dislop 主引擎并行演进。",
    "awesome.openFull": "进入 Awesome Anti-Slop (87) →",
    "awesome.ecoTitle": "去 AI 味精选清单 · Awesome Anti-Slop (87)",
    "awesome.ecoDesc":
      "中立跨媒介目录，涵盖规范研究、中英文写作工具、确定性 Linter、前端与图表规则、代码 PR 治理，并将规避检测类工具单独隔离在对照观察区。",
    "awesome.topologyNote":
      "当前随 dislop-ai/dislop 主仓同源维护（awesome/README.md）并在 dislop.com/awesome/ 规范发布，集中收藏、转发与工作台转化；数据结构已预留 dislop.radar/3 契约，仅在外部投稿进入高频阶段时再无损切出独立 CC0-1.0 仓库。",
    "awesome.browseBtn": "检索与筛选全部 87 条资源 →",
    "awesome.posTitle": "非主流高品位设计与印刷参考源",
    "awesome.posDesc":
      "精选自 verified-positive-sources.json，用于研习 SaaS 模板之外的网格比例、字体分工与纸墨对比（只抽抽象原则，不抄具体源码）：",
    "ds.tokensHeading": "实时清样令牌（全部通过 WCAG AA · 深色明度 L* 4.6 → 8.1 → 12.6）",
    "ds.typeHeading": "三级字体分工（零外部字体 CDN 请求）",
    "footer.audit": "自检门禁：dislop check site/ --fail-on info → 0 findings（Node 与 Python 双端）",
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
      '<div class="bg-gradient-to-r from-indigo via-purple to-pink bg-clip-text text-transparent p-6">',
      '  <span class="badge">AI-Powered · Zero Hallucination</span>',
      "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
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
    trap: ["这不是普通展览，而是 14 周的文化盛宴。"].join("\n"),
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
}`,
  agent: `# Level 0 Website-as-an-Agent-Service (zero installation)
# 1. Fetch routing index (~500 tokens)
curl -fsSL https://dislop.com/llms.txt

# 2. Fetch machine-readable catalog (dislop.catalog/1)
curl -fsSL https://dislop.com/catalog.json

# 3. Fetch only the task bundle needed (~1,000 tokens)
curl -fsSL https://dislop.com/tasks/business-doc.md
curl -fsSL https://dislop.com/tasks/web-and-deck.md

# 4. Fetch a single atomic rule card (~250 tokens) or raw skill workflow
curl -fsSL https://dislop.com/rules/negation-pivot-frame.md
curl -fsSL https://dislop.com/tools/skill.md`,
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
    good: "dislop de-slops Markdown, HTML/CSS/JSX/SVG, DOCX, PPTX, and PDF outputs across any model or dev environment. It flags stock phrasing, leaked paths, unfilled placeholders, and overloaded slides deterministically, then verifies edits kept numbers, links, and citations intact.",
  },
  zh: {
    bad: "好的，以下是为您撰写的介绍：值得注意的是，dislop 不仅仅是一款检查工具，更是高质量交付的底气。它以确定性规则为重要抓手，全面赋能内容团队实现精准高效、安全可靠、灵活易用的审校闭环。",
    good: "dislop 覆盖写作、Markdown、HTML/CSS/JSX/SVG、DOCX、PPTX 与 PDF，适配任意模型与开发环境；确定性标出高频套话、本机路径泄露、未填占位符与超载幻灯片，改后复检确认数字、单位、链接与引用原样保留。",
  },
};

// ---------- Safe Storage & State ----------

function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore restricted/private-mode storage errors
  }
}

let currentLang = safeGetStorage("dislop-lang") === "zh" ? "zh" : "en";
let currentTheme = "light";
let activeSpecimen = SPECIMENS[0];
let customRuleTitle = null;
let baselineText = activeSpecimen.bad;
let currentText = activeSpecimen.bad;
let currentFilename = activeSpecimen.filename;
let currentModality = activeSpecimen.modality;
let currentPackId = activeSpecimen.pack;
let viewMode = "proof";
let focusedFindingIdx = 0;
let binaryAuditResult = null;
let lastUploadedFile = null;
let uploadedOriginalText = null;
let uploadSeq = 0;
let activeRuleFilter = "all";
let activeModalityFilter = "all";
let activeSeverityFilter = "all";
let activeRuleSearch = "";
let highlightedRuleId = null;
let activeSnippet = "cli";
const copyTimers = new WeakMap();

// ---------- Browser-Native ZIP Reader (`DecompressionStream`) ----------

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

// ---------- Deterministic Local Stylometrics (dislop.voice/1 preview) ----------

function computeStylometrics(text, modality) {
  if (!text || modality === "html" || modality === "css" || modality === "svg") {
    return null;
  }
  const stripped = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]+`/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const rawSents = stripped
    .split(/(?<=[。！？])|(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  if (rawSents.length === 0) return null;

  const lengths = rawSents.map((s) => {
    const han = (s.match(/[\u4E00-\u9FFF]/g) || []).length;
    const latin = (s.match(/[A-Za-z0-9]+/g) || []).length;
    return han + latin;
  }).filter((n) => n > 0);

  if (lengths.length === 0) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const emDashes = (stripped.match(/——|—/g) || []).length;
  const maxCommas = Math.max(...rawSents.map((s) => (s.replace(/\d,\d/g, "").match(/[,，]/g) || []).length));

  return {
    sentences: lengths.length,
    meanLen: mean.toFixed(1),
    cv: lengths.length >= 2 ? cv.toFixed(2) : "n/a",
    emDashes,
    maxCommas,
  };
}

// ---------- Rendering Helpers ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizePublicExemplar(str) {
  if (!str) return "";
  return String(str)
    .replace(/file:\/\/\/Users\/[A-Za-z0-9._-]+\//g, "file:///Users/example/")
    .replace(/(?<![A-Za-z0-9_])\/Users\/(?!example\/)[A-Za-z0-9._-]+\//g, "/Users/example/");
}

function formatRuleProseHtml(str) {
  return escapeHtml(str || "")
    .replace(/'(AI-Powered|Zero Hallucination|Overview|Background|studies show)'/g, "<code>$1</code>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function setViewMode(mode) {
  viewMode = binaryAuditResult ? "proof" : mode;
  const proofBtn = document.getElementById("mode-proof-btn");
  const editBtn = document.getElementById("mode-edit-btn");
  const isProof = viewMode === "proof";
  proofBtn.classList.toggle("is-active", isProof);
  proofBtn.setAttribute("aria-pressed", String(isProof));
  editBtn.classList.toggle("is-active", !isProof);
  editBtn.setAttribute("aria-pressed", String(!isProof));
  editBtn.disabled = Boolean(binaryAuditResult);
  editBtn.title = binaryAuditResult
    ? currentLang === "zh"
      ? "二进制文档（DOCX/PPTX/PDF）与不可检文件为只读体检模式，请修改原文件后重新上传"
      : "Binary documents (DOCX/PPTX/PDF) and uninspectable files are read-only; edit the source file and re-upload"
    : "";
}

function collectStetRanges(text, findingSpans) {
  const ranges = [];
  const numRe =
    /(?<![A-Za-z0-9_/-])(?:(?:\b(?:up to|at least|under|over|above|below)\s+|(?:最多|至少|不超过|低于|高于)\s*))?(?:[$¥€£]\s*)?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|(?:ms|s|sec|seconds?|min|minutes?|hours?|weeks?|rows?|nodes?|decks?)(?![A-Za-z])|秒|分钟|小时|周|行|枚|张|所))?/giu;
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
    const interactiveAttrs =
      tok.findingIdx >= 0
        ? ` data-finding-idx="${tok.findingIdx}" role="button" tabindex="0"`
        : "";
    html += `<span class="${tok.cls}${focusCls}" title="${escapeHtml(tok.title)}"${interactiveAttrs}>${escapeHtml(
      lineText.slice(tok.start, tok.end)
    )}</span>`;
    cursor = tok.end;
  }
  if (cursor < lineText.length) {
    html += escapeHtml(lineText.slice(cursor));
  }
  return html || " ";
}

function syncQuickActionState() {
  const goodBtn = document.getElementById("btn-apply-good");
  const trapBtn = document.getElementById("btn-apply-trap");
  const hasGood = !lastUploadedFile && !binaryAuditResult && typeof activeSpecimen?.good === "string";
  const hasTrap = !lastUploadedFile && !binaryAuditResult && typeof activeSpecimen?.trap === "string";
  goodBtn.disabled = !hasGood;
  trapBtn.disabled = !hasTrap;
  goodBtn.title = hasGood
    ? ""
    : currentLang === "zh"
      ? "仅内置校样标本支持一键载入合规改写；请直接在编辑视图修改当前文稿"
      : "Available for built-in specimens with a fact-preserving revision; edit your draft directly in Edit & Recheck";
  trapBtn.title = hasTrap
    ? ""
    : currentLang === "zh"
      ? "仅提供已验证会被 verify 拒绝的二阶陷阱对照；请直接在编辑视图测试改稿"
      : "Enabled only when a verified-rejected second-order trap exists; test edits directly in Edit & Recheck";
}

function renderWorkbench() {
  setViewMode(viewMode);
  syncQuickActionState();
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

  // Summary strip (natural plurals + honest numeric-span count before verify runs)
  const errCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.length - errCount;
  const facts = binaryAuditResult ? { numbers: [] } : extractProtectedFacts(currentText);
  const summaryEl = document.getElementById("wb-summary");
  const errWord = errCount === 1 ? "error" : "errors";
  const warnWord = warnCount === 1 ? "query" : "queries";
  const spanWord = facts.numbers.length === 1 ? "numeric span" : "numeric spans";
  summaryEl.innerHTML =
    currentLang === "zh"
      ? `<span>${errCount} 处硬伤 · ${warnCount} 处商榷 · ${facts.numbers.length} 处数值片段</span><span>${elapsedMs} ms</span>`
      : `<span>${errCount} ${errWord} · ${warnCount} ${warnWord} · ${facts.numbers.length} ${spanWord}</span><span>${elapsedMs} ms</span>`;

  // Voice meter
  const vmEl = document.getElementById("voice-meter-values");
  const stats = binaryAuditResult ? null : computeStylometrics(currentText, currentModality);
  if (stats) {
    vmEl.textContent =
      currentLang === "zh"
        ? `句数: ${stats.sentences} · 均长: ${stats.meanLen} 单元 · 句长 CV: ${stats.cv} · 破折号: ${stats.emDashes} · 单句最多逗号: ${stats.maxCommas}`
        : `sentences: ${stats.sentences} · mean len: ${stats.meanLen} units · length CV: ${stats.cv} · em-dashes: ${stats.emDashes} · max commas/sent: ${stats.maxCommas}`;
  } else {
    vmEl.textContent =
      currentLang === "zh"
        ? `当前模态 (${currentModality}) 仅执行结构与视觉确定性探针`
        : `modality (${currentModality}): running structural & UI deterministic probes`;
  }

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
      const activate = () => {
        focusedFindingIdx = Number(el.getAttribute("data-finding-idx"));
        renderWorkbench();
      };
      el.addEventListener("click", activate);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
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
        ? (binaryAuditResult.skipped || [])
            .map((s) => `<div style="color:var(--ink-2);margin-top:6px;">[SKIP] ${escapeHtml(s.reason)}</div>`)
            .join("")
        : "";
    const isBlankDraft = !binaryAuditResult && currentText.trim().length === 0;
    const isNearMissSpecimen = !binaryAuditResult && !lastUploadedFile && activeSpecimen?.id === "clean-nearmiss" && currentText === baselineText;
    const cleanText = isBlankDraft
      ? currentLang === "zh"
        ? "校样单还是空的。贴一段稿子进来，或者从左边挑一份标本。"
        : "Nothing on the sheet yet. Paste a draft, or pick a specimen on the left."
      : isNearMissSpecimen
        ? currentLang === "zh"
          ? "可以付印。这里的 Delve 是调试器、wool tapestry 是真挂毯、数字修正也是真事实，全部原样留着；可点「试一版改过头的」看拦截对比。"
          : "Pass for press. Delve is the debugger here, wool tapestry is literal, and numeric corrections stay untouched. Click 'Try an overcorrection' to compare."
        : currentLang === "zh"
          ? "可以付印。用这组规则查过了，没有批注。"
          : "Pass for press. No marks from this rule pack.";
    notesEl.innerHTML = `<div class="clean-sheet-msg">${cleanText}${softSkipNote}</div>`;
  } else {
    const extraSkipCards = (binaryAuditResult?.skipped || [])
      .map(
        (s) =>
          `<article class="note-card"><div class="note-head"><span class="sev-tag sev-warning">coverage-skip</span><span>${escapeHtml(
            s.file
          )}</span></div><p class="note-why">${escapeHtml(s.reason)}</p></article>`
      )
      .join("");
    notesEl.innerHTML =
      findings
        .map((f, idx) => {
          const sevCls = `sev-${f.severity}`;
          const sevLabel = f.severity === "warning" ? "warn" : f.severity;
          const why = f.message?.[currentLang] || f.message?.en || "";
          const dt = f.deletionTest?.[currentLang] || f.deletionTest?.en || "";
          const ex = f.exemplar;
          const exHtml = ex
            ? `<div class="note-exemplar">
                 <div><span class="ex-label">bad:</span> ${escapeHtml(sanitizePublicExemplar(ex.bad))}</div>
                 ${ex.trap ? `<div><span class="ex-label">trap:</span> ${escapeHtml(sanitizePublicExemplar(ex.trap))}</div>` : ""}
                 <div><span class="ex-label">good:</span> ${escapeHtml(sanitizePublicExemplar(ex.good))}</div>
               </div>`
            : "";
          return `<article class="note-card${idx === focusedFindingIdx ? " is-focused" : ""}" data-note-idx="${idx}" tabindex="0">
            <div class="note-head">
              <span class="sev-tag ${sevCls}">${escapeHtml(sevLabel)} · ${escapeHtml(f.ruleId)}</span>
              <span>${escapeHtml(f.location)}</span>
            </div>
            <p class="note-why">${escapeHtml(why)}</p>
            ${dt ? `<p class="note-test"><strong>${currentLang === "zh" ? "删除测试：" : "Deletion test:"}</strong> ${escapeHtml(dt)}</p>` : ""}
            ${exHtml}
          </article>`;
        })
        .join("") + extraSkipCards;

    notesEl.querySelectorAll("[data-note-idx]").forEach((card) => {
      const activate = () => {
        focusedFindingIdx = Number(card.getAttribute("data-note-idx"));
        renderWorkbench();
      };
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }
}

function updateSpecimenRailSelection() {
  document.querySelectorAll(".specimen-btn").forEach((btn) => {
    const isSelected = !binaryAuditResult && !lastUploadedFile && !customRuleTitle && activeSpecimen.id === btn.dataset.specimenId;
    btn.classList.toggle("is-active", isSelected);
    btn.setAttribute("aria-pressed", String(isSelected));
  });
}

function renderSpecimenRail() {
  const rail = document.getElementById("specimen-list");
  const existing = rail.querySelectorAll(".specimen-btn");
  if (existing.length === SPECIMENS.length) {
    existing.forEach((btn, i) => {
      const sp = SPECIMENS[i];
      const labelEl = btn.querySelector(".spec-label");
      if (labelEl) labelEl.textContent = sp.label[currentLang] || sp.label.en;
    });
    updateSpecimenRailSelection();
    return;
  }

  existing.forEach((b) => b.remove());
  const privacyNote = rail.querySelector(".privacy-note");

  SPECIMENS.forEach((sp) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.specimenId = sp.id;
    btn.className = "specimen-btn";
    btn.innerHTML = `
      <span class="spec-num">${sp.num} / ${sp.filename}</span>
      <span class="spec-label">${escapeHtml(sp.label[currentLang] || sp.label.en)}</span>
      <span class="spec-pack">${sp.pack}</span>
    `;
    btn.addEventListener("click", () => {
      uploadSeq += 1;
      binaryAuditResult = null;
      lastUploadedFile = null;
      uploadedOriginalText = null;
      customRuleTitle = null;
      activeSpecimen = sp;
      baselineText = sp.bad;
      currentText = sp.bad;
      currentFilename = sp.filename;
      currentModality = sp.modality;
      currentPackId = sp.pack;
      focusedFindingIdx = 0;
      document.getElementById("pack-select").value = currentPackId;
      updateSpecimenRailSelection();
      renderWorkbench();
    });
    rail.insertBefore(btn, privacyNote);
  });
  updateSpecimenRailSelection();
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
      ? `引擎实测命中 ${badRes.findings.length} 处：${ruleNames}`
      : `Live engine caught ${badRes.findings.length} findings: ${ruleNames}`;
}

function findRuleById(ruleId) {
  const order = ["core", "business-brief", "literary-essay", "deck-and-ui"];
  for (const pid of order) {
    const pack = PACKS_BY_ID[pid];
    if (!pack) continue;
    const hit = (pack.rules || []).find((r) => r.id === ruleId);
    if (hit) return { rule: hit, packId: pid };
  }
  return null;
}

function loadRuleInWorkbench(ruleId) {
  const found = findRuleById(ruleId);
  if (!found || !found.rule.exemplar) return;
  const { rule, packId } = found;
  const mods = rule.modalities || [];
  let modality = "markdown";
  let ext = "md";
  if (mods.includes("css") && !mods.includes("markdown")) {
    modality = "css";
    ext = "css";
  } else if (mods.includes("svg") && !mods.includes("markdown") && !mods.includes("html")) {
    modality = "svg";
    ext = "svg";
  } else if (mods.includes("html") && !mods.includes("markdown")) {
    modality = "html";
    ext = "html";
  }

  const targetPack =
    packId === "core"
      ? modality === "html" || modality === "css" || modality === "svg"
        ? "deck-and-ui"
        : "business-brief"
      : packId;
  const effPack = resolveEffectivePack(targetPack, PACKS_BY_ID);
  const sampleFilename = `${rule.id}.${ext}`;

  // Ensure the loaded bad sample triggers this rule live; fall back to rule.demo
  // for rules whose exemplar.bad is prose rather than raw markup.
  let badSample = rule.exemplar.bad;
  let goodSample = rule.exemplar.good;
  let trapSample = rule.exemplar.trap || null;
  const probeEx = auditText(badSample, { filename: sampleFilename, modality, pack: effPack });
  if (!probeEx.findings.some((f) => f.ruleId === rule.id) && rule.demo?.bad) {
    badSample = rule.demo.bad;
    goodSample = rule.demo.good || null;
    trapSample = null;
  }

  // Only offer one-click "Load Clean Revision" when goodSample passes Stage-3 verifyRevision
  if (goodSample) {
    const v = verifyRevision(badSample, goodSample, { filename: sampleFilename, modality, pack: effPack });
    if (!v.ok) {
      goodSample = null;
    }
  }
  // Only offer "Try 2nd-Order Trap" when trapSample is verified rejected by Stage-3 verifyRevision
  if (trapSample) {
    const vt = verifyRevision(badSample, trapSample, { filename: sampleFilename, modality, pack: effPack });
    if (vt.ok) {
      trapSample = null;
    }
  }

  uploadSeq += 1;
  binaryAuditResult = null;
  lastUploadedFile = null;
  uploadedOriginalText = null;
  customRuleTitle = rule.id;
  activeSpecimen = {
    id: `rule-${rule.id}`,
    pack: targetPack,
    filename: sampleFilename,
    modality,
    bad: badSample,
    trap: trapSample,
    good: goodSample,
  };
  currentPackId = targetPack;
  currentFilename = activeSpecimen.filename;
  currentModality = modality;
  baselineText = activeSpecimen.bad;
  currentText = activeSpecimen.bad;
  focusedFindingIdx = 0;
  document.getElementById("pack-select").value = targetPack;
  setViewMode("proof");
  updateSpecimenRailSelection();
  renderWorkbench();
  document.getElementById("workbench").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetRuleFilters() {
  activeRuleFilter = "all";
  activeModalityFilter = "all";
  activeSeverityFilter = "all";
  activeRuleSearch = "";
  document.getElementById("rule-search").value = "";
  document.getElementById("rule-modality-filter").value = "all";
  document.getElementById("rule-severity-filter").value = "all";
  document.querySelectorAll("[data-pack-filter]").forEach((b) => {
    const active = b.getAttribute("data-pack-filter") === "all";
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  renderRulesTable();
}

function renderRulesTable() {
  const tbody = document.getElementById("rules-tbody");
  const countEl = document.getElementById("rules-count");
  const rows = [];
  let totalCount = 0;
  let matchedCount = 0;
  const q = activeRuleSearch.trim().toLowerCase();
  const order = ["core", "business-brief", "literary-essay", "deck-and-ui"];
  const textMods = new Set(["markdown", "text", "html", "css", "jsx", "svg"]);

  for (const pid of order) {
    const pack = PACKS_BY_ID[pid];
    if (!pack) continue;
    for (const r of pack.rules || []) {
      totalCount += 1;
      if (activeRuleFilter !== "all" && activeRuleFilter !== pid) continue;
      if (activeModalityFilter !== "all" && !(r.modalities || []).includes(activeModalityFilter)) continue;
      if (activeSeverityFilter !== "all" && r.severity !== activeSeverityFilter) continue;

      if (q) {
        const hay = [
          r.id,
          pid,
          r.family,
          r.message?.en,
          r.message?.zh,
          r.deletionTest?.en,
          r.deletionTest?.zh,
          r.exemplar?.bad,
          r.exemplar?.trap,
          r.exemplar?.good,
          ...(r.modalities || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }

      matchedCount += 1;
      const sevCls = r.severity === "error" ? "sev-error" : "sev-warning";
      const why = r.message?.[currentLang] || r.message?.en || "";
      const dt = r.deletionTest?.[currentLang] || r.deletionTest?.en || "";
      const ex = r.exemplar;
      const canTry = ex && (r.modalities || []).some((m) => textMods.has(m));
      const hashCls = highlightedRuleId === r.id ? " is-hash-target" : "";
      const tryAria = currentLang === "zh" ? `在工作台试跑 ${r.id}` : `Try ${r.id} in Workbench`;
      const mdAria = currentLang === "zh" ? `打开 ${r.id} Markdown 规则卡` : `Open ${r.id} Markdown rule card`;

      rows.push(`<tr id="rule-${escapeHtml(r.id)}" class="rule-row${hashCls}">
        <td class="rule-id-cell">
          <code>${escapeHtml(r.id)}</code>
          <div class="rule-id-actions">
            ${
              canTry
                ? `<button type="button" class="ctrl-btn ctrl-btn-sm" data-try-rule="${escapeHtml(r.id)}" aria-label="${escapeHtml(tryAria)}">${
                    currentLang === "zh" ? "试跑 ↑" : "Try ↑"
                  }</button>`
                : ""
            }
            <a class="rule-md-link" href="./rules/${escapeHtml(r.id)}.md" aria-label="${escapeHtml(mdAria)}">.md</a>
          </div>
        </td>
        <td><code>${escapeHtml(pid)}</code><br><span class="sev-tag ${sevCls}" style="font-family:var(--font-mono);font-size:0.73rem;">${escapeHtml(r.tier)} · ${escapeHtml(r.severity)}</span></td>
        <td><code>${escapeHtml((r.modalities || []).join(", "))}</code></td>
        <td><div>${formatRuleProseHtml(why)}</div><div style="color:var(--ink-2);font-size:0.8rem;margin-top:4px;"><strong>${currentLang === "zh" ? "删除测试：" : "Test:"}</strong> ${formatRuleProseHtml(dt)}</div></td>
        <td>${
          ex
            ? `<div class="ex-stack">
                 <div class="ex-row-bad"><strong>bad:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.bad))}</code></div>
                 ${ex.trap ? `<div class="ex-row-trap"><strong>trap:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.trap))}</code></div>` : ""}
                 <div class="ex-row-good"><strong>good:</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.good))}</code></div>
               </div>`
            : "—"
        }</td>
      </tr>`);
    }
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-2);font-family:var(--font-mono);padding:18px;">${
      currentLang === "zh" ? "无匹配规则。" : "No rules matched."
    } <button type="button" class="ctrl-btn ctrl-btn-sm" id="rules-clear-empty-btn" style="margin-left:8px;">${
      currentLang === "zh" ? "清空筛选" : "Clear filters"
    }</button></td></tr>`;
    const clearBtn = document.getElementById("rules-clear-empty-btn");
    if (clearBtn) clearBtn.addEventListener("click", resetRuleFilters);
  } else {
    tbody.innerHTML = rows.join("");
  }

  countEl.textContent =
    currentLang === "zh" ? `${matchedCount} / ${totalCount} 条规则` : `${matchedCount} / ${totalCount} rules`;

  tbody.querySelectorAll("[data-try-rule]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadRuleInWorkbench(btn.getAttribute("data-try-rule"));
    });
  });
}

function handleRuleHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#rule-")) {
    if (highlightedRuleId) {
      highlightedRuleId = null;
      renderRulesTable();
    }
    return;
  }
  const ruleId = hash.slice("#rule-".length);
  if (!findRuleById(ruleId)) return;

  activeRuleFilter = "all";
  activeModalityFilter = "all";
  activeSeverityFilter = "all";
  activeRuleSearch = "";
  highlightedRuleId = ruleId;

  document.getElementById("rule-search").value = "";
  document.getElementById("rule-modality-filter").value = "all";
  document.getElementById("rule-severity-filter").value = "all";
  document.querySelectorAll("[data-pack-filter]").forEach((b) => {
    const active = b.getAttribute("data-pack-filter") === "all";
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });

  renderRulesTable();
  const row = document.getElementById(`rule-${ruleId}`);
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function selectSnippetTab(tabBtn, moveFocus = false) {
  const tabs = Array.from(document.querySelectorAll("[data-snippet]"));
  activeSnippet = tabBtn.getAttribute("data-snippet");
  tabs.forEach((b) => {
    const active = b === tabBtn;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", String(active));
    b.setAttribute("tabindex", active ? "0" : "-1");
  });
  const panel = document.getElementById("snippet-panel");
  if (panel && tabBtn.id) {
    panel.setAttribute("aria-labelledby", tabBtn.id);
  }
  renderSnippet();
  if (moveFocus) tabBtn.focus();
}

function renderSnippet() {
  document.getElementById("snippet-code").textContent = SNIPPETS[activeSnippet] || SNIPPETS.cli;
}

async function copyTextWithFeedback(btn, text) {
  let copied = false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }
  if (!copied) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(ta);
  }
  const prevTimer = copyTimers.get(btn);
  if (prevTimer) clearTimeout(prevTimer);
  btn.textContent = copied
    ? I18N[currentLang]["btn.copied"]
    : currentLang === "zh"
      ? "复制失败"
      : "Copy failed";
  const timer = setTimeout(() => {
    btn.textContent = I18N[currentLang]["btn.copy"];
    copyTimers.delete(btn);
  }, 1200);
  copyTimers.set(btn, timer);
}

function updateThemeToggleLabel() {
  const btn = document.getElementById("theme-toggle");
  const dict = I18N[currentLang] || I18N.en;
  btn.textContent = currentTheme === "dark" ? dict["theme.light"] : dict["theme.dark"];
  btn.setAttribute("aria-label", currentLang === "zh" ? "切换浅色/深色主题" : "Toggle color theme");
}

function applyI18n() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  safeSetStorage("dislop-lang", currentLang);
  const dict = I18N[currentLang] || I18N.en;
  if (dict["page.title"]) document.title = dict["page.title"];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  const searchEl = document.getElementById("rule-search");
  if (searchEl) {
    searchEl.placeholder =
      currentLang === "zh"
        ? "搜索规则 ID、症状或关键词（中 / EN）..."
        : "Search rule ID, symptom, or keyword (EN / 中文)...";
    searchEl.setAttribute("aria-label", currentLang === "zh" ? "搜索规则" : "Search rules");
  }
  const langBtn = document.getElementById("lang-toggle");
  langBtn.textContent = currentLang === "en" ? "中文" : "EN";
  langBtn.setAttribute("aria-label", currentLang === "en" ? "切换到中文" : "Switch to English");
  updateThemeToggleLabel();
  renderSpecimenRail();
  renderWorkbench();
  renderDogfood();
  renderRulesTable();
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleLabel();
}

// ---------- Wire Events ----------

function init() {
  const savedTheme = safeGetStorage("dislop-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    safeSetStorage("dislop-theme", next);
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
    setViewMode("proof");
    renderWorkbench();
  });

  document.getElementById("mode-edit-btn").addEventListener("click", () => {
    if (binaryAuditResult) return;
    setViewMode("edit");
    renderWorkbench();
    document.getElementById("edit-textarea").focus();
  });

  document.getElementById("edit-textarea").addEventListener("input", (e) => {
    if (binaryAuditResult) return;
    currentText = e.target.value;
    renderWorkbench();
  });

  document.getElementById("btn-apply-good").addEventListener("click", () => {
    if (lastUploadedFile || binaryAuditResult || typeof activeSpecimen?.good !== "string") return;
    currentText = activeSpecimen.good;
    focusedFindingIdx = 0;
    renderWorkbench();
  });

  document.getElementById("btn-apply-trap").addEventListener("click", () => {
    if (lastUploadedFile || binaryAuditResult || typeof activeSpecimen?.trap !== "string") return;
    currentText = activeSpecimen.trap;
    focusedFindingIdx = 0;
    renderWorkbench();
  });

  document.getElementById("btn-reset").addEventListener("click", async () => {
    if (lastUploadedFile) {
      if (uploadedOriginalText !== null) {
        binaryAuditResult = null;
        baselineText = uploadedOriginalText;
        currentText = uploadedOriginalText;
        focusedFindingIdx = 0;
        renderWorkbench();
      } else {
        await handleUploadedFile(lastUploadedFile, false);
      }
      return;
    }
    uploadSeq += 1;
    binaryAuditResult = null;
    currentFilename = activeSpecimen.filename;
    currentModality = activeSpecimen.modality;
    currentPackId = activeSpecimen.pack;
    document.getElementById("pack-select").value = currentPackId;
    baselineText = activeSpecimen.bad;
    currentText = activeSpecimen.bad;
    focusedFindingIdx = 0;
    updateSpecimenRailSelection();
    renderWorkbench();
  });

  async function handleUploadedFile(file, autoSelectPack = true) {
    const token = ++uploadSeq;
    const mod = detectModality(file.name) || "markdown";
    const nextPackId =
      autoSelectPack && (mod === "pptx" || mod === "html" || mod === "css" || mod === "jsx" || mod === "svg")
        ? "deck-and-ui"
        : currentPackId;
    const pack = resolveEffectivePack(nextPackId, PACKS_BY_ID);

    let nextBinaryResult = null;
    let nextOriginalText = null;
    let nextBaselineText = "";
    let nextCurrentText = "";

    try {
      if (mod === "docx" || mod === "pptx") {
        const buf = await file.arrayBuffer();
        const entries = await readBrowserZipXmlEntries(buf);
        const hasExpectedXml =
          mod === "docx"
            ? typeof entries["word/document.xml"] === "string" && entries["word/document.xml"].includes("<")
            : (typeof entries["ppt/presentation.xml"] === "string" && entries["ppt/presentation.xml"].includes("<")) ||
              Object.keys(entries).some((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k) && entries[k].includes("<"));
        if (!hasExpectedXml) {
          throw new Error(
            mod === "docx"
              ? "Missing or invalid word/document.xml inside archive"
              : "Missing or invalid ppt/presentation.xml or slide XML inside archive"
          );
        }
        const res = auditOoxmlEntries(entries, { filename: file.name, modality: mod, pack });
        nextBinaryResult = res;
        nextCurrentText = `[Local ${mod.toUpperCase()} inspected in browser RAM: ${file.name}]\nFindings: ${res.findings.length}`;
      } else if (mod === "pdf") {
        const buf = await file.arrayBuffer();
        const latin1 = new TextDecoder("latin1").decode(new Uint8Array(buf));
        if (!latin1.startsWith("%PDF-") || (!/\bobj\b/.test(latin1) && !/xref/.test(latin1))) {
          throw new Error("Missing %PDF- header or PDF object structure");
        }
        const res = auditPdfStructure(latin1, [], { filename: file.name, pack });
        res.skipped = [
          ...(res.skipped || []),
          {
            file: `${file.name}#compressed-streams`,
            reason:
              "Browser mode checks uncompressed PDF metadata and /URI objects only; compressed FlateDecode streams require the Node.js or Python CLI.",
          },
        ];
        nextBinaryResult = res;
        nextCurrentText = `[Local PDF uncompressed metadata/URI structure inspected in browser RAM: ${file.name}]\nFindings: ${res.findings.length}`;
      } else {
        const buf = await file.arrayBuffer();
        let text;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(buf));
        } catch {
          throw new Error("File is not valid UTF-8 text");
        }
        nextOriginalText = text;
        nextBaselineText = text;
        nextCurrentText = text;
      }
    } catch (err) {
      nextBinaryResult = {
        findings: [],
        skipped: [{ file: file.name, reason: `Uninspectable ${mod.toUpperCase()}: ${err.message}` }],
      };
      nextCurrentText = `Could not inspect ${file.name}: ${err.message}`;
    }

    // Discard superseded async reads
    if (token !== uploadSeq) return;

    lastUploadedFile = file;
    customRuleTitle = null;
    currentFilename = file.name;
    currentModality = mod;
    currentPackId = nextPackId;
    document.getElementById("pack-select").value = nextPackId;
    binaryAuditResult = nextBinaryResult;
    uploadedOriginalText = nextOriginalText;
    baselineText = nextBaselineText;
    currentText = nextCurrentText;
    focusedFindingIdx = 0;
    if (binaryAuditResult) {
      setViewMode("proof");
    }
    updateSpecimenRailSelection();
    renderWorkbench();
  }

  document.getElementById("file-picker").addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await handleUploadedFile(file, true);
  });

  // Rule table filters & search
  document.querySelectorAll("[data-pack-filter]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.classList.contains("is-active")));
    btn.addEventListener("click", () => {
      activeRuleFilter = btn.getAttribute("data-pack-filter");
      document.querySelectorAll("[data-pack-filter]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      renderRulesTable();
    });
  });

  document.getElementById("rule-search").addEventListener("input", (e) => {
    activeRuleSearch = e.target.value;
    renderRulesTable();
  });

  document.getElementById("rule-modality-filter").addEventListener("change", (e) => {
    activeModalityFilter = e.target.value;
    renderRulesTable();
  });

  document.getElementById("rule-severity-filter").addEventListener("change", (e) => {
    activeSeverityFilter = e.target.value;
    renderRulesTable();
  });

  // Snippet tabs (W3C APG keyboard navigation + roving tabindex)
  const snippetTabs = Array.from(document.querySelectorAll("[data-snippet]"));
  snippetTabs.forEach((btn, idx) => {
    btn.addEventListener("click", () => selectSnippetTab(btn, false));
    btn.addEventListener("keydown", (e) => {
      let nextIdx = -1;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % snippetTabs.length;
      else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + snippetTabs.length) % snippetTabs.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = snippetTabs.length - 1;
      if (nextIdx !== -1) {
        e.preventDefault();
        selectSnippetTab(snippetTabs[nextIdx], true);
      }
    });
  });

  // Copy buttons (shared per-button timer + clipboard fallback)
  document.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-copy-target");
      const text = document.getElementById(targetId)?.textContent || "";
      await copyTextWithFeedback(btn, text);
    });
  });

  document.getElementById("copy-snippet-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const text = document.getElementById("snippet-code")?.textContent || "";
    await copyTextWithFeedback(btn, text);
  });

  window.addEventListener("hashchange", handleRuleHash);

  renderSnippet();
  applyI18n();
  handleRuleHash();
}

init();
