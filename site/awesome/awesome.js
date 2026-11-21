import { AWESOME_DATA } from "./awesome-data.mjs";

const SECTION_LABELS = {
  "standards-research-policy": { en: "Standards, Research & Policy", zh: "标准、研究与平台政策" },
  "prose-en-multilingual": { en: "Prose (EN & Multilingual)", zh: "英文与多语种写作" },
  "prose-zh": { en: "Chinese Writing & Localization", zh: "中文写作与去翻译腔" },
  "deterministic-prose-linters": { en: "Deterministic Linters", zh: "确定性检查工具" },
  "ui-design-and-media": { en: "UI, Design & Diagrams", zh: "前端 UI、设计与图表" },
  "code-and-pr-governance": { en: "Code & PR Governance", zh: "代码与 PR 治理" },
  "contrast-and-detection": { en: "Contrast Watch (Evasion / Detectors)", zh: "对照观察区（规避/检测）" },
  "awesome-and-registries": { en: "Awesome Lists & Registries", zh: "目录与注册中心" },
};

const SNAPSHOT_DATE = AWESOME_DATA.snapshotDate || "2026-11-21";
const SCHEMA_ID = AWESOME_DATA.schema || "dislop.radar/2";
const TOTAL_COUNT = (AWESOME_DATA.entries || []).length;

