import {
  auditOoxmlEntries,
  auditText,
  detectModality,
  resolveEffectivePack,
} from "./engine/core.mjs";
import { PACKS_BY_ID, RULE_UI_META } from "./engine/packs-data.mjs";

// ---------- Native Bilingual Copy (Default ZH, Native EN — Zero Translationese) ----------

const I18N = {
  zh: {
    "page.title": "dislop — 发之前，把文案和设计里的 AI 味过一遍",
    "nav.skip": "跳至正文",
    "nav.cases": "案例",
    "nav.workbench": "在线试",
    "nav.surfaces": "怎么用",
    "nav.awesome": "87 条清单",
    "nav.rules": "规则",
    "nav.github": "GitHub ★",
    "theme.dark": "深色",
    "theme.light": "浅色",
    "btn.copy": "复制",
    "btn.copied": "已复制",

    "lead.strike": "好的，以下是为您润色后的版本。",
    "lead.title": "发之前，把文案和设计里的 AI 味过一遍",
    "lead.sub":
      "把靠谱的写作规矩、网页和 PPT 设计原则、离线检查工具和 87 条精选资源收在一起。复制下面这句话发给你的 AI 立刻就能用，也可以直接贴进来测，或装成 Skill、Plugin 和 MCP。",
    "lead.promptLabel": "最快上手：复制这句话直接发给你的 AI / Agent（免安装）",
    "lead.promptText":
      "先读 https://dislop.com/llms.txt，按里面整理的文案和设计去 AI 味规矩与检查方法，帮我把接下来这份稿子发之前过一遍。",
    "lead.copyPromptBtn": "复制发给 Agent",
    "lead.cta": "贴一段在线试 ↓",
    "lead.installBtn": "装 Skill / Plugin / MCP",
    "lead.awesomeBtn": "87 条 Awesome 清单 →",
    "lead.starBtn": "GitHub 点 Star ★",
    "lead.reassure": "开源零依赖，在线试用只在当前标签页运行，不上传任何文件。",

    "hp.tabBad": "原稿",
    "hp.tabTrap": "换了种 AI 味",
    "hp.tabGood": "改干净了",
    "hp.meta": "用同一个检查引擎实时跑的",
    "hp.openWb": "在下面工作台打开 →",

    "m1.title": "写前避坑：给 Agent 装规矩",
    "m1.desc": "复制发给 AI，或装上 Skill / Plugin。让模型动笔前避开空话、三段分号推销句、段尾说教和默认紫粉页面。",
    "m2.title": "交付前查：25 条离线规则",
    "m2.desc": "浏览器、MCP 和命令行跑同一套引擎。挑出 AI 寒暄、占位符、裸 Markdown、套话、二阶口号和 PPT / 网页模板味。",
    "m3.title": "看案例 + 87 条工具清单",
    "m3.desc": "公开真实改稿对照、0 命中翻车复盘和 87 个核验过的去 AI 味工具与规范，自己查或者转发给团队都顺手。",

    "cases.title": "三个真实案例：为什么删了套词还是像 AI",
    "cases.desc":
      "AI 味分三层：一阶是“抓手”“赋能”这类套词，二阶是“不是 A，而是 B”这类口号，三阶是就算工具报 0 问题、读起来依然像在念推销稿的写法。下面三组对照可以直接试，也可以一键复制分享。",
    "cases.readAll": "看全部对照案例（.md）→",

    "wb.heading": "直接在这里试一试",
    "wb.packLabel": "按哪种稿子查：",
    "pack.brief": "工作文档 / 方案",
    "pack.essay": "随笔 / 长文",
    "pack.ui": "PPT 和网页",
    "wb.openFile": "打开本地文件（.md / .html / .docx / .pptx）",
    "wb.specimensTitle": "示例",
    "wb.privacyNote": "内容只留在这个标签页里，页面禁止联网（connect-src 'none'）。",
    "wb.modeProof": "标出问题",
    "wb.modeEdit": "编辑原文",
    "wb.pasteOwn": "贴我的稿子",
    "wb.applyClean": "看改好的",
    "wb.tryTrap": "看换了种 AI 味的",
    "wb.reset": "还原",
    "wb.voiceTitle": "句长统计",
    "wb.nudgeText": "测完了觉得顺手？把 dislop 装给你的 Agent，以后交付前自动查一遍，也欢迎去 GitHub 点个 Star。",
    "wb.nudgeInstall": "装给 Agent / 看安装 ↓",
    "wb.nudgeCopy": "复制发给 AI",
    "wb.nudgeStar": "GitHub 点 Star ★",
    "legend.error": "红实线：AI 残留硬伤",
    "legend.warn": "蓝虚线：套话与模板味",

    "surf.title": "怎么用：发给你的 AI，或者装给编程 Agent",
    "surf.desc":
      "按你平时用的工具选一种就行。普通对话用户直接复制一句话就能用；用 Claude Code、Codex、Cursor 的开发者装一次 Skill 或 Plugin，以后写前自动避坑、写完自动复检。",
    "surf.readTools": "完整接入文档（.md）→",
    "surf.w1Title": "1. 直接发给 AI（免安装）",
    "surf.w1Desc": "适合 ChatGPT、Claude、Kimi 等任意联网对话。复制一句话丢给它，它会自己读 dislop.com/llms.txt 按规矩审稿。",
    "surf.w2Title": "2. Agent Skill（跨工具通用）",
    "surf.w2Desc": "一行命令装进 Claude Code、Codex、Cursor、Windsurf 或 Antigravity。写之前防 AI 味，写完自动复检。",
    "surf.w3Title": "3. Plugin 与 MCP（本地 / 在线）",
    "surf.w3Desc": "本地 stdio MCP 与 Plugin 零依赖免 Key；需要大模型深度改写或三阶审校时，可接入官方/自托管开源后台的远程 HTTP MCP。",
    "surf.w4Title": "4. 命令行与 PR 卡点",
    "surf.w4Desc": "终端用 npx 或 uvx 查整个目录、Word、PPT 或本次 Git 改动，也能放进 GitHub Actions 卡住 AI 残留硬伤。",
    "snip.prompt": "发给 AI",
    "snip.server": "自托管后台",
    "snip.cli": "命令行",
    "ep.foldTitle": "给 Agent / 开发者看：静态 Markdown 与 JSON 接口",
    "ep.foldSub": "/llms.txt · /catalog.json · 任务卡 · 规则卡（纯静态，展开查看）",
    "ep.heading": "给 Agent 读的静态文档（纯 Markdown / JSON）",
    "ep.llms": "Agent 入口索引",
    "ep.catalog": "全部文档的 JSON 目录",
    "ep.taskBiz": "任务卡：工作文档与技术方案",
    "ep.taskWeb": "任务卡：网页与 PPT 模板味",
    "ep.taskEdit": "任务卡：随笔与长文",
    "ep.taskGate": "任务卡：发稿前 AI 残留硬伤检查",
    "ep.skill": "跨宿主 Agent Skill",
    "ep.awesome": "87 条工具清单 JSON",
    "ep.method": "文案与设计基准",
    "ep.full": "单次拉取的全部 25 条规则",

    "awesome.title": "Awesome Anti-Slop：87 个去 AI 味工具与资料",
    "awesome.desc":
      "除了 dislop 自己，我们也维护了一份按场景整理的去 AI 味资源索引，包含 Vale、Impeccable 等成熟工具、中英文写作规范、代码 PR 治理规则和实证论文。全部链接在 2026-11-21 逐条核过一遍。",
    "awesome.openFull": "打开完整清单 →",
    "awesome.ecoTitle": "按用途筛选，也可以直接给 Agent 读",
    "awesome.ecoDesc": "按写作、网页、代码、研究分类筛选，或者只看能本地自动检查的工具。AI 检测器和规避工具单独放在最下面做对照。",
    "awesome.browseBtn": "在线筛选 87 条清单 →",
    "awesome.ghBtn": "GitHub 中文版",
    "awesome.shareBtn": "复制清单推荐语",
    "awesome.posTitle": "不想长成 AI 模板？看看这些设计参考",
    "awesome.posDesc": "除了去套话，还存了 31 个印刷、字体厂和独立出版站点，做网页或排版时拿来找灵感很管用。",
    "awesome.posAll": "全部 31 个参考（.md）→",
    "stat.entries": "条资料",
    "stat.sections": "个分类",
    "stat.det": "个可自动检查",
    "stat.zh": "条中文 / 多语种",

    "share.title": "觉得顺手？发给同事，或者去 GitHub 留个 Star",
    "share.desc": "dislop 按 Apache-2.0 完全开源、零依赖、不收数据。如果你身边也有人天天给 AI 稿子改味道，下面三个入口最直接。",
    "share.c1Title": "一键分享给团队或朋友",
    "share.c1Desc": "复制一段直白不浮夸的介绍（带官网试用链接、案例页和 87 条清单），直接贴到群聊或文档里就行。",
    "share.copySiteBtn": "复制项目推荐语",
    "share.copyCasesBtn": "复制案例页链接",
    "share.c2Title": "去 GitHub 点个 Star",
    "share.c2Desc": "检查引擎、Agent Skill、Plugin、MCP 和 87 条 Awesome Anti-Slop 清单都在同一个仓库。点个 Star 方便以后找。",
    "share.starCta": "GitHub 点 Star ★",
    "share.c3Title": "一起补案例、规则和工具",
    "share.c3Desc": "遇到特别典型的 AI 味翻车案例，或者发现好用的去 AI 味工具没进清单，欢迎在路线图或 Issue 里一起补。",
    "share.roadmapCta": "看路线图 →",
    "share.issueCta": "投稿案例 / 工具",

    "cov.title": "支持哪些文件，哪些还查不了",
    "cov.desc": "能查的和还没做的都写明白。损坏或读不出来的文档会直接报跳过，不会显示成 0 问题。",
    "cov.readMd": "看纯文本说明（.md）→",
    "cov.colTarget": "文件类型",
    "cov.colFormat": "扩展名",
    "cov.colScope": "查什么",
    "cov.colStatus": "现状",
    "cov.r1Name": "文稿与笔记",
    "cov.r1Scope": "开头寒暄、未填占位符、公文黑话、英文高频空词、“不是 A，而是 B”套句、连发短句和四字排比、段尾说教、没出处的统计、满屏加粗清单、破折号过密、中文里混半角标点。",
    "cov.r2Name": "Word 和 PPT",
    "cov.r2Scope": "贴进文档没渲染的 Markdown 星号、正文套话、PPT 单页字墙、要点超 6 条、文字自动缩太小、空泛标题（如“背景”“概述”）。",
    "cov.r4Name": "网页与组件",
    "cov.r4Scope": "点不动的空链接和占位按钮、默认紫粉渐变、满屏胶囊标签、三层套盒、把提示词口号印成装饰徽章。",
    "cov.r5Name": "Git 改动与 PR",
    "cov.r5Scope": "只查本次改过的行，拦住残留寒暄、占位符和文字/页面里的 AI 味，支持 GitHub PR 批注和 SARIF。代码语法树检查还没做。",
    "cov.r6Name": "节奏单调与个人风格",
    "cov.r6Scope": "连环逗号句、句长过于均匀、PPT 连续同版式，以及从自己旧稿里统计句长习惯。原型已跑通，还没合进主程序。",
    "status.live": "可用",
    "status.partial": "改动检查可用，AST 未做",
    "status.notYet": "还没上线（原型阶段）",

    "rules.title": "全部 25 条规则明细（Agent 与深度用户参考）",
    "rules.desc": "平时不需要背规则，直接交给 Agent 或贴进工作台就行。想逐条查判断依据、看正反例或者点「试试 ↑」加载单条规则时，展开下面这张表。",
    "rules.readCases": "单文件拉取全部规则（llms-full.txt）→",
    "rules.foldTitle": "展开查看 25 条规则明细与在线筛选",
    "rules.modAll": "全部格式",
    "rules.sevAll": "全部级别",
    "rules.sevError": "硬伤（error）",
    "rules.sevWarn": "提醒（warning）",
    "rules.sevInfo": "轻提示（info）",
    "rules.filterAll": "全部",
    "rules.filterCore": "硬伤",
    "rules.filterBrief": "工作文档",
    "rules.filterEssay": "随笔长文",
    "rules.filterUi": "PPT 和网页",
    "rules.colId": "规则",
    "rules.colPack": "分类",
    "rules.colMod": "格式",
    "rules.colWhy": "查什么 / 怎么判断",
    "rules.colEx": "原句 → 改坏 → 改好",

    "pos.norm-zurich": "苏黎世独立设计事务所，以极克制的模数网格见长。",
    "pos.stiftung-buchkunst": "世界最美的书评选档案：看页边距、版心比例与长篇阅读怎么拉开呼吸感。",
    "pos.fonts-in-use": "真实印刷品与网页里的字体搭配库。",
    "pos.dinamo": "瑞士独立字厂，看可变字重与大号字阶怎么撑起实用界面。",
    "pos.the-type": "中文排印评论，细聊标点挤压、混排细节与出版规范。",
    "pos.arena": "研究者自己攒的视觉线索库：旧印刷、路牌与独立小书。",

    "footer.selfAudit": "这个页面自己也跑过 dislop check site/，0 处问题。",
    "footer.awesome": "工具清单",
    "footer.roadmap": "路线图",
    "footer.brand": "文案基准",
    "footer.design": "视觉规范",
  },
  en: {
    "page.title": "dislop — Clear the AI slop from your writing and design",
    "nav.skip": "Skip to main content",
    "nav.cases": "Cases",
    "nav.workbench": "Try it",
    "nav.surfaces": "How to use",
    "nav.awesome": "87 tools",
    "nav.rules": "Rules",
    "nav.github": "GitHub ★",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "btn.copy": "Copy",
    "btn.copied": "Copied",

    "lead.strike": "Certainly! Here is your polished draft.",
    "lead.title": "Clear the AI slop from your writing and design",
    "lead.sub":
      "Good writing habits, web and slide design rules, an offline checker, and 87 vetted tools—gathered in one place. Copy one line to hand dislop to your AI right now, test a draft below, or install it as a Skill, Plugin, or MCP.",
    "lead.promptLabel": "Fastest start: copy this line to any AI / coding agent (no install)",
    "lead.promptText":
      "Read https://dislop.com/llms.txt and follow its writing and design anti-slop rules and checks before delivering my next doc, slide deck, or web page.",
    "lead.copyPromptBtn": "Copy for Agent",
    "lead.cta": "Try a draft here ↓",
    "lead.installBtn": "Install Skill / Plugin / MCP",
    "lead.awesomeBtn": "87 Awesome tools →",
    "lead.starBtn": "Star on GitHub ★",
    "lead.reassure": "Open source, zero dependencies. The live workbench runs only in this tab with zero uploads.",

    "hp.tabBad": "Original",
    "hp.tabTrap": "Still sounds like AI",
    "hp.tabGood": "Cleaned up",
    "hp.meta": "Running live on the same linter engine",
    "hp.openWb": "Open in workbench ↓",

    "m1.title": "Prevent while drafting",
    "m1.desc": "Send the prompt or install the Skill / Plugin so your AI avoids stock phrasing, 3-part semicolon pitches, moralizing endings, and default AI chrome upfront.",
    "m2.title": "Check before shipping",
    "m2.desc": "Browser, MCP, and CLI run the same 25 offline rules to catch chat wrappers, placeholders, raw Markdown, clichés, 2nd-order slogans, and slide/UI slop.",
    "m3.title": "Cases + 87 Awesome tools",
    "m3.desc": "Real before/after rewrites, our own 0-finding copy autopsy, and 87 checked anti-slop tools, guides, and papers you can browse or share.",

    "cases.title": "Three real cases: why cutting buzzwords still sounds like AI",
    "cases.desc":
      "AI slop shows up in three layers: 1st-order clichés, 2nd-order slogan frames ('Not X, but Y'), and 3rd-order pitch cadence that passes a linter with 0 findings. Try them live or copy any case to share.",
    "cases.readAll": "All contrast cases (.md) →",

    "wb.heading": "Try it right here",
    "wb.packLabel": "Check as:",
    "pack.brief": "Work doc / spec",
    "pack.essay": "Essay / longform",
    "pack.ui": "Slides & UI",
    "wb.openFile": "Open a local file (.md / .html / .docx / .pptx)",
    "wb.specimensTitle": "Examples",
    "wb.privacyNote": "Everything stays in this tab. The page blocks outbound requests (connect-src 'none').",
    "wb.modeProof": "Highlights",
    "wb.modeEdit": "Edit text",
    "wb.pasteOwn": "Paste my draft",
    "wb.applyClean": "Clean version",
    "wb.tryTrap": "2nd-order AI slop",
    "wb.reset": "Reset",
    "wb.voiceTitle": "Sentence stats",
    "wb.nudgeText": "Done testing? Install dislop for your coding agent so every draft gets checked before shipping, or star it on GitHub.",
    "wb.nudgeInstall": "Install for Agent ↓",
    "wb.nudgeCopy": "Copy for AI",
    "wb.nudgeStar": "Star on GitHub ★",
    "legend.error": "Red solid: AI artifact",
    "legend.warn": "Blue dashed: cliché / template slop",

    "surf.title": "How to use it: hand it to your AI or install it for your agent",
    "surf.desc":
      "Pick whichever fits how you work. Everyday AI chat users can paste one sentence with zero setup; Claude Code, Codex, and Cursor users can install the Skill or Plugin once for automatic prevent-and-check.",
    "surf.readTools": "Full setup guide (.md) →",
    "surf.w1Title": "1. Send to any AI (zero install)",
    "surf.w1Desc": "Works in ChatGPT, Claude, or any web-capable agent. Paste one sentence and it reads dislop.com/llms.txt directly.",
    "surf.w2Title": "2. Agent Skill (cross-host)",
    "surf.w2Desc": "One command for Claude Code, Codex, Cursor, Windsurf, or Antigravity. Covers plain writing habits plus local re-checking.",
    "surf.w3Title": "3. Plugin & MCP (local / hosted)",
    "surf.w3Desc": "Local stdio MCP and Plugin run zero-dep with no key; attach our open-source server/ for LLM-backed remote HTTP MCP review & rewriting.",
    "surf.w4Title": "4. CLI & PR gate",
    "surf.w4Desc": "Run npx or uvx on folders, Word/PPT files, or git diffs, or block AI artifact bugs automatically in GitHub Actions.",
    "snip.prompt": "Send to AI",
    "snip.server": "Self-host server",
    "snip.cli": "CLI",
    "ep.foldTitle": "For Agents & Developers: Static Markdown & JSON Endpoints",
    "ep.foldSub": "/llms.txt · /catalog.json · task guides · rule cards (click to expand)",
    "ep.heading": "Plain Markdown & JSON pages for agents",
    "ep.llms": "Entry index for agents",
    "ep.catalog": "JSON index of all pages",
    "ep.taskBiz": "Guide: work docs & specs",
    "ep.taskWeb": "Guide: web pages & slides",
    "ep.taskEdit": "Guide: essays & longform",
    "ep.taskGate": "Guide: pre-release AI artifact checks",
    "ep.skill": "Cross-host Agent Skill",
    "ep.awesome": "Raw JSON for 87 anti-slop tools",
    "ep.method": "Voice & design guide",
    "ep.full": "All 25 rules in one file",

    "awesome.title": "Awesome Anti-Slop: 87 checked tools, guides & papers",
    "awesome.desc":
      "Beyond dislop itself, we maintain a verified directory of anti-slop tools, writing guides, UI rules, PR policies, and papers—including Vale and Impeccable. Every link was checked on 2026-11-21.",
    "awesome.openFull": "Open full list →",
    "awesome.ecoTitle": "Filter by use case, or feed it to an agent",
    "awesome.ecoDesc": "Filter by writing, web UI, code, or research, or show only tools with automated checks. Detectors and bypass tools are kept separate at the bottom.",
    "awesome.browseBtn": "Filter all 87 entries →",
    "awesome.ghBtn": "View on GitHub",
    "awesome.shareBtn": "Copy list blurb",
    "awesome.posTitle": "Design references that don't look like AI templates",
    "awesome.posDesc": "31 public print, type foundry, and independent publishing sites worth browsing when you want a page to look grounded.",
    "awesome.posAll": "All 31 references (.md) →",
    "stat.entries": "entries",
    "stat.sections": "topics",
    "stat.det": "automated tools",
    "stat.zh": "zh / multilingual",

    "share.title": "Found this useful? Share it or star it on GitHub",
    "share.desc": "dislop is Apache-2.0 open source, zero-dependency, and collects no data. If your team deals with AI slop every week, these three links help the most.",
    "share.c1Title": "Share with a teammate or friend",
    "share.c1Desc": "Copy a plain, no-hype blurb with the live workbench, real cases, and 87-entry Awesome list.",
    "share.copySiteBtn": "Copy project blurb",
    "share.copyCasesBtn": "Copy cases link",
    "share.c2Title": "Star dislop on GitHub",
    "share.c2Desc": "The engine, Agent Skill, Plugin, MCP server, and 87-entry Awesome Anti-Slop index all live in one repo.",
    "share.starCta": "Star on GitHub ★",
    "share.c3Title": "Add a case, rule, or tool",
    "share.c3Desc": "Have a classic AI-slop before/after example or a solid anti-slop tool missing from the list? Drop it in our Roadmap or Issues.",
    "share.roadmapCta": "View Roadmap →",
    "share.issueCta": "Submit case / tool",

    "cov.title": "What it checks, and what it skips",
    "cov.desc": "Plain status for each file type. Unreadable archives are marked as skipped instead of 0 issues.",
    "cov.readMd": "Plain text overview (.md) →",
    "cov.colTarget": "File type",
    "cov.colFormat": "Extensions",
    "cov.colScope": "What gets checked",
    "cov.colStatus": "Status",
    "cov.r1Name": "Docs & notes",
    "cov.r1Scope": "Chat replies, unfilled placeholders, throat-clearing openers, buzzwords, 'Not X, but Y' frames, staccato slogan runs, moralizing endings, unsourced claims, bold-lead bullet walls, and em-dash overuse.",
    "cov.r2Name": "Word & PowerPoint",
    "cov.r2Scope": "Raw Markdown asterisks pasted from chat, prose clichés, crowded slides, more than 6 bullets, shrunk autofit text, and vague slide titles ('Overview', 'Background').",
    "cov.r4Name": "Web pages & components",
    "cov.r4Scope": "Dead href='#' placeholder links, unexplained disabled buttons, purple-pink AI gradients, pill walls, 3-level nested boxes, and 'AI-Powered' prompt-echo badges.",
    "cov.r5Name": "Git diffs & PRs",
    "cov.r5Scope": "Checks only modified lines for chat wrappers, placeholders, prose clichés, and UI template slop, with GitHub annotations and SARIF output. Code AST linting is not built.",
    "cov.r6Name": "Rhythm & voice stats",
    "cov.r6Scope": "Comma chains, uniform sentence length, repeated slide layouts, and local sentence stats from your own drafts. Prototype works, not merged into the core yet.",
    "status.live": "Works now",
    "status.partial": "Diff checks work; no AST",
    "status.notYet": "Not shipped (prototype)",

    "rules.title": "All 25 rules (Agent & power-user reference)",
    "rules.desc": "You don't need to memorize rules—just hand dislop to your agent or paste into the workbench. Expand the table below whenever you want exact rule details or to test a single rule.",
    "rules.readCases": "Single-file rule digest (llms-full.txt) →",
    "rules.foldTitle": "Expand all 25 rules and filter online",
    "rules.modAll": "All formats",
    "rules.sevAll": "All levels",
    "rules.sevError": "Hard bug (error)",
    "rules.sevWarn": "Warning",
    "rules.sevInfo": "Info",
    "rules.filterAll": "All",
    "rules.filterCore": "Hard bugs",
    "rules.filterBrief": "Work docs",
    "rules.filterEssay": "Essays",
    "rules.filterUi": "Slides & UI",
    "rules.colId": "Rule",
    "rules.colPack": "Group",
    "rules.colMod": "Formats",
    "rules.colWhy": "What it checks / how to judge",
    "rules.colEx": "Before → Bad edit → After",

    "pos.norm-zurich": "Strict modular graphic systems, micro-typographic rules, and structural restraint.",
    "pos.stiftung-buchkunst": "Book proportion, margin choreography, and pacing principles transferable to reports, PDFs, and decks.",
    "pos.fonts-in-use": "Real-world typography pairings across books, posters, and interfaces.",
    "pos.dinamo": "Independent Swiss foundry demonstrating typographic scale, variable axes, and clean utility UI.",
    "pos.the-type": "Chinese and multilingual typography critique, CJK punctuation mechanics, and editorial layout standards.",
    "pos.arena": "Research-oriented visual channels for archival print, editorial systems, and signage.",

    "footer.selfAudit": "This site passes dislop check site/ with 0 issues.",
    "footer.awesome": "Awesome list",
    "footer.roadmap": "Roadmap",
    "footer.brand": "Voice guide",
    "footer.design": "Design tokens",
  },
};

