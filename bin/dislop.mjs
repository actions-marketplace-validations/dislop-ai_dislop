#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ENGINE_VERSION,
  SEVERITY_RANK,
  fnv1aHex,
  detectModality,
  defaultPackForModality,
  resolveEffectivePack,
  auditText,
  auditOoxmlEntries,
  analyzeTextProfile,
  formatReport,
  buildCatalog,
  queryCatalog,
  extractVoiceProfileOffline,
} from "../src/core.mjs";
import { analyzePatternProfile, auditPatterns } from "../src/pattern-engine.mjs";
import {
  analyzeDocumentWithPocketModels,
  predictPackWithPocketRouter,
} from "../src/pocket-model.mjs";
import {
  LOCAL_MODEL_TIERS,
  buildModelStatusReport,
  installOptionalModel,
  importLocalModelFile,
  removeInstalledModel,
  runLocalDeslop,
} from "../src/local-model.mjs";
import { readZipXmlEntries } from "../src/binary-node.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(REPO_ROOT, "packs");
const PATTERNS_DIR = path.join(REPO_ROOT, "patterns");

const DEFAULT_IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
]);

function loadAllPacks(customPacksDir = PACKS_DIR) {
  const packs = {};
  if (!fs.existsSync(customPacksDir)) return packs;
  for (const entry of fs.readdirSync(customPacksDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(customPacksDir, entry.name, "pack.json");
    if (fs.existsSync(manifestPath)) {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      packs[data.id] = data;
    }
  }
  return packs;
}

function loadPatternLibrary(customPatternsDir = PATTERNS_DIR) {
  const dimDir = path.join(customPatternsDir, "dimensions");
  const byRuleId = {};
  if (!fs.existsSync(dimDir)) return byRuleId;
  for (const entry of fs.readdirSync(dimDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dimDir, entry.name), "utf8"));
    const dim = data.dimension || null;
    for (const pat of data.patterns || []) {
      if (pat.ruleId) {
        byRuleId[pat.ruleId] = { dimension: dim, ...pat };
      }
    }
  }
  return byRuleId;
}

function loadConfig(cwd = process.cwd(), explicitConfigPath = null) {
  let base = {};
  const candidates = explicitConfigPath
    ? [path.resolve(cwd, explicitConfigPath)]
    : [
        path.join(cwd, ".dislop.json"),
        path.join(cwd, "dislop.json"),
        path.join(cwd, ".disloprc.json"),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      base = JSON.parse(fs.readFileSync(candidate, "utf8"));
      break;
    }
  }

  const localPath = path.join(cwd, ".dislop.local.json");
  if (fs.existsSync(localPath)) {
    const localCfg = JSON.parse(fs.readFileSync(localPath, "utf8"));
    base = {
      ...base,
      ...localCfg,
      rules: { ...(base.rules || {}), ...(localCfg.rules || {}) },
      allow: [...(base.allow || []), ...(localCfg.allow || [])],
      ignore: [...(base.ignore || []), ...(localCfg.ignore || [])],
      forbid: [...(base.forbid || []), ...(localCfg.forbid || [])],
    };
  }
  return base;
}

function expandBraces(pattern) {
  const m = pattern.match(/\{([^{}]+)\}/);
  if (!m) return [pattern];
  const prefix = pattern.slice(0, m.index);
  const suffix = pattern.slice(m.index + m[0].length);
  return m[1].split(",").flatMap((part) => expandBraces(prefix + part.trim() + suffix));
}

function globToRegExp(glob) {
  const norm = glob.replace(/\\/g, "/").replace(/^\.\//, "");
  let rx = "^";
  for (let i = 0; i < norm.length; i += 1) {
    const ch = norm[i];
    if (ch === "*" && norm[i + 1] === "*") {
      if (norm[i + 2] === "/") {
        rx += "(?:.+/)?";
        i += 2;
      } else {
        rx += ".*";
        i += 1;
      }
    } else if (ch === "*") {
      rx += "[^/]*";
    } else if (ch === "?") {
      rx += "[^/]";
    } else if ("+.^$|()[]{}".includes(ch)) {
      rx += "\\" + ch;
    } else {
      rx += ch;
    }
  }
  rx += "$";
  return new RegExp(rx);
}

function matchesAnyGlob(relPosix, globs = []) {
  const clean = relPosix.replace(/^\.\//, "");
  return globs.flatMap(expandBraces).some((g) => globToRegExp(g).test(clean));
}

function pickPackForFile(relPosix, modality, explicitPack, config) {
  if (explicitPack) return explicitPack;
  for (const ov of config?.overrides || []) {
    const patterns = Array.isArray(ov.files) ? ov.files : [ov.files];
    if (ov.pack && matchesAnyGlob(relPosix, patterns)) {
      return ov.pack;
    }
  }
  if (config?.pack) return config.pack;
  return defaultPackForModality(modality);
}

function decodeUtf8Strict(buffer) {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  return decoder.decode(buffer);
}

function collectFiles(targetPaths, cwd, config) {
  const realCwd = fs.existsSync(cwd) ? fs.realpathSync(cwd) : cwd;
  const files = [];
  const skipped = [];
  const ignoreGlobs = config?.ignore || [];

  // When running inside the dislop repo itself without custom config, skip intentional bad-example dirs
  const isSelfRepo =
    fs.existsSync(path.join(realCwd, "packs", "core", "pack.json")) &&
    fs.existsSync(path.join(realCwd, "src", "core.mjs"));
  const effectiveIgnores = isSelfRepo && ignoreGlobs.length === 0
    ? ["packs/**", "tests/**", "scratch/**"]
    : ignoreGlobs;

  function walk(absPath, explicit) {
    if (!fs.existsSync(absPath)) {
      throw new Error(`Target path not found: ${absPath}`);
    }
    const canonicalPath = fs.realpathSync(absPath);
    const stat = fs.statSync(canonicalPath);
    const rawRel = path.relative(realCwd, canonicalPath);
    const rel =
      !rawRel || rawRel === "."
        ? path.basename(canonicalPath)
        : rawRel === ".." || rawRel.startsWith(`..${path.sep}`) || path.isAbsolute(rawRel)
          ? path.basename(canonicalPath)
          : rawRel.split(path.sep).join("/");

    if (!explicit && matchesAnyGlob(rel, effectiveIgnores)) {
      return;
    }

    if (stat.isDirectory()) {
      const entries = fs
        .readdirSync(canonicalPath, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(canonicalPath, entry.name), false);
      }
      return;
    }

    if (!stat.isFile()) return;
    const mod = detectModality(canonicalPath);
    if (!mod) {
      if (explicit) {
        skipped.push({ file: rel, reason: `Unsupported file extension '${path.extname(canonicalPath) || "(none)"}'` });
      }
      return;
    }
    files.push({ absPath: canonicalPath, rel, modality: mod, explicit });
  }

  for (const t of targetPaths) {
    walk(path.resolve(realCwd, t), true);
  }
  return { files, skipped };
}

function getChangedLineMap(cwd, gitRef, staged = false) {
  const args = staged
    ? ["diff", "--cached", "-U0", "--no-color"]
    : ["diff", "-U0", "--no-color", gitRef || "HEAD"];
  const diffOut = execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const changed = new Map(); // relPath -> Set<line> | "ALL"
  let currentFile = null;

  for (const line of diffOut.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      const dm = line.match(/^diff --git a\/.+ b\/(.+)$/);
      currentFile = dm ? dm[1].trim() : null;
    } else if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      if (!changed.has(currentFile)) changed.set(currentFile, new Set());
    } else if (line.startsWith("Binary files ") && currentFile) {
      changed.set(currentFile, "ALL");
    } else if (line.startsWith("@@ ") && currentFile) {
      const m = line.match(/\+(\d+)(?:,(\d+))?/);
      if (m) {
        const start = Number(m[1]);
        const count = m[2] !== undefined ? Number(m[2]) : 1;
        const set = changed.get(currentFile);
        if (set instanceof Set) {
          for (let k = 0; k < Math.max(1, count); k += 1) {
            set.add(start + k);
          }
        }
      }
    }
  }
  return changed;
}

