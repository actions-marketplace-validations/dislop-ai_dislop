import fs from "node:fs";
import path from "node:path";

export const PACK_ALLOWED_LANGUAGES = new Set(["en", "zh", "common", "multi", "any"]);
export const INVISIBLE_UNICODE_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/;
export const CJK_CHAR_REGEX = /[\u4E00-\u9FFF]/;

const PROMPT_INJECTION_RULES = [
  {
    id: "prompt-injection/instruction-override",
    regex: /\b(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+|any\s+|your\s+)?(?:previous|prior|above|system|kernel|safety|security)\s+(?:instructions|prompts?|rules|invariants|policies|constraints)\b/i,
    message: "Contains instruction-override / jailbreak phrasing",
  },
  {
    id: "prompt-injection/role-hijack",
    regex: /\b(?:you\s+are\s+now|new\s+system\s+prompt|act\s+as\s+unrestricted|developer\s+mode\s+enabled|jailbreak)\b/i,
    message: "Contains role-hijack or jailbreak directive",
  },
  {
    id: "prompt-injection/boundary-breakout",
    regex: /<\/?(?:untrusted_document|context_readonly|pack_rules|established_tone_anchor|system)\b[^>]*>/i,
    message: "Contains XML boundary tag breakout attempt",
  },
  {
    id: "prompt-injection/suppression",
    regex: /\b(?:always\s+report\s+zero\s+issues|report\s+zero\s+issues\s+for|suppress\s+all\s+(?:defects|errors|warnings)|always\s+return\s+(?:empty|clean))\b/i,
    message: "Attempts to force false-negative clean results",
  },
  {
    id: "prompt-injection/exfiltration",
    regex: /\b(?:exfiltrate|leak\s+(?:secrets|tokens|env)|send\s+(?:all\s+)?(?:contents?|secrets?|tokens?|api[_ -]?keys?)\s+to\s+https?:|upload\s+.*\s+to\s+https?:)\b/i,
    message: "Contains data-exfiltration or URL-redirect instruction",
  },
  {
    id: "prompt-injection/url-swap",
    regex: /\breplace\s+(?:all\s+)?(?:links?|urls?)\s+with\s+https?:\/\//i,
    message: "Contains malicious URL replacement instruction",
  },
  {
    id: "secret-leak/credential-literal",
    regex: /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/,
    message: "Contains potential hardcoded API key or credential token",
  },
];