// ---------- Hero 3-State Proof Card Data (100% Language-Pure, Live Engine Verified) ----------

const HERO_PROOF_BY_LANG = {
  zh: {
    filename: "launch-note.md",
    modality: "markdown",
    pack: "business-brief",
    bad: "好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。",
    trap: "队列分级已经落地，故障恢复时间最多 45 秒。这不是一次简单的升级，而是一场效率革命。",
    good: "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
    badNotes: [
      { kind: "error", label: "红线：", text: "开头留着 AI 寒暄，删掉就行。" },
      { kind: "warn", label: "蓝线：", text: "“值得注意的是”“抓手”“全面赋能”都是空话，可以直接说做了什么。" },
    ],
    trapVerdict: "依然标出 1 处。旧套话删掉了，但换成了“不是……而是……”这种二阶 AI 腔。",
    goodVerdict: "0 处问题。寒暄和空话都清掉了。",
  },
  en: {
    filename: "launch-note.md",
    modality: "markdown",
    pack: "business-brief",
    bad: "Certainly! Here is the launch note. It's worth noting that CSV exports are a game-changer, finishing in up to 12 minutes for workspaces above 500,000 rows.",
    trap: "CSV exports finish in up to 12 minutes for workspaces above 500,000 rows. This isn't just an upgrade — it's a new standard.",
    good: "CSV exports finish in up to 12 minutes for workspaces above 500,000 rows.",
    badNotes: [
      { kind: "error", label: "Red:", text: "Stray chat reply on line one. Delete it." },
      { kind: "warn", label: "Blue:", text: "Filler opener and hype noun ('game-changer'). Say what changed instead." },
    ],
    trapVerdict: "Still flagged (1 issue). Old buzzwords are gone, replaced by a 'Not X, but Y' AI slogan.",
    goodVerdict: "0 issues. Chat wrapper and stock phrasing removed.",
  },
};

