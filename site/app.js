import {
  auditOoxmlEntries,
  auditPdfStructure,
  auditText,
  detectModality,
  resolveEffectivePack,
  verifyRevision,
} from "./engine/core.mjs";
import { PACKS_BY_ID, RULE_UI_META } from "./engine/packs-data.mjs";

// ---------- Native Bilingual Copy (Default ZH, Native EN — Zero Translationese) ----------

const I18N = {
  zh: {
    "page.title": "dislop — 给 AI 写的东西配一支红笔",
    "nav.skip": "跳至正文",
    "nav.workbench": "试一试",
    "nav.coverage": "能读什么",
    "nav.rules": "规则",
    "nav.surfaces": "安装",
    "nav.awesome": "同路清单",
    "theme.dark": "深色",
    "theme.light": "浅色",
    "btn.copy": "复制",
    "btn.copied": "已复制",

    "lead.strike": "好的，以下是为您润色后的版本。",
    "lead.title": "你的稿子，不带 AI 味。",
    "lead.sub":
      "把稿子、PPT 或网页贴进来。不能发的硬伤，dislop 直接划掉；听着像套话的地方，它在页边问你一句；等你改完，再拿原稿逐条对一遍数字、链接和引用。它不替你改稿，笔一直在你手里。",
    "lead.cta": "贴一段稿子试试 ↓",
    "lead.awesomeBtn": "翻翻 87 条同路清单 →",
    "lead.starBtn": "GitHub 收藏 ★",
    "lead.reassure": "稿子只留在这个标签页里，不上传，不联网。",
    "lead.cliLabel": "或者在终端里直接跑：",

    "hp.tabBad": "模型交来的原稿",
    "hp.tabGood": "你改完之后",
    "hp.tabTrap": "改过头的一版",
    "hp.meta": "同引擎实时运行 · 划红线直接删，划蓝线你来定",
    "hp.openWb": "在下方工作台打开 →",

    "m1.title": "不能发的，直接划掉。",
    "m1.desc": "漏出来的本机路径、忘了填的占位符、留在开头的 AI 寒暄、点不动的空链接、跑出幻灯片边界的文本框。",
    "m2.title": "像套话的，问你一句。",
    "m2.desc": "一处批注只问一个具体问题，不搞一刀切黑名单，也不逼你换同义词。留不留，你说了算。",
    "m3.title": "改完，和原稿对一遍。",
    "m3.desc": "数字、限定词（最多、至少、不超过）、单位、日期、链接、代码和引用，漏掉或改歪了当场退回。",

    "wb.heading": "拿一份稿子试试",
    "wb.packLabel": "当成什么来看：",
    "pack.brief": "商业简报 / 技术方案",
    "pack.essay": "随笔 / 长文报道",
    "pack.ui": "PPT 与网页界面",
    "wb.openFile": "打开本地文件（.md / .html / .docx / .pptx / .pdf）",
    "wb.specimensTitle": "样稿",
    "wb.privacyNote": "你的稿子只留在这个标签页里。页面锁定了 connect-src 'none'，想往外发都发不出去。",
    "wb.modeProof": "清样批注",
    "wb.modeEdit": "自己改改看",
    "wb.applyClean": "看改好的一版",
    "wb.tryTrap": "看改过头的样子",
    "wb.reset": "恢复原稿",
    "wb.voiceTitle": "这份稿子的节奏",
    "legend.error": "红实线：不能发的硬伤",
    "legend.warn": "蓝虚线：页边商榷",
    "legend.stet": "绿点线：改稿时原样保留",

    "cov.title": "它读得了什么，还读不了什么",
    "cov.desc": "能查的直说能查，还没做的直接标出来。加密或读不了的 PDF 会明确报跳过，绝不假装“0 问题”。",
    "cov.readMd": "阅读说明（.md）→",
    "cov.colTarget": "手头的文件",
    "cov.colFormat": "扩展名",
    "cov.colScope": "能替你挑出什么",
    "cov.colStatus": "现状",
    "cov.r1Name": "文稿、简报与随笔",
    "cov.r1Scope": "开场白寒暄、公文黑话、“不是 A，而是 B”套句、四字排比、段尾说教、无出处数据、中文里混半角标点，以及改完后核对数字、限定词、日期、链接与引用。",
    "cov.r2Name": "Word 与 PowerPoint",
    "cov.r2Scope": "忘接受的修订痕迹和批注、贴进文档没渲染的星号 Markdown、单页字数墙、超限项目符号、文字自动缩太小、文本框跑出画布、空泛标题。",
    "cov.r3Name": "PDF 元数据与链接",
    "cov.r3Scope": "指向本机硬盘的链接、标题里残留的原始文件名、未嵌入字体与页面尺寸混排。加密 PDF 与完整正文抽字会显式标明跳过，不静默放行。",
    "cov.r4Name": "网页界面与矢量图",
    "cov.r4Scope": "点不动的空链接、无说明的禁用按钮、文字对比度不够、深色模式层级发灰倒置、默认紫粉渐变、满屏胶囊标签、三层套盒，以及 SVG 文字被裁切。",
    "cov.r5Name": "代码仓与 PR 改动",
    "cov.r5Scope": "只盯本次修改的行，拦住本机路径、占位符、聊天回复残迹和界面套话，支持输出 GitHub 注解与 SARIF。更深的代码结构规则还在做。",
    "cov.r6Name": "节奏单调与个人声纹",
    "cov.r6Scope": "连环逗号句、句长过于均匀、PPT 连续同版式，以及从你自己写过的旧稿里提炼个人节奏参考。原型脚本已跑通，还没并入主程序。",
    "status.live": "现在能用",
    "status.pdf": "查元数据，正文跳过",
    "status.partial": "交稿门禁可用，AST 还在做",
    "status.notYet": "还不行（原型阶段）",

    "why.title": "为什么只批不改",
    "why.desc":
      "市面上自动“拟人化改写”的工具经常为了改得像人，顺手把“最多 45 秒”改成“45 秒”，或者把一句平实的话换成“不是升级，而是革命”。dislop 只做审校台上的红笔和蓝笔：把问题指出来，把决定权留给你，等你改完再和原稿逐条对数。",
    "why.readBrand": "读我们的文字与设计基准 →",
    "dogfood.badTag": "模型刚写完的原稿 · 挑出 5 处",
    "dogfood.goodTag": "改完再对一遍 · 可以付印",

    "surf.title": "装进你已经在用的地方",
    "surf.desc": "无论模型用的是 Claude、GPT、Gemini、DeepSeek 还是本地开源模型，Node.js 和 Python 双端都零外部依赖，查出来的结果一模一样。",
    "surf.readTools": "全部接入说明（.md）→",
    "surf.w1Title": "浏览器里",
    "surf.w1Desc": "就在上面这个工作台。拖进本地文档，全部在标签页内存里跑完，断网照常工作。",
    "surf.w2Title": "终端里",
    "surf.w2Desc": "用 npx 或 uvx 一行开跑，不用配环境。也支持只查本次 Git 改动，直接出 GitHub PR 批注。",
    "surf.w3Title": "编程 Agent 里",
    "surf.w3Desc": "接上本地 MCP，或装好 SKILL.md，让 Claude Code、Codex、Cursor、Windsurf 交稿前先自己过一遍红笔。",
    "surf.w4Title": "写给 Agent 读的页面",
    "surf.w4Desc": "不想装任何本地工具？让联网 Agent 直接读 /llms.txt 或按场景挑一张千字任务卡。",
    "snip.cli": "终端命令",
    "snip.agent": "Agent 直读",
    "ep.heading": "写给 Agent 读的静态页面（纯文本直读，无测试反例残留）",
    "ep.llms": "Agent 导航首页（按任务选最小文档）",
    "ep.catalog": "全部静态资源的 JSON 索引与字数估算",
    "ep.taskBiz": "任务卡：商业简报与技术方案",
    "ep.taskWeb": "任务卡：网页界面、SVG 与 PPT",
    "ep.taskEdit": "任务卡：随笔与长文报道",
    "ep.taskGate": "任务卡：发稿前硬伤门禁与改稿核对",
    "ep.skill": "跨宿主 Agent Skill（检查 -> 改稿 -> 核对）",
    "ep.awesome": "同路清单 87 条原始 JSON",
    "ep.method": "品牌人格、表达基准与自检清单",
    "ep.full": "单次拉取的全部 29 条规则合集",

    "rules.title": "每条规则，都有改前和改后",
    "rules.desc": "中文页只展示中文与跨格式规则及原生中文例句，不夹英文例子；切到英文可看全部英文专项规则。点「试试 ↑」直接装进上方工作台。",
    "rules.readCases": "全部对照（.md）→",
    "rules.modAll": "全部格式",
    "rules.sevAll": "全部级别",
    "rules.sevError": "红笔硬伤（error）",
    "rules.sevWarn": "蓝笔商榷（warning）",
    "rules.sevInfo": "轻提示（info）",
    "rules.filterAll": "全部",
    "rules.filterCore": "硬伤规则",
    "rules.filterBrief": "商业简报",
    "rules.filterEssay": "随笔长文",
    "rules.filterUi": "PPT 与网页",
    "rules.colId": "规则与操作",
    "rules.colPack": "归属",
    "rules.colMod": "适用格式",
    "rules.colWhy": "挑什么毛病 & 问自己一句",
    "rules.colEx": "原句 → 改过头 → 改好",

    "awesome.title": "同路人：Awesome Anti-Slop",
    "awesome.desc":
      "查文稿规范可以看 Vale，查网页模板味可以翻 Impeccable。我们把中英文写作指南、确定性检查器、前端设计规则、代码 PR 治理与论文研究整理成了 87 条清单，所有链接和仓库状态都在 2026-11-21 逐条核过。",
    "awesome.openFull": "打开同路清单 →",
    "awesome.ecoTitle": "按手头的活儿找工具",
    "awesome.ecoDesc": "按写作、网页、代码或研究分栏浏览，也可以只看能离线自动检查的工具。检测器与规避工具单独放在对照区，仅供了解。",
    "awesome.browseBtn": "在线筛选清单 →",
    "awesome.ghBtn": "GitHub 中文清单",
    "awesome.posTitle": "跳出模板的审美参照",
    "awesome.posDesc": "只删套话还不够，我们另存了 31 处独立印刷、字体厂与出版机构的公开参考源，留给想把页面做出自己味道的人慢慢看。",
    "awesome.posAll": "看全部 31 处设计参考（.md）→",
    "stat.entries": "条已核验资源",
    "stat.sections": "个主题分栏",
    "stat.det": "款可自动检查",
    "stat.zh": "条中文 / 多语种",

    "pos.norm-zurich": "苏黎世独立设计事务所，以极克制的模数网格见长。",
    "pos.stiftung-buchkunst": "世界最美的书评选档案：看页边距、版心比例与长篇阅读怎么拉开呼吸感。",
    "pos.fonts-in-use": "真实印刷品与网页里的字体搭配库。",
    "pos.dinamo": "瑞士独立字厂，看可变字重与大号字阶怎么撑起实用界面。",
    "pos.the-type": "中文排印评论，细聊标点挤压、混排细节与出版规范。",
    "pos.arena": "研究者自己攒的视觉线索库：旧印刷、路牌与独立小书。",

    "footer.selfAudit": "这一页也过了自己的红笔：dislop check site/ 没挑出毛病。",
    "footer.awesome": "同路清单",
    "footer.brand": "品牌与表达",
    "footer.design": "视觉规范",
  },
  en: {
    "page.title": "dislop — a red pen for AI-written drafts, decks, and pages",
    "nav.skip": "Skip to main content",
    "nav.workbench": "Try it",
    "nav.coverage": "What it reads",
    "nav.rules": "Rules",
    "nav.surfaces": "Install",
    "nav.awesome": "Awesome list",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "btn.copy": "Copy",
    "btn.copied": "Copied",

    "lead.strike": "Certainly! Here is your polished draft.",
    "lead.title": "Your draft, minus the slop.",
    "lead.sub":
      "Paste a draft, a deck, or a page. dislop strikes what can't ship, asks one question about what sounds canned, and checks your edit against the original so every number, link, and citation stays put. It never rewrites a word; the pen stays with you.",
    "lead.cta": "Paste your draft ↓",
    "lead.awesomeBtn": "Browse Awesome list (87) →",
    "lead.starBtn": "Star on GitHub ★",
    "lead.reassure": "Stays in this tab. Nothing is uploaded.",
    "lead.cliLabel": "Or run it in a terminal:",

    "hp.tabBad": "Model's draft",
    "hp.tabGood": "After your edit",
    "hp.tabTrap": "Went too far",
    "hp.meta": "Live engine · Red means delete, blue is your call",
    "hp.openWb": "Open in workbench ↓",

    "m1.title": "Strikes what can't ship.",
    "m1.desc": "A leaked local path, an unfilled placeholder, a stray chatbot greeting, a dead link, or a text box running off the slide.",
    "m2.title": "Asks about what sounds canned.",
    "m2.desc": "One plain question per mark—never a blunt banned-word list that punishes real nouns. You decide what stays.",
    "m3.title": "Checks your edit against the original.",
    "m3.desc": "Numbers, qualifiers (up to, at least), units, dates, links, code spans, and citations all have to survive.",

    "wb.heading": "Try it on a real draft",
    "wb.packLabel": "Read it as:",
    "pack.brief": "Business brief / tech spec",
    "pack.essay": "Essay / longform",
    "pack.ui": "Slide deck / web page",
    "wb.openFile": "Open a local file (.md / .html / .docx / .pptx / .pdf)",
    "wb.specimensTitle": "Sample drafts",
    "wb.privacyNote": "Your draft stays in this tab. The page's CSP sets connect-src 'none', so it couldn't phone home if it tried.",
    "wb.modeProof": "Proof sheet",
    "wb.modeEdit": "Edit & recheck",
    "wb.applyClean": "Show a clean edit",
    "wb.tryTrap": "Try an overcorrection",
    "wb.reset": "Reset",
    "wb.voiceTitle": "Rhythm of this draft",
    "legend.error": "Red, solid: can't ship",
    "legend.warn": "Blue, dashed: worth a second look",
    "legend.stet": "Green, dotted: kept as written",

    "cov.title": "What it reads, and what it can't yet",
    "cov.desc": "What works today sits apart from what is still in progress. Encrypted or unreadable PDFs are reported as skipped, never marked clean.",
    "cov.readMd": "Read overview (.md) →",
    "cov.colTarget": "What you bring",
    "cov.colFormat": "Extensions",
    "cov.colScope": "What dislop catches",
    "cov.colStatus": "Status",
    "cov.r1Name": "Drafts, briefs & essays",
    "cov.r1Scope": "Chatbot greetings, throat-clearing openers, buzzwords, 'Not X, but Y' pivots, staccato slogan runs, moralizing endings, unsourced claims, and edit comparison for numbers, qualifiers, dates, links, and citations.",
    "cov.r2Name": "Word & PowerPoint",
    "cov.r2Scope": "Unaccepted tracked changes and comments, raw Markdown asterisks left in docs, slide word-walls, bullet overload, shrunk autofit text, off-slide boxes, and vague topic titles.",
    "cov.r3Name": "PDF metadata & links",
    "cov.r3Scope": "Local file:/// URIs, raw filename titles, unembedded fonts, and mismatched page sizes. Encrypted PDFs and full body extraction are explicitly skipped.",
    "cov.r4Name": "Web pages & SVG",
    "cov.r4Scope": "Dead href='#' controls, unexplained disabled buttons, low WCAG contrast, dark-mode surface inversions, purple-pink AI gradients, pill-badge walls, 3-level nested boxes, and clipped SVG labels.",
    "cov.r5Name": "Git diffs & PRs",
    "cov.r5Scope": "Checks only the lines you changed for leaked paths, placeholders, chat wrappers, and UI slop, with GitHub annotations and SARIF output. Deeper AST code rules are not built yet.",
    "cov.r6Name": "Rhythm monotony & voice",
    "cov.r6Scope": "Comma-chain sentences, flat sentence lengths, repeated slide layouts, and offline rhythm profiles built from your own writing. Prototype verified, not shipped in the core yet.",
    "status.live": "Works today",
    "status.pdf": "Metadata today, body skipped",
    "status.partial": "Diff hygiene works; AST not yet",
    "status.notYet": "Not yet (prototype)",

    "why.title": "Why it marks and never rewrites",
    "why.desc":
      "Tools that auto-rewrite drafts to 'sound human' quietly turn 'up to 12 minutes' into '12 minutes', or swap plain sentences for dramatic slogans. dislop only marks the page. You edit in your own voice, and verify checks that every number, link, and citation made it through.",
    "why.readBrand": "Read our brand & voice guide →",
    "dogfood.badTag": "As the model wrote it · 4 marks",
    "dogfood.goodTag": "After your edit · Pass for press",

    "surf.title": "Put it where you already work",
    "surf.desc": "Works on drafts from Claude, GPT, Gemini, DeepSeek, or local models. Zero external runtime dependencies, and identical results in Node.js, Python, and the browser.",
    "surf.readTools": "All integration docs (.md) →",
    "surf.w1Title": "In a browser tab",
    "surf.w1Desc": "Right above on this page. Drop in a local file and inspect it in memory with no network access.",
    "surf.w2Title": "In a terminal",
    "surf.w2Desc": "Run once with npx or uvx. Gate only changed lines in a pull request and emit GitHub annotations.",
    "surf.w3Title": "Inside your coding agent",
    "surf.w3Desc": "Attach the local stdio MCP server or install SKILL.md so Claude Code, Codex, Cursor, and Windsurf check drafts before handoff.",
    "surf.w4Title": "Pages written for agents",
    "surf.w4Desc": "No shell or MCP? Point any web-capable agent at /llms.txt or a single ~1,000-token task guide.",
    "snip.cli": "Terminal",
    "snip.agent": "Agent fetch",
    "ep.heading": "Pages written for agents (plain Markdown & JSON, no raw test fixtures)",
    "ep.llms": "Start here: compact task router",
    "ep.catalog": "Everything as versioned JSON with token estimates",
    "ep.taskBiz": "Guide: review a brief or proposal",
    "ep.taskWeb": "Guide: check a web page or slide deck",
    "ep.taskEdit": "Guide: edit an essay",
    "ep.taskGate": "Guide: check files before release",
    "ep.skill": "Cross-host Agent Skill (check -> edit -> verify)",
    "ep.awesome": "Raw JSON for all 87 Awesome Anti-Slop entries",
    "ep.method": "Brand voice guide & editorial self-check",
    "ep.full": "Single-fetch compilation of all 29 rules",

    "rules.title": "Every rule, with a before and an after",
    "rules.desc": "The English view shows English and cross-format rules with native English examples only; switch to 中文 for Chinese-specific rules. Click 'Try ↑' to load any rule into the workbench.",
    "rules.readCases": "All contrasts (.md) →",
    "rules.modAll": "All formats",
    "rules.sevAll": "All levels",
    "rules.sevError": "Can't ship (error)",
    "rules.sevWarn": "Query (warning)",
    "rules.sevInfo": "Note (info)",
    "rules.filterAll": "All",
    "rules.filterCore": "Can't-ship",
    "rules.filterBrief": "Business brief",
    "rules.filterEssay": "Essay",
    "rules.filterUi": "Decks & UI",
    "rules.colId": "Rule & action",
    "rules.colPack": "Pack",
    "rules.colMod": "Formats",
    "rules.colWhy": "What it catches & question to ask",
    "rules.colEx": "Before → Overcorrected → After",

    "awesome.title": "Other people working on this",
    "awesome.desc":
      "Vale checks prose against a style guide. Impeccable checks web interfaces. We gathered 87 checked tools, style guides, UI design rules, PR policies, and papers into Awesome Anti-Slop—every link and GitHub snapshot verified on 2026-11-21.",
    "awesome.openFull": "Open Awesome list →",
    "awesome.ecoTitle": "Browse by what you're editing",
    "awesome.ecoDesc": "Filter by writing, web UI, code, or research, or show only tools that run automated checks. Detectors and bypass tools sit separately for reference only.",
    "awesome.browseBtn": "Filter all 87 entries →",
    "awesome.ghBtn": "View on GitHub",
    "awesome.posTitle": "Design references outside the template",
    "awesome.posDesc": "Cutting clichés is only half the job. We also keep 31 public print, type foundry, and editorial references for when you want a page to feel unmistakably yours.",
    "awesome.posAll": "See all 31 design references (.md) →",
    "stat.entries": "checked entries",
    "stat.sections": "topics",
    "stat.det": "automated checks",
    "stat.zh": "zh / multilingual",

    "pos.norm-zurich": "Strict modular graphic systems, micro-typographic rules, and structural restraint.",
    "pos.stiftung-buchkunst": "Book proportion, margin choreography, and pacing principles transferable to reports, PDFs, and decks.",
    "pos.fonts-in-use": "Real-world typography pairings across books, posters, and interfaces.",
    "pos.dinamo": "Independent Swiss foundry demonstrating typographic scale, variable axes, and clean utility UI.",
    "pos.the-type": "Chinese and multilingual typography critique, CJK punctuation mechanics, and editorial layout standards.",
    "pos.arena": "Research-oriented visual channels for archival print, editorial systems, and signage.",

    "footer.selfAudit": "This page went under its own red pen: dislop check site/ found nothing to mark.",
    "footer.awesome": "Awesome list",
    "footer.brand": "Brand & voice",
    "footer.design": "Visual guide",
  },
};