function buildPocketMlFindings(text, filename, existingFindings, threshold = null) {
  const doc = analyzeDocumentWithPocketModels(text, { threshold });
  const extras = [];
  for (const p of doc.paragraphs) {
    if (!p.flagged) continue;
    const overlapsExisting = existingFindings.some(
      (f) => f.line >= p.startLine && f.line <= p.endLine
    );
    if (overlapsExisting) continue;
    const pct = Math.round(p.slopProbability * 100);
    const drvEn = p.topDrivers.map((d) => d.reason.en).join("; ") || "uniform abstract phrasing";
    const drvZh = p.topDrivers.map((d) => d.reason.zh).join("、") || "句式与用词高度均质";
    const loc = String(p.startLine);
    const cleanExcerpt = String(p.excerpt || "");
    const fp = `pocket-stealth-vapor:${fnv1aHex(`pocket-stealth-vapor|${cleanExcerpt.toLowerCase()}|${loc}`)}`;
    extras.push({
      fingerprint: fp,
      ruleId: "pocket-stealth-vapor",
      packId: "pocket-model",
      severity: "warning",
      tier: "taste",
      family: "rhythm/pocket-stealth-vapor",
      category: "statistical-vapor",
      modality: detectModality(filename) || "markdown",
      file: filename,
      location: loc,
      line: p.startLine,
      col: 1,
      endLine: p.endLine,
      match: cleanExcerpt,
      excerpt: cleanExcerpt,
      mlProbability: p.slopProbability,
      message: {
        en: `Paragraph reads as predictable low-concreteness AI filler (${pct}% pocket-ML score: ${drvEn}).`,
        zh: `段落呈高度可预测、低事实密度的温吞水套话（内置模型评分 ${pct}%：${drvZh}）。`,
      },
      deletionTest: {
        en: "Cut this paragraph or replace abstract cushion wrappers with one concrete event, number, file path, or direct action.",
        zh: "删掉整段空泛铺垫，或把抽象缓冲外壳直接换成具体事件、数字、文件路径或明确动作。",
      },
    });
  }
  return { doc, findings: extras };
}

function summarizePocketForProfile(text) {
  const doc = analyzeDocumentWithPocketModels(text);
  return {
    documentProbability: doc.documentProbability,
    band: doc.wholeTextScore.band,
    recommendedPack: doc.packRouter.recommendedPack,
    flaggedCount: doc.flaggedCount,
  };
}