// ---------- Language-Pure Workbench Specimens (5 ZH + 5 EN, ZERO Mixing) ----------

const SPECIMENS_BY_LANG = {
  zh: [
    {
      id: "brief",
      num: "01",
      label: "汇报与上线说明",
      pack: "business-brief",
      filename: "weekly-report.md",
      modality: "markdown",
      bad: [
        "好的，以下是修改后的上线说明。",
        "",
        "压测延迟数据见【待补充】。",
        "",
        "值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至最多 45 秒。",
      ].join("\n"),
      trap: [
        "压测延迟待压测签字后补齐。",
        "",
        "本次改造给工单分了级，一线客服首响时间压缩至最多 45 秒。这不是普通优化，而是行业标杆。",
      ].join("\n"),
      good: [
        "压测延迟待压测签字后补齐。",
        "",
        "本次改造给工单分了级，一线客服首响时间压缩至最多 45 秒。",
      ].join("\n"),
    },
    {
      id: "essay",
      num: "02",
      label: "随笔与长文",
      pack: "literary-essay",
      filename: "winter-note.md",
      modality: "markdown",
      bad: [
        "冬至那天下了初雪,院子里的腊梅开了 3 朵;香气一直飘到走廊。",
        "",
        "老周留下的那把旧刨子不是工具，而是手艺人的尊严。",
        "",
        "傍晚 18:30，修表匠把拆下的 3 枚铜齿轮泡进煤油皿里，关掉台灯。这或许就是慢工出细活在喧嚣时代真正的意义所在。",
      ].join("\n"),
      trap: [
        "冬至那天下了初雪，院子里的腊梅开了 3 朵；香气一直飘到走廊。",
        "",
        "老周的旧刨子不是木头，而是时间本身。",
        "",
        "傍晚 18:30，修表匠把拆下的 3 枚铜齿轮泡进煤油皿里，关掉台灯。",
      ].join("\n"),
      good: [
        "冬至那天下了初雪，院子里的腊梅开了 3 朵；香气一直飘到走廊。",
        "",
        "老周留下的那把旧刨子刃口磨窄了一半，松木柄被手汗浸得发亮。",
        "",
        "傍晚 18:30，修表匠把拆下的 3 枚铜齿轮泡进煤油皿里，关掉台灯。",
      ].join("\n"),
    },
    {
      id: "ui-chrome",
      num: "03",
      label: "网页模板味",
      pack: "deck-and-ui",
      filename: "landing-card.html",
      modality: "html",
      bad: [
        '<div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">',
        '  <span class="badge">AI 强力驱动</span>',
        "  <h2>1.2 秒查完 48 份演示文稿</h2>",
        '  <a href="#">下载完整报告</a>',
        "</div>",
      ].join("\n"),
      trap: [
        '<div class="surface-card">',
        '  <span class="badge">零幻觉保证</span>',
        "  <h2>1.2 秒查完 48 份演示文稿</h2>",
        '  <a href="./report.html">下载完整报告</a>',
        "</div>",
      ].join("\n"),
      good: [
        '<div class="surface-card">',
        "  <h2>1.2 秒查完 48 份演示文稿</h2>",
        '  <a href="./report.html">下载完整报告</a>',
        "</div>",
      ].join("\n"),
    },
    {
      id: "second-order",
      num: "04",
      label: "四字排比与二阶腔",
      pack: "business-brief",
      filename: "sla-update.md",
      modality: "markdown",
      bad: [
        "新版网关具备精准高效、安全可靠、灵活易用的特性，单节点支持 8000 QPS。",
        "",
        "数据显示，大多数团队在发稿前都不会检查套话。",
      ].join("\n"),
      trap: [
        "新版网关单节点支持 8000 QPS。这不是一次普通升级，而是系统架构的质变。",
      ].join("\n"),
      good: [
        "新版网关单节点支持 8000 QPS，上游超时 2 秒后自动熔断。",
        "",
        "我们在 2026 年 3 月抽查的 40 份发布说明里，有 28 份留着未清理的套话。",
      ].join("\n"),
    },
    {
      id: "clean-nearmiss",
      num: "05",
      label: "看着像套话，其实不是",
      pack: "business-brief",
      filename: "clean-chinese.md",
      modality: "markdown",
      bad: [
        "她抓手机拍下黑板上的推导过程，默认超时不是 30 秒，而是 300 秒。",
        "",
        "北京大学、清华大学、复旦大学三校联合公开了这份语料，单次推理平均延迟降至 18 毫秒。",
      ].join("\n"),
      trap: [
        "这不是一份普通的语料，而是学术协作的新起点。",
      ].join("\n"),
      good: [
        "她抓手机拍下黑板上的推导过程，默认超时不是 30 秒，而是 300 秒。",
        "",
        "北京大学、清华大学、复旦大学三校联合公开了这份语料，单次推理平均延迟降至 18 毫秒。",
      ].join("\n"),
    },
  ],
  en: [
    {
      id: "brief",
      num: "01",
      label: "Release brief",
      pack: "business-brief",
      filename: "launch-note.md",
      modality: "markdown",
      bad: [
        "Certainly! Here is the Q3 update.",
        "",
        "p95 latency is [insert p95 latency].",
        "",
        "It is worth noting that CSV exports take up to 12 minutes for accounts above 500,000 rows. This is a game-changer that isn't just faster — it's a paradigm shift.",
      ].join("\n"),
      trap: [
        "p95 latency is pending load-test sign-off.",
        "",
        "CSV exports take up to 12 minutes for accounts above 500,000 rows. Queues clear. Charts load. Teams ship.",
      ].join("\n"),
      good: [
        "p95 latency is pending load-test sign-off.",
        "",
        "CSV exports take up to 12 minutes for accounts above 500,000 rows.",
      ].join("\n"),
    },
    {
      id: "essay",
      num: "02",
      label: "Narrative essay",
      pack: "literary-essay",
      filename: "ferry-deck.md",
      modality: "markdown",
      bad: [
        "The station clock — brass-rimmed — stopped at 4:10 — right before the rain — leaving the platform quiet — and empty.",
        "",
        "At 6:15 a.m., the ferry deck smelled of wet rope and diesel. Ultimately, this reminds us that departures are always quieter than arrivals.",
      ].join("\n"),
      trap: [
        "The brass-rimmed station clock stopped at 4:10 right before the rain, leaving the platform quiet.",
        "",
        "At 6:15 a.m., the ferry deck smelled of wet rope and diesel. It wasn't just a crossing — it was a reckoning.",
      ].join("\n"),
      good: [
        "The brass-rimmed station clock stopped at 4:10 right before the rain, leaving the platform quiet.",
        "",
        "At 6:15 a.m., the ferry deck smelled of wet rope and diesel.",
      ].join("\n"),
    },
    {
      id: "ui-chrome",
      num: "03",
      label: "Web page & UI",
      pack: "deck-and-ui",
      filename: "hero-card.html",
      modality: "html",
      bad: [
        '<div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">',
        '  <span class="badge">AI-Powered · Zero Hallucination</span>',
        "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
        '  <a href="#">Download report</a>',
        "</div>",
      ].join("\n"),
      trap: [
        '<div class="surface-card">',
        '  <span class="badge">Supercharge Your Workflow</span>',
        "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
        '  <a href="./report.html">Download report</a>',
        "</div>",
      ].join("\n"),
      good: [
        '<div class="surface-card">',
        "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
        '  <a href="./report.html">Download report</a>',
        "</div>",
      ].join("\n"),
    },
    {
      id: "second-order",
      num: "04",
      label: "Staccato & bullet walls",
      pack: "business-brief",
      filename: "sla-note.md",
      modality: "markdown",
      bad: [
        "Studies show that 70% of decks pack too much text onto one slide.",
        "",
        "Signals drop. Audits stall. Launches slip.",
      ].join("\n"),
      trap: [
        "This isn't just a deck linter — it's a new standard for clear slides.",
      ].join("\n"),
      good: [
        "In our audit of 48 internal Q3 decks, 31 had at least one slide over 120 words.",
      ].join("\n"),
    },
    {
      id: "clean-nearmiss",
      num: "05",
      label: "Looks like slop, isn't",
      pack: "business-brief",
      filename: "clean-english.md",
      modality: "markdown",
      bad: [
        "The Delve debugger inspected a 19th-century wool tapestry archive on 2026-10-15.",
        "",
        "The bug is not in `parser.py`, but in `loader.py` line 42.",
      ].join("\n"),
      trap: [
        "This isn't just speed — it's clarity.",
      ].join("\n"),
      good: [
        "The Delve debugger inspected a 19th-century wool tapestry archive on 2026-10-15.",
        "",
        "The bug is not in `parser.py`, but in `loader.py` line 42.",
      ].join("\n"),
    },
  ],
};

