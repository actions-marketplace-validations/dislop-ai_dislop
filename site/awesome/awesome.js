import { AWESOME_DATA } from "./awesome-data.mjs";

const SECTION_LABELS = {
  "standards-research-policy": { zh: "标准、研究与平台政策", en: "Standards, Research, and Policy" },
  "prose-en-multilingual": { zh: "英文与多语种写作", en: "English and Multilingual Writing" },
  "prose-zh": { zh: "中文写作与去翻译腔", en: "Chinese Writing and Localization" },
  "deterministic-prose-linters": { zh: "确定性检查工具", en: "Deterministic Linters" },
  "ui-design-and-media": { zh: "前端界面、设计与图表", en: "UI, Design, and Diagrams" },
  "code-and-pr-governance": { zh: "代码与 PR 治理", en: "Code and PR Governance" },
  "awesome-and-registries": { zh: "目录与注册中心", en: "Awesome Lists and Registries" },
  "contrast-and-detection": { zh: "检测与规避研究（仅供对照）", en: "Contrast Watch (Reference Only)" },
};

const SNAPSHOT_DATE = AWESOME_DATA.snapshotDate || "2026-11-21";
const TOTAL_COUNT = (AWESOME_DATA.entries || []).length;

const I18N = {
  zh: {
    "page.title": `同路清单 · Awesome Anti-Slop（${TOTAL_COUNT} 条）— dislop`,
    "nav.skip": "跳至正文",
    "nav.workbench": "返回首页",
    "nav.awesome": "同路清单",
    "awesome.heading": "同路清单",
    "awesome.sub":
      `查文稿有没有违反写作规范，可以先看 Vale；想找网页里的模板痕迹，可以翻 Impeccable。按手头的活儿选一类，也可以只看能自动检查的工具。全部 ${TOTAL_COUNT} 条链接与 GitHub 状态核验于 ${SNAPSHOT_DATE}。`,
    "awesome.allSections": `全部类别（${TOTAL_COUNT}）`,
    "awesome.allLocales": "全部语种",
    "awesome.detOnly": "只看能自动检查",
    "awesome.reset": "重置",
    "awesome.snapNote": `核验日期 ${SNAPSHOT_DATE} · 标签页离线筛选`,
    "awesome.colName": "资源与类别",
    "awesome.colSummary": "用途",
    "awesome.colMeta": "星标 · 最近更新",
    "awesome.contrastNote":
      "中立边界：「检测与规避研究（仅供对照）」单独收录概率型 AI 文本检测器与规避工具，仅作行业参考。dislop 专注去套话与改稿核对，不用于规避披露规范。",
    "footer.snapshot": `核验日期：${SNAPSHOT_DATE} · 离线运行，不发外网请求`,
    "footer.home": "返回首页",
    "footer.json": "JSON 数据",
    "theme.dark": "深色",
    "theme.light": "浅色",
  },
  en: {
    "page.title": `Awesome Anti-Slop (${TOTAL_COUNT} Entries) — dislop`,
    "nav.skip": "Skip to main content",
    "nav.workbench": "Back to dislop",
    "nav.awesome": "Awesome list",
    "awesome.heading": "Awesome Anti-Slop",
    "awesome.sub":
      `Vale checks prose against a style guide. Impeccable checks web interfaces. Browse by what you are editing, or filter for tools that run automated checks without an LLM. All ${TOTAL_COUNT} links and GitHub details checked on ${SNAPSHOT_DATE}.`,
    "awesome.allSections": `All topics (${TOTAL_COUNT})`,
    "awesome.allLocales": "All locales",
    "awesome.detOnly": "Automated checks only",
    "awesome.reset": "Reset",
    "awesome.snapNote": `Checked ${SNAPSHOT_DATE} · Filters offline in this tab`,
    "awesome.colName": "Resource & topic",
    "awesome.colSummary": "What it is",
    "awesome.colMeta": "Stars · last push",
    "awesome.contrastNote":
      "Neutrality boundary: Contrast Watch lists probabilistic AI-text detectors and bypass tools strictly for reference. dislop removes clichés and checks edits against the original rather than helping evade disclosure rules.",
    "footer.snapshot": `Checked ${SNAPSHOT_DATE} · Runs offline with no outbound requests`,
    "footer.home": "Back to dislop",
    "footer.json": "JSON",
    "theme.dark": "Dark",
    "theme.light": "Light",
  },
};

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

let currentLang = safeGetStorage("dislop-lang") === "en" ? "en" : "zh";
let currentTheme = "light";
let activeSection = "all";
let activeLocale = "all";
let deterministicOnly = false;
let searchQuery = "";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStars(n) {
  if (typeof n !== "number") return "—";
  return `${n.toLocaleString("en-US")}★`;
}

function resetAllFilters() {
  activeSection = "all";
  activeLocale = "all";
  deterministicOnly = false;
  searchQuery = "";

  const searchEl = document.getElementById("awesome-search");
  if (searchEl) searchEl.value = "";
  const secEl = document.getElementById("awesome-section");
  if (secEl) secEl.value = "all";
  const locEl = document.getElementById("awesome-locale");
  if (locEl) locEl.value = "all";
  const detBtn = document.getElementById("awesome-det-btn");
  if (detBtn) {
    detBtn.setAttribute("aria-pressed", "false");
    detBtn.classList.remove("is-active");
  }
  renderTable();
}

function updateSectionSelectLabels() {
  const secEl = document.getElementById("awesome-section");
  if (!secEl) return;
  const entries = AWESOME_DATA.entries || [];
  for (const opt of secEl.options) {
    const val = opt.value;
    if (val === "all") {
      opt.textContent = I18N[currentLang]["awesome.allSections"];
    } else {
      const cnt = entries.filter((e) => e.section === val).length;
      const label = SECTION_LABELS[val]?.[currentLang] || val;
      opt.textContent = currentLang === "zh" ? `${label}（${cnt}）` : `${label} (${cnt})`;
    }
  }
}