function mergePatternBankFindings(existingFindings, patFindings) {
  const seen = new Set(existingFindings.map((f) => `${f.ruleId}:${f.line}`));
  const out = [...existingFindings];
  for (const pf of patFindings || []) {
    const key = `${pf.ruleId}:${pf.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pf);
  }
  return out;
}

function inspectSingleFile({ absPath, rel, modality }, packs, explicitPack, config, { includeMl = false, includePatterns = false, banks = null } = {}) {
  const stat = fs.statSync(absPath);
  if (stat.size > 25 * 1024 * 1024) {
    return {
      checked: false,
      findings: [],
      unusedSuppressions: [],
      skipped: [{ file: rel, reason: "File exceeds 25 MB single-file inspection cap" }],
    };
  }

  const buf = fs.readFileSync(absPath);

  if (modality === "docx" || modality === "pptx") {
    const resolvedExplicit = explicitPack === "auto" ? null : explicitPack;
    const packId = pickPackForFile(rel, modality, resolvedExplicit, config);
    const pack = resolveEffectivePack(packId, packs, config);
    try {
      const entries = readZipXmlEntries(buf);
      const res = auditOoxmlEntries(entries, { filename: rel, modality, pack, config });
      const missingCorePart = res.skipped.some((s) => s.file === rel);
      let findings = res.findings;
      if (includePatterns && !missingCorePart) {
        const patRes = auditPatterns("", { filename: rel, modality, banks: banks || loadPatternBanks(), ooxml: entries });
        findings = mergePatternBankFindings(findings, patRes.findings);
      }
      return { checked: !missingCorePart, findings, unusedSuppressions: [], skipped: res.skipped };
    } catch (err) {
      return {
        checked: false,
        findings: [],
        unusedSuppressions: [],
        skipped: [{ file: rel, reason: `Uninspectable ${modality.toUpperCase()} archive: ${err.message}` }],
      };
    }
  }

  let text;
  try {
    text = decodeUtf8Strict(buf);
  } catch {
    return {
      checked: false,
      findings: [],
      unusedSuppressions: [],
      skipped: [{ file: rel, reason: "Non-UTF-8 text encoding; convert to UTF-8 to inspect" }],
    };
  }

  const effectiveExplicit =
    explicitPack === "auto" && (modality === "markdown" || modality === "text")
      ? predictPackWithPocketRouter(text).recommendedPack
      : explicitPack === "auto"
        ? null
        : explicitPack;
  const packId = pickPackForFile(rel, modality, effectiveExplicit, config);
  const pack = resolveEffectivePack(packId, packs, config);

  const res = auditText(text, { filename: rel, modality, pack, config });
  let findings = res.findings;
  if (includePatterns) {
    const patRes = auditPatterns(text, { filename: rel, modality, banks: banks || loadPatternBanks() });
    findings = mergePatternBankFindings(findings, patRes.findings);
  }
  if (includeMl && (modality === "markdown" || modality === "text")) {
    const mlRes = buildPocketMlFindings(text, rel, findings);
    findings = [...findings, ...mlRes.findings];
  }
  return { checked: true, findings, unusedSuppressions: res.unusedSuppressions, skipped: [] };
}

// ---------- Subcommands ----------

function parseFlags(args) {
  const flags = {};
  const positional = [];
  const boolKeys = new Set([
    "json",
    "staged",
    "report-unused",
    "no-loopback",
    "help",
    "version",
    "mcp",
    "no-exemplars",
    "profile",
    "ml",
    "patterns",
    "force",
    "dry-run",
    "yes",
    "no-copy",
    "local",
    "allow-lan",
  ]);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-") {
      positional.push("-");
    } else if (arg === "-h") {
      flags.help = true;
    } else if (arg === "-v") {
      flags.version = true;
    } else if (arg === "-o") {
      if (i + 1 < args.length) {
        flags.output = args[i + 1];
        i += 1;
      } else {
        console.error("dislop: flag '-o' requires a file path");
        process.exit(2);
      }
    } else if (arg.startsWith("-o=")) {
      flags.output = arg.slice(3);
    } else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        const key = arg.slice(2, eq);
        const val = arg.slice(eq + 1);
        if (boolKeys.has(key)) {
          const low = val.trim().toLowerCase();
          if (low === "true" || low === "1" || low === "yes") {
            flags[key] = true;
          } else if (low === "false" || low === "0" || low === "no") {
            flags[key] = false;
          } else {
            console.error(`dislop: flag '--${key}' does not accept value '${val}'`);
            process.exit(2);
          }
        } else {
          flags[key] = val;
        }
      } else {
        const key = arg.slice(2);
        if (boolKeys.has(key)) {
          flags[key] = true;
        } else if (key === "changed" && (i + 1 >= args.length || args[i + 1].startsWith("-"))) {
          flags[key] = "HEAD";
        } else if (i + 1 < args.length) {
          flags[key] = args[i + 1];
          i += 1;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  if (flags.help) {
    printHelp();
    process.exit(0);
  }
  return { flags, positional };
}

function assertTextOrJsonFormat(format) {
  if (!["text", "json"].includes(format)) {
    console.error(`dislop: invalid --format '${format}' (expected text or json)`);
    process.exit(2);
  }
}

function runCheck(args, packs) {
  const { flags, positional } = parseFlags(args);
  const cwd = process.cwd();
  const config = loadConfig(cwd, flags.config || null);
  const format = flags.json ? "json" : flags.format || "text";
  const failOn = flags["fail-on"] || config.failOn || "error";
  const lang = flags.lang || "en";
  const reportUnused = Boolean(flags["report-unused"]);
  const includeProfile = Boolean(flags.profile);
  const includeMl = Boolean(flags.ml);
  const includePatterns = Boolean(flags.patterns);
  const banks = includePatterns ? loadPatternBanks() : null;

  const validFormats = new Set(["text", "json", "sarif", "github", "md"]);
  if (!validFormats.has(format)) {
    console.error(`dislop: invalid --format '${format}' (expected text, json, sarif, github, or md)`);
    process.exit(2);
  }
  if (!SEVERITY_RANK[failOn]) {
    console.error(`dislop: invalid --fail-on '${failOn}' (expected error, warning, info, or never)`);
    process.exit(2);
  }

  // Stdin mode
  if (positional.includes("-")) {
    const stdinText = fs.readFileSync(0, "utf8");
    const filename = flags["stdin-filename"] || "stdin.md";
    const modality = detectModality(filename) || "markdown";
    const effectiveExplicit =
      flags.pack === "auto" && (modality === "markdown" || modality === "text")
        ? predictPackWithPocketRouter(stdinText).recommendedPack
        : flags.pack === "auto"
          ? null
          : flags.pack || null;
    const packId = pickPackForFile(filename, modality, effectiveExplicit, config);
    let pack;
    try {
      pack = resolveEffectivePack(packId, packs, config);
    } catch (err) {
      console.error(`dislop: ${err.message}`);
      process.exit(2);
    }
    const res = auditText(stdinText, { filename, modality, pack, config });
    let findings = res.findings;
    if (includePatterns) {
      const patRes = auditPatterns(stdinText, { filename, modality, banks });
      findings = mergePatternBankFindings(findings, patRes.findings);
    }
    if (includeMl && (modality === "markdown" || modality === "text")) {
      findings = [...findings, ...buildPocketMlFindings(stdinText, filename, findings).findings];
    }
    const report = {
      version: ENGINE_VERSION,
      checkedCount: 1,
      skipped: [],
      findings,
      unusedSuppressions: reportUnused ? res.unusedSuppressions : [],
      ...(includeProfile && (modality === "markdown" || modality === "text")
        ? {
            profiles: [
              {
                file: filename,
                profile: analyzeTextProfile(stdinText, { modality }),
                pocketModel: summarizePocketForProfile(stdinText),
              },
            ],
          }
        : {}),
    };
    console.log(formatReport(report, format, lang));
    const triggered =
      findings.some((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[failOn]) ||
      (reportUnused && res.unusedSuppressions.length > 0);
    process.exitCode = triggered ? 1 : 0;
    return;
  }

  let changedMap = null;
  if (flags.changed || flags.staged) {
    try {
      changedMap = getChangedLineMap(cwd, typeof flags.changed === "string" ? flags.changed : "HEAD", Boolean(flags.staged));
    } catch (err) {
      console.error(`dislop: failed to read git diff: ${err.message}`);
      process.exit(2);
    }
  }

  const targets = positional.length > 0 ? positional : changedMap ? Array.from(changedMap.keys()).filter((p) => fs.existsSync(path.join(cwd, p))) : ["."];
  let collected;
  try {
    collected = collectFiles(targets, cwd, config);
  } catch (err) {
    console.error(`dislop: ${err.message}`);
    process.exit(2);
  }

  const allFindings = [];
  const allSkipped = [...collected.skipped];
  const allUnused = [];
  const allProfiles = [];
  let checkedCount = 0;
  let explicitUninspectable = collected.skipped.length > 0;

  for (const item of collected.files) {
    if (changedMap && !changedMap.has(item.rel)) continue;
    let res;
    try {
      res = inspectSingleFile(item, packs, flags.pack || null, config, { includeMl, includePatterns, banks });
    } catch (err) {
      console.error(`dislop: ${err.message}`);
      process.exit(2);
    }
    if (res.checked) {
      checkedCount += 1;
      if (includeProfile && (item.modality === "markdown" || item.modality === "text")) {
        try {
          const rawTxt = decodeUtf8Strict(fs.readFileSync(item.absPath));
          allProfiles.push({
            file: item.rel,
            profile: analyzeTextProfile(rawTxt, { modality: item.modality }),
            pocketModel: summarizePocketForProfile(rawTxt),
          });
        } catch {}
      }
    } else if (item.explicit) {
      explicitUninspectable = true;
    }
    let fileFindings = res.findings;
    if (changedMap && changedMap.has(item.rel)) {
      const allowedLines = changedMap.get(item.rel);
      if (allowedLines instanceof Set) {
        fileFindings = fileFindings.filter((f) => allowedLines.has(f.line));
      }
    }
    allFindings.push(...fileFindings);
    allSkipped.push(...res.skipped);
    if (reportUnused) {
      allUnused.push(...res.unusedSuppressions);
    }
  }

  const report = {
    version: ENGINE_VERSION,
    checkedCount,
    skipped: allSkipped,
    findings: allFindings,
    unusedSuppressions: allUnused,
    ...(allProfiles.length > 0 ? { profiles: allProfiles } : {}),
  };

  const rendered = formatReport(report, format, lang);
  if (rendered) console.log(rendered);

  if (explicitUninspectable || (checkedCount === 0 && allSkipped.length > 0)) {
    process.exitCode = 2;
    return;
  }
  const shouldFail =
    allFindings.some((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[failOn]) ||
    (reportUnused && allUnused.length > 0);
  process.exitCode = shouldFail ? 1 : 0;
}

const POCKET_STEALTH_VAPOR_RULE = {
  id: "pocket-stealth-vapor",
  tier: "taste",
  severity: "warning",
  category: "statistical-vapor",
  dimension: "discourse-rhythm",
  family: "rhythm/pocket-stealth-vapor",
  modalities: ["markdown", "text"],
  tags: ["pocket-ml", "stealth-vapor", "low-concreteness", "flat-cadence"],
  message: {
    en: "Paragraph scores above the bundled 15 KB Pocket ML threshold for low-concreteness, uniform-cadence AI filler despite avoiding banned buzzwords.",
    zh: "段落虽避开了禁用热词表，但在句长节奏、抽象名词化与低事实密度上命中内置 15 KB 轻量集成模型的温吞水套话阈值。",
  },
  deletionTest: {
    en: "Cut this paragraph or replace abstract cushion wrappers with one concrete event, number, file path, or direct action.",
    zh: "删掉整段空泛铺垫，或把抽象缓冲外壳直接换成具体事件、数字、文件路径或明确动作。",
  },
  exemplar: {
    bad: "During ongoing collaboration, maintaining a steady rhythm across teams helps surface operational observations early while supporting long-term alignment.",
    trap: "This isn't about more meetings — it's about radical operational clarity.",
    good: "We post a 3-line status update in #release every Tuesday at 10:00 so blockers surface before Thursday's cut.",
    source: "Original constructed example (Apache-2.0)",
  },
};

function runExplain(args, packs, patternByRuleId) {
  const { flags, positional } = parseFlags(args);
  const format = flags.json ? "json" : flags.format || "text";
  assertTextOrJsonFormat(format);
  const ruleId = positional[0];
  if (!ruleId) {
    console.error("Usage: dislop explain <rule-id> [--lang en|zh] [--json]");
    process.exit(2);
  }
  const lang = flags.lang || "en";
  for (const pack of Object.values(packs)) {
    const rule = (pack.rules || []).find((r) => r.id === ruleId);
    if (rule) {
      if (format === "json") {
        console.log(JSON.stringify({ packId: pack.id, ...rule }, null, 2));
        process.exit(0);
      }
      console.log(`${rule.id}  [${rule.tier} / ${rule.severity}]  (pack: ${pack.id})`);
      console.log(`Modalities: ${(rule.modalities || []).join(", ")}`);
      console.log(`Why:        ${rule.message?.[lang] || rule.message?.en}`);
      if (rule.deletionTest) {
        console.log(`Test:       ${rule.deletionTest[lang] || rule.deletionTest.en}`);
      }
      if (rule.exemplar) {
        console.log(`\nBefore (bad):  ${rule.exemplar.bad}`);
        if (rule.exemplar.trap) {
          console.log(`Trap (avoid):  ${rule.exemplar.trap}`);
        }
        console.log(`After (good):  ${rule.exemplar.good}`);
        if (rule.exemplar.note) {
          console.log(`Note:          ${rule.exemplar.note[lang] || rule.exemplar.note.en}`);
        }
      }
      process.exit(0);
    }
  }
  const pat = patternByRuleId && patternByRuleId[ruleId];
  if (pat) {
    const sev = pat.severityDefault || "info";
    const packId = pat.packId || "pattern-bank";
    const msg = pat.mechanism || pat.name || { en: "", zh: "" };
    const guards = Array.isArray(pat.falsePositiveGuards) ? pat.falsePositiveGuards.join(" ") : "";
    const synth = {
      packId,
      id: ruleId,
      tier: "taste",
      severity: sev,
      category: pat.category || "general",
      dimension: pat.dimension || null,
      modalities: pat.modalities || ["markdown", "text"],
      tags: pat.tags || [],
      message: msg,
      ...(guards ? { deletionTest: { en: guards, zh: guards } } : {}),
      ...(pat.exemplar ? { exemplar: pat.exemplar } : {}),
    };
    if (format === "json") {
      console.log(JSON.stringify(synth, null, 2));
      process.exit(0);
    }
    console.log(`${synth.id}  [${synth.tier} / ${synth.severity}]  (pack: ${packId})`);
    console.log(`Modalities: ${synth.modalities.join(", ")}`);
    console.log(`Why:        ${msg[lang] || msg.en}`);
    if (guards) console.log(`Guards:     ${guards}`);
    if (pat.exemplar) {
      console.log(`\nBefore (bad):  ${pat.exemplar.bad}`);
      if (pat.exemplar.trap) console.log(`Trap (avoid):  ${pat.exemplar.trap}`);
      console.log(`After (good):  ${pat.exemplar.good}`);
    }
    process.exit(0);
  }
  if (ruleId === "pocket-stealth-vapor") {
    const r = POCKET_STEALTH_VAPOR_RULE;
    if (format === "json") {
      console.log(JSON.stringify({ packId: "pocket-model", ...r }, null, 2));
      process.exit(0);
    }
    console.log(`${r.id}  [${r.tier} / ${r.severity}]  (pack: pocket-model)`);
    console.log(`Modalities: ${r.modalities.join(", ")}`);
    console.log(`Why:        ${r.message[lang] || r.message.en}`);
    console.log(`Test:       ${r.deletionTest[lang] || r.deletionTest.en}`);
    console.log(`\nBefore (bad):  ${r.exemplar.bad}`);
    console.log(`Trap (avoid):  ${r.exemplar.trap}`);
    console.log(`After (good):  ${r.exemplar.good}`);
    process.exit(0);
  }
  console.error(`dislop: unknown rule '${ruleId}'`);
  process.exit(2);
}

function runPacks(args, packs) {
  const { flags } = parseFlags(args);
  const format = flags.json ? "json" : flags.format || "text";
  assertTextOrJsonFormat(format);
  const list = Object.values(packs).map((p) => ({
    id: p.id,
    version: p.version,
    tier: p.tier,
    extends: p.extends || [],
    name: p.name,
    modalities: p.modalities,
    ruleCount: (p.rules || []).length,
    summary: p.summary,
  }));
  if (format === "json") {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  for (const p of list) {
    console.log(`${p.id.padEnd(18)} [${p.tier}] (${p.ruleCount} rules) — ${p.name.en} / ${p.name.zh}`);
    console.log(`  modalities: ${p.modalities.join(", ")}`);
  }
}

const VALID_MODALITIES = new Set(["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx"]);
const VALID_SEVERITIES = new Set(["error", "warning", "info"]);
const VALID_TIERS = new Set(["invariant", "taste"]);

function runCatalog(args, packs, patternByRuleId) {
  const { flags, positional } = parseFlags(args);
  const format = flags.json ? "json" : flags.format || "text";
  const lang = flags.lang || "en";
  if (!["text", "json", "md"].includes(format)) {
    console.error(`dislop: invalid --format '${format}' (expected text, json, or md)`);
    process.exit(2);
  }
  if (flags.severity && !VALID_SEVERITIES.has(flags.severity)) {
    console.error(`dislop: invalid --severity '${flags.severity}' (expected error, warning, or info)`);
    process.exit(2);
  }
  if (flags.modality && !VALID_MODALITIES.has(flags.modality)) {
    console.error(`dislop: invalid --modality '${flags.modality}'`);
    process.exit(2);
  }
  if (flags.tier && !VALID_TIERS.has(flags.tier)) {
    console.error(`dislop: invalid --tier '${flags.tier}' (expected invariant or taste)`);
    process.exit(2);
  }

  const query = flags.query || positional.join(" ").trim() || "";
  const limit = flags.limit ? Number(flags.limit) : null;
  const entries = buildCatalog(packs, patternByRuleId);
  const result = queryCatalog(entries, {
    query,
    pack: flags.pack || null,
    category: flags.category || null,
    dimension: flags.dimension || null,
    family: flags.family || null,
    modality: flags.modality || null,
    severity: flags.severity || null,
    tier: flags.tier || null,
    includeExemplars: flags["no-exemplars"] ? false : true,
    limit: Number.isInteger(limit) && limit > 0 ? limit : null,
  });

  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (format === "md") {
    const rows = [
      "| Rule | Pack | Severity | Category | Modalities | Description |",
      "|---|---|---|---|---|---|",
      ...result.items.map((item) => {
        const msg = (item.message?.[lang] || item.message?.en || "").replace(/\|/g, "\\|");
        return `| \`${item.id}\` | \`${item.packId}\` | \`${item.severity}\` | \`${item.category}\` | ${(item.modalities || []).join(", ")} | ${msg} |`;
      }),
    ];
    console.log(rows.join("\n"));
    return;
  }

  console.log(`dislop catalog: ${result.matched} / ${result.total} rule(s) matched`);
  for (const item of result.items) {
    const msg = item.message?.[lang] || item.message?.en || "";
    console.log(`  [${item.severity.padEnd(7)}] ${item.id.padEnd(30)} (${item.packId} · ${item.category}) — ${msg}`);
  }
}