// ---------- Real Cases & Share Blurbs (100% Language-Pure) ----------

const CASES_BY_LANG = {
  zh: [
    {
      id: "doc",
      kicker: "案例 01 · 工作文档与上线说明",
      title: "删了“抓手”，结果换成了“不是……而是……”",
      steps: [
        {
          cls: "is-bad",
          label: "原稿（一阶套话 + AI 寒暄）",
          text: "好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。",
        },
        {
          cls: "is-trap",
          label: "改过头（掉进二阶 AI 腔）",
          text: "队列分级已经落地，故障恢复时间最多 45 秒。这不是一次简单的升级，而是一场效率革命。",
        },
        {
          cls: "is-good",
          label: "改干净（只留动作和结果）",
          text: "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
        },
      ],
      loadSpecimenId: "brief",
      loadLabel: "在工作台试一下 ↓",
      shareLabel: "复制这段分享",
      shareText: [
        "看一个挺典型的去 AI 味对照：",
        "原稿：好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。",
        "改过头：队列分级已经落地，故障恢复时间最多 45 秒。这不是一次简单的升级，而是一场效率革命。",
        "改干净：这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
        "在线试查和 87 条去 AI 味工具清单：https://dislop.com/#cases",
      ].join("\n"),
    },
    {
      id: "autopsy",
      kicker: "案例 02 · 真实自查（三阶结构味）",
      title: "检查报 0 处问题，但我们自己上一版首屏照样像 AI",
      steps: [
        {
          cls: "is-bad",
          label: "翻车原稿（0 命中，却满屏 AI 味）",
          text: "把稿子、PPT 或网页贴进来。不能发的硬伤，dislop 直接划掉；听着像套话的地方，它在页边问你一句；等你改完，再拿原稿逐条对一遍。它不替你改稿，笔一直在你手里。",
        },
        {
          cls: "is-good",
          label: "改回人话",
          text: "AI 写完的文档、Word、PPT 和网页，经常留着开头寒暄、空话套话、满页字墙或默认紫粉模板。你可以直接复制一句话发给你的 AI，或者在这里在线试查。",
        },
      ],
      note: "毛病不在单个词，在于“三段对称分号推销句 + 假装老校对 + 段尾金句收尾”。这就是为什么单靠脚本标红线不够，必须把写作规矩一起写进 Skill 和 Plugin。",
      linkHref: "./methodology/brand-and-voice.md",
      linkLabel: "看完整复盘 →",
      shareLabel: "复制这段分享",
      shareText: [
        "为什么有时候把“赋能”“抓手”删完了，读起来还是满屏 AI 味？",
        "我们拿自己上一版官网首屏做了次复盘：工具检查报 0 处问题，但三段对称分号推销句 + 校对戏服 + 段尾“笔一直在你手里”金句收尾，一眼还是 AI 写的。",
        "完整前后对照与去 AI 味方法：https://dislop.com/#cases",
      ].join("\n"),
    },
    {
      id: "ui",
      kicker: "案例 03 · 网页与 PPT 模板味",
      title: "紫粉渐变 + 装饰徽章 + 点不动的空链接",
      steps: [
        {
          cls: "is-bad",
          label: "生成式模板原稿",
          html: '<code>from-indigo via-purple to-pink</code> 渐变标题 + <code>AI 强力驱动</code> 徽章 + <code>href="#"</code> 假下载按钮。',
        },
        {
          cls: "is-good",
          label: "改干净",
          html: "纯色纸面和 1px 分界线、去掉装饰徽章、按钮接上真实报告路径 <code>./report.html</code>。",
        },
      ],
      note: "同一套引擎也能直接读 .pptx，挑出单页字墙（> 280 字）、要点超过 6 条、文字自动缩排和空泛标题。",
      loadSpecimenId: "ui-chrome",
      loadLabel: "在工作台试一下 ↓",
      shareLabel: "复制这段分享",
      shareText: [
        "AI 写的网页和 PPT 常见老三样：紫粉渐变标题、AI 强力驱动徽章、点不动的 href=\"#\" 空链接，还有单页塞满 300 字的 PPT。",
        "dislop 可以在浏览器或命令行直接离线挑出这些模板味：https://dislop.com/#cases",
      ].join("\n"),
    },
  ],
  en: [
    {
      id: "doc",
      kicker: "Case 01 · Work docs & release notes",
      title: "Cutting 'game-changer' only to write 'Not X — it's Y'",
      steps: [
        {
          cls: "is-bad",
          label: "Original (1st-order clichés + chat wrapper)",
          text: "Certainly! Here is the launch note. It's worth noting that CSV exports are a game-changer, finishing in up to 12 minutes for workspaces above 500,000 rows.",
        },
        {
          cls: "is-trap",
          label: "Overcorrected (2nd-order AI slogan)",
          text: "CSV exports finish in up to 12 minutes for workspaces above 500,000 rows. This isn't just an upgrade — it's a new standard.",
        },
        {
          cls: "is-good",
          label: "Cleaned up (just the fact)",
          text: "CSV exports finish in up to 12 minutes for workspaces above 500,000 rows.",
        },
      ],
      loadSpecimenId: "brief",
      loadLabel: "Try in workbench ↓",
      shareLabel: "Copy to share",
      shareText: [
        "Quick AI-slop before/after:",
        "Before: Certainly! Here is the launch note. It's worth noting that CSV exports are a game-changer, finishing in up to 12 minutes for workspaces above 500,000 rows.",
        "Overcorrected: CSV exports finish in up to 12 minutes for workspaces above 500,000 rows. This isn't just an upgrade — it's a new standard.",
        "After: CSV exports finish in up to 12 minutes for workspaces above 500,000 rows.",
        "Try drafts offline + 87 Awesome Anti-Slop tools: https://dislop.com/#cases",
      ].join("\n"),
    },
    {
      id: "autopsy",
      kicker: "Case 02 · Real self-audit (3rd-order cadence)",
      title: "0 linter findings, yet our own previous hero still sounded like AI",
      steps: [
        {
          cls: "is-bad",
          label: "Previous hero (0 findings, still pitchy AI)",
          text: "Drop in a draft, deck, or page. Hard defects get crossed out; cliché lines get a margin query; once you edit, we check every number and link. It never rewrites for you—the pen stays in your hand.",
        },
        {
          cls: "is-good",
          label: "Plain rewrite",
          text: "AI-written docs, Word files, slides, and web pages often ship with chat replies, stock phrasing, crowded slides, or purple-pink template chrome. Copy one line to hand dislop to your AI right now, or test a draft here.",
        },
      ],
      note: "Zero buzzwords triggered a rule, yet the 3-part semicolon pitch, editor roleplay, and pull-quote closer still screamed AI. That's why we put plain writing rules into SKILL.md and the Plugin alongside the linter.",
      linkHref: "./methodology/brand-and-voice.md",
      linkLabel: "Read full autopsy →",
      shareLabel: "Copy to share",
      shareText: [
        "Why a draft with 0 linter findings can still scream AI:",
        "Our own previous hero had zero banned buzzwords, yet a 3-part semicolon pitch + editor costume + pull-quote closer ('the pen stays in your hand') still felt synthetic.",
        "Full before/after & anti-slop Skill/Plugin: https://dislop.com/#cases",
      ].join("\n"),
    },
    {
      id: "ui",
      kicker: "Case 03 · Web UI & slide templates",
      title: "Purple-pink gradient + prompt badge + dead href='#' button",
      steps: [
        {
          cls: "is-bad",
          label: "Default generated template",
          html: '<code>from-indigo via-purple to-pink</code> gradient heading + <code>AI-Powered</code> badge + dead <code>href="#"</code> download button.',
        },
        {
          cls: "is-good",
          label: "Cleaned up",
          html: "Flat paper surfaces with 1px rules, no prompt-echo badge, and a working <code>./report.html</code> link.",
        },
      ],
      note: "The same zero-dep engine inspects .pptx decks for slide word walls (> 120 words), > 6 bullets, autofit text shrink, and generic 'Overview' titles.",
      loadSpecimenId: "ui-chrome",
      loadLabel: "Try in workbench ↓",
      shareLabel: "Copy to share",
      shareText: [
        "Classic AI UI & deck slop: indigo-purple-pink gradients, 'AI-Powered' badges, dead href=\"#\" buttons, and 150-word slides.",
        "dislop catches all of them offline in your browser, CLI, or agent MCP: https://dislop.com/#cases",
      ].join("\n"),
    },
  ],
};

