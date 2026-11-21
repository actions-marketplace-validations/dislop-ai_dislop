#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VERSION = "0.1.0";
const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__", "packs", "tests"]);
const TEXT_EXTS = new Set([".md", ".markdown", ".txt", ".html", ".htm", ".svg", ".css", ".tsx", ".jsx"]);

export function loadPacks() {
  const packsDir = path.join(ROOT, "packs");
  const packs = new Map();
  if (!fs.existsSync(packsDir)) return packs;
  for (const entry of fs.readdirSync(packsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const p = path.join(packsDir, entry.name, "pack.json");
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      packs.set(data.id, data);
    }
  }
  return packs;
}

function stripMarkdownCode(lines) {
  let inFence = false;
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return "";
    }
    if (inFence) return "";
    return line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
  });
}

export function auditText(text, packId = "business-brief", isMarkdown = true) {
  const packs = loadPacks();
  const pack = packs.get(packId);
  if (!pack) throw new Error(`Unknown Taste Pack: ${packId}`);
  const rawLines = text.split(/\r?\n/);
  const proseLines = isMarkdown ? stripMarkdownCode(rawLines) : rawLines;
  const findings = [];

  for (const rule of pack.rules || []) {
    const targetLines =
      rule.category === "artifact-hygiene" || rule.category === "visual-cliche" ? rawLines : proseLines;
    const regexes = (rule.patterns || []).map((pat) => new RegExp(pat, "gi"));
    targetLines.forEach((line, idx) => {
      for (const re of regexes) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          findings.push({
            line: idx + 1,
            column: m.index + 1,
            ruleId: rule.id,
            severity: rule.severity,
            category: rule.category,
            match: m[0],
            description: rule.description,
          });
          if (m[0].length === 0) break;
        }
      }
    });
  }

  const joined = proseLines.join("\n");
  const nonSpace = joined.replace(/\s+/g, "").length;
  const emDashes = (joined.match(/—/g) || []).length;
  if (nonSpace >= 300 && (emDashes * 1000) / nonSpace > 10) {
    findings.push({
      line: 1,
      column: 1,
      ruleId: "excessive-em-dash-density",
      severity: "info",
      category: "structure",
      match: `${emDashes} em-dashes / ${nonSpace} chars`,
      description: "High em-dash frequency flattens sentence cadence; replace part of them with periods or clauses.",
    });
  }

  return { pack: pack.id, count: findings.length, findings };
}

export function auditPath(targetPath, packId = null) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const results = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
          results.push(auditPath(full, packId));
        }
      }
    };
    walk(targetPath);
    return {
      target: targetPath,
      filesScanned: results.length,
      count: results.reduce((acc, r) => acc + r.count, 0),
      results,
    };
  }
  const ext = path.extname(targetPath).toLowerCase();
  const chosen = packId || ([".html", ".htm", ".svg", ".css"].includes(ext) ? "deck-and-ui" : "business-brief");
  const content = fs.readFileSync(targetPath, "utf8");
  const res = auditText(content, chosen, ext === ".md" || ext === ".markdown");
  return { file: targetPath, modality: ext.replace(/^\./, "") || "text", ...res };
}

export function runMcpStdio() {
  const packs = loadPacks();
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

  rl.on("line", (raw) => {
    if (!raw.trim()) return;
    let req;
    try {
      req = JSON.parse(raw);
    } catch {
      return;
    }
    const { id, method, params } = req;
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "dislop", version: VERSION },
        },
      });
    } else if (method === "tools/list") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "dislop_check",
              description: "Audit text, file, or directory against a Taste Pack before delivery.",
              inputSchema: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  path: { type: "string" },
                  pack: { type: "string", default: "business-brief" },
                },
              },
            },
            {
              name: "dislop_packs",
              description: "List installed Taste Packs.",
              inputSchema: { type: "object", properties: {} },
            },
            {
              name: "dislop_exemplars",
              description: "Fetch before/after editorial exemplars from a Taste Pack.",
              inputSchema: {
                type: "object",
                properties: { pack: { type: "string", default: "business-brief" } },
              },
            },
          ],
        },
      });
    } else if (method === "tools/call") {
      try {
        const name = params?.name;
        const args = params?.arguments || {};
        if (name === "dislop_check") {
          const report = args.path
            ? auditPath(String(args.path), args.pack || null)
            : auditText(String(args.text || ""), args.pack || "business-brief");
          send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] } });
        } else if (name === "dislop_packs") {
          const summary = [...packs.values()].map((p) => ({
            id: p.id,
            name: p.name,
            modalities: p.modalities || [],
            rules: (p.rules || []).length,
          }));
          send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] } });
        } else if (name === "dislop_exemplars") {
          const pack = packs.get(args.pack || "business-brief");
          send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(pack?.exemplars || [], null, 2) }] } });
        } else {
          send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${name}` } });
        }
      } catch (err) {
        send({ jsonrpc: "2.0", id, error: { code: -32000, message: String(err.message || err) } });
      }
    } else if (id !== undefined) {
      send({ jsonrpc: "2.0", id, result: {} });
    }
  });
}

function printFileReport(r) {
  for (const f of r.findings || []) {
    console.log(`${r.file}:${f.line}:${f.column} [${f.severity}] ${f.ruleId}: "${f.match}" — ${f.description}`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(VERSION);
    return;
  }
  if (argv.includes("--mcp")) {
    runMcpStdio();
    return;
  }
  if (argv[0] === "packs") {
    for (const p of loadPacks().values()) {
      console.log(`${p.id}\t(${(p.rules || []).length} rules)\t${p.description}`);
    }
    return;
  }
  if (argv[0] === "explain" && argv[1]) {
    for (const p of loadPacks().values()) {
      const rule = (p.rules || []).find((r) => r.id === argv[1]);
      if (rule) {
        const exemplars = (p.exemplars || []).filter((e) => e.ruleId === argv[1]);
        console.log(JSON.stringify({ pack: p.id, rule, exemplars }, null, 2));
        return;
      }
    }
    console.error(`Unknown rule: ${argv[1]}`);
    process.exitCode = 1;
    return;
  }
  if (argv[0] === "check" && argv[1]) {
    const packIdx = argv.indexOf("--pack");
    const packId = packIdx !== -1 && argv[packIdx + 1] ? argv[packIdx + 1] : null;
    const jsonOut = argv.includes("--json");
    const report = auditPath(argv[1], packId);
    if (jsonOut) {
      console.log(JSON.stringify(report, null, 2));
      if (report.count > 0) process.exitCode = 1;
    } else if (report.count === 0) {
      const label = report.filesScanned !== undefined ? `${report.filesScanned} files` : report.pack;
      console.log(`ok (${label}): 0 findings`);
    } else {
      if (report.results) report.results.forEach(printFileReport);
      else printFileReport(report);
      process.exitCode = 1;
    }
    return;
  }
  console.log(
    [
      `dislop ${VERSION} — Cross-modal anti-AI-slop quality gate`,
      "",
      "Usage:",
      "  dislop check <file-or-dir> [--pack business-brief|literary-essay|deck-and-ui] [--json]",
      "  dislop packs",
      "  dislop explain <rule-id>",
      "  dislop --mcp",
      "  dislop --version",
    ].join("\n")
  );
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("/dislop") || process.argv[1]?.endsWith("dislop.mjs")) {
  main();
}