function runPackTest(packs) {
  const errors = [];
  let assertions = 0;

  for (const pack of Object.values(packs)) {
    if (pack.schema !== "dislop.pack/2") {
      errors.push(`${pack.id}: expected schema 'dislop.pack/2'`);
    }
    const effective = resolveEffectivePack(pack.id, packs, {});
    for (const rule of pack.rules || []) {
      if (!rule.deletionTest?.en || !rule.deletionTest?.zh) {
        errors.push(`${pack.id}/${rule.id}: missing bilingual deletionTest`);
      }
      if (!rule.exemplar?.bad || !rule.exemplar?.good || !rule.exemplar?.source) {
        errors.push(`${pack.id}/${rule.id}: missing exemplar (bad/good/source)`);
      }
      const hits = rule.fixtures?.hit || [];
      const cleans = rule.fixtures?.clean || [];
      if (hits.length === 0 || cleans.length === 0) {
        errors.push(`${pack.id}/${rule.id}: requires at least 1 hit and 1 clean fixture`);
      }
      const sampleMod = (rule.modalities && rule.modalities[0]) || "markdown";
      for (const h of hits) {
        assertions += 1;
        const res = auditText(h, { filename: `fixture.${sampleMod}`, modality: sampleMod, pack: effective, allowSyntheticFixtures: true });
        if (!res.findings.some((f) => f.ruleId === rule.id)) {
          errors.push(`${pack.id}/${rule.id}: hit fixture did NOT trigger rule: ${JSON.stringify(h)}`);
        }
      }
      for (const c of cleans) {
        assertions += 1;
        const res = auditText(c, { filename: `fixture.${sampleMod}`, modality: sampleMod, pack: effective, allowSyntheticFixtures: true });
        if (res.findings.some((f) => f.ruleId === rule.id)) {
          errors.push(`${pack.id}/${rule.id}: clean fixture FALSELY triggered rule: ${JSON.stringify(c)}`);
        }
      }
      // Lint regex patterns against unbounded `.*`
      for (const pat of rule.patterns || []) {
        if (/\.\*/.test(pat)) {
          errors.push(`${pack.id}/${rule.id}: unbounded '.*' forbidden in portable pack regex: ${pat}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`dislop pack-test: FAILED (${errors.length} error(s) across ${assertions} assertions)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`dislop pack-test: ok (${Object.keys(packs).length} packs, ${assertions} fixture assertions passed)`);
}

function runInit() {
  const cwd = process.cwd();
  const cfgPath = path.join(cwd, ".dislop.json");
  if (!fs.existsSync(cfgPath)) {
    const starter = {
      failOn: "error",
      ignore: ["vendor/**", "dist/**"],
      overrides: [{ files: ["docs/**/*.md"], pack: "business-brief" }],
      allow: [],
      rules: {},
    };
    fs.writeFileSync(cfgPath, JSON.stringify(starter, null, 2) + "\n", "utf8");
    console.log(`Created ${cfgPath}`);
  } else {
    console.log(`${cfgPath} already exists`);
  }

  const giPath = path.join(cwd, ".gitignore");
  const localEntry = ".dislop.local.json";
  if (fs.existsSync(giPath)) {
    const cur = fs.readFileSync(giPath, "utf8");
    if (!cur.split(/\r?\n/).includes(localEntry)) {
      fs.writeFileSync(giPath, cur.replace(/\s*$/, "\n") + localEntry + "\n", "utf8");
      console.log(`Added ${localEntry} to .gitignore`);
    }
  }
}

// ---------- MCP Stdio Server ----------

function runMcpServer(packs, patternByRuleId) {
  const cwd = process.cwd();
  const config = loadConfig(cwd);
  const catalogEntries = buildCatalog(packs, patternByRuleId);
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  function send(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  function toolResult(id, payload, isError = false) {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        isError,
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      },
    });
  }

  function formatRuleForExplain(rule, packId, lang) {
    const cleanLang = lang === "en" || lang === "zh" ? lang : null;
    const localizeObj = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      if (!cleanLang) return obj;
      return { [cleanLang]: obj[cleanLang] || obj.en || "" };
    };
    const out = {
      packId,
      id: rule.id,
      tier: rule.tier,
      severity: rule.severity,
      ...(rule.category ? { category: rule.category } : {}),
      ...(rule.family ? { family: rule.family } : {}),
      modalities: rule.modalities || [],
      ...(Array.isArray(rule.tags) ? { tags: rule.tags } : {}),
      message: localizeObj(rule.message),
      deletionTest: localizeObj(rule.deletionTest),
    };
    if (rule.exemplar) {
      out.exemplar = {
        ...rule.exemplar,
        ...(rule.exemplar.note ? { note: localizeObj(rule.exemplar.note) } : {}),
      };
    }
    return out;
  }

  function formatFindingsForMcp(findings, verbosity, lang) {
    const cleanLang = lang === "en" || lang === "zh" ? lang : null;
    const localizeObj = (obj) => {
      if (!obj || typeof obj !== "object" || !cleanLang) return obj;
      return { [cleanLang]: obj[cleanLang] || obj.en || "" };
    };
    if (verbosity === "full") {
      if (!cleanLang) return findings;
      return findings.map((f) => ({
        ...f,
        message: localizeObj(f.message),
        deletionTest: localizeObj(f.deletionTest),
      }));
    }
    return findings.map((f) => ({
      fingerprint: f.fingerprint,
      ruleId: f.ruleId,
      tier: f.tier ?? "taste",
      severity: f.severity,
      family: f.family ?? (f.dimension ? `${f.dimension}/${f.ruleId}` : null),
      file: f.file,
      modality: f.modality,
      location: f.location,
      line: f.line,
      col: f.col,
      match: f.match,
      message: localizeObj(f.message),
      deletionTest: f.deletionTest ? localizeObj(f.deletionTest) : null,
    }));
  }

  const tools = [
    {
      name: "dislop_check",
      description:
        "Check a draft (`text` or workspace-relative `path`) for AI-generation artifacts, clichés, and template slop across Markdown, HTML/CSS/JSX/SVG, Word (.docx), and PowerPoint (.pptx). Edit only the flagged spans, then run `dislop_check` again.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Draft text to inspect in memory" },
          path: { type: "string", description: "Workspace-relative file path (.md, .html, .css, .jsx, .svg, .docx, .pptx)" },
          pack: { type: "string", description: "Style pack ID (auto, business-brief, engineering-spec, regulated-comms, literary-essay, deck-and-ui, executive-deck)" },
          filename: { type: "string", description: "Virtual filename hint when inspecting `text`" },
          profile: { type: "boolean", description: "Include 5-axis rhythm & concreteness telemetry on text/markdown (default true)" },
          ml: { type: "boolean", description: "Enable bundled 15 KB Pocket ML stealth-vapor paragraph detection (default false)" },
          patterns: { type: "boolean", description: "Include extended 6-dimension pattern-bank probes (default false)" },
          verbosity: { type: "string", enum: ["compact", "full"], description: "Default compact (omits per-hit exemplars to save context tokens; pass full to inline exemplars)" },
          lang: { type: "string", enum: ["en", "zh"], description: "Optional single-locale filter for finding messages" },
        },
      },
    },
    {
      name: "dislop_explain",
      description:
        "Retrieve the rationale, check question, and before/trap/after examples for a specific `ruleId`.",
      inputSchema: {
        type: "object",
        properties: {
          ruleId: { type: "string", description: "Rule ID returned by dislop_check or dislop_catalog" },
          lang: { type: "string", enum: ["en", "zh"], description: "en or zh" },
        },
        required: ["ruleId"],
      },
    },
    {
      name: "dislop_packs",
      description: "List installed rule packs, supported formats, and rule counts.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "dislop_catalog",
      description:
        "Search and browse dislop's 53-pattern AI-slop catalog by keyword, dimension, category, family, modality, severity, tier, or pack.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional bilingual keyword query (matches id, tags, message, deletionTest, exemplar)" },
          pack: { type: "string" },
          category: { type: "string" },
          dimension: { type: "string" },
          family: { type: "string" },
          modality: { type: "string" },
          severity: { type: "string", enum: ["error", "warning", "info"] },
          tier: { type: "string", enum: ["invariant", "taste"] },
          lang: { type: "string", enum: ["en", "zh"] },
          includeExemplars: { type: "boolean", description: "Default true; set false for compact index listing" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
    {
      name: "dislop_voice_extract_offline",
      description:
        "Extract a deterministic offline `dislop.voice/1` statistical writing profile from 1-15 clean author samples (0 network calls, 0 uploads).",
      inputSchema: {
        type: "object",
        properties: {
          samples: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 15,
            description: "1 to 15 clean sample passages written by the author",
          },
          lang: { type: "string", enum: ["auto", "en", "zh"] },
        },
        required: ["samples"],
      },
    },
    {
      name: "dislop_model_score",
      description:
        "Run the bundled zero-dependency 15 KB Pocket ML ensemble (`pocket-slop-v1`) + 5-domain pack router on `text` to detect clean-wordlist stealth AI vapor paragraphs and explain top contributing signals (0 network calls).",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Draft text to score with bundled Pocket ML" },
          threshold: { type: "number", description: "Optional paragraph flag threshold (0..1)" },
        },
        required: ["text"],
      },
    },
    {
      name: "dislop_model_status",
      description:
        "Inspect bundled models, installed optional model weights, hardware memory budget, and recommended optional local model tier.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req;
    try {
      req = JSON.parse(trimmed);
    } catch {
      return;
    }
    const { id, method, params = {} } = req;
    if (id === undefined || id === null) return;

    if (method === "initialize") {
      const clientVersion = params.protocolVersion || "2024-11-05";
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: clientVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "dislop", version: ENGINE_VERSION },
        },
      });
      return;
    }

    if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
      return;
    }

    if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools } });
      return;
    }

    if (method === "tools/call") {
      const name = params.name;
      const args = params.arguments || {};
      try {
        if (name === "dislop_packs") {
          const list = Object.values(packs).map((p) => ({
            id: p.id,
            tier: p.tier,
            name: p.name,
            modalities: p.modalities,
            ruleCount: (p.rules || []).length,
            summary: p.summary,
          }));
          toolResult(id, { packs: list });
          return;
        }

        if (name === "dislop_catalog") {
          const result = queryCatalog(catalogEntries, {
            query: args.query || "",
            pack: args.pack || null,
            category: args.category || null,
            dimension: args.dimension || null,
            family: args.family || null,
            modality: args.modality || null,
            severity: args.severity || null,
            tier: args.tier || null,
            includeExemplars: args.includeExemplars !== false,
            limit: Number.isInteger(args.limit) && args.limit > 0 ? args.limit : null,
          });
          toolResult(id, result);
          return;
        }

        if (name === "dislop_explain") {
          if (!args.ruleId) {
            toolResult(id, { error: "Missing required argument `ruleId`" }, true);
            return;
          }
          for (const p of Object.values(packs)) {
            const rule = (p.rules || []).find((r) => r.id === args.ruleId);
            if (rule) {
              toolResult(id, formatRuleForExplain(rule, p.id, args.lang));
              return;
            }
          }
          const pat = patternByRuleId && patternByRuleId[args.ruleId];
          if (pat) {
            const guards = Array.isArray(pat.falsePositiveGuards) ? pat.falsePositiveGuards.join(" ") : "";
            const synthRule = {
              id: args.ruleId,
              tier: "taste",
              severity: pat.severityDefault || "info",
              category: pat.category || "general",
              family: pat.dimension ? `${pat.dimension}/${args.ruleId}` : "pattern-bank",
              modalities: pat.modalities || ["markdown", "text"],
              tags: pat.tags || [],
              message: pat.mechanism || pat.name || { en: "", zh: "" },
              ...(guards ? { deletionTest: { en: guards, zh: guards } } : {}),
              ...(pat.exemplar ? { exemplar: pat.exemplar } : {}),
            };
            toolResult(id, formatRuleForExplain(synthRule, pat.packId || "pattern-bank", args.lang));
            return;
          }
          if (args.ruleId === "pocket-stealth-vapor") {
            toolResult(id, formatRuleForExplain(POCKET_STEALTH_VAPOR_RULE, "pocket-model", args.lang));
            return;
          }
          toolResult(id, { error: `Unknown ruleId '${args.ruleId}'` }, true);
          return;
        }

        if (name === "dislop_check") {
          const hasText = typeof args.text === "string";
          const hasPath = typeof args.path === "string" && args.path.trim().length > 0;
          if (hasText === hasPath) {
            toolResult(
              id,
              { error: "Provide exactly one of `text` (in-memory string) or `path` (workspace file path)." },
              true
            );
            return;
          }

          const liveConfig = loadConfig(cwd);
          const verbosity = args.verbosity === "full" ? "full" : "compact";
          const includeMl = Boolean(args.ml);
          const includePatterns = Boolean(args.patterns);
          const wantProfile = args.profile !== false;
          const banks = includePatterns ? loadPatternBanks() : null;

          if (hasText) {
            const fn = args.filename || "draft.md";
            const mod = detectModality(fn) || "markdown";
            const effPack =
              args.pack === "auto" && (mod === "markdown" || mod === "text")
                ? predictPackWithPocketRouter(args.text).recommendedPack
                : args.pack === "auto"
                  ? null
                  : args.pack || null;
            const packId = pickPackForFile(fn, mod, effPack, liveConfig);
            const pack = resolveEffectivePack(packId, packs, liveConfig);
            const res = auditText(args.text, { filename: fn, modality: mod, pack, config: liveConfig });
            let findings = res.findings;
            if (includePatterns) {
              findings = mergePatternBankFindings(findings, auditPatterns(args.text, { filename: fn, modality: mod, banks }).findings);
            }
            if (includeMl && (mod === "markdown" || mod === "text")) {
              findings = [...findings, ...buildPocketMlFindings(args.text, fn, findings).findings];
            }
            const profile = wantProfile && (mod === "markdown" || mod === "text") ? analyzeTextProfile(args.text, { modality: mod }) : null;
            const formatted = formatFindingsForMcp(findings, verbosity, args.lang);
            toolResult(id, {
              pack: packId,
              modality: mod,
              checked: true,
              skipped: [],
              count: formatted.length,
              findings: formatted,
              ...(verbosity === "compact" && formatted.length > 0
                ? { explainHint: "Call dislop_explain(ruleId) for before/trap/after examples." }
                : {}),
              ...(profile ? { profile } : {}),
            });
            return;
          }

          // Check lexical workspace containment BEFORE touching filesystem, then realpath containment against symlinks
          const realCwd = fs.realpathSync(cwd);
          const resolvedLex = path.resolve(realCwd, args.path);
          const lexRel = path.relative(realCwd, resolvedLex);
          if (lexRel === ".." || lexRel.startsWith(`..${path.sep}`) || path.isAbsolute(lexRel)) {
            toolResult(id, { error: "Path must stay within the current workspace directory." }, true);
            return;
          }
          if (!fs.existsSync(resolvedLex) || !fs.statSync(resolvedLex).isFile()) {
            toolResult(id, { error: `File not found: ${args.path}` }, true);
            return;
          }
          const realTarget = fs.realpathSync(resolvedLex);
          const rel = path.relative(realCwd, realTarget);
          if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
            toolResult(id, { error: "Path must stay within the current workspace directory." }, true);
            return;
          }
          const mod = detectModality(realTarget);
          if (!mod) {
            toolResult(id, { error: `Unsupported file extension for '${args.path}'` }, true);
            return;
          }
          const posixRel = rel.split(path.sep).join("/");
          let rawTxtForPack = null;
          if ((mod === "markdown" || mod === "text") && (args.pack === "auto" || wantProfile)) {
            try {
              rawTxtForPack = decodeUtf8Strict(fs.readFileSync(realTarget));
            } catch {}
          }
          const effPackArg =
            args.pack === "auto" && rawTxtForPack !== null && (mod === "markdown" || mod === "text")
              ? predictPackWithPocketRouter(rawTxtForPack).recommendedPack
              : args.pack === "auto"
                ? null
                : args.pack || null;
          const res = inspectSingleFile(
            { absPath: realTarget, rel: posixRel, modality: mod },
            packs,
            effPackArg,
            liveConfig,
            { includeMl, includePatterns, banks }
          );
          let profile = null;
          if (res.checked && wantProfile && rawTxtForPack !== null && (mod === "markdown" || mod === "text")) {
            profile = analyzeTextProfile(rawTxtForPack, { modality: mod });
          }
          const formatted = formatFindingsForMcp(res.findings, verbosity, args.lang);
          toolResult(id, {
            pack: pickPackForFile(posixRel, mod, effPackArg, liveConfig),
            modality: mod,
            checked: res.checked,
            skipped: res.skipped,
            count: formatted.length,
            findings: formatted,
            ...(verbosity === "compact" && formatted.length > 0
              ? { explainHint: "Call dislop_explain(ruleId) for before/trap/after examples." }
              : {}),
            ...(profile ? { profile } : {}),
          });
          return;
        }

        if (name === "dislop_voice_extract_offline") {
          if (!Array.isArray(args.samples) || args.samples.length === 0) {
            toolResult(id, { error: "Non-empty `samples` string array is required." }, true);
            return;
          }
          if (args.samples.length > 15) {
            toolResult(id, { error: "Provide at most 15 sample passages per call." }, true);
            return;
          }
          if (args.samples.some((s) => typeof s !== "string")) {
            toolResult(id, { error: "Every element in `samples` must be a string." }, true);
            return;
          }
          const nonBlankSamples = args.samples.map((s) => s.trim()).filter(Boolean);
          if (nonBlankSamples.length === 0) {
            toolResult(id, { error: "At least one non-empty sample passage is required." }, true);
            return;
          }
          const voice = extractVoiceProfileOffline(nonBlankSamples, { lang: args.lang || "auto" });
          toolResult(id, voice);
          return;
        }

        if (name === "dislop_model_score") {
          if (typeof args.text !== "string") {
            toolResult(id, { error: "Required string argument `text` missing." }, true);
            return;
          }
          if (args.threshold !== undefined && args.threshold !== null) {
            if (typeof args.threshold !== "number" || !Number.isFinite(args.threshold) || args.threshold < 0 || args.threshold > 1) {
              toolResult(id, { error: "`threshold` must be a number between 0 and 1." }, true);
              return;
            }
          }
          const thr = typeof args.threshold === "number" ? args.threshold : null;
          toolResult(id, analyzeDocumentWithPocketModels(args.text, { threshold: thr }));
          return;
        }

        if (name === "dislop_model_status") {
          let rulesCount = 0;
          for (const p of Object.values(packs)) rulesCount += (p.rules || []).length;
          buildModelStatusReport({
            packsCount: Object.keys(packs).length,
            rulesCount,
            probeLoopback: false,
          })
            .then((st) => toolResult(id, st))
            .catch((e) => toolResult(id, { error: e.message }, true));
          return;
        }

        toolResult(id, { error: `Unknown tool '${name}'` }, true);
      } catch (err) {
        toolResult(id, { error: err.message }, true);
      }
      return;
    }

    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  });
}