const SHARE_BLURBS_BY_LANG = {
  zh: {
    site: "分享一个开源的去 AI 味工具箱 dislop：发文档、PPT 或网页前，可以直接复制一句话发给你的 AI 按规矩过一遍，也能装成 Claude Code / Codex / Cursor 的 Skill、Plugin 或 MCP，官网还附了一份核验过的 87 条 Awesome Anti-Slop 工具清单。官网：https://dislop.com GitHub：https://github.com/dislop-ai/dislop",
    awesome: "整理了一份 87 条去 AI 味工具与资料清单（Awesome Anti-Slop），涵盖中英文写作规范、Vale / Impeccable 等自动检查器、网页设计规则、PR 治理和论文，支持在线筛选也提供给 Agent 读的 JSON：https://dislop.com/awesome/ （GitHub：https://github.com/dislop-ai/dislop/blob/main/awesome/README.zh-CN.md）",
    cases: "https://dislop.com/#cases",
  },
  en: {
    site: "Checking out dislop — an open-source, zero-dependency anti-slop kit for docs, slides, and web pages. You can paste one line into any AI chat, install it as a Skill / Plugin / MCP for Claude Code, Codex, or Cursor, try drafts offline, or browse 87 Awesome Anti-Slop tools: https://dislop.com (GitHub: https://github.com/dislop-ai/dislop)",
    awesome: "Awesome Anti-Slop: 87 verified anti-slop tools, writing guides, UI standards, PR policies, and papers with an offline filter UI and agent-ready JSON: https://dislop.com/awesome/ (GitHub: https://github.com/dislop-ai/dislop/tree/main/awesome)",
    cases: "https://dislop.com/#cases",
  },
};

// ---------- Snippets by Language ----------

const SNIPPETS_BY_LANG = {
  zh: {
    prompt: `# 复制下面这段直接发给任意能联网的 AI / Agent（免安装）：
请先读 https://dislop.com/llms.txt，按里面的去 AI 味写作规矩和检查方法，帮我把接下来这份稿子（文档 / PPT / 网页）交付前过一遍：
1. 先删掉 AI 寒暄、没填的占位符和空链接；
2. 把套话、二阶口号和三段分号推销句改回平实人话，不编造新数字；
3. 改完再对照规则复检一遍。`,
    skill: `# 一行安装跨宿主 Agent Skill（Claude Code / Codex / Cursor / Windsurf / Antigravity）
npx skills add dislop-ai/dislop

# 装完后你的 Agent 会按三步工作：
# 1. 动笔前套用去 AI 味写作与 UI 规矩（避开一阶套词、二阶口号和三阶推销句）
# 2. 写完调用本地 dislop 检查文档、HTML、Word 或 PPT
# 3. 局部改干净后再复检一遍`,
    plugin: `# 在 Claude Code 里一键安装 Plugin（同时装好 SKILL.md + 本地 MCP 服务）
/plugin marketplace add dislop-ai/dislop
/plugin install dislop@dislop-ai

# 仓库根目录自带标准清单：
# .claude-plugin/marketplace.json · .claude-plugin/plugin.json · .mcp.json`,
    mcp: `{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}`,
    server: `# 开源后台（自托管 BYOK，支持 OpenAI / DeepSeek / Gemini 兼容端点 / Ollama）
# Key 只放服务端环境变量，绝不进仓库或前端；同时提供 /v1/review、/v1/deslop 与远程 /mcp
cp server/.env.example server/.env
set -a && source server/.env && set +a
node server/index.mjs

# 或 Docker 一键部署（零 npm 依赖）：
docker build -f server/Dockerfile -t dislop-server .
docker run --rm -p 8787:8787 -e DISLOP_LLM_API_KEY="YOUR_KEY" dislop-server`,
    cli: `# 检查当前目录（命中硬伤时退出码为 1，同时标出套话提醒）
npx --yes github:dislop-ai/dislop check .

# 只查相对 main 新改的行，并输出 SARIF 报告
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# 用 Python 3.10+ 检查 PPT 或 Word（零外部依赖）
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# 查看某条规则的判断方法和改前/改后示例
npx --yes github:dislop-ai/dislop explain negation-pivot-frame --lang zh`,
    ci: `name: dislop
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npx --yes github:dislop-ai/dislop check --changed origin/main --format github`,
    config: `{
  "failOn": "error",
  "ignore": ["vendor/**", "dist/**"],
  "overrides": [
    { "files": ["docs/**/*.md"], "pack": "business-brief" },
    { "files": ["essays/**/*.md"], "pack": "literary-essay" },
    { "files": ["site/**/*.{html,css,svg}"], "pack": "deck-and-ui" }
  ],
  "allow": ["无缝钢管"]
}`,
  },
  en: {
    prompt: `# Copy and paste this into any web-capable AI chat or coding agent (zero install):
Read https://dislop.com/llms.txt and follow its anti-slop rules before we ship this draft (doc, slide deck, or web page):
1. Remove stray AI chat wrappers, unfilled placeholders, and dead links;
2. Rewrite clichés, 2nd-order slogans, and 3-part semicolon pitches plainly without inventing facts;
3. Run a final check against the rules before delivering.`,
    skill: `# Install the cross-host Agent Skill (Claude Code, Codex, Cursor, Windsurf, Antigravity)
npx skills add dislop-ai/dislop

# Once installed, your agent runs a 3-step loop:
# 1. Draft plainly using the anti-slop prose & UI rules
# 2. Check the Markdown, HTML, DOCX, or PPTX locally
# 3. Clean up flagged spans and re-check`,
    plugin: `# Install as a Claude Code Plugin (bundles SKILL.md + local stdio MCP server)
/plugin marketplace add dislop-ai/dislop
/plugin install dislop@dislop-ai

# Standard plugin manifests live in the repo root:
# .claude-plugin/marketplace.json · .claude-plugin/plugin.json · .mcp.json`,
    mcp: `{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}`,
    server: `# Open-source BYOK server (OpenAI, DeepSeek, Gemini compat, OpenRouter, Ollama)
# Keys live only in server env vars; exposes /v1/check, /v1/review, /v1/deslop & Remote HTTP /mcp
cp server/.env.example server/.env
set -a && source server/.env && set +a
node server/index.mjs

# Or run via Docker (zero npm install):
docker build -f server/Dockerfile -t dislop-server .
docker run --rm -p 8787:8787 -e DISLOP_LLM_API_KEY="YOUR_KEY" dislop-server`,
    cli: `# Check the current folder (exits 1 on core errors, prints style warnings)
npx --yes github:dislop-ai/dislop check .

# Check only lines changed against main and emit SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect a PowerPoint deck or Word file with Python 3.10+ (zero external deps)
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Show the check question and examples for a rule
npx --yes github:dislop-ai/dislop explain negation-pivot-frame`,
    ci: `name: dislop
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npx --yes github:dislop-ai/dislop check --changed origin/main --format github`,
    config: `{
  "failOn": "error",
  "ignore": ["vendor/**", "dist/**"],
  "overrides": [
    { "files": ["docs/**/*.md"], "pack": "business-brief" },
    { "files": ["essays/**/*.md"], "pack": "literary-essay" },
    { "files": ["site/**/*.{html,css,svg}"], "pack": "deck-and-ui" }
  ],
  "allow": ["Delve", "Bayeux Tapestry"]
}`,
  },
};

const PACK_LABELS = {
  zh: {
    core: "硬伤",
    "business-brief": "工作文档",
    "literary-essay": "随笔长文",
    "deck-and-ui": "PPT 和网页",
  },
  en: {
    core: "Hard bugs",
    "business-brief": "Work docs",
    "literary-essay": "Essays",
    "deck-and-ui": "Slides & UI",
  },
};

// ---------- Safe Storage & Application State ----------

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
    // Ignore storage quota or restricted-origin errors
  }
}

let currentLang = safeGetStorage("dislop-lang") === "en" ? "en" : "zh";
let currentTheme = "light";
let heroProofState = "bad";
let activeSpecimenIdx = 0;
let activeSpecimen = SPECIMENS_BY_LANG[currentLang][0];
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
let activeSnippet = "prompt";
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

// ---------- Local Rhythm Stats ----------

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

  const lengths = rawSents
    .map((s) => {
      const han = (s.match(/[\u4E00-\u9FFF]/g) || []).length;
      const latin = (s.match(/[A-Za-z0-9]+/g) || []).length;
      return han + latin;
    })
    .filter((n) => n > 0);

  if (lengths.length === 0) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const emDashes = (stripped.match(/——|—/g) || []).length;

  return {
    sentences: lengths.length,
    meanLen: mean.toFixed(1),
    cv: lengths.length >= 2 ? cv.toFixed(2) : "—",
    emDashes,
  };
}

// ---------- Helpers ----------

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

function cleanRuleCopyForLang(str, lang) {
  if (!str) return "";
  if (lang === "en") {
    return String(str)
      .replace(/\s*\/\s*['"`“「][^'"`”」]*[\u4E00-\u9FFF][^'"`”」]*['"`”」]/g, "")
      .replace(/\s*\([^)]*[\u4E00-\u9FFF][^)]*\)/g, "");
  }
  return String(str);
}

function formatRuleProseHtml(str) {
  return escapeHtml(cleanRuleCopyForLang(str, currentLang))
    .replace(/'(AI-Powered|Zero Hallucination|Overview|Background|studies show)'/g, "<code>$1</code>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function getLocalizedExemplar(rule, lang) {
  const meta = RULE_UI_META[rule.id];
  if (lang === "zh" && meta?.zhEx) return meta.zhEx;
  if (lang === "en" && meta?.enEx) return meta.enEx;
  return rule.exemplar || null;
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
      ? "Word / PPT 文件为只读体检，请修改原文件后重新打开"
      : "Binary files (DOCX/PPTX) are read-only here; edit the source file and re-open"
    : "";
}

function renderAnnotatedLine(lineText, lineGlobalStart, findings) {
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
        title: RULE_UI_META[f.ruleId]?.title?.[currentLang] || f.ruleId,
      });
    }
  });

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  let html = "";
  let cursor = 0;
  for (const t of tokens) {
    if (t.start < cursor) continue;
    if (t.start > cursor) {
      html += escapeHtml(lineText.slice(cursor, t.start));
    }
    const piece = escapeHtml(lineText.slice(t.start, t.end));
    const focused = t.findingIdx === focusedFindingIdx ? " is-focused" : "";
    html += `<span class="${t.cls}${focused}" data-finding-idx="${t.findingIdx}" title="${escapeHtml(t.title)}" tabindex="0">${piece}</span>`;
    cursor = t.end;
  }
  if (cursor < lineText.length) {
    html += escapeHtml(lineText.slice(cursor));
  }
  return html || "&nbsp;";
}

