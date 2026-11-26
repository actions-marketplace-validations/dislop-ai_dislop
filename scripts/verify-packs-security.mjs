#!/usr/bin/env node
/**
 * CI Supply-Chain & Language-Purity Security Scanner for `dislop` Packs.
 * Verifies:
 *   1. Valid `pack.json` schema across all built-in Packs.
 *   2. Zero kernel boundary tags, jailbreaks, leaked schema keys, or Trojan Source bidi/zero-width chars in `prompts/*.md` and `.pack.md`.
 *   3. Zero forbidden runtime capabilities (`child_process`, `http`, `fetch`, `eval`, `fs.writeFile`, etc.) inside pack script modules (`packs/<scope>/<scenario>/scripts/`).
 *   4. Strict single-language separation across `src/`, `packs/common/`, `packs/en/`, and English root docs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FORBIDDEN_PROMPT_BOUNDARY_RE =
  /<\/?(?:pack_rules|untrusted_document|context_readonly|established_tone_anchor)\b/i;
const FORBIDDEN_PROMPT_OVERRIDE_RE =
  /\b(?:ignore (?:all )?previous instructions|override core invariants|disregard safety|system prompt override)\b/i;
const FORBIDDEN_PROMPT_SCHEMA_RE =
  /\b(?:actionType|fixSafety|suggestedReplacement|rewritePrompt|targetId|documentToneAnchor|dislop\.report)\b/;
const TROJAN_UNICODE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/;

const FORBIDDEN_SCRIPT_CAPS = [
  { label: "child_process", re: /['"](?:node:)?child_process['"]/ },
  { label: "network module (http/https/net/tls/dgram/dns)", re: /['"](?:node:)?(?:http|https|http2|net|tls|dgram|dns)['"]/ },
  { label: "fetch() / WebSocket", re: /\b(?:fetch\s*\(|new\s+WebSocket\b)/ },
  { label: "dynamic eval / Function", re: /\b(?:eval\s*\(|new\s+Function\b)/ },
  { label: "filesystem mutation", re: /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|unlinkSync|unlink|rmSync|rm|renameSync|rename|mkdirSync|mkdir)\s*\(/ },
];

const CJK_RE = /[\u4e00-\u9fff]/;

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const errors = [];

function fail(relPath, msg) {
  errors.push(`${relPath}: ${msg}`);
}

function scanPromptFile(absPath) {
  const rel = path.relative(ROOT, absPath);
  const raw = fs.readFileSync(absPath, "utf8");
  const withoutBom = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;

  if (FORBIDDEN_PROMPT_BOUNDARY_RE.test(raw)) {
    fail(rel, "Contains forbidden kernel XML boundary tag");
  }
  if (FORBIDDEN_PROMPT_OVERRIDE_RE.test(raw)) {
    fail(rel, "Contains forbidden prompt-override / jailbreak phrase");
  }
  if (FORBIDDEN_PROMPT_SCHEMA_RE.test(raw)) {
    fail(rel, "Leaks internal kernel JSON schema field name");
  }
  if (TROJAN_UNICODE_RE.test(raw) || withoutBom.includes("\uFEFF")) {
    fail(rel, "Contains hidden zero-width, bidi, or mid-file BOM Unicode character");
  }
}

// 1. Scan all built-in Packs
const packsDir = path.join(ROOT, "packs");
let packCount = 0;

for (const scopeEntry of fs.readdirSync(packsDir, { withFileTypes: true })) {
  if (!scopeEntry.isDirectory()) continue;
  const scopeDir = path.join(packsDir, scopeEntry.name);
  for (const scenEntry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
    if (!scenEntry.isDirectory()) continue;
    const packDir = path.join(scopeDir, scenEntry.name);
    const manifestPath = path.join(packDir, "pack.json");
    const relManifest = path.relative(ROOT, manifestPath);

    if (!fs.existsSync(manifestPath)) {
      fail(path.relative(ROOT, packDir), "Missing pack.json");
      continue;
    }
    packCount += 1;

    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!m.name || !m.version || !m.description) {
        fail(relManifest, "pack.json must declare non-empty name, version, and description");
      }
      if (TROJAN_UNICODE_RE.test(JSON.stringify(m))) {
        fail(relManifest, "pack.json contains hidden zero-width/bidi Unicode characters");
      }
    } catch (err) {
      fail(relManifest, `Invalid JSON: ${err.message}`);
    }

    for (const pf of walkFiles(path.join(packDir, "prompts")).filter((f) => f.endsWith(".md"))) {
      scanPromptFile(pf);
    }

    for (const sf of walkFiles(path.join(packDir, "scripts")).filter((f) => /\.(?:mjs|js)$/.test(f))) {
      const rel = path.relative(ROOT, sf);
      const code = fs.readFileSync(sf, "utf8");
      if (TROJAN_UNICODE_RE.test(code)) {
        fail(rel, "Script contains hidden zero-width/bidi Unicode characters");
      }
      for (const cap of FORBIDDEN_SCRIPT_CAPS) {
        if (cap.re.test(code)) {
          fail(rel, `Forbidden capability inside Pack script: ${cap.label}`);
        }
      }
    }
  }
}

// Also scan any standalone `.pack.md` files in the repository
for (const f of walkFiles(ROOT).filter((p) => p.endsWith(".pack.md") && !p.includes(`${path.sep}node_modules${path.sep}`))) {
  scanPromptFile(f);
}

// 2. Enforce strict single-language purity across pure-English directories & docs
for (const pureDir of ["src", "packs/common", "packs/en"]) {
  for (const f of walkFiles(path.join(ROOT, pureDir)).filter((p) => /\.(?:mjs|js|md|json)$/.test(p))) {
    const rel = path.relative(ROOT, f);
    const content = fs.readFileSync(f, "utf8");
    if (CJK_RE.test(content)) {
      fail(rel, "Pure-English path contains disallowed literal CJK characters");
    }
  }
}

for (const pureDoc of ["README.md", "CONTRIBUTING.md", "PRODUCT.md", "AGENTS.md", "SECURITY.md", "docs/architecture.md", "docs/MIGRATION-TODO.md"]) {
  const full = path.join(ROOT, pureDoc);
  if (fs.existsSync(full) && CJK_RE.test(fs.readFileSync(full, "utf8"))) {
    fail(pureDoc, "English root/doc file contains disallowed literal CJK characters");
  }
}

if (errors.length > 0) {
  console.error(`Pack security scan FAILED (${errors.length} violation(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Pack security scan PASSED (${packCount} built-in packs verified, 0 violations).`);