function runResources(rest, packs) {
  const { flags } = parseFlags(rest);
  const format = flags.json ? "json" : flags.format || "text";
  assertTextOrJsonFormat(format);
  const asJson = format === "json";
  const payload = {
    schema: "dislop.resources/1",
    offlineCheck: true,
    note: "'dislop check' runs 100% locally with zero network requests and zero file uploads.",
    bundledPacks: Object.keys(packs).sort(),
    staticResources: {
      llmsIndex: "https://dislop.com/llms.txt",
      catalog: "https://dislop.com/catalog.json",
      awesomeIndex: "https://dislop.com/awesome/index.json",
      tasks: [
        "https://dislop.com/tasks/business-doc.md",
        "https://dislop.com/tasks/web-and-deck.md",
        "https://dislop.com/tasks/editorial-writing.md",
        "https://dislop.com/tasks/pre-release-gate.md",
      ],
      ruleTemplate: "https://dislop.com/rules/<rule-id>.md",
    },
    optionalCloudMcp: {
      url: "https://dislop.com/mcp",
      pricingAndFreeToken: "https://dislop.com/#pricing",
      tools: ["dislop_review", "dislop_deslop", "dislop_voice_extract"],
    },
  };
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`dislop v${ENGINE_VERSION} resources (dislop check makes 0 network requests)`);
  console.log(`\nBundled offline packs: ${payload.bundledPacks.join(", ")}`);
  console.log(`\nFree read-only static resources (dislop.com):`);
  console.log(`  - Agent index : ${payload.staticResources.llmsIndex}`);
  console.log(`  - Full catalog: ${payload.staticResources.catalog}`);
  console.log(`  - Awesome 87  : ${payload.staticResources.awesomeIndex}`);
  console.log(`  - Rule card   : ${payload.staticResources.ruleTemplate}`);
  console.log(`\nOptional hosted Cloud Remote MCP (login + 30 free credits/mo):`);
  console.log(`  - Endpoint    : ${payload.optionalCloudMcp.url}`);
  console.log(`  - Free token  : ${payload.optionalCloudMcp.pricingAndFreeToken}`);
}