// ---------- Hero 3-State Proof Card Renderer ----------

function renderHeroProof() {
  const data = HERO_PROOF_BY_LANG[currentLang] || HERO_PROOF_BY_LANG.zh;
  const stageEl = document.getElementById("hero-proof-stage");
  const fbEl = document.getElementById("hero-proof-feedback");
  if (!stageEl || !fbEl) return;

  const pack = resolveEffectivePack(data.pack, PACKS_BY_ID);
  const text = data[heroProofState] || data.bad;
  const audit = auditText(text, { filename: data.filename, modality: data.modality, pack });
  stageEl.innerHTML = renderAnnotatedLine(text, 0, audit.findings);

  if (heroProofState === "bad") {
    fbEl.innerHTML = `<ul class="hero-proof-notes">${data.badNotes
      .map(
        (n) =>
          `<li><span class="hero-note-dot is-${n.kind}"></span><span><strong>${escapeHtml(n.label)}</strong>${escapeHtml(n.text)}</span></li>`
      )
      .join("")}</ul>`;
  } else if (heroProofState === "good") {
    fbEl.innerHTML = `<div class="hero-proof-verdict">${escapeHtml(data.goodVerdict)}</div>`;
  } else {
    fbEl.innerHTML = `<div class="hero-proof-verdict is-rejected">${escapeHtml(data.trapVerdict)}</div>`;
  }

  document.querySelectorAll("[data-hero-state]").forEach((btn) => {
    const active = btn.getAttribute("data-hero-state") === heroProofState;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

// ---------- Workbench Renderers ----------

function updateSpecimenRailSelection() {
  const rail = document.getElementById("specimen-list");
  if (!rail) return;
  rail.querySelectorAll(".specimen-btn").forEach((b) => {
    const active = !lastUploadedFile && !customRuleTitle && b.getAttribute("data-specimen-id") === activeSpecimen?.id;
    b.classList.toggle("is-active", active);
  });
}

function renderSpecimenRail() {
  const rail = document.getElementById("specimen-list");
  const titleEl = rail.querySelector(".rail-title");
  const privacyEl = rail.querySelector(".privacy-note");
  rail.querySelectorAll(".specimen-btn").forEach((el) => el.remove());

  const list = SPECIMENS_BY_LANG[currentLang] || SPECIMENS_BY_LANG.zh;
  list.forEach((sp, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "specimen-btn" + (!lastUploadedFile && !customRuleTitle && sp.id === activeSpecimen.id ? " is-active" : "");
    btn.setAttribute("data-specimen-id", sp.id);
    const packName = PACK_LABELS[currentLang]?.[sp.pack] || sp.pack;
    btn.innerHTML = `<span class="spec-num">${sp.num}</span><span class="spec-label">${escapeHtml(sp.label)}</span><span class="spec-pack">${escapeHtml(packName)}</span>`;
    btn.addEventListener("click", () => {
      uploadSeq += 1;
      activeSpecimenIdx = idx;
      activeSpecimen = sp;
      lastUploadedFile = null;
      uploadedOriginalText = null;
      binaryAuditResult = null;
      customRuleTitle = null;
      currentPackId = sp.pack;
      currentFilename = sp.filename;
      currentModality = sp.modality;
      baselineText = sp.bad;
      currentText = sp.bad;
      focusedFindingIdx = 0;
      document.getElementById("pack-select").value = sp.pack;
      setViewMode("proof");
      updateSpecimenRailSelection();
      renderWorkbench();
    });
    rail.insertBefore(btn, privacyEl);
  });
  titleEl.textContent = I18N[currentLang]["wb.specimensTitle"];
}

function renderVoiceMeter(text, modality, isBinary) {
  const valuesEl = document.getElementById("voice-meter-values");
  if (!valuesEl) return;
  if (isBinary) {
    valuesEl.textContent =
      currentLang === "zh"
        ? "二进制文档不统计句长节奏，仅做结构与内容体检。"
        : "Rhythm stats are skipped for binary Office/PDF files.";
    return;
  }
  const st = computeStylometrics(text, modality);
  if (!st) {
    valuesEl.textContent =
      currentLang === "zh" ? "代码或空白稿件不统计句长节奏。" : "Rhythm stats apply to prose drafts.";
    return;
  }
  if (currentLang === "zh") {
    valuesEl.textContent = `句数：${st.sentences} · 平均句长：${st.meanLen} 字 · 句长变化：${st.cv} · 破折号：${st.emDashes}`;
  } else {
    valuesEl.textContent = `sentences: ${st.sentences} · mean length: ${st.meanLen} · variation (CV): ${st.cv} · em-dashes: ${st.emDashes}`;
  }
}

function renderWorkbench() {
  const pack = resolveEffectivePack(currentPackId, PACKS_BY_ID);
  const t0 = performance.now();
  const auditRes = binaryAuditResult
    ? binaryAuditResult
    : auditText(currentText, {
        filename: currentFilename,
        modality: currentModality,
        pack,
      });
  const elapsedMs = (performance.now() - t0).toFixed(1);
  const findings = auditRes.findings || [];
  const skipped = auditRes.skipped || [];

  const proofView = document.getElementById("proof-view");
  const editArea = document.getElementById("edit-textarea");
  const summaryEl = document.getElementById("wb-summary");
  const notesEl = document.getElementById("notes-container");

  setViewMode(viewMode);
  const goodBtn = document.getElementById("btn-apply-good");
  const trapBtn = document.getElementById("btn-apply-trap");
  if (goodBtn) {
    goodBtn.disabled = Boolean(lastUploadedFile || binaryAuditResult || typeof activeSpecimen?.good !== "string");
  }
  if (trapBtn) {
    trapBtn.disabled = Boolean(lastUploadedFile || binaryAuditResult || typeof activeSpecimen?.trap !== "string");
  }

  const errorsCount = findings.filter((f) => f.severity === "error").length;
  const queriesCount = findings.length - errorsCount;

  const isEmptySheet = !binaryAuditResult && currentText.trim().length === 0;
  if (isEmptySheet) {
    summaryEl.innerHTML =
      currentLang === "zh"
        ? `<span>空稿纸 · 等你贴字进来</span><span>${elapsedMs} ms</span>`
        : `<span>Blank sheet · paste a draft</span><span>${elapsedMs} ms</span>`;
  } else {
    summaryEl.innerHTML =
      currentLang === "zh"
        ? `<span>${errorsCount} 处硬伤 · ${queriesCount} 条提醒</span><span>${elapsedMs} ms</span>`
        : `<span>${errorsCount} ${errorsCount === 1 ? "error" : "errors"} · ${queriesCount} ${queriesCount === 1 ? "warning" : "warnings"}</span><span>${elapsedMs} ms</span>`;
  }

  renderVoiceMeter(currentText, currentModality, Boolean(binaryAuditResult));

  // Render Proof Sheet or Edit Mode
  if (viewMode === "edit" && !binaryAuditResult) {
    proofView.hidden = true;
    editArea.hidden = false;
    if (editArea.value !== currentText) {
      editArea.value = currentText;
    }
  } else {
    proofView.hidden = false;
    editArea.hidden = true;

    const lines = currentText.split("\n");
    let offset = 0;
    const htmlLines = lines.map((line, i) => {
      const annotated = binaryAuditResult
        ? escapeHtml(line)
        : renderAnnotatedLine(line, offset, findings);
      offset += line.length + 1;
      return `<li class="proof-line"><span class="line-num">${i + 1}</span><span class="line-content">${annotated}</span></li>`;
    });
    proofView.innerHTML = htmlLines.join("");

    proofView.querySelectorAll("[data-finding-idx]").forEach((el) => {
      const focusHandler = () => {
        focusedFindingIdx = Number(el.getAttribute("data-finding-idx"));
        renderWorkbench();
        const noteCard = notesEl.querySelector(`[data-note-idx="${focusedFindingIdx}"]`);
        if (noteCard) noteCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
      el.addEventListener("click", focusHandler);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          focusHandler();
        }
      });
    });
  }

  // Render Margin Notes
  const cards = [];

  for (const s of skipped) {
    cards.push(`<div class="note-card">
      <div class="note-head"><span class="sev-tag sev-warning">${currentLang === "zh" ? "跳过未查" : "Skipped"}</span><span class="note-loc">${escapeHtml(s.file)}</span></div>
      <div class="note-why">${escapeHtml(s.reason)}</div>
    </div>`);
  }

  if (findings.length === 0 && skipped.length === 0) {
    const cleanMsg = isEmptySheet
      ? currentLang === "zh"
        ? "这里还是空的。点「编辑原文」贴一段字，或者从左边选个例子。"
        : "Nothing here yet. Click 'Edit text' to paste a draft, or pick an example on the left."
      : !lastUploadedFile && !customRuleTitle && activeSpecimen?.id === "clean-nearmiss" && currentText === baselineText
        ? currentLang === "zh"
          ? "0 处问题。“抓手机”是动作，“默认超时不是 30 秒，而是 300 秒”是真实纠偏，“北京大学、清华大学、复旦大学”是真实校名，不会被误伤。"
          : "0 issues. 'Delve' is a debugger, 'wool tapestry' is literal, and the line-42 correction is factual, so nothing gets flagged."
        : currentLang === "zh"
          ? "没查出问题。"
          : "No issues found.";
    cards.push(`<div class="clean-sheet-msg">${escapeHtml(cleanMsg)}</div>`);
  }

  findings.forEach((f, idx) => {
    const isErr = f.severity === "error";
    const ruleDef = (pack.rules || []).find((r) => r.id === f.ruleId);
    const meta = RULE_UI_META[f.ruleId];
    const plainTitle = meta?.title?.[currentLang] || f.ruleId;
    const msg = ruleDef?.message?.[currentLang] || f.message || "";
    const dt = ruleDef?.deletionTest?.[currentLang] || f.deletionTest || "";
    const ex = ruleDef ? getLocalizedExemplar(ruleDef, currentLang) : f.exemplar;
    const loc = typeof f.location === "string" && f.location ? f.location : `${f.line || 1}:${f.col || 1}`;
    const excerpt = f.match || "";
    const focusedCls = idx === focusedFindingIdx ? " is-focused" : "";
    const dotCls = isErr ? "is-error" : "is-warn";

    const exHtml = ex
      ? `<div class="note-exemplar">
          <div><span class="ex-label">${currentLang === "zh" ? "原句：" : "Before:"}</span> ${escapeHtml(sanitizePublicExemplar(ex.bad))}</div>
          ${ex.trap ? `<div><span class="ex-label">${currentLang === "zh" ? "改过头：" : "Overcorrected:"}</span> ${escapeHtml(sanitizePublicExemplar(ex.trap))}</div>` : ""}
          <div><span class="ex-label">${currentLang === "zh" ? "改好：" : "After:"}</span> ${escapeHtml(sanitizePublicExemplar(ex.good))}</div>
        </div>`
      : "";

    cards.push(`<article class="note-card${focusedCls}" data-note-idx="${idx}">
      <div class="note-head">
        <span style="display:inline-flex;align-items:center;gap:8px;font-weight:650;color:var(--ink);font-size:0.86rem;">
          <span class="hero-note-dot ${dotCls}"></span>${escapeHtml(plainTitle)}
        </span>
        <span class="note-loc">${escapeHtml(loc)}</span>
      </div>
      ${excerpt ? `<div class="note-snippet">“${escapeHtml(sanitizePublicExemplar(excerpt))}”</div>` : ""}
      ${dt ? `<div class="note-test"><strong>${currentLang === "zh" ? "判断方法：" : "Check:"}</strong> ${formatRuleProseHtml(dt)}</div>` : ""}
      <details class="note-details">
        <summary>${currentLang === "zh" ? "规则和示例" : "Rule & examples"}</summary>
        <div class="note-why" style="margin-top:6px;">${formatRuleProseHtml(msg)}</div>
        ${exHtml}
        <div style="margin-top:6px;font-family:var(--font-mono);font-size:0.72rem;color:var(--ink-3);">
          <a href="#rule-${escapeHtml(f.ruleId)}">${escapeHtml(f.ruleId)}</a> · <a href="./rules/${escapeHtml(f.ruleId)}.md">.md</a>
        </div>
      </details>
    </article>`);
  });

  notesEl.innerHTML = cards.join("");
  notesEl.querySelectorAll("[data-note-idx]").forEach((card) => {
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("summary, a")) return;
      focusedFindingIdx = Number(card.getAttribute("data-note-idx"));
      renderWorkbench();
    });
  });

  const nudgeEl = document.getElementById("wb-nudge-text");
  if (nudgeEl) {
    if (!isEmptySheet && findings.length === 0 && skipped.length === 0) {
      nudgeEl.textContent =
        currentLang === "zh"
          ? "检查通过（0 处问题）。装成 Skill / Plugin / MCP 让 Agent 下次自动跑，顺手去 GitHub 点个 Star 吧。"
          : "Looks clean (0 issues). Install the Skill, Plugin, or MCP so your agent checks automatically next time, or star us on GitHub.";
    } else if (!isEmptySheet && (lastUploadedFile || currentText !== baselineText)) {
      nudgeEl.textContent =
        currentLang === "zh"
          ? `已标出 ${findings.length} 处问题。不想每次手动贴进来？把 dislop 装给你的 Agent，或去 GitHub 收藏仓库。`
          : `Flagged ${findings.length} ${findings.length === 1 ? "issue" : "issues"}. Install dislop for your agent to run this automatically, or star the repo on GitHub.`;
    } else {
      nudgeEl.textContent = (I18N[currentLang] || I18N.zh)["wb.nudgeText"];
    }
  }
}