const I18N = {
  en: {
    "page.title": `Awesome Anti-Slop — ${TOTAL_COUNT} Curated De-Slop Resources (dislop)`,
    "nav.skip": "Skip to main content",
    "nav.workbench": "De-Slop Home",
    "nav.awesome": `Awesome (${TOTAL_COUNT})`,
    "awesome.index": `AWESOME ANTI-SLOP · ${TOTAL_COUNT} VERIFIED ENTRIES · SNAPSHOT ${SNAPSHOT_DATE}`,
    "awesome.heading": `Awesome Anti-Slop: ${TOTAL_COUNT} curated resources across writing, UI, decks, code, and standards.`,
    "awesome.sub":
      `A standalone, bookmarkable directory for humans and agents—compiled offline with no outbound requests (CSP: connect-src 'none'). Every star count, push date, and URL was checked on ${SNAPSHOT_DATE}. Evasion tools stay isolated in Contrast Watch.`,
    "awesome.allSections": "All Sections",
    "awesome.allModalities": "All modalities",
    "awesome.allLocales": "All locales",
    "awesome.detOnly": "Deterministic check only",
    "awesome.reset": "Reset filters",
    "awesome.colName": "Resource & Repository",
    "awesome.colSection": "Section & Format",
    "awesome.colTags": "Modality / Locale / Check",
    "awesome.colSummary": "Objective Summary",
    "awesome.colMeta": "Snapshot Meta",
    "awesome.contrastNote":
      "Neutrality boundary: Contrast Watch (contrast-and-detection) isolates probabilistic AI-text detectors (Fast-DetectGPT, Pangram) and adversarial bypass tools strictly for reference. dislop improves clarity and checks edits against the original rather than helping evade disclosure rules.",
    "footer.snapshot": `Snapshot: ${SNAPSHOT_DATE} · Runs offline in this tab (CSP: connect-src 'none')`,
    "footer.home": "dislop Workbench",
    "footer.json": "Raw JSON",
    "theme.dark": "Dark",
    "theme.light": "Light",
  },
  zh: {
    "page.title": `Awesome Anti-Slop — ${TOTAL_COUNT} 条实测核验去 AI 味精选清单（dislop）`,
    "nav.skip": "跳至正文",
    "nav.workbench": "返回首页",
    "nav.awesome": `精选清单 (${TOTAL_COUNT})`,
    "awesome.index": `AWESOME ANTI-SLOP · ${TOTAL_COUNT} 条实测核验 · 核验快照 ${SNAPSHOT_DATE}`,
    "awesome.heading": `去 AI 味精选清单（Awesome Anti-Slop）：${TOTAL_COUNT} 条跨媒介工具、规范与研究。`,
    "awesome.sub":
      `一份适合收藏、转发，也支持外部 Agent 直读的跨媒介目录。离线编译运行，不发外网请求（CSP: connect-src 'none'）。全部星标、推送日期与链接均于 ${SNAPSHOT_DATE} 实测核验；规避检测类工具单独隔离在对照观察区。`,
    "awesome.allSections": "全部分栏",
    "awesome.allModalities": "全部模态",
    "awesome.allLocales": "全部语种",
    "awesome.detOnly": "仅看含确定性检查",
    "awesome.reset": "重置筛选",
    "awesome.colName": "资源名称与仓库",
    "awesome.colSection": "分栏与形态",
    "awesome.colTags": "模态 / 语种 / 确定性检查",
    "awesome.colSummary": "客观机制说明",
    "awesome.colMeta": "快照元数据",
    "awesome.contrastNote":
      "中立边界：对照观察区（contrast-and-detection）同时隔离收录概率型 AI 文本检测器（如 Fast-DetectGPT、Pangram）与对抗式降检测率或去水印项目，仅作生态对照参考。dislop 专注去套话与改稿核对，与规避生成标识法规保持清晰分界。",
    "footer.snapshot": `核验快照：${SNAPSHOT_DATE} · 标签页离线运行（CSP: connect-src 'none'）`,
    "footer.home": "dislop 工作台",
    "footer.json": "原始 JSON",
    "theme.dark": "深色",
    "theme.light": "浅色",
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

let currentLang = safeGetStorage("dislop-lang") === "zh" ? "zh" : "en";
let currentTheme = "light";
let activeSection = "all";
let activeModality = "all";
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
  activeModality = "all";
  activeLocale = "all";
  deterministicOnly = false;
  searchQuery = "";

  const searchEl = document.getElementById("awesome-search");
  if (searchEl) searchEl.value = "";
  const modEl = document.getElementById("awesome-modality");
  if (modEl) modEl.value = "all";
  const locEl = document.getElementById("awesome-locale");
  if (locEl) locEl.value = "all";
  const detBtn = document.getElementById("awesome-det-btn");
  if (detBtn) {
    detBtn.classList.remove("is-active");
    detBtn.setAttribute("aria-pressed", "false");
  }
  document.querySelectorAll("[data-section-filter]").forEach((btn) => {
    const active = btn.getAttribute("data-section-filter") === "all";
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("awesome-tbody");
  const countEl = document.getElementById("awesome-count");
  const q = searchQuery.trim().toLowerCase();
  const entries = AWESOME_DATA.entries || [];
  const filtered = entries.filter((e) => {
    if (activeSection !== "all" && e.section !== activeSection) return false;
    if (activeModality !== "all" && e.modality !== activeModality) return false;
    if (activeLocale !== "all" && e.locale !== activeLocale) return false;
    if (deterministicOnly && !e.hasDeterministicCheck) return false;
    if (q) {
      const hay = [e.id, e.name, e.repo, e.summary, e.section, e.modality, e.locale, e.format, ...(e.stages || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  countEl.textContent =
    currentLang === "zh"
      ? `${filtered.length} / ${entries.length} 条资源`
      : `${filtered.length} / ${entries.length} entries`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-2);font-family:var(--font-sans);padding:18px;">${
      currentLang === "zh" ? "没有匹配的资源。" : "No entries matched."
    } <button type="button" class="ctrl-btn ctrl-btn-sm" id="awesome-clear-empty-btn" style="margin-left:8px;">${
      currentLang === "zh" ? "重置筛选" : "Clear filters"
    }</button></td></tr>`;
    const clearBtn = document.getElementById("awesome-clear-empty-btn");
    if (clearBtn) clearBtn.addEventListener("click", resetAllFilters);
    return;
  }

  tbody.innerHTML = filtered
    .map((e) => {
      const secLabel = SECTION_LABELS[e.section]?.[currentLang] || e.section;
      const isContrast = e.section === "contrast-and-detection";
      const hasZhSummary = /[\u4E00-\u9FFF]/.test(e.summary || "");
      const detText = e.hasDeterministicCheck
        ? currentLang === "zh"
          ? "确定性检查: 有"
          : "deterministic: yes"
        : currentLang === "zh"
          ? "确定性检查: 无"
          : "deterministic: no";
      const metaParts = [];
      if (typeof e.stars === "number") metaParts.push(formatStars(e.stars));
      if (e.pushedAt) metaParts.push(e.pushedAt);
      if (e.license && e.license !== "NOASSERTION") metaParts.push(e.license);
      if (e.archived) metaParts.push("archived");

      return `<tr>
        <td>
          <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(e.name)}</strong></a>
          ${e.repo ? `<div style="font-family:var(--font-mono);font-size:0.73rem;color:var(--ink-3);margin-top:2px;">${escapeHtml(e.repo)}</div>` : ""}
        </td>
        <td>
          <span class="${isContrast ? "sev-error" : ""}" style="font-family:var(--font-mono);font-size:0.74rem;font-weight:600;">${escapeHtml(secLabel)}</span>
          <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--ink-3);margin-top:2px;">${escapeHtml(e.format)}</div>
        </td>
        <td style="font-family:var(--font-mono);font-size:0.74rem;">
          <div>${escapeHtml(e.modality)} · ${escapeHtml(e.locale)}</div>
          <div style="color:${e.hasDeterministicCheck ? "var(--mark-stet)" : "var(--ink-3)"};margin-top:2px;">${escapeHtml(detText)}</div>
        </td>
        <td${hasZhSummary ? ' lang="zh-CN"' : ""}>${escapeHtml(e.summary)}</td>
        <td style="font-family:var(--font-mono);font-size:0.74rem;white-space:nowrap;">${escapeHtml(metaParts.join(" · ") || "—")}</td>
      </tr>`;
    })
    .join("");
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
  const langBtn = document.getElementById("lang-toggle");
  langBtn.textContent = currentLang === "en" ? "中文" : "EN";
  langBtn.setAttribute("aria-label", currentLang === "en" ? "切换到中文" : "Switch to English");
  const searchEl = document.getElementById("awesome-search");
  if (searchEl) {
    searchEl.placeholder =
      currentLang === "zh" ? "搜索项目名、仓库、机制或关键词..." : "Search name, repo, mechanism, or keyword...";
    searchEl.setAttribute("aria-label", currentLang === "zh" ? "搜索精选清单资源" : "Search Awesome Anti-Slop resources");
  }
  document.querySelectorAll("[data-section-filter]").forEach((btn) => {
    const sec = btn.getAttribute("data-section-filter");
    if (sec === "all") {
      btn.textContent = `${dict["awesome.allSections"]} (${(AWESOME_DATA.entries || []).length})`;
    } else if (SECTION_LABELS[sec]) {
      const cnt = (AWESOME_DATA.entries || []).filter((e) => e.section === sec).length;
      btn.textContent = `${SECTION_LABELS[sec][currentLang]} (${cnt})`;
    }
  });
  updateThemeToggleLabel();
  renderTable();
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleLabel();
}

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

  document.querySelectorAll("[data-section-filter]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.classList.contains("is-active")));
    btn.addEventListener("click", () => {
      activeSection = btn.getAttribute("data-section-filter");
      document.querySelectorAll("[data-section-filter]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      renderTable();
    });
  });

  document.getElementById("awesome-search").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTable();
  });

  document.getElementById("awesome-modality").addEventListener("change", (e) => {
    activeModality = e.target.value;
    renderTable();
  });

  document.getElementById("awesome-locale").addEventListener("change", (e) => {
    activeLocale = e.target.value;
    renderTable();
  });

  document.getElementById("awesome-det-btn").addEventListener("click", (e) => {
    deterministicOnly = !deterministicOnly;
    e.currentTarget.classList.toggle("is-active", deterministicOnly);
    e.currentTarget.setAttribute("aria-pressed", String(deterministicOnly));
    renderTable();
  });

  const resetBtn = document.getElementById("awesome-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetAllFilters);

  applyI18n();
}

init();