function loadPatternBanks(customPatternsDir = PATTERNS_DIR) {
  const bankDir = path.join(customPatternsDir, "banks");
  const out = {};
  if (!fs.existsSync(bankDir)) return out;
  for (const entry of fs.readdirSync(bankDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(bankDir, entry.name), "utf8"));
    out[data.id || entry.name.replace(/\.json$/, "")] = data;
  }
  return out;
}

function runPatterns(args) {
  const { flags, positional } = parseFlags(args);
  const format = flags.json ? "json" : flags.format || "text";
  assertTextOrJsonFormat(format);
  const lang = flags.lang || "en";
  const banks = loadPatternBanks();
  const angles = flags.angle ? String(flags.angle).split(",").map((s) => s.trim()).filter(Boolean) : null;

  let text = "";
  let filename = flags["stdin-filename"] || "stdin.md";
  let modality = detectModality(filename) || "markdown";
  let ooxml = null;

  if (positional.length === 0 || positional[0] === "-") {
    text = fs.readFileSync(0, "utf8");
  } else {
    const abs = path.resolve(process.cwd(), positional[0]);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.error(`dislop: file not found: ${positional[0]}`);
      process.exit(2);
    }
    filename = positional[0];
    const detected = detectModality(abs);
    if (!detected) {
      console.error(`dislop: unsupported file extension for '${positional[0]}'`);
      process.exit(2);
    }
    modality = detected;
    const buf = fs.readFileSync(abs);
    try {
      if (modality === "pptx" || modality === "docx") {
        ooxml = readZipXmlEntries(buf);
      } else {
        text = decodeUtf8Strict(buf);
      }
    } catch (err) {
      console.error(`dislop: uninspectable ${modality.toUpperCase()} file '${positional[0]}': ${err.message}`);
      process.exit(2);
    }
  }

  const profile = analyzePatternProfile(text, { filename, modality, banks, angles, ooxml });
  if (format === "json") {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }
  if (profile.findingCount === 0) {
    console.log(`dislop patterns: ok (${filename}, 0 pattern findings)`);
    return;
  }
  console.log(`dislop patterns: ${profile.findingCount} finding(s) in ${filename} (dimensions: ${profile.activeDimensions.join(", ")})`);
  for (const f of profile.findings) {
    const msg = f.message?.[lang] || f.message?.en || "";
    console.log(`  [${f.severity.toUpperCase()}] ${f.file}:${f.location}  ${f.ruleId}  (${f.detectionAngle}${f.metric ? ` · ${f.metric}` : ""})`);
    console.log(`    match: "${f.match}"`);
    console.log(`    why:   ${msg}`);
  }
}