// ---------- Real Cases Showcase (Language-Pure + Interactive Load & Share) ----------

function loadSpecimenById(specimenId) {
  const list = SPECIMENS_BY_LANG[currentLang] || SPECIMENS_BY_LANG.zh;
  const idx = list.findIndex((s) => s.id === specimenId);
  if (idx === -1) return;
  const sp = list[idx];
  uploadSeq += 1;
  binaryAuditResult = null;
  lastUploadedFile = null;
  uploadedOriginalText = null;
  customRuleTitle = null;
  activeSpecimenIdx = idx;
  activeSpecimen = sp;
  currentPackId = sp.pack;
  currentFilename = sp.filename;
  currentModality = sp.modality;
  baselineText = sp.bad;
  currentText = sp.bad;
  focusedFindingIdx = 0;
  document.getElementById("pack-select").value = sp.pack;
  setViewMode("proof");
  updateSpecimenRailSelection();
  renderWorkbench();
  document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCases() {
  const grid = document.getElementById("cases-grid");
  if (!grid) return;
  const cases = CASES_BY_LANG[currentLang] || CASES_BY_LANG.zh;
  grid.innerHTML = cases
    .map((c) => {
      const stepsHtml = c.steps
        .map((st) => {
          const body = st.html ? st.html : escapeHtml(st.text);
          return `<div class="case-step ${escapeHtml(st.cls)}"><span class="case-step-label">${escapeHtml(st.label)}</span>${body}</div>`;
        })
        .join("");
      const noteHtml = c.note ? `<p class="case-note">${escapeHtml(c.note)}</p>` : "";
      const primaryAction = c.loadSpecimenId
        ? `<button type="button" class="ctrl-btn ctrl-btn-sm" data-load-case="${escapeHtml(c.loadSpecimenId)}">${escapeHtml(c.loadLabel)}</button>`
        : `<a href="${escapeHtml(c.linkHref)}" class="ctrl-btn ctrl-btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;">${escapeHtml(c.linkLabel)}</a>`;
      return `<article class="case-card">
        <span class="case-kicker">${escapeHtml(c.kicker)}</span>
        <h3 class="case-title">${escapeHtml(c.title)}</h3>
        <div class="case-body">${stepsHtml}${noteHtml}</div>
        <div class="case-actions">
          ${primaryAction}
          <button type="button" class="ctrl-btn ctrl-btn-sm" data-share-case="${escapeHtml(c.id)}">${escapeHtml(c.shareLabel)}</button>
        </div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll("[data-load-case]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadSpecimenById(btn.getAttribute("data-load-case"));
    });
  });

  grid.querySelectorAll("[data-share-case]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const caseId = btn.getAttribute("data-share-case");
      const found = cases.find((x) => x.id === caseId);
      if (found) {
        await copyTextWithFeedback(btn, found.shareText);
      }
    });
  });
}

// ---------- Rule Catalog (Strict Language Purity: ZH shows ZH+both; EN shows EN+both) ----------

function findRuleById(ruleId) {
  for (const [packId, pack] of Object.entries(PACKS_BY_ID)) {
    const found = (pack.rules || []).find((r) => r.id === ruleId);
    if (found) return { packId, rule: found };
  }
  return null;
}

function loadRuleInWorkbench(ruleId) {
  const found = findRuleById(ruleId);
  if (!found || !found.rule.exemplar) return;
  const { packId, rule } = found;
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

  const localizedEx = getLocalizedExemplar(rule, currentLang) || rule.exemplar;
  let badSample = localizedEx.bad;
  let goodSample = localizedEx.good;
  let trapSample = localizedEx.trap || null;

  const probeEx = auditText(badSample, { filename: sampleFilename, modality, pack: effPack });
  if (!probeEx.findings.some((f) => f.ruleId === rule.id)) {
    const rawProbe = auditText(rule.exemplar.bad, { filename: sampleFilename, modality, pack: effPack });
    if (rawProbe.findings.some((f) => f.ruleId === rule.id)) {
      badSample = rule.exemplar.bad;
      goodSample = rule.exemplar.good;
      trapSample = rule.exemplar.trap || null;
    } else if (rule.demo?.bad) {
      badSample = rule.demo.bad;
      goodSample = rule.demo.good || null;
      trapSample = null;
    }
  }

  if (goodSample) {
    const gAudit = auditText(goodSample, { filename: sampleFilename, modality, pack: effPack });
    if (gAudit.findings.length > 0) goodSample = null;
  }
  if (trapSample) {
    const tAudit = auditText(trapSample, { filename: sampleFilename, modality, pack: effPack });
    if (tAudit.findings.length === 0) trapSample = null;
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
  let visibleInLangCount = 0;
  let matchedCount = 0;
  const q = activeRuleSearch.trim().toLowerCase();
  const order = ["core", "business-brief", "literary-essay", "deck-and-ui"];
  const textMods = new Set(["markdown", "text", "html", "css", "jsx", "svg"]);

  for (const pid of order) {
    const pack = PACKS_BY_ID[pid];
    if (!pack) continue;
    for (const r of pack.rules || []) {
      const meta = RULE_UI_META[r.id] || { lang: "both", title: { zh: r.id, en: r.id } };
      // Strict language purity: hide EN-only rules in ZH view and ZH-only rules in EN view
      // (unless specifically targeted via #rule-<id> hash link)
      const hiddenByLang =
        highlightedRuleId !== r.id &&
        ((currentLang === "zh" && meta.lang === "en") || (currentLang === "en" && meta.lang === "zh"));
      if (hiddenByLang) continue;

      visibleInLangCount += 1;
      if (activeRuleFilter !== "all" && activeRuleFilter !== pid) continue;
      if (activeModalityFilter !== "all" && !(r.modalities || []).includes(activeModalityFilter)) continue;
      if (activeSeverityFilter !== "all" && r.severity !== activeSeverityFilter) continue;

      const ex = getLocalizedExemplar(r, currentLang);
      const title = meta.title?.[currentLang] || r.id;
      const why = r.message?.[currentLang] || r.message?.en || "";
      const dt = r.deletionTest?.[currentLang] || r.deletionTest?.en || "";

      if (q) {
        const hay = [r.id, title, pid, why, dt, ex?.bad, ex?.trap, ex?.good, ...(r.modalities || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }

      matchedCount += 1;
      const sevCls = r.severity === "error" ? "sev-error" : "sev-warning";
      const sevLabel =
        currentLang === "zh"
          ? r.severity === "error"
            ? "硬伤"
            : r.severity === "warning"
              ? "提醒"
              : "轻提示"
          : r.severity === "error"
            ? "hard bug"
            : r.severity === "warning"
              ? "warning"
              : "info";
      const canTry = ex && (r.modalities || []).some((m) => textMods.has(m));
      const hashCls = highlightedRuleId === r.id ? " is-hash-target" : "";
      const packLabel = PACK_LABELS[currentLang]?.[pid] || pid;

      const badLabel = currentLang === "zh" ? "原句：" : "Before:";
      const trapLabel = currentLang === "zh" ? "改过头：" : "Overcorrected:";
      const goodLabel = currentLang === "zh" ? "改好：" : "After:";

      rows.push(`<tr id="rule-${escapeHtml(r.id)}" class="rule-row${hashCls}" data-rule-lang="${escapeHtml(meta.lang)}">
        <td class="rule-id-cell">
          <strong>${escapeHtml(title)}</strong>
          <div style="margin-top:2px;"><code>${escapeHtml(r.id)}</code></div>
          <div class="rule-id-actions">
            ${
              canTry
                ? `<button type="button" class="ctrl-btn ctrl-btn-sm" data-try-rule="${escapeHtml(r.id)}">${
                    currentLang === "zh" ? "试试 ↑" : "Try ↑"
                  }</button>`
                : ""
            }
            <a class="rule-md-link" href="./rules/${escapeHtml(r.id)}.md">.md</a>
          </div>
        </td>
        <td>${escapeHtml(packLabel)}<br><span class="sev-tag ${sevCls}" style="font-size:0.75rem;">${escapeHtml(sevLabel)}</span></td>
        <td><code>${escapeHtml((r.modalities || []).join(", "))}</code></td>
        <td><div>${formatRuleProseHtml(why)}</div><div style="color:var(--ink-2);font-size:0.82rem;margin-top:4px;"><strong>${
        currentLang === "zh" ? "判断方法：" : "Check:"
      }</strong> ${formatRuleProseHtml(dt)}</div></td>
        <td>${
          ex
            ? `<div class="ex-stack">
                 <div class="ex-row-bad"><strong>${badLabel}</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.bad))}</code></div>
                 ${ex.trap ? `<div class="ex-row-trap"><strong>${trapLabel}</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.trap))}</code></div>` : ""}
                 <div class="ex-row-good"><strong>${goodLabel}</strong> <code>${escapeHtml(sanitizePublicExemplar(ex.good))}</code></div>
               </div>`
            : "—"
        }</td>
      </tr>`);
    }
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-2);padding:18px;">${
      currentLang === "zh" ? "没有匹配的规则。" : "No rules matched."
    } <button type="button" class="ctrl-btn ctrl-btn-sm" id="rules-clear-empty-btn" style="margin-left:8px;">${
      currentLang === "zh" ? "清空筛选" : "Clear filters"
    }</button></td></tr>`;
    const clearBtn = document.getElementById("rules-clear-empty-btn");
    if (clearBtn) clearBtn.addEventListener("click", resetRuleFilters);
  } else {
    tbody.innerHTML = rows.join("");
  }

  countEl.textContent =
    currentLang === "zh" ? `${matchedCount} / ${visibleInLangCount} 条规则` : `${matchedCount} / ${visibleInLangCount} rules`;

  tbody.querySelectorAll("[data-try-rule]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadRuleInWorkbench(btn.getAttribute("data-try-rule"));
    });
  });
}