function renderTable() {
  const tbody = document.getElementById("awesome-tbody");
  const countEl = document.getElementById("awesome-count");
  if (!tbody) return;

  const q = searchQuery.trim().toLowerCase();
  const entries = AWESOME_DATA.entries || [];
  const filtered = entries.filter((e) => {
    if (activeSection !== "all" && e.section !== activeSection) return false;
    if (activeLocale !== "all" && e.locale !== activeLocale) return false;
    if (deterministicOnly && !e.hasDeterministicCheck) return false;
    if (q) {
      const hay = [e.id, e.name, e.nameEn, e.repo, e.summary, e.summaryEn, e.modality, e.locale, e.section]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (countEl) {
    countEl.textContent =
      currentLang === "zh"
        ? `${filtered.length} / ${entries.length} 条`
        : `${filtered.length} / ${entries.length} entries`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px;color:var(--ink-2);">${
      currentLang === "zh"
        ? '没有匹配的条目。<button type="button" class="ctrl-btn ctrl-btn-sm" id="empty-reset-btn" style="margin-left:8px;">重置筛选</button>'
        : 'No matching entries. <button type="button" class="ctrl-btn ctrl-btn-sm" id="empty-reset-btn" style="margin-left:8px;">Reset</button>'
    }</td></tr>`;
    const btn = document.getElementById("empty-reset-btn");
    if (btn) btn.addEventListener("click", resetAllFilters);
    return;
  }

  const autoTag = currentLang === "zh" ? "自动检查" : "automated check";
  const archivedTag = currentLang === "zh" ? "已归档" : "archived";

  tbody.innerHTML = filtered
    .map((e) => {
      const secLabel = SECTION_LABELS[e.section]?.[currentLang] || e.section;
      const isContrast = e.section === "contrast-and-detection";
      const displayName = currentLang === "en" ? e.nameEn || e.name : e.name;
      const displaySummary = currentLang === "en" ? e.summaryEn || e.summary : e.summary;
      const metaParts = [];
      if (typeof e.stars === "number") metaParts.push(formatStars(e.stars));
      if (e.pushedAt) metaParts.push(e.pushedAt);
      if (e.license && e.license !== "NOASSERTION") metaParts.push(e.license);
      if (e.archived) metaParts.push(archivedTag);

      return `<tr>
        <td><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(displayName)}</strong></a>${
        e.repo ? `<div style="font-family:var(--font-mono);font-size:0.73rem;color:var(--ink-3);margin-top:2px;">${escapeHtml(e.repo)}</div>` : ""
      }<div style="font-size:0.74rem;color:${isContrast ? "var(--mark-error)" : "var(--ink-3)"};margin-top:4px;">${escapeHtml(secLabel)}${
        e.hasDeterministicCheck ? ` · <span style="color:var(--mark-stet);">${autoTag}</span>` : ""
      }</div></td>
        <td>${escapeHtml(displaySummary)}</td>
        <td style="font-family:var(--font-mono);font-size:0.74rem;white-space:nowrap;text-align:right;">${escapeHtml(metaParts.join(" · ") || "—")}</td>
      </tr>`;
    })
    .join("");
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  safeSetStorage("dislop-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = theme === "dark" ? I18N[currentLang]["theme.light"] : I18N[currentLang]["theme.dark"];
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  safeSetStorage("dislop-lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = I18N[lang]["page.title"];

  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang][key] !== undefined) {
      el.textContent = I18N[lang][key];
    }
  }

  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) {
    langBtn.textContent = lang === "zh" ? "EN" : "中文";
    langBtn.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换为中文");
  }

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.textContent = currentTheme === "dark" ? I18N[lang]["theme.light"] : I18N[lang]["theme.dark"];
  }

  const searchEl = document.getElementById("awesome-search");
  if (searchEl) {
    searchEl.placeholder = lang === "zh" ? "搜项目名、仓库或用途…" : "Search name, repo, or what it does...";
  }

  const ghUrl =
    lang === "zh"
      ? "https://github.com/dislop-ai/dislop/blob/main/awesome/README.zh-CN.md"
      : "https://github.com/dislop-ai/dislop/tree/main/awesome";
  const ghNav = document.getElementById("awesome-gh-nav");
  const ghFoot = document.getElementById("awesome-gh-foot");
  if (ghNav) ghNav.href = ghUrl;
  if (ghFoot) ghFoot.href = ghUrl;

  updateSectionSelectLabels();
  renderTable();
}

function init() {
  const savedTheme = safeGetStorage("dislop-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });

  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    applyLanguage(currentLang === "zh" ? "en" : "zh");
  });

  document.getElementById("awesome-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value || "";
    renderTable();
  });

  document.getElementById("awesome-section")?.addEventListener("change", (e) => {
    activeSection = e.target.value || "all";
    renderTable();
  });

  document.getElementById("awesome-locale")?.addEventListener("change", (e) => {
    activeLocale = e.target.value || "all";
    renderTable();
  });

  document.getElementById("awesome-det-btn")?.addEventListener("click", (e) => {
    deterministicOnly = !deterministicOnly;
    e.currentTarget.setAttribute("aria-pressed", String(deterministicOnly));
    e.currentTarget.classList.toggle("is-active", deterministicOnly);
    renderTable();
  });

  document.getElementById("awesome-reset-btn")?.addEventListener("click", resetAllFilters);

  applyLanguage(currentLang);
}

init();
