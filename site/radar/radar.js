import { RADAR_DATA } from "./radar-data.mjs";

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

const SNAPSHOT_DATE = RADAR_DATA.snapshotDate || "2026-11-21";
const SCHEMA_ID = RADAR_DATA.schema || "dislop.radar/2";
const TOTAL_COUNT = (RADAR_DATA.entries || []).length;

const I18N = {
  en: {
    "page.title": `dislop Radar — ${TOTAL_COUNT} Verified De-Slop Resources (${SCHEMA_ID})`,
    "nav.skip": "Skip to main content",
    "nav.workbench": "De-Slop Home",
    "nav.radar": `Radar (${TOTAL_COUNT})`,
    "radar.index": `DE-SLOP ECOSYSTEM RADAR · SCHEMA ${SCHEMA_ID} · SNAPSHOT ${SNAPSHOT_DATE}`,
    "radar.heading": `${TOTAL_COUNT} verified de-slop resources across writing, UI, decks, code, and standards.`,
    "radar.sub":
      `Compiled offline from docs/research/anti-slop-radar-index.json with zero runtime network calls (CSP: connect-src 'none'). Every GitHub star count, push date, and URL was checked on ${SNAPSHOT_DATE}. Evasion tools are isolated in the Contrast Watch section.`,
    "radar.allSections": "All Sections",
    "radar.allModalities": "All modalities",
    "radar.allLocales": "All locales",
    "radar.detOnly": "Deterministic check only",
    "radar.reset": "Reset filters",
    "radar.colName": "Resource & Repository",
    "radar.colSection": "Section & Format",
    "radar.colTags": "Modality / Locale / Check",
    "radar.colSummary": "Objective Summary",
    "radar.colMeta": "Snapshot Meta",
    "radar.contrastNote":
      "Neutrality & Ethics Boundary: Contrast Watch (contrast-and-detection) isolates both probabilistic AI-text detectors (e.g., Fast-DetectGPT, Pangram) and adversarial evasion or bypass tools strictly for ecosystem contrast. dislop removes AI slop and preserves factual integrity rather than helping evade AI disclosure rules.",
    "footer.snapshot": `Snapshot: ${SNAPSHOT_DATE} · Zero runtime network calls (CSP: connect-src 'none')`,
    "footer.home": "Home & Workbench",
    "footer.json": "Raw JSON",
    "theme.dark": "Dark",
    "theme.light": "Light",
  },
  zh: {
    "page.title": `dislop 生态雷达 — ${TOTAL_COUNT} 条实测核验去 AI 味资源（${SCHEMA_ID}）`,
    "nav.skip": "跳至正文",
    "nav.workbench": "返回首页",
    "nav.radar": `生态雷达 (${TOTAL_COUNT})`,
    "radar.index": `去 AI 味生态资源雷达 · SCHEMA ${SCHEMA_ID} · 核验快照 ${SNAPSHOT_DATE}`,
    "radar.heading": `${TOTAL_COUNT} 条经实测核验的跨媒介去 AI 味资源索引。`,
    "radar.sub":
      `由 docs/research/anti-slop-radar-index.json 离线编译，零运行期外发请求（CSP: connect-src 'none'）。全部仓库星标、推送日期与链接均于 ${SNAPSHOT_DATE} 实测核验；规避检测类工具单独隔离在对照观察区。`,
    "radar.allSections": "全部分栏",
    "radar.allModalities": "全部模态",
    "radar.allLocales": "全部语种",
    "radar.detOnly": "仅看含确定性检查",
    "radar.reset": "重置筛选",
    "radar.colName": "资源名称与仓库",
    "radar.colSection": "分栏与形态",
    "radar.colTags": "模态 / 语种 / 确定性检查",
    "radar.colSummary": "客观机制说明",
    "radar.colMeta": "快照元数据",
    "radar.contrastNote":
      "中立与伦理边界：对照观察区（contrast-and-detection）同时隔离收录概率型 AI 文本检测器（如 Fast-DetectGPT、Pangram）与对抗式降检测率或去水印项目，仅作生态对照参考。dislop 专注去除 AI 味与事实保真，与规避生成标识法规保持清晰分界。",
    "footer.snapshot": `核验快照：${SNAPSHOT_DATE} · 零运行期外发请求（CSP: connect-src 'none'）`,
    "footer.home": "首页与工作台",
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

  const searchEl = document.getElementById("radar-search");
  if (searchEl) searchEl.value = "";
  const modEl = document.getElementById("radar-modality");
  if (modEl) modEl.value = "all";
  const locEl = document.getElementById("radar-locale");
  if (locEl) locEl.value = "all";
  const detBtn = document.getElementById("radar-det-btn");
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
  const tbody = document.getElementById("radar-tbody");
  const countEl = document.getElementById("radar-count");
  const q = searchQuery.trim().toLowerCase();
  const entries = RADAR_DATA.entries || [];
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
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-2);font-family:var(--font-mono);padding:18px;">${
      currentLang === "zh" ? "无匹配资源。" : "No entries matched."
    } <button type="button" class="ctrl-btn ctrl-btn-sm" id="radar-clear-empty-btn" style="margin-left:8px;">${
      currentLang === "zh" ? "重置筛选" : "Clear filters"
    }</button></td></tr>`;
    const clearBtn = document.getElementById("radar-clear-empty-btn");
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
  const searchEl = document.getElementById("radar-search");
  if (searchEl) {
    searchEl.placeholder =
      currentLang === "zh" ? "搜索项目名、仓库、机制或关键词..." : "Search name, repo, mechanism, or keyword...";
    searchEl.setAttribute("aria-label", currentLang === "zh" ? "搜索生态雷达资源" : "Search radar resources");
  }
  document.querySelectorAll("[data-section-filter]").forEach((btn) => {
    const sec = btn.getAttribute("data-section-filter");
    if (sec === "all") {
      btn.textContent = `${dict["radar.allSections"]} (${(RADAR_DATA.entries || []).length})`;
    } else if (SECTION_LABELS[sec]) {
      const cnt = (RADAR_DATA.entries || []).filter((e) => e.section === sec).length;
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

  document.getElementById("radar-search").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTable();
  });

  document.getElementById("radar-modality").addEventListener("change", (e) => {
    activeModality = e.target.value;
    renderTable();
  });

  document.getElementById("radar-locale").addEventListener("change", (e) => {
    activeLocale = e.target.value;
    renderTable();
  });

  document.getElementById("radar-det-btn").addEventListener("click", (e) => {
    deterministicOnly = !deterministicOnly;
    e.currentTarget.classList.toggle("is-active", deterministicOnly);
    e.currentTarget.setAttribute("aria-pressed", String(deterministicOnly));
    renderTable();
  });

  const resetBtn = document.getElementById("radar-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetAllFilters);

  applyI18n();
}

init();