function runVoice(args) {
  const { flags, positional } = parseFlags(args);
  const format = flags.json ? "json" : flags.format || "text";
  assertTextOrJsonFormat(format);
  const lang = flags.lang || "auto";
  const samples = [];

  if (positional.length === 0 || positional[0] === "-") {
    const raw = fs.readFileSync(0, "utf8");
    samples.push(...raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean));
  } else {
    for (const p of positional) {
      const abs = path.resolve(process.cwd(), p);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        console.error(`dislop: file not found: ${p}`);
        process.exit(2);
      }
      samples.push(decodeUtf8Strict(fs.readFileSync(abs)));
    }
  }
  if (samples.length === 0) {
    console.error("dislop voice: provide at least one non-empty sample file or stdin text");
    process.exit(2);
  }

  const result = extractVoiceProfileOffline(samples, { lang });
  if (flags.output) {
    const outAbs = path.resolve(process.cwd(), String(flags.output));
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify(result, null, 2) + "\n", "utf8");
  }
  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const s = result.stylometrics;
  console.log(`dislop voice (${result.mode}, 0 network calls)`);
  console.log(`  samples=${s.sampleCount} · sentences=${s.sentenceCount} · mean=${s.meanLength} · cv=${s.lengthCV} · band=[${s.targetLengthBand.join(", ")}]`);
  console.log(`  tone: ${result.profile.tone}`);
  for (const h of result.profile.sentenceHabits) {
    console.log(`  - ${h}`);
  }
}

async function promptInteractiveTier(defaultTier, lang) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const q =
    lang === "zh"
      ? `\n请选择要选装的本地模型档位 [none / fast / balanced / quality]（回车默认 ${defaultTier}）：`
      : `\nChoose optional local model tier [none / fast / balanced / quality] (Enter for '${defaultTier}'): `;
  return new Promise((resolve) => {
    rl.question(q, (ans) => {
      rl.close();
      const val = String(ans || "").trim().toLowerCase();
      resolve(val || defaultTier);
    });
  });
}

async function runLocalDeslopCli(target, flags, packs) {
  const lang = flags.lang || "en";
  let rawText = "";
  let filename = flags["stdin-filename"] || "draft.md";
  if (!target || target === "-") {
    rawText = fs.readFileSync(0, "utf8");
  } else {
    const abs = path.resolve(process.cwd(), target);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.error(`dislop: file not found: ${target}`);
      process.exit(2);
    }
    filename = path.basename(abs);
    rawText = decodeUtf8Strict(fs.readFileSync(abs));
  }
  const modality = detectModality(filename) || "markdown";
  const config = loadConfig(process.cwd(), flags.config || null);
  const explicitPack =
    flags.pack === "auto"
      ? predictPackWithPocketRouter(rawText).recommendedPack
      : flags.pack || null;
  const packId = pickPackForFile(filename, modality, explicitPack, config);
  const pack = resolveEffectivePack(packId, packs, config);

  let res;
  try {
    res = await runLocalDeslop({
      text: rawText,
      pack,
      modality,
      endpoint: flags.endpoint || null,
      model: flags.model || null,
      allowLan: Boolean(flags["allow-lan"]),
    });
  } catch (err) {
    console.error(`dislop: ${err.message}`);
    process.exit(2);
  }

  if (!res.ok) {
    if (flags.json || flags.format === "json") {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.error(`dislop: ${res.error}`);
    }
    process.exit(2);
  }

  if (flags.output) {
    const outAbs = path.resolve(process.cwd(), String(flags.output));
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, res.text, "utf8");
  }

  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (!flags.output) {
    process.stdout.write(res.text.endsWith("\n") ? res.text : res.text + "\n");
  } else if (lang === "zh") {
    console.log(
      `dislop 本地改写完成（${res.model}）：改写 ${res.rewrittenParagraphs} 段，保留原段 ${res.keptOriginalParagraphs} 段，事实核验 ${res.factLedgerOk ? "通过" : "未通过"} -> ${flags.output}`
    );
  } else {
    console.log(
      `dislop local deslop (${res.model}): rewrote ${res.rewrittenParagraphs} paragraph(s), kept ${res.keptOriginalParagraphs} untouched, fact ledger ${res.factLedgerOk ? "ok" : "drifted"} -> ${flags.output}`
    );
  }
}