// ---------- Hero 3-State Proof Card Data (100% Language-Pure, Live Engine Verified) ----------

const HERO_PROOF_BY_LANG = {
  zh: {
    filename: "launch-note.md",
    modality: "markdown",
    pack: "business-brief",
    bad: "好的，以下是修改后的上线说明。值得注意的是，本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒。这不是一次简单的升级，而是一场效率革命。",
    good: "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒。",
    trap: "这次改造给队列分了级，一线运维团队的故障恢复时间 45 秒。",
    badNotes: [
      { kind: "error", label: "红笔硬伤：", text: "AI 寒暄留在第一行，直接删掉。" },
      { kind: "warn", label: "蓝笔商榷：", text: "去掉“抓手”“全面赋能”和“不是……而是……”，谁对什么做了什么？" },
      { kind: "stet", label: "绿点保留：", text: "“最多 45 秒”已记下，改完会拿原稿核对。" },
    ],
    goodVerdict: "可以付印。5 处批注全部清完，“最多 45 秒”一字没动。",
    trapVerdict: "退回重对。原稿写的是“最多 45 秒”，改后只剩“45 秒”——这是另一个承诺。",
  },
  en: {
    filename: "launch-note.md",
    modality: "markdown",
    pack: "business-brief",
    bad: "Certainly! Here is the launch note. It's worth noting that exports now finish in up to 12 minutes for workspaces above 500,000 rows. This isn't just a speed bump — it's a game-changer.",
    good: "Exports now finish in up to 12 minutes for workspaces above 500,000 rows.",
    trap: "Exports now finish in 12 minutes for workspaces above 500,000 rows.",
    badNotes: [
      { kind: "error", label: "Red mark:", text: "Chatbot greeting on line one. Delete it." },
      { kind: "warn", label: "Blue query:", text: "Cut the throat-clearing and slogan frame—what concrete fact is left?" },
      { kind: "stet", label: "Green stet:", text: 'Kept as written: "up to 12 minutes" and "above 500,000 rows".' },
    ],
    goodVerdict: 'Pass for press. 4 marks cleared; "up to 12 minutes" and "above 500,000 rows" survived word for word.',
    trapVerdict: 'Sent back. The original said "up to 12 minutes"; your edit says "12 minutes", and that is a different promise.',
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
        "详见 [架构图](file:///tmp/release-v3/arch.png)，压测延迟数据见【待补充】。",
        "",
        "值得注意的是，本次改造以工单分级为重要抓手，全面赋能一线客服团队形成服务闭环，将首响时间压缩至最多 45 秒。",
        "",
        "这不是一次简单的升级，而是一场效率革命。",
      ].join("\n"),
      trap: [
        "详见 [架构图](./docs/arch.png)，压测延迟待压测签字后补齐。",
        "",
        "本次改造给工单分了级，一线客服首响时间压缩至 45 秒。这不是普通优化，而是行业标杆。",
      ].join("\n"),
      good: [
        "详见 [架构图](./docs/arch.png)，压测延迟待压测签字后补齐。",
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
        "冬至那天下了初雪，院子里的腊梅开了几朵；香气飘到走廊。",
        "",
        "老周的旧刨子不是木头，而是时间本身。",
        "",
        "修表匠泡好齿轮，关掉台灯。",
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
        '<div class="bg-gradient-to-r from-indigo via-purple to-pink bg-clip-text text-transparent">',
        "  <h2>1.2 秒查完 48 份演示文稿</h2>",
        '  <a href="#">下载完整报告</a>',
        '  <button disabled>立即导出</button>',
        "</div>",
      ].join("\n"),
      trap: [
        '<div class="surface-card">',
        "  <h2>快速查完演示文稿</h2>",
        '  <a href="./report.pdf">下载完整报告</a>',
        "</div>",
      ].join("\n"),
      good: [
        '<div class="surface-card">',
        "  <h2>1.2 秒查完 48 份演示文稿</h2>",
        '  <a href="./report.pdf">下载完整报告</a>',
        '  <button type="button" disabled title="请先选择要导出的文件">立即导出</button>',
        "</div>",
      ].join("\n"),
    },
    {
      id: "verify-demo",
      num: "04",
      label: "改稿核对演示",
      pack: "business-brief",
      filename: "sla-update.md",
      modality: "markdown",
      bad: [
        "好的，以下是修改后的公告。",
        "",
        "新版网关具备精准高效、安全可靠、灵活易用的特性，单节点可支持至少 8000 次每秒请求，迁移窗口最多 300 毫秒，详情见 https://status.example.com/q3。",
        "",
        "值得注意的是，本次切换以灰度发布为抓手。",
      ].join("\n"),
      trap: [
        "新版网关单节点支持 8000 次每秒请求，迁移窗口 300 毫秒，详情见 https://status.example.com/q3。",
        "",
        "这不是一次普通升级，而是系统架构的质变。",
      ].join("\n"),
      good: [
        "新版网关单节点可支持至少 8000 次每秒请求，迁移窗口最多 300 毫秒，详情见 https://status.example.com/q3。",
        "",
        "本次切换采用灰度发布。",
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
        "她抓手机拍下黑板上的推导过程，顺手记下 2026-10-15 的压测结果。",
        "",
        "北京大学、清华大学、复旦大学三校联合公开了这份语料，单次推理平均延迟降至 18 毫秒。",
      ].join("\n"),
      trap: [
        "她拍下黑板上的推导过程，记下了压测结果。",
        "",
        "这不是一份普通的语料，而是学术协作的新起点。",
      ].join("\n"),
      good: [
        "她抓手机拍下黑板上的推导过程，顺手记下 2026-10-15 的压测结果。",
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
        "See [Architecture](file:///tmp/release-v3/arch.png); p95 latency is [insert p95 latency].",
        "",
        "It is worth noting that CSV exports take up to 12 minutes for accounts above 500,000 rows. This is a game-changer that isn't just faster — it's a paradigm shift.",
      ].join("\n"),
      trap: [
        "See [Architecture](./docs/arch.png); p95 latency is pending load-test sign-off.",
        "",
        "CSV exports take 12 minutes for accounts above 500,000 rows. Fast. Clean. Ready.",
      ].join("\n"),
      good: [
        "See [Architecture](./docs/arch.png); p95 latency is pending load-test sign-off.",
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
        "At 6:15 a.m., the ferry deck smelled of wet rope and diesel. And perhaps that is what quiet endurance really means in a noisy world.",
      ].join("\n"),
      trap: [
        "The station clock stopped before the rain, leaving the platform quiet.",
        "",
        "The ferry deck smelled of wet rope and diesel. It wasn't just a crossing — it was a reckoning.",
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
        '<div class="bg-gradient-to-r from-indigo via-purple to-pink bg-clip-text text-transparent">',
        '  <span class="badge">AI-Powered · Zero Hallucination</span>',
        "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
        '  <a href="#">Download report</a>',
        "</div>",
      ].join("\n"),
      trap: [
        '<div class="surface-card">',
        "  <h2>Audit slide decks in seconds</h2>",
        '  <a href="./report.pdf">Download report</a>',
        "</div>",
      ].join("\n"),
      good: [
        '<div class="surface-card">',
        "  <h2>Audit 48 slide decks in 1.2 seconds</h2>",
        '  <a href="./report.pdf">Download report</a>',
        "</div>",
      ].join("\n"),
    },
    {
      id: "verify-demo",
      num: "04",
      label: "Edit comparison",
      pack: "business-brief",
      filename: "sla-note.md",
      modality: "markdown",
      bad: [
        "Certainly! Here is the revised notice.",
        "",
        "Studies show that 70% of decks fail contrast checks. Exports finish in up to 300 ms across 14 gateways; see https://status.example.com/q3.",
        "",
        "Signals drop. Audits stall. Launches slip.",
      ].join("\n"),
      trap: [
        "Our audit flagged decks for contrast failures. Exports finish in 300 ms across 14 gateways; see https://status.example.com/q3.",
      ].join("\n"),
      good: [
        "Our internal audit flagged 70% of decks for contrast failures. Exports finish in up to 300 ms across 14 gateways; see https://status.example.com/q3.",
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
        "Median query latency fell to 18 ms across 14 regions.",
      ].join("\n"),
      trap: [
        "The debugger inspected an archive.",
        "",
        "This isn't just speed — it's clarity.",
      ].join("\n"),
      good: [
        "The Delve debugger inspected a 19th-century wool tapestry archive on 2026-10-15.",
        "",
        "Median query latency fell to 18 ms across 14 regions.",
      ].join("\n"),
    },
  ],
};

