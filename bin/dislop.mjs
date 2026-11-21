#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ENGINE_VERSION,
  SEVERITY_RANK,
  detectModality,
  defaultPackForModality,
  resolveEffectivePack,
  auditText,
  auditOoxmlEntries,
  formatReport,
} from "../src/core.mjs";
import { readZipXmlEntries } from "../src/binary-node.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKS_DIR = path.join(REPO_ROOT, "packs");

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
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return decoder.decode(buffer);
}

function collectFiles(targetPaths, cwd, config) {
  const files = [];
  const skipped = [];
  const ignoreGlobs = config?.ignore || [];

  // When running inside the dislop repo itself without custom config, skip intentional bad-example dirs
  const isSelfRepo =
    fs.existsSync(path.join(cwd, "packs", "core", "pack.json")) &&
    fs.existsSync(path.join(cwd, "src", "core.mjs"));
  const effectiveIgnores = isSelfRepo && ignoreGlobs.length === 0
    ? ["packs/**", "tests/**", "scratch/**"]
    : ignoreGlobs;

  function walk(absPath, explicit) {
    if (!fs.existsSync(absPath)) {
      throw new Error(`Target path not found: ${absPath}`);
    }
    const stat = fs.statSync(absPath);
    const rel = path.relative(cwd, absPath).split(path.sep).join("/") || path.basename(absPath);

    if (!explicit && matchesAnyGlob(rel, effectiveIgnores)) {
      return;
    }

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(absPath, entry.name), false);
      }
      return;
    }

    if (!stat.isFile()) return;
    const mod = detectModality(absPath);
    if (!mod) {
      if (explicit) {
        skipped.push({ file: rel, reason: `Unsupported file extension '${path.extname(absPath) || "(none)"}'` });
      }
      return;
    }
    files.push({ absPath, rel, modality: mod, explicit });
  }

  for (const t of targetPaths) {
    walk(path.resolve(cwd, t), true);
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

function inspectSingleFile({ absPath, rel, modality }, packs, explicitPack, config) {
  const stat = fs.statSync(absPath);
  if (stat.size > 25 * 1024 * 1024) {
    return {
      checked: false,
      findings: [],
      unusedSuppressions: [],
      skipped: [{ file: rel, reason: "File exceeds 25 MB single-file inspection cap" }],
    };
  }

  const packId = pickPackForFile(rel, modality, explicitPack, config);
  const pack = resolveEffectivePack(packId, packs, config);
  const buf = fs.readFileSync(absPath);

  if (modality === "docx" || modality === "pptx") {
    try {
      const entries = readZipXmlEntries(buf);
      const res = auditOoxmlEntries(entries, { filename: rel, modality, pack, config });
      const missingCorePart = res.skipped.some((s) => s.file === rel);
      return { checked: !missingCorePart, findings: res.findings, unusedSuppressions: [], skipped: res.skipped };
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

  const res = auditText(text, { filename: rel, modality, pack, config });
  return { checked: true, findings: res.findings, unusedSuppressions: res.unusedSuppressions, skipped: [] };
}

// ---------- Subcommands ----------

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-") {
      positional.push("-");
    } else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const boolKeys = new Set(["json", "staged", "report-unused", "allow-drop", "help", "version", "mcp"]);
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
  return { flags, positional };
}

function runCheck(args, packs) {
  const { flags, positional } = parseFlags(args);
  const cwd = process.cwd();
  const config = loadConfig(cwd, flags.config || null);
  const format = flags.json ? "json" : flags.format || "text";
  const failOn = flags["fail-on"] || config.failOn || "error";
  const lang = flags.lang || "en";
  const reportUnused = Boolean(flags["report-unused"]);

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
    const packId = pickPackForFile(filename, modality, flags.pack || null, config);
    const pack = resolveEffectivePack(packId, packs, config);
    const res = auditText(stdinText, { filename, modality, pack, config });
    const report = {
      version: ENGINE_VERSION,
      checkedCount: 1,
      skipped: [],
      findings: res.findings,
      unusedSuppressions: reportUnused ? res.unusedSuppressions : [],
    };
    console.log(formatReport(report, format, lang));
    const triggered =
      res.findings.some((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[failOn]) ||
      (reportUnused && res.unusedSuppressions.length > 0);
    process.exit(triggered ? 1 : 0);
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
  let checkedCount = 0;
  let explicitUninspectable = collected.skipped.length > 0;

  for (const item of collected.files) {
    if (changedMap && !changedMap.has(item.rel)) continue;
    let res;
    try {
      res = inspectSingleFile(item, packs, flags.pack || null, config);
    } catch (err) {
      console.error(`dislop: ${err.message}`);
      process.exit(2);
    }
    if (res.checked) {
      checkedCount += 1;
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
  };

  const rendered = formatReport(report, format, lang);
  if (rendered) console.log(rendered);

  if (explicitUninspectable || (checkedCount === 0 && allSkipped.length > 0)) {
    process.exit(2);
  }
  const shouldFail =
    allFindings.some((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[failOn]) ||
    (reportUnused && allUnused.length > 0);
  process.exit(shouldFail ? 1 : 0);
}

function runExplain(args, packs) {
  const { flags, positional } = parseFlags(args);
  const ruleId = positional[0];
  if (!ruleId) {
    console.error("Usage: dislop explain <rule-id> [--lang en|zh] [--json]");
    process.exit(2);
  }
  const lang = flags.lang || "en";
  for (const pack of Object.values(packs)) {
    const rule = (pack.rules || []).find((r) => r.id === ruleId);
    if (rule) {
      if (flags.json || flags.format === "json") {
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
  console.error(`dislop: unknown rule '${ruleId}'`);
  process.exit(2);
}

function runPacks(args, packs) {
  const { flags } = parseFlags(args);
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
  if (flags.json || flags.format === "json") {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  for (const p of list) {
    console.log(`${p.id.padEnd(18)} [${p.tier}] (${p.ruleCount} rules) — ${p.name.en} / ${p.name.zh}`);
    console.log(`  modalities: ${p.modalities.join(", ")}`);
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

function runMcpServer(packs) {
  const cwd = process.cwd();
  const config = loadConfig(cwd);
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
          pack: { type: "string", description: "Style pack ID (business-brief, literary-essay, deck-and-ui)" },
          filename: { type: "string", description: "Virtual filename hint when inspecting `text`" },
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
          ruleId: { type: "string", description: "Rule ID returned by dislop_check" },
          lang: { type: "string", description: "en or zh" },
        },
        required: ["ruleId"],
      },
    },
    {
      name: "dislop_packs",
      description: "List installed rule packs, supported formats, and rule counts.",
      inputSchema: { type: "object", properties: {} },
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

        if (name === "dislop_explain") {
          if (!args.ruleId) {
            toolResult(id, { error: "Missing required argument `ruleId`" }, true);
            return;
          }
          for (const p of Object.values(packs)) {
            const rule = (p.rules || []).find((r) => r.id === args.ruleId);
            if (rule) {
              toolResult(id, { packId: p.id, ...rule });
              return;
            }
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

          if (hasText) {
            const fn = args.filename || "draft.md";
            const mod = detectModality(fn) || "markdown";
            const packId = pickPackForFile(fn, mod, args.pack || null, config);
            const pack = resolveEffectivePack(packId, packs, config);
            const res = auditText(args.text, { filename: fn, modality: mod, pack, config });
            toolResult(id, {
              pack: packId,
              modality: mod,
              checked: true,
              skipped: [],
              count: res.findings.length,
              findings: res.findings,
            });
            return;
          }

          // Confine realpath inside workspace root (blocks symlink escapes and allows `..dots.md`)
          const resolved = path.resolve(cwd, args.path);
          if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
            toolResult(id, { error: `File not found: ${args.path}` }, true);
            return;
          }
          const realCwd = fs.realpathSync(cwd);
          const realTarget = fs.realpathSync(resolved);
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
          const res = inspectSingleFile(
            { absPath: realTarget, rel: rel.split(path.sep).join("/"), modality: mod },
            packs,
            args.pack || null,
            config
          );
          toolResult(id, {
            pack: pickPackForFile(rel, mod, args.pack || null, config),
            modality: mod,
            checked: res.checked,
            skipped: res.skipped,
            count: res.findings.length,
            findings: res.findings,
          });
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

function printHelp() {
  console.log(`dislop v${ENGINE_VERSION} — Local linter for AI-written docs, slides, and web pages

Usage:
  dislop check [paths... | -] [--pack <id>] [--fail-on error|warning|info|never]
               [--format text|json|sarif|github|md] [--changed [ref] | --staged]
               [--stdin-filename <name>] [--report-unused] [--lang en|zh]
  dislop explain <rule-id> [--lang en|zh] [--json]
  dislop packs [--json]
  dislop pack-test
  dislop init
  dislop --mcp`);
}

function main() {
  const argv = process.argv.slice(2);
  const packs = loadAllPacks();

  if (argv.includes("--mcp")) {
    runMcpServer(packs);
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
  if (cmd === "explain") return runExplain(rest, packs);
  if (cmd === "packs") return runPacks(rest, packs);
  if (cmd === "pack-test") return runPackTest(packs);
  if (cmd === "init") return runInit();

  console.error(`dislop: unknown command '${cmd}'. Run 'dislop --help' for usage.`);
  process.exit(2);
}

main();