async function runModel(args, packs) {
  const { flags, positional } = parseFlags(args);
  const action = positional[0] || "status";
  const validActions = new Set(["status", "recommend", "score", "install", "setup", "import", "remove", "rm", "deslop"]);
  if (!validActions.has(action)) {
    console.error(
      `dislop model: unknown action '${action}' (expected status, recommend, score, install, setup, import, remove, or deslop)`
    );
    process.exit(2);
  }
  const restPos = positional.slice(1);
  const lang = flags.lang || "en";
  const asJson = Boolean(flags.json || flags.format === "json");

  if (action === "score") {
    const target = restPos[0] || "-";
    let threshold = null;
    if (flags.threshold !== undefined) {
      threshold = Number(flags.threshold);
      if (typeof flags.threshold === "boolean" || String(flags.threshold).trim() === "" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        console.error(`dislop model score: invalid --threshold '${flags.threshold}' (expected a number between 0 and 1)`);
        process.exit(2);
      }
    }
    let rawText = "";
    let label = flags["stdin-filename"] || "stdin.md";
    if (target === "-") {
      rawText = fs.readFileSync(0, "utf8");
    } else {
      const abs = path.resolve(process.cwd(), target);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        console.error(`dislop model score: file not found: ${target}`);
        process.exit(2);
      }
      label = target;
      rawText = decodeUtf8Strict(fs.readFileSync(abs));
    }
    const result = analyzeDocumentWithPocketModels(rawText, { threshold });
    if (asJson) {
      console.log(JSON.stringify({ file: label, ...result }, null, 2));
      return;
    }
    const pct = Math.round(result.documentProbability * 100);
    if (lang === "zh") {
      console.log(`dislop 内置传统模型评分（pocket-slop-v1 · 0 联网）：${label}`);
      console.log(
        `  文档最高温吞水概率 : ${pct}%（阈值 ${Math.round(result.threshold * 100)}% · 命中段落 ${result.flaggedCount}/${result.paragraphs.length}）`
      );
      console.log(
        `  自动判别场景包     : ${result.packRouter.recommendedPack}（置信度 ${Math.round(result.packRouter.confidence * 100)}%）`
      );
      for (const p of result.paragraphs) {
        const mark = p.flagged ? "[提醒]" : "[正常]";
        const drv = p.topDrivers.map((d) => d.reason.zh).join("、");
        console.log(`  ${mark} 第 ${p.startLine}-${p.endLine} 行 (${Math.round(p.slopProbability * 100)}%)${drv ? `：${drv}` : ""}`);
      }
    } else {
      console.log(`dislop bundled Pocket ML score (pocket-slop-v1 · 0 network calls): ${label}`);
      console.log(
        `  Max paragraph slop : ${pct}% (threshold ${Math.round(result.threshold * 100)}% · flagged ${result.flaggedCount}/${result.paragraphs.length})`
      );
      console.log(
        `  Recommended pack   : ${result.packRouter.recommendedPack} (confidence ${Math.round(result.packRouter.confidence * 100)}%)`
      );
      for (const p of result.paragraphs) {
        const mark = p.flagged ? "[FLAG]" : "[OK]  ";
        const drv = p.topDrivers.map((d) => d.reason.en).join("; ");
        console.log(`  ${mark} lines ${p.startLine}-${p.endLine} (${Math.round(p.slopProbability * 100)}%)${drv ? ` — ${drv}` : ""}`);
      }
    }
    return;
  }

  if ( action === "install" || action === "setup" ) {
    let rulesCount = 0;
    for (const p of Object.values(packs)) rulesCount += (p.rules || []).length;
    const status = await buildModelStatusReport({
      packsCount: Object.keys(packs).length,
      rulesCount,
      probeLoopback: false,
      cacheDir: flags["cache-dir"] || null,
    });
    let chosenTier = flags.tier || null;
    if (!chosenTier) {
      if (action === "setup" && process.stdin.isTTY && !flags.yes && !asJson && !flags["dry-run"]) {
        if (lang === "zh") {
          console.log(`dislop 模型选装向导（内置 15 KB 传统集成模型已就绪）`);
          console.log(`  硬件检测：${status.hardware.platform}/${status.hardware.arch} · ${status.hardware.totalMemoryGb} GB 内存 · 推荐档位 ${status.recommendation.tier}`);
          for (const t of Object.values(LOCAL_MODEL_TIERS)) {
            console.log(`  - ${t.tier.padEnd(9)} (${String(t.approxDownloadMb).padStart(4)} MB): ${t.summary.zh}`);
          }
        } else {
          console.log(`dislop optional model setup (bundled 15 KB Pocket ML is already active)`);
          console.log(`  Hardware: ${status.hardware.platform}/${status.hardware.arch} · ${status.hardware.totalMemoryGb} GB RAM · recommended '${status.recommendation.tier}'`);
          for (const t of Object.values(LOCAL_MODEL_TIERS)) {
            console.log(`  - ${t.tier.padEnd(9)} (${String(t.approxDownloadMb).padStart(4)} MB): ${t.summary.en}`);
          }
        }
        chosenTier = await promptInteractiveTier(status.recommendation.tier, lang);
      } else {
        chosenTier = restPos[0] || "auto";
      }
    }

    const res = installOptionalModel({
      tier: chosenTier,
      provider: flags.provider || "ollama",
      force: Boolean(flags.force),
      dryRun: Boolean(flags["dry-run"]),
      cacheDir: flags["cache-dir"] || null,
    });

    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
      if (!res.ok) process.exit(res.blockedByHardware ? 1 : 2);
      return;
    }

    if (!res.ok) {
      const msg = res.warning?.[lang] || res.message?.[lang] || res.warning?.en || res.message?.en || res.error;
      console.error(`dislop model install: ${msg}`);
      process.exit(res.blockedByHardware ? 1 : 2);
    }
    if (res.dryRun) {
      console.log(
        lang === "zh"
          ? `dislop 选装预检通过：档位 ${res.tier} (${res.modelId || res.provider}, 约 ${res.approxDownloadMb || 0} MB) -> ${res.command || res.modelCacheDir}`
          : `dislop install dry-run passed: tier '${res.tier}' (${res.modelId || res.provider}, ~${res.approxDownloadMb || 0} MB) -> ${res.command || res.modelCacheDir}`
      );
      return;
    }
    const doneMsg = res.message?.[lang] || res.message?.en || `Installed tier '${res.tier}' (${res.modelId}).`;
    console.log(doneMsg);
    return;
  }

  if (action === "import") {
    const fileArg = restPos[0];
    if (!fileArg) {
      console.error("Usage: dislop model import <file.gguf|file.onnx> [--tier <tier>] [--sha256 <hex>] [--no-copy] [--json]");
      process.exit(2);
    }
    const res = importLocalModelFile({
      filePath: fileArg,
      tier: flags.tier || "custom",
      expectedSha256: flags.sha256 || null,
      copyFile: !flags["no-copy"],
      cacheDir: flags["cache-dir"] || null,
    });
    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
      if (!res.ok) process.exit(2);
      return;
    }
    if (!res.ok) {
      console.error(`dislop model import: ${res.error}`);
      process.exit(2);
    }
    console.log(`Imported ${res.imported.id} (tier=${res.imported.tier}, sha256=${res.imported.sha256.slice(0, 12)}…) -> ${res.imported.path}`);
    return;
  }

  if (action === "remove" || action === "rm") {
    const target = restPos[0] || flags.tier;
    const res = removeInstalledModel({ target, cacheDir: flags["cache-dir"] || null });
    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
      if (!res.ok) process.exit(1);
      return;
    }
    if (!res.ok) {
      console.error(`dislop model remove: ${res.error || `no cached model matched '${target}'`}`);
      process.exit(1);
    }
    console.log(`Removed ${res.removedCount} cached model entry(s).`);
    return;
  }

  if (action === "deslop") {
    await runLocalDeslopCli(restPos[0] || "-", flags, packs);
    return;
  }

  let rulesCount = 0;
  for (const p of Object.values(packs)) rulesCount += (p.rules || []).length;
  const report = await buildModelStatusReport({
    packsCount: Object.keys(packs).length,
    rulesCount,
    probeLoopback: !flags["no-loopback"],
    cacheDir: flags["cache-dir"] || null,
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const hw = report.hardware;
  const rec = report.recommendation;
  const bm = report.bundledModels?.[0];
  if (lang === "zh") {
    console.log(`dislop 本地引擎、随包传统模型与选装小模型状态（检查全程 0 联网）`);
    console.log(`  内置确定性引擎 : 已就绪（${report.builtinDeterministic.bundledPacks} 套规则包 / ${report.builtinDeterministic.bundledRules} 条规则全量内置）`);
    if (bm) {
      console.log(`  随包传统模型   : 已内置 ${bm.id}（约 ${bm.approxGzipKb} KB gz · 含隐蔽水文集成评分与场景自动路由）`);
    }
    console.log(`  当前机器硬件   : ${hw.platform}/${hw.arch} · ${hw.totalMemoryGb} GB 内存${hw.freeDiskGb !== null ? ` · 剩余磁盘 ${hw.freeDiskGb} GB` : ""}`);
    console.log(`  可选生成小模型 : ${rec.tier}${rec.modelId ? ` (${rec.modelId}, 约 ${rec.approxDownloadMb} MB)` : "（无需额外下载）"}`);
    console.log(`  说明           : ${rec.reason.zh}`);
    if (rec.installHint) console.log(`  按需选装命令   : ${rec.installHint}`);
    if (report.installedModels.length > 0) {
      console.log(`  已装本地权重   : ${report.installedModels.map((m) => `${m.id}[${m.tier}]`).join(", ")}`);
    }
    if (report.localRunners.length > 0) {
      for (const r of report.localRunners) {
        console.log(`  已发现本地服务 : ${r.kind} (${r.endpoint}) -> ${r.models.join(", ") || "无已装模型"}`);
      }
    }
  } else {
    console.log(`dislop local engine, bundled ML & optional model status (0 external network calls)`);
    console.log(`  Built-in engine : ready (${report.builtinDeterministic.bundledPacks} packs / ${report.builtinDeterministic.bundledRules} rules bundled offline)`);
    if (bm) {
      console.log(`  Bundled ML      : ready (${bm.id}, ~${bm.approxGzipKb} KB gz · paragraph slop ensemble + domain router)`);
    }
    console.log(`  Hardware        : ${hw.platform}/${hw.arch} · ${hw.totalMemoryGb} GB RAM${hw.freeDiskGb !== null ? ` · ${hw.freeDiskGb} GB free disk` : ""}`);
    console.log(`  Recommended SLM : ${rec.tier}${rec.modelId ? ` (${rec.modelId}, ~${rec.approxDownloadMb} MB)` : " (no extra download needed)"}`);
    console.log(`  Reason          : ${rec.reason.en}`);
    if (rec.installHint) console.log(`  Optional install: ${rec.installHint}`);
    if (report.installedModels.length > 0) {
      console.log(`  Cached weights  : ${report.installedModels.map((m) => `${m.id}[${m.tier}]`).join(", ")}`);
    }
    if (report.localRunners.length > 0) {
      for (const r of report.localRunners) {
        console.log(`  Active loopback : ${r.kind} (${r.endpoint}) -> ${r.models.join(", ") || "no models loaded"}`);
      }
    }
  }
}

function printHelp() {
  console.log(`dislop v${ENGINE_VERSION} — Linter for AI Slop in docs, web UI, and slides

Usage:
  dislop check [paths... | -] [--pack <id|auto>] [--ml] [--patterns] [--fail-on error|warning|info|never]
               [--format text|json|sarif|github|md] [--profile] [--changed [ref] | --staged]
               [--stdin-filename <name>] [--report-unused] [--lang en|zh]
  dislop voice [paths... | -] [--output|-o <voice.json>] [--lang auto|en|zh] [--json]
  dislop model [status|score|install|import|remove|deslop] [target] [--tier <t>] [--lang en|zh] [--json]
  dislop setup [--tier auto|none|fast|balanced|quality] [--dry-run] [--force] [--lang en|zh]
  dislop deslop [file | -] --local [--endpoint <url>] [--model <id>] [--output|-o <file>] [--json]
  dislop explain <rule-id> [--lang en|zh] [--json]
  dislop catalog [query] [--pack <id>] [--category <cat>] [--dimension <dim>]
                 [--family <prefix>] [--modality <mod>] [--severity <sev>] [--tier invariant|taste]
                 [--format text|json|md] [--lang en|zh]
  dislop patterns [file | -] [--stdin-filename <name>] [--angle <a,b>] [--lang en|zh] [--json]
  dislop packs [--json]
  dislop resources [--json]
  dislop pack-test
  dislop init
  dislop --mcp`);
}

async function main() {
  const argv = process.argv.slice(2);
  const packs = loadAllPacks();
  const patternByRuleId = loadPatternLibrary();

  if (argv.includes("--mcp")) {
    runMcpServer(packs, patternByRuleId);
    return;
  }
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help" || argv[0] === "help") {
    printHelp();
    return;
  }
  if (argv[0] === "-v" || argv[0] === "--version") {
    console.log(ENGINE_VERSION);
    return;
  }

  const cmd = argv[0];
  const rest = argv.slice(1);
  if (cmd === "check") return runCheck(rest, packs);
  if (cmd === "voice") return runVoice(rest);
  if (cmd === "model" || cmd === "doctor") return await runModel(rest, packs);
  if (cmd === "setup") return await runModel(["setup", ...rest], packs);
  if (cmd === "deslop") {
    const { flags, positional } = parseFlags(rest);
    if (!flags.local) {
      console.error("dislop deslop: pass --local to run with a loopback local small model (0 external upload).");
      process.exit(2);
    }
    return await runLocalDeslopCli(positional[0] || "-", flags, packs);
  }
  if (cmd === "explain") return runExplain(rest, packs, patternByRuleId);
  if (cmd === "catalog" || cmd === "search") return runCatalog(rest, packs, patternByRuleId);
  if (cmd === "patterns") return runPatterns(rest);
  if (cmd === "packs") return runPacks(rest, packs);
  if (cmd === "resources") return runResources(rest, packs);
  if (cmd === "pack-test") return runPackTest(packs);
  if (cmd === "init") return runInit();

  console.error(`dislop: unknown command '${cmd}'. Run 'dislop --help' for usage.`);
  process.exit(2);
}

main();