// ---------- Snippets by Language ----------

const SNIPPETS_BY_LANG = {
  zh: {
    cli: `# 检查当前目录（命中硬伤时退出码为 1，同时提示套话商榷）
npx --yes github:dislop-ai/dislop check .

# 只查相对 main 新改的行，并输出 SARIF 报告
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# 用 Python 3.10+ 检查 PPT 或 Word（零外部依赖）
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# 改完和原稿对一遍：核对数字、限定词、链接与代码是否完好
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md`,
    mcp: `{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}`,
    agent: `# 1. 先让联网 Agent 读导航首页（约 2.1 KB）
curl -fsSL https://dislop.com/llms.txt

# 2. 按手头的活儿挑一张千字任务卡
curl -fsSL https://dislop.com/tasks/business-doc.md
curl -fsSL https://dislop.com/tasks/web-and-deck.md

# 3. 读取 87 条同路清单的 JSON 数据
curl -fsSL https://dislop.com/awesome/index.json`,
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
    cli: `# Check the current folder (exits 1 on core errors, prints style queries)
npx --yes github:dislop-ai/dislop check .

# Check only lines changed against main and emit SARIF 2.1.0
npx --yes github:dislop-ai/dislop check --changed origin/main --format sarif > dislop.sarif

# Inspect a PowerPoint deck or Word file with Python 3.10+ (zero external deps)
uvx --from git+https://github.com/dislop-ai/dislop dislop check quarterly-review.pptx

# Compare your revision against the original
npx --yes github:dislop-ai/dislop verify draft.before.md draft.after.md`,
    mcp: `{
  "mcpServers": {
    "dislop": {
      "command": "npx",
      "args": ["--yes", "github:dislop-ai/dislop", "--mcp"]
    }
  }
}`,
    agent: `# 1. Start with the compact task router (~2.1 KB)
curl -fsSL https://dislop.com/llms.txt

# 2. Fetch one ~1,000-token guide for your task
curl -fsSL https://dislop.com/tasks/business-doc.md
curl -fsSL https://dislop.com/tasks/web-and-deck.md

# 3. Load all 87 Awesome Anti-Slop entries as JSON
curl -fsSL https://dislop.com/awesome/index.json`,
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
    core: "硬伤规则",
    "business-brief": "商业简报",
    "literary-essay": "随笔长文",
    "deck-and-ui": "PPT 与网页",
  },
  en: {
    core: "Can't-ship",
    "business-brief": "Business brief",
    "literary-essay": "Essay",
    "deck-and-ui": "Decks & UI",
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
      ? "Word / PPT / PDF 文件为只读体检，请修改原文件后重新打开"
      : "Binary files (DOCX/PPTX/PDF) are read-only here; edit the source file and re-open"
    : "";
}

function collectStetRanges(text, findingSpans) {
  const ranges = [];
  const numRe =
    /(?<![A-Za-z0-9_/-])(?:(?:\b(?:up to|at least|under|over|above|below)\s+|(?:最多|至少|不超过|低于|高于)\s*))?(?:[$¥€£]\s*)?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:%|(?:ms|s|sec|seconds?|min|minutes?|hours?|days?|weeks?|rows?|nodes?|decks?|gateways?|regions?)(?![A-Za-z])|毫秒|秒|分钟|小时|天|周|次|页|条|行|枚|张|所|朵|份))?/giu;
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
        title: RULE_UI_META[f.ruleId]?.title?.[currentLang] || f.ruleId,
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
          cls: "mark-stet",
          findingIdx: -1,
          title: currentLang === "zh" ? "原样保留的数字与限定词" : "Protected number / qualifier",
        });
      }
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
    if (t.findingIdx >= 0) {
      const focused = t.findingIdx === focusedFindingIdx ? " is-focused" : "";
      html += `<span class="${t.cls}${focused}" data-finding-idx="${t.findingIdx}" title="${escapeHtml(t.title)}" tabindex="0">${piece}</span>`;
    } else {
      html += `<span class="${t.cls}" title="${escapeHtml(t.title)}">${piece}</span>`;
    }
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
  const spans = audit.findings.map((f) => f.span).filter(Boolean);
  const stet = collectStetRanges(text, spans);
  stageEl.innerHTML = renderAnnotatedLine(text, 0, audit.findings, stet);

  if (heroProofState === "bad") {
    fbEl.innerHTML = `<ul class="hero-proof-notes">${data.badNotes
      .map(
        (n) =>
          `<li><span class="hero-note-dot is-${n.kind}"></span><span><strong>${escapeHtml(n.label)}</strong>${escapeHtml(n.text)}</span></li>`
      )
      .join("")}</ul>`;
  } else if (heroProofState === "good") {
    const v = verifyRevision(data.bad, data.good, { filename: data.filename, modality: data.modality, pack });
    fbEl.innerHTML = `<div class="hero-proof-verdict">${escapeHtml(
      v.ok ? data.goodVerdict : v.reasons.join("; ")
    )}</div>`;
  } else {
    const v = verifyRevision(data.bad, data.trap, { filename: data.filename, modality: data.modality, pack });
    fbEl.innerHTML = `<div class="hero-proof-verdict is-rejected">${escapeHtml(
      !v.ok ? data.trapVerdict : ""
    )}</div>`;
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
  const verifyBox = document.getElementById("verify-box");
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
        ? `<span>${errorsCount} 处硬伤 · ${queriesCount} 条商榷</span><span>${elapsedMs} ms</span>`
        : `<span>${errorsCount} ${errorsCount === 1 ? "error" : "errors"} · ${queriesCount} ${queriesCount === 1 ? "query" : "queries"}</span><span>${elapsedMs} ms</span>`;
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
    const findingSpans = findings.map((f) => f.span).filter(Boolean);
    const stetRanges = binaryAuditResult ? [] : collectStetRanges(currentText, findingSpans);
    let offset = 0;
    const htmlLines = lines.map((line, i) => {
      const annotated = binaryAuditResult
        ? escapeHtml(line)
        : renderAnnotatedLine(line, offset, findings, stetRanges);
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

  // Edit comparison verdict
  if (!binaryAuditResult && currentText !== baselineText) {
    const v = verifyRevision(baselineText, currentText, {
      filename: currentFilename,
      modality: currentModality,
      pack,
    });
    verifyBox.hidden = false;
    verifyBox.className = "verify-banner " + (v.ok ? "is-accepted" : "is-rejected");
    const title = v.ok
      ? currentLang === "zh"
        ? `可以付印（批注 ${v.beforeFindings} → ${v.afterFindings}，数字与链接原样保留）`
        : `Pass for press (marks ${v.beforeFindings} → ${v.afterFindings}; numbers, links & code intact)`
      : currentLang === "zh"
        ? `退回重对（批注 ${v.beforeFindings} → ${v.afterFindings}）`
        : `Sent back (marks ${v.beforeFindings} → ${v.afterFindings})`;
    const reasonsHtml = v.reasons.length
      ? `<ul>${v.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
      : "";
    verifyBox.innerHTML = `<strong>${escapeHtml(title)}</strong>${reasonsHtml}`;
  } else {
    verifyBox.hidden = true;
    verifyBox.innerHTML = "";
  }

  // Render Editor-Style Margin Notes
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
        ? "空稿纸。切到「自己改改看」贴一段文字，或从左侧选一份样稿。"
        : "Blank sheet. Switch to 'Edit & recheck' to paste a draft, or pick a sample on the left."
      : !lastUploadedFile && !customRuleTitle && activeSpecimen?.id === "clean-nearmiss" && currentText === baselineText
        ? currentLang === "zh"
          ? "可以付印。“抓手机”是动作，“北京大学、清华大学、复旦大学”是真实校名，数字原样保留——点击「看改过头的样子」试试会怎样。"
          : "Pass for press. 'Delve' is the debugger here, 'wool tapestry' is literal, and numbers stay untouched. Click 'Try an overcorrection' to compare."
        : currentLang === "zh"
          ? "可以付印。这一版没挑出硬伤或套话。"
          : "Pass for press. No marks from this rule pack.";
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
      ${dt ? `<div class="note-test"><strong>${currentLang === "zh" ? "问自己一句：" : "Ask yourself:"}</strong> ${formatRuleProseHtml(dt)}</div>` : ""}
      <details class="note-details">
        <summary>${currentLang === "zh" ? "看规则和改法" : "Show rule & fix"}</summary>
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
}

// ---------- Verified Language-Pure Dogfood Contrast ----------

function renderDogfood() {
  const data = HERO_PROOF_BY_LANG[currentLang] || HERO_PROOF_BY_LANG.zh;
  const pack = resolveEffectivePack(data.pack, PACKS_BY_ID);
  const badRes = auditText(data.bad, { filename: data.filename, modality: data.modality, pack });
  const goodRes = auditText(data.good, { filename: data.filename, modality: data.modality, pack });
  const ver = verifyRevision(data.bad, data.good, { filename: data.filename, modality: data.modality, pack });

  const badTextEl = document.getElementById("dogfood-bad-text");
  const badMetaEl = document.getElementById("dogfood-bad-meta");
  const goodTextEl = document.getElementById("dogfood-good-text");
  const goodMetaEl = document.getElementById("dogfood-good-meta");
  if (!badTextEl || !goodTextEl) return;

  badTextEl.textContent = data.bad;
  goodTextEl.textContent = data.good;

  const errs = badRes.findings.filter((f) => f.severity === "error").length;
  const warns = badRes.findings.length - errs;
  if (badMetaEl) {
    badMetaEl.textContent =
      currentLang === "zh"
        ? `实时检出：硬伤 ${errs} 处 · 商榷 ${warns} 处`
        : `Live check: ${errs} error · ${warns} queries`;
  }
  if (goodMetaEl) {
    goodMetaEl.textContent =
      currentLang === "zh"
        ? `实时检出：${goodRes.findings.length} 处批注 · verify ${ver.ok ? "通过（“最多 45 秒”原样保留）" : "退回"}`
        : `Live check: ${goodRes.findings.length} marks · verify ${ver.ok ? 'accepted ("up to 12 minutes" intact)' : "rejected"}`;
  }
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
    const v = verifyRevision(badSample, goodSample, { filename: sampleFilename, modality, pack: effPack });
    if (!v.ok) goodSample = null;
  }
  if (trapSample) {
    const vt = verifyRevision(badSample, trapSample, { filename: sampleFilename, modality, pack: effPack });
    if (vt.ok) trapSample = null;
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
            ? "红笔硬伤"
            : r.severity === "warning"
              ? "蓝笔商榷"
              : "轻提示"
          : r.severity === "error"
            ? "can't ship"
            : r.severity === "warning"
              ? "query"
              : "note";
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
        currentLang === "zh" ? "问自己一句：" : "Ask yourself:"
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
  const map = SNIPPETS_BY_LANG[currentLang] || SNIPPETS_BY_LANG.zh;
  document.getElementById("snippet-code").textContent = map[activeSnippet] || map.cli;
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
        ? '让 Agent 来读？从 <a href="./llms.txt">/llms.txt</a> 开始。'
        : 'Sending an agent? Start it at <a href="./llms.txt">/llms.txt</a>.';
  }

  // Update GitHub Awesome link to match language
  const ghLink = document.getElementById("awesome-gh-link");
  if (ghLink) {
    ghLink.href =
      currentLang === "zh"
        ? "https://github.com/dislop-ai/dislop/blob/main/awesome/README.zh-CN.md"
        : "https://github.com/dislop-ai/dislop/tree/main/awesome";
  }

  const searchEl = document.getElementById("rule-search");
  if (searchEl) {
    searchEl.placeholder = currentLang === "zh" ? "搜规则名、毛病或关键词…" : "Search rules or symptoms...";
    searchEl.setAttribute("aria-label", currentLang === "zh" ? "搜索规则" : "Search rules");
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
  renderSpecimenRail();
  renderWorkbench();
  renderDogfood();
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
              currentLang === "zh"
                ? "浏览器模式只检查未压缩 PDF 元数据与链接；压缩流请用本机 Node.js 或 Python CLI。"
                : "Browser mode checks uncompressed PDF metadata and /URI objects only; compressed streams require the Node.js or Python CLI.",
          },
        ];
        nextBinaryResult = res;
        nextCurrentText =
          currentLang === "zh"
            ? `[已在标签页内存检查本地 PDF 元数据与链接：${file.name}]\n检出：${res.findings.length} 处`
            : `[Inspected local PDF metadata & /URI links in browser memory: ${file.name}]\nFindings: ${res.findings.length}`;
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

  window.addEventListener("hashchange", handleRuleHash);

  applyI18n(false);
  handleRuleHash();
}

init();