function handleRuleHash() {
  const hash = window.location.hash || "";
  const rulesFold = document.getElementById("rules-fold");
  if (hash === "#rules" && rulesFold) {
    rulesFold.open = true;
  }
  if (!hash.startsWith("#rule-")) {
    if (highlightedRuleId) {
      highlightedRuleId = null;
      renderRulesTable();
    }
    return;
  }
  const ruleId = hash.slice("#rule-".length);
  if (!findRuleById(ruleId)) return;

  if (rulesFold) rulesFold.open = true;

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
  const map = SNIPPETS_BY_LANG[currentLang] || SNIPPETS_BY_LANG.zh;
  document.getElementById("snippet-code").textContent = map[activeSnippet] || map.prompt;
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
  if (prevTimer) {
    clearTimeout(prevTimer);
  } else {
    btn.dataset.origLabel = btn.textContent;
  }
  const origLabel = btn.dataset.origLabel || I18N[currentLang]["btn.copy"];
  btn.textContent = copied
    ? I18N[currentLang]["btn.copied"]
    : currentLang === "zh"
      ? "复制失败"
      : "Copy failed";
  const timer = setTimeout(() => {
    const i18nKey = btn.getAttribute("data-i18n");
    btn.textContent = (i18nKey && I18N[currentLang]?.[i18nKey]) || origLabel;
    delete btn.dataset.origLabel;
    copyTimers.delete(btn);
  }, 1200);
  copyTimers.set(btn, timer);
}

function updateThemeToggleLabel() {
  const btn = document.getElementById("theme-toggle");
  const dict = I18N[currentLang] || I18N.zh;
  btn.textContent = currentTheme === "dark" ? dict["theme.light"] : dict["theme.dark"];
  btn.setAttribute("aria-label", currentLang === "zh" ? "切换浅色/深色主题" : "Toggle color theme");
}

function applyI18n(isUserSwitch = false) {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  safeSetStorage("dislop-lang", currentLang);
  const dict = I18N[currentLang] || I18N.zh;
  if (dict["page.title"]) document.title = dict["page.title"];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // Update struck opener text safely without touching the sibling SVG path
  const strikeEl = document.getElementById("hero-strike-text");
  if (strikeEl) strikeEl.textContent = dict["lead.strike"];

  // Footer agent hint with link
  const agentHintEl = document.querySelector("[data-i18n='footer.agentHint']");
  if (agentHintEl) {
    agentHintEl.innerHTML =
      currentLang === "zh"
        ? '给 Agent 读的话，从 <a href="./llms.txt">/llms.txt</a> 开始。'
        : 'For agents, start at <a href="./llms.txt">/llms.txt</a>.';
  }

  // Update GitHub Awesome & Roadmap links to match language
  const ghLink = document.getElementById("awesome-gh-link");
  if (ghLink) {
    ghLink.href =
      currentLang === "zh"
        ? "https://github.com/dislop-ai/dislop/blob/main/awesome/README.zh-CN.md"
        : "https://github.com/dislop-ai/dislop/tree/main/awesome";
  }
  const roadmapHref =
    currentLang === "zh"
      ? "https://github.com/dislop-ai/dislop/blob/main/ROADMAP.zh-CN.md"
      : "https://github.com/dislop-ai/dislop/blob/main/ROADMAP.md";
  const roadmapLink = document.getElementById("footer-roadmap-link");
  if (roadmapLink) roadmapLink.href = roadmapHref;
  const shareRoadmapLink = document.getElementById("share-roadmap-link");
  if (shareRoadmapLink) shareRoadmapLink.href = roadmapHref;

  const searchEl = document.getElementById("rule-search");
  if (searchEl) {
    searchEl.placeholder = currentLang === "zh" ? "搜规则名、毛病或关键词…" : "Search rules or symptoms...";
    searchEl.setAttribute("aria-label", currentLang === "zh" ? "搜索规则" : "Search rules");
  }
  const editAreaEl = document.getElementById("edit-textarea");
  if (editAreaEl) {
    editAreaEl.placeholder =
      currentLang === "zh"
        ? "把你的文档、文案或 HTML 粘贴到这里，实时标出 AI 味…"
        : "Paste your doc, copy, or HTML here to check for AI slop live...";
  }

  const langBtn = document.getElementById("lang-toggle");
  langBtn.textContent = currentLang === "zh" ? "EN" : "中文";
  langBtn.setAttribute("aria-label", currentLang === "zh" ? "Switch to English" : "切换为中文");

  // Swap built-in specimen to native language if user has not uploaded or edited their own draft
  if (isUserSwitch && !lastUploadedFile && !customRuleTitle) {
    const untouched = currentText === baselineText || currentText === activeSpecimen.good || currentText === activeSpecimen.trap;
    if (untouched) {
      const nextList = SPECIMENS_BY_LANG[currentLang] || SPECIMENS_BY_LANG.zh;
      const nextSp = nextList[activeSpecimenIdx] || nextList[0];
      activeSpecimen = nextSp;
      currentPackId = nextSp.pack;
      currentFilename = nextSp.filename;
      currentModality = nextSp.modality;
      baselineText = nextSp.bad;
      currentText = nextSp.bad;
      focusedFindingIdx = 0;
      document.getElementById("pack-select").value = nextSp.pack;
    }
  }

  updateThemeToggleLabel();
  renderHeroProof();
  renderCases();
  renderSpecimenRail();
  renderWorkbench();
  renderSnippet();
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
    currentLang = currentLang === "zh" ? "en" : "zh";
    applyI18n(true);
  });

  // Hero 3-state Proof Card tabs
  document.querySelectorAll("[data-hero-state]").forEach((btn) => {
    btn.addEventListener("click", () => {
      heroProofState = btn.getAttribute("data-hero-state") || "bad";
      renderHeroProof();
    });
  });

  document.getElementById("hero-open-wb")?.addEventListener("click", () => {
    const data = HERO_PROOF_BY_LANG[currentLang] || HERO_PROOF_BY_LANG.zh;
    uploadSeq += 1;
    lastUploadedFile = null;
    uploadedOriginalText = null;
    binaryAuditResult = null;
    customRuleTitle = "hero-proof";
    activeSpecimen = {
      id: "hero-proof",
      pack: data.pack,
      filename: data.filename,
      modality: data.modality,
      bad: data.bad,
      good: data.good,
      trap: data.trap,
    };
    currentPackId = data.pack;
    currentFilename = data.filename;
    currentModality = data.modality;
    baselineText = data.bad;
    currentText = data[heroProofState] || data.bad;
    focusedFindingIdx = 0;
    document.getElementById("pack-select").value = data.pack;
    setViewMode("proof");
    updateSpecimenRailSelection();
    renderWorkbench();
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

  document.getElementById("btn-paste-own")?.addEventListener("click", () => {
    uploadSeq += 1;
    binaryAuditResult = null;
    lastUploadedFile = null;
    uploadedOriginalText = null;
    customRuleTitle = "user-draft";
    currentFilename = "my-draft.md";
    currentModality = currentPackId === "deck-and-ui" ? "html" : "markdown";
    baselineText = "";
    currentText = "";
    focusedFindingIdx = 0;
    setViewMode("edit");
    updateSpecimenRailSelection();
    renderWorkbench();
    const ta = document.getElementById("edit-textarea");
    if (ta) ta.focus();
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
        nextCurrentText =
          currentLang === "zh"
            ? `[已在标签页内存检查本地 ${mod.toUpperCase()}：${file.name}]\n检出：${res.findings.length} 处`
            : `[Inspected local ${mod.toUpperCase()} in browser memory: ${file.name}]\nFindings: ${res.findings.length}`;
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

  document.getElementById("copy-awesome-share-btn")?.addEventListener("click", async (e) => {
    const blurb = (SHARE_BLURBS_BY_LANG[currentLang] || SHARE_BLURBS_BY_LANG.zh).awesome;
    await copyTextWithFeedback(e.currentTarget, blurb);
  });

  document.getElementById("copy-site-share-btn")?.addEventListener("click", async (e) => {
    const blurb = (SHARE_BLURBS_BY_LANG[currentLang] || SHARE_BLURBS_BY_LANG.zh).site;
    await copyTextWithFeedback(e.currentTarget, blurb);
  });

  document.getElementById("copy-cases-link-btn")?.addEventListener("click", async (e) => {
    const blurb = (SHARE_BLURBS_BY_LANG[currentLang] || SHARE_BLURBS_BY_LANG.zh).cases;
    await copyTextWithFeedback(e.currentTarget, blurb);
  });

  document.querySelectorAll('a[href="#rules"]').forEach((link) => {
    link.addEventListener("click", () => {
      const fold = document.getElementById("rules-fold");
      if (fold) fold.open = true;
    });
  });

  window.addEventListener("hashchange", handleRuleHash);

  applyI18n(false);
  handleRuleHash();
}

init();