const SCRIPT_SECURITY_RULES = [
  {
    id: "script-security/forbidden-module",
    regex: /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:node:)?(?:child_process|fs\/promises|http|https|http2|net|tls|dgram|dns|vm|worker_threads|cluster|os|process|inspector|module|readline)["']/i,
    message: "Imports restricted Node.js built-in module outside pack sandbox",
  },
  {
    id: "script-security/fs-write",
    regex: /\bfs\.(?:writeFile|appendFile|rm|unlink|mkdir|rmdir|rename|chmod|chown|copyFile|symlink|truncate)(?:Sync)?\s*\(/,
    message: "Attempts destructive or mutating filesystem call inside pack script",
  },
  {
    id: "script-security/dynamic-code-exec",
    regex: /\b(?:eval\s*\(|new\s+Function\b|\bFunction\s*\(|import\s*\(|require\s*\()/,
    message: "Uses dynamic code evaluation or dynamic module loading",
  },
  {
    id: "script-security/network-access",
    regex: /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon)\b/,
    message: "Attempts network access inside deterministic pack script",
  },
  {
    id: "script-security/runtime-escape",
    regex: /\b(?:process\.(?:env|exit|kill|binding|dlopen|mainModule|argv)|globalThis\s*\[|Reflect\.construct)\b/,
    message: "Accesses restricted host runtime process or global state",
  },
];

function findLineNumber(text, index) {
  if (index < 0) return 1;
  return text.slice(0, index).split("\n").length;
}

/**
 * Validate markdown prompt text or string fields for security and language purity.
 */
export function validatePackPromptContent(content, filePath, { enforceEnglishOnly = false } = {}) {
  const violations = [];
  const text = String(content ?? "");

  const invisibleMatch = INVISIBLE_UNICODE_REGEX.exec(text);
  if (invisibleMatch) {
    violations.push({
      file: filePath,
      ruleId: "pack-security/invisible-unicode",
      severity: "error",
      line: findLineNumber(text, invisibleMatch.index),
      message: "Contains hidden zero-width or bidirectional control characters",
    });
  }

  for (const rule of PROMPT_INJECTION_RULES) {
    const match = rule.regex.exec(text);
    if (match) {
      violations.push({
        file: filePath,
        ruleId: rule.id,
        severity: "error",
        line: findLineNumber(text, match.index),
        message: rule.message,
      });
    }
  }

  if (enforceEnglishOnly && CJK_CHAR_REGEX.test(text)) {
    const match = CJK_CHAR_REGEX.exec(text);
    violations.push({
      file: filePath,
      ruleId: "pack-hygiene/non-english-in-en-pack",
      severity: "error",
      line: findLineNumber(text, match ? match.index : 0),
      message: "English or common pack must not contain literal CJK characters",
    });
  }

  return violations;
}

/**
 * Validate deterministic JS/MJS pack script content against dangerous host primitives.
 */
export function validatePackScriptContent(
  content,
  filePath,
  { enforceEnglishOnly = false, allowBuiltinFs = false } = {},
) {
  const violations = [];
  const text = String(content ?? "");

  const invisibleMatch = INVISIBLE_UNICODE_REGEX.exec(text);
  if (invisibleMatch) {
    violations.push({
      file: filePath,
      ruleId: "pack-security/invisible-unicode",
      severity: "error",
      line: findLineNumber(text, invisibleMatch.index),
      message: "Script contains hidden zero-width or bidirectional control characters",
    });
  }

  for (const rule of SCRIPT_SECURITY_RULES) {
    const match = rule.regex.exec(text);
    if (match) {
      violations.push({
        file: filePath,
        ruleId: rule.id,
        severity: "error",
        line: findLineNumber(text, match.index),
        message: rule.message,
      });
    }
  }

  // Flag external / parent-escaping ESM imports inside scripts
  const allowedSpecs = new Set(["dislop/sdk"]);
  if (allowBuiltinFs) {
    allowedSpecs.add("node:fs");
    allowedSpecs.add("node:path");
  }
  const importRegex = /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  let importMatch;
  while ((importMatch = importRegex.exec(text)) !== null) {
    const spec = importMatch[1];
    if (!spec.startsWith("./") && !allowedSpecs.has(spec)) {
      violations.push({
        file: filePath,
        ruleId: "script-security/external-import",
        severity: "error",
        line: findLineNumber(text, importMatch.index),
        message: `Pack script import "${spec}" must be "dislop/sdk" or stay within local "./" pack files`,
      });
    }
  }

  if (enforceEnglishOnly && CJK_CHAR_REGEX.test(text)) {
    const match = CJK_CHAR_REGEX.exec(text);
    violations.push({
      file: filePath,
      ruleId: "pack-hygiene/non-english-in-en-pack",
      severity: "error",
      line: findLineNumber(text, match ? match.index : 0),
      message: "English or common pack script must not contain literal CJK characters",
    });
  }

  return violations;
}

function collectPackFiles(dirPath) {
  const results = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function checkRelativePackRef(packDir, relPath, manifestPath, fieldName) {
  const violations = [];
  if (typeof relPath !== "string" || !relPath.trim()) {
    violations.push({
      file: manifestPath,
      ruleId: "pack-manifest/invalid-path",
      severity: "error",
      message: `${fieldName} must be a non-empty relative path`,
    });
    return violations;
  }
  if (path.isAbsolute(relPath)) {
    violations.push({
      file: manifestPath,
      ruleId: "pack-manifest/absolute-path",
      severity: "error",
      message: `${fieldName} must be relative, not absolute: ${relPath}`,
    });
    return violations;
  }
  const resolved = path.resolve(packDir, relPath);
  const rel = path.relative(packDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    violations.push({
      file: manifestPath,
      ruleId: "pack-manifest/path-traversal",
      severity: "error",
      message: `${fieldName} escapes pack directory: ${relPath}`,
    });
    return violations;
  }
  if (!fs.existsSync(resolved)) {
    violations.push({
      file: manifestPath,
      ruleId: "pack-manifest/missing-ref",
      severity: "error",
      message: `${fieldName} references missing file: ${relPath}`,
    });
  }
  return violations;
}

function validatePackDirectory(packDir, { enforceEnglishOnly = false, allowBuiltinFs = false } = {}) {
  const violations = [];
  const manifestPath = path.join(packDir, "pack.json");
  let checkedFiles = 0;

  if (!fs.existsSync(manifestPath)) {
    violations.push({
      file: manifestPath,
      ruleId: "pack-manifest/missing",
      severity: "error",
      message: "Pack directory is missing required pack.json",
    });
  } else {
    checkedFiles += 1;
    let manifest;
    const rawManifest = fs.readFileSync(manifestPath, "utf8");
    violations.push(
      ...validatePackPromptContent(rawManifest, manifestPath, { enforceEnglishOnly }),
    );
    try {
      manifest = JSON.parse(rawManifest);
    } catch (error) {
      violations.push({
        file: manifestPath,
        ruleId: "pack-manifest/invalid-json",
        severity: "error",
        message: `Invalid pack.json JSON: ${error.message}`,
      });
      manifest = null;
    }

    if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
      const packId = manifest.name || manifest.id;
      if (typeof packId !== "string" || !packId.trim()) {
        violations.push({
          file: manifestPath,
          ruleId: "pack-manifest/missing-id",
          severity: "error",
          message: "pack.json must declare a non-empty string 'name' or 'id'",
        });
      }
      if (manifest.language !== undefined) {
        const langs = Array.isArray(manifest.language) ? manifest.language : [manifest.language];
        for (const lang of langs) {
          if (typeof lang !== "string" || !PACK_ALLOWED_LANGUAGES.has(lang)) {
            violations.push({
              file: manifestPath,
              ruleId: "pack-manifest/invalid-language",
              severity: "error",
              message: `Unsupported pack language "${lang}"`,
            });
          }
        }
      }
      if (typeof manifest.scripts === "string") {
        violations.push(
          ...checkRelativePackRef(packDir, manifest.scripts, manifestPath, "scripts"),
        );
      } else if (Array.isArray(manifest.scripts)) {
        for (const entry of manifest.scripts) {
          violations.push(...checkRelativePackRef(packDir, entry, manifestPath, "scripts"));
        }
      }
      if (typeof manifest.prompts === "string") {
        violations.push(
          ...checkRelativePackRef(packDir, manifest.prompts, manifestPath, "prompts"),
        );
      } else if (Array.isArray(manifest.prompts)) {
        for (const entry of manifest.prompts) {
          const ref = typeof entry === "string" ? entry : entry?.path || entry?.file;
          if (ref) {
            violations.push(...checkRelativePackRef(packDir, ref, manifestPath, "prompts"));
          }
        }
      }
    } else if (manifest !== null) {
      violations.push({
        file: manifestPath,
        ruleId: "pack-manifest/not-object",
        severity: "error",
        message: "pack.json root must be a JSON object",
      });
    }
  }

  const files = collectPackFiles(packDir);
  for (const file of files) {
    if (file === manifestPath) continue;
    const ext = path.extname(file).toLowerCase();
    if ([".mjs", ".js", ".cjs"].includes(ext)) {
      checkedFiles += 1;
      const content = fs.readFileSync(file, "utf8");
      violations.push(
        ...validatePackScriptContent(content, file, { enforceEnglishOnly, allowBuiltinFs }),
      );
    } else if ([".md", ".txt", ".json"].includes(ext)) {
      checkedFiles += 1;
      const content = fs.readFileSync(file, "utf8");
      violations.push(...validatePackPromptContent(content, file, { enforceEnglishOnly }));
    }
  }

  return {
    exists: true,
    ok: violations.length === 0,
    kind: "dir",
    targetPath: packDir,
    checkedFiles,
    violations,
  };
}

function validatePackFile(filePath, { enforceEnglishOnly = false } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];

  if ([".mjs", ".js", ".cjs"].includes(ext)) {
    violations.push(...validatePackScriptContent(content, filePath, { enforceEnglishOnly }));
  } else if (base.endsWith(".pack.md") || base === "pack.md") {
    violations.push(...validatePackPromptContent(content, filePath, { enforceEnglishOnly }));
    if (!/^---\r?\n[\s\S]*?\r?\n---/.test(content)) {
      violations.push({
        file: filePath,
        ruleId: "pack-markdown/missing-frontmatter",
        severity: "error",
        line: 1,
        message: "Markdown pack file must begin with YAML frontmatter ('--- ... ---')",
      });
    }
    const stripped = content.replace(/^---[\s\S]*?---\s*/, "").trim();
    if (!stripped) {
      violations.push({
        file: filePath,
        ruleId: "pack-markdown/empty",
        severity: "error",
        message: "Markdown pack file contains no rule instructions",
      });
    }
  } else {
    violations.push({
      file: filePath,
      ruleId: "pack-target/unsupported-file",
      severity: "error",
      message: `Unsupported pack file '${path.basename(filePath)}' (expected pack directory or *.pack.md)`,
    });
  }

  return {
    exists: true,
    ok: violations.length === 0,
    kind: "file",
    targetPath: filePath,
    checkedFiles: 1,
    violations,
  };
}

/**
 * Validate a single pack directory or `.pack.md`/script file.
 */
export function validatePackPath(targetPath, { cwd = process.cwd(), enforceEnglishOnly } = {}) {
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
  if (!fs.existsSync(resolved)) {
    return {
      exists: false,
      ok: false,
      kind: "missing",
      targetPath: resolved,
      checkedFiles: 0,
      violations: [
        {
          file: resolved,
          ruleId: "pack-target/missing",
          severity: "error",
          message: `Pack path does not exist: ${targetPath}`,
        },
      ],
    };
  }

  const stat = fs.statSync(resolved);
  const autoEnglishOnly =
    enforceEnglishOnly !== undefined
      ? enforceEnglishOnly
      : /[\\/]packs[\\/](?:en|common)(?:[\\/]|$)/.test(resolved);

  if (stat.isDirectory()) {
    return validatePackDirectory(resolved, { enforceEnglishOnly: autoEnglishOnly });
  }
  return validatePackFile(resolved, { enforceEnglishOnly: autoEnglishOnly });
}

/**
 * Validate all built-in packs under `packs/<lang>/<scenario>`.
 */
export function validateBuiltinPacks(packsRoot) {
  const packDirs = [];
  if (fs.existsSync(packsRoot)) {
    for (const langEntry of fs.readdirSync(packsRoot, { withFileTypes: true })) {
      if (!langEntry.isDirectory()) continue;
      const langDir = path.join(packsRoot, langEntry.name);
      for (const scenarioEntry of fs.readdirSync(langDir, { withFileTypes: true })) {
        if (!scenarioEntry.isDirectory()) continue;
        packDirs.push({
          id: `${langEntry.name}/${scenarioEntry.name}`,
          lang: langEntry.name,
          dir: path.join(langDir, scenarioEntry.name),
        });
      }
    }
  }
  packDirs.sort((a, b) => a.id.localeCompare(b.id));

  const results = [];
  const violations = [];
  let checkedFiles = 0;

  for (const entry of packDirs) {
    const res = validatePackDirectory(entry.dir, {
      enforceEnglishOnly: entry.lang === "en" || entry.lang === "common",
      allowBuiltinFs: true,
    });
    results.push({ id: entry.id, ...res });
    checkedFiles += res.checkedFiles;
    violations.push(...res.violations);
  }

  return {
    ok: violations.length === 0,
    packCount: results.length,
    checkedFiles,
    results,
    violations,
  };
}
