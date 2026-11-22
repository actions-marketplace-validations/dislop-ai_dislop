#!/usr/bin/env node
/**
 * Unified zero-dependency preflight, version bump, optional local deploy hook, and git tagger for dislop.
 *
 * Usage:
 *   node scripts/release.mjs --check [--quick]
 *   node scripts/release.mjs --extract-notes [X.Y.Z]
 *   node scripts/release.mjs <X.Y.Z> [--channel github|registry] [--deploy] [--commit] [--tag] [--push]
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function runStep(label, cmd, cmdArgs, opts = {}) {
  const t0 = Date.now();
  const res = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf8",
    stdio: opts.capture ? "pipe" : "inherit",
  });
  const ms = Date.now() - t0;
  if (res.status !== 0) {
    if (opts.capture) {
      if (res.stdout) process.stderr.write(res.stdout);
      if (res.stderr) process.stderr.write(res.stderr);
    }
    throw new Error(`Step failed (${label}, exit ${res.status ?? 1})`);
  }
  console.log(`  [ok] ${label} (${(ms / 1000).toFixed(1)}s)`);
  return res;
}

function hasCommand(bin) {
  const res = spawnSync(process.platform === "win32" ? "where" : "which", [bin], { stdio: "ignore" });
  return res.status === 0;
}

function readCurrentVersion() {
  const core = fs.readFileSync(path.join(ROOT, "src", "core.mjs"), "utf8");
  const m = core.match(/export const ENGINE_VERSION = "([^"]+)";/);
  assert.ok(m, "Missing ENGINE_VERSION in src/core.mjs");
  return m[1];
}

function extractReleaseNotes(version) {
  const changelogPath = path.join(ROOT, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    return `Release v${version}\n`;
  }
  const text = fs.readFileSync(changelogPath, "utf8");
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactSec = text.match(new RegExp(`## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`));
  if (exactSec && exactSec[1].trim()) {
    return exactSec[1].trim() + "\n";
  }
  const unreleased = text.match(/## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/);
  if (unreleased && unreleased[1].trim()) {
    return unreleased[1].trim() + "\n";
  }
  return `Release v${version}\n`;
}

function runPrivacyAndSecretGate() {
  const t0 = Date.now();
  const ls = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (ls.status !== 0) {
    throw new Error("git ls-files failed during privacy check");
  }

  const files = ls.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const forbiddenPathRe = /(^|\/)(\.env(\.[^/]*)?|\.private\/.*|\.dislop\.local\.json|CLAUDE\.local\.md|[^/]*\.(pem|p12|key))$/;
  const allowedEnvExampleRe = /(^|\/)\.env\.(example|sample|template)$/;
  const tokenRe =
    /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|AQ\.[A-Za-z0-9_-]{16,}|dslp_[0-9a-f]{32,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
  const gcpInfraRe =
    /[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com|projects\/\d+\/locations\/[^/\s]+\/workloadIdentityPools\/[^\s'"]+/;
  const placeholderRe = /test|fake|dummy|example|sample|placeholder|never|redact|xxxx|your_token|your-project/i;
  const internalSchemeRe = new RegExp("\\b(?:" + ["zx", "wxc"].join("|") + ")://[^\\s)`'\"]+");

  let localForbidTerms = [];
  try {
    const localCfgPath = path.join(ROOT, ".dislop.local.json");
    if (fs.existsSync(localCfgPath)) {
      const localCfg = JSON.parse(fs.readFileSync(localCfgPath, "utf8"));
      if (Array.isArray(localCfg?.forbid)) {
        localForbidTerms = localCfg.forbid.map((s) => String(s || "").trim()).filter((s) => s.length >= 4);
      }
    }
  } catch {}

  let localUserRe = null;
  try {
    const uname = os.userInfo().username;
    if (uname && uname.length >= 3 && !/^(runner|root|ubuntu|node|admin|user|alice|bob)$/i.test(uname)) {
      const esc = uname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      localUserRe = new RegExp(`/(?:Users|home)/${esc}\\b`);
    }
  } catch {}

  const binaryExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".onnx", ".gguf", ".whl", ".tgz", ".gz", ".zip"]);
  const issues = [];

  for (const rel of files) {
    if (forbiddenPathRe.test(rel) && !allowedEnvExampleRe.test(rel)) {
      issues.push(`Forbidden private/secret file tracked or unignored: ${rel}`);
      continue;
    }
    const ext = path.extname(rel).toLowerCase();
    if (binaryExt.has(ext)) continue;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const raw = fs.readFileSync(abs);
    if (raw.includes(0)) continue;
    const content = raw.toString("utf8");

    const tokMatch = content.match(tokenRe);
    if (tokMatch && !placeholderRe.test(tokMatch[0])) {
      issues.push(`Potential live credential in ${rel}: ${tokMatch[0].slice(0, 8)}...`);
    }
    const gcpMatch = content.match(gcpInfraRe);
    if (gcpMatch && !placeholderRe.test(gcpMatch[0])) {
      issues.push(`Private GCP identity/pool identifier leaked in ${rel}: ${gcpMatch[0].slice(0, 32)}...`);
    }
    for (const term of localForbidTerms) {
      if (content.includes(term)) {
        issues.push(`Forbidden local term leaked in ${rel}`);
      }
    }
    const schemeMatch = content.match(internalSchemeRe);
    if (schemeMatch) {
      issues.push(`Internal URI leaked in ${rel}: ${schemeMatch[0].slice(0, 24)}`);
    }
    if (localUserRe) {
      const userMatch = content.match(localUserRe);
      if (userMatch) {
        issues.push(`Workstation home path leaked in ${rel}: ${userMatch[0]}`);
      }
    }
  }

  // Also ensure README.md keeps the PyPI MCP Registry ownership comment
  const readmeEn = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  if (!readmeEn.includes("<!-- mcp-name: io.github.dislop-ai/dislop -->")) {
    issues.push("README.md is missing '<!-- mcp-name: io.github.dislop-ai/dislop -->' required by Official MCP Registry for PyPI");
  }

  if (issues.length > 0) {
    throw new Error(`Public release hygiene check failed:\n    - ${issues.join("\n    - ")}`);
  }
  console.log(`  [ok] Public repo secret, path & registry marker scan (${files.length} files, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

function runArtifactSmokeChecks() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dislop-release-smoke-"));
  try {
    const packRes = runStep("npm tarball pack & size check", "npm", ["pack", "--pack-destination", tmpDir, "--quiet"], {
      capture: true,
    });
    const tgzName = packRes.stdout.trim().split(/\r?\n/).pop();
    const tgzPath = path.join(tmpDir, tgzName);
    const sizeKb = fs.statSync(tgzPath).size / 1024;
    if (sizeKb > 300) {
      throw new Error(`npm tarball too large (${sizeKb.toFixed(1)} KB > 300 KB budget)`);
    }

    if (hasCommand("uv")) {
      runStep("Python wheel & sdist build check (uv build)", "uv", ["build", "--out-dir", path.join(tmpDir, "pydist")], {
        capture: true,
      });
    }

    if (hasCommand("claude")) {
      runStep("Claude Code plugin manifest validation", "claude", ["plugin", "validate", ROOT], {
        capture: true,
      });
    }
    if (hasCommand("agy")) {
      runStep("Antigravity plugin strict validation", "agy", ["plugin", "validate", "integrations/antigravity", "--strict"], {
        capture: true,
      });
    }
    if (fs.existsSync(path.join(ROOT, "integrations", "vscode", "test_extension.mjs"))) {
      runStep("VS Code & Open VSX extension unit tests", "node", ["integrations/vscode/test_extension.mjs"], {
        capture: true,
      });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function runPreflight({ quick = false, strictClean = false } = {}) {
  console.log(`\ndislop release preflight (v${readCurrentVersion()})${quick ? " [quick]" : ""}`);
  const pyEnv = { PYTHONPATH: path.join(ROOT, "src") };
  runStep("Manifest & version lockstep", "node", ["scripts/sync_manifests.mjs", "--check"], { capture: true });
  runPrivacyAndSecretGate();
  runStep("Compile site & Awesome lists", "node", ["scripts/build_site.mjs"], { capture: true });
  if (strictClean) {
    runStep("Verify site/ & awesome/ match committed SSOT", "git", ["diff", "--exit-code", "site/", "awesome/"], { capture: true });
  }
  runStep("Website, catalog, JSON snippet & WCAG checks", "node", ["tests/test_site.mjs"], { capture: true });
  runStep("Rule fixtures (Node)", "node", ["./bin/dislop.mjs", "pack-test"], { capture: true });
  runStep("Rule fixtures (Python)", "python3", ["-m", "dislop.cli", "pack-test"], { capture: true, env: pyEnv });
  runStep("Pattern catalog & 154-sample benchmark gate", "node", ["scripts/pattern_lab.mjs", "assert"], { capture: true });
  runStep("Pocket ML ensemble zero-leakage & parity gate", "python3", ["scripts/train_pocket_models.py", "--eval-only"], {
    capture: true,
    env: pyEnv,
  });
  runStep("dislop-bench v2 regression gate (112 samples + 18 tasks)", "node", ["scripts/run_benchmark.mjs", "--assert"], {
    capture: true,
  });
  runStep("Unit & Node/Python conformance suite", "python3", ["-m", "unittest", "discover", "-s", "tests", "-q"], {
    capture: true,
    env: pyEnv,
  });
  runStep("Self-dogfood repository (Node & Python, --fail-on warning)", "node", ["./bin/dislop.mjs", "check", ".", "--fail-on", "warning"], {
    capture: true,
  });
  runStep("Self-dogfood repository (Python, --fail-on warning)", "python3", ["-m", "dislop.cli", "check", ".", "--fail-on", "warning"], {
    capture: true,
    env: pyEnv,
  });
  const strictInfoTargets = [
    "site/",
    "docs/research/",
    "docs/releasing.md",
    "docs/releasing.zh-CN.md",
    "skills/",
    "assets/",
    "ROADMAP.md",
    "ROADMAP.zh-CN.md",
  ];
  runStep(
    "Self-dogfood site, research, release guides & roadmaps (Node, --fail-on info)",
    "node",
    ["./bin/dislop.mjs", "check", ...strictInfoTargets, "--fail-on", "info"],
    { capture: true }
  );
  runStep(
    "Self-dogfood site, research, release guides & roadmaps (Python, --fail-on info)",
    "python3",
    ["-m", "dislop.cli", "check", ...strictInfoTargets, "--fail-on", "info"],
    { capture: true, env: pyEnv }
  );
  runStep(
    "Self-dogfood README.zh-CN.md (--pack literary-essay)",
    "python3",
    ["-m", "dislop.cli", "check", "README.zh-CN.md", "--pack", "literary-essay", "--fail-on", "warning"],
    { capture: true, env: pyEnv }
  );
  if (!quick) {
    runArtifactSmokeChecks();
  }
  console.log("dislop preflight: ALL GREEN\n");
}

function replaceOnceOrThrow(relPath, regex, replacement, desc) {
  const full = path.join(ROOT, relPath);
  const before = fs.readFileSync(full, "utf8");
  assert.ok(regex.test(before), `Could not match ${desc} in ${relPath}`);
  const after = before.replace(regex, replacement);
  fs.writeFileSync(full, after, "utf8");
}

function bumpVersionEverywhere(nextVer, channel) {
  assert.ok(SEMVER_RE.test(nextVer), `Invalid SemVer '${nextVer}' (expected X.Y.Z)`);
  const today = new Date().toISOString().slice(0, 10);

  replaceOnceOrThrow("src/core.mjs", /export const ENGINE_VERSION = "[^"]+";/, `export const ENGINE_VERSION = "${nextVer}";`, "ENGINE_VERSION");
  replaceOnceOrThrow("src/dislop/engine.py", /ENGINE_VERSION = "[^"]+"/, `ENGINE_VERSION = "${nextVer}"`, "ENGINE_VERSION");

  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = nextVer;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

  replaceOnceOrThrow("pyproject.toml", /^version\s*=\s*"[^"]+"/m, `version = "${nextVer}"`, "pyproject version");
  replaceOnceOrThrow("skills/dislop/SKILL.md", /^version:\s*[^\s]+/m, `version: ${nextVer}`, "SKILL.md version");
  replaceOnceOrThrow("docs/architecture.md", /^# Architecture \(`v[^`]+`\)/m, `# Architecture (\`v${nextVer}\`)`, "architecture.md header");
  replaceOnceOrThrow("docs/architecture.zh-CN.md", /^# 系统架构说明（`v[^`]+`）/m, `# 系统架构说明（\`v${nextVer}\`）`, "architecture.zh-CN.md header");
  replaceOnceOrThrow(
    "ROADMAP.md",
    /^Last updated: `\d{4}-\d{2}-\d{2}` · Current baseline: `v[^`]+`/m,
    `Last updated: \`${today}\` · Current baseline: \`v${nextVer}\``,
    "ROADMAP.md baseline"
  );
  replaceOnceOrThrow(
    "ROADMAP.zh-CN.md",
    /^最后更新：`\d{4}-\d{2}-\d{2}` · 当前基线：`v[^`]+`/m,
    `最后更新：\`${today}\` · 当前基线：\`v${nextVer}\``,
    "ROADMAP.zh-CN.md baseline"
  );

  const vscodePkgPath = path.join(ROOT, "integrations", "vscode", "package.json");
  if (fs.existsSync(vscodePkgPath)) {
    const vpkg = JSON.parse(fs.readFileSync(vscodePkgPath, "utf8"));
    vpkg.version = nextVer;
    fs.writeFileSync(vscodePkgPath, JSON.stringify(vpkg, null, 2) + "\n", "utf8");
  }
  const herdrTomlPath = path.join(ROOT, "integrations", "herdr", "herdr-plugin.toml");
  if (fs.existsSync(herdrTomlPath)) {
    replaceOnceOrThrow("integrations/herdr/herdr-plugin.toml", /^version\s*=\s*"[^"]+"/m, `version = "${nextVer}"`, "herdr-plugin.toml version");
  }

  const syncArgs = ["scripts/sync_manifests.mjs"];
  if (channel) syncArgs.push("--channel", channel);
  runStep(`Sync manifests to v${nextVer}`, "node", syncArgs, { capture: true });
  if (fs.existsSync(path.join(ROOT, "integrations", "vscode", "scripts", "build.mjs"))) {
    runStep(`Rebuild VS Code & Open VSX bundles for v${nextVer}`, "node", ["integrations/vscode/scripts/build.mjs"], {
      capture: true,
    });
  }
  runStep(`Rebuild site/ & catalog for v${nextVer}`, "node", ["scripts/build_site.mjs"], { capture: true });
}

async function verifyLiveSiteSmoke() {
  for (const url of ["https://dislop.com/llms.txt", "https://dislop.com/api/health"]) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Live smoke check failed for ${url}: HTTP ${res.status}`);
    }
  }
  console.log("  [ok] Live https://dislop.com/llms.txt & /api/health returned HTTP 200");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(
      [
        "Usage:",
        "  npm run release:check                        # Run all 6 release preflight & packaging gates",
        "  node scripts/release.mjs --check --quick     # Fast preflight (skip tarball/wheel build)",
        "  node scripts/release.mjs --extract-notes [v] # Print release notes from CHANGELOG.md",
        "  npm run release -- <X.Y.Z> [options]         # Bump version across repo, rebuild & verify",
        "",
        "Options:",
        "  --channel <github|registry>  MCP package coordinate mode (use 'registry' once npm package is live)",
        "  --deploy                     Run optional gitignored .private/deploy.local.sh + live HTTP smoke test",
        "  --commit                     Commit release artifacts as 'chore(release): v<X.Y.Z>'",
        "  --tag                        Create annotated git tag 'v<X.Y.Z>'",
        "  --push                       Push branch and tag to origin (triggers GitHub Actions release.yml)",
      ].join("\n")
    );
    return;
  }

  if (argv.includes("--extract-notes")) {
    const idx = argv.indexOf("--extract-notes");
    const rawVer = (argv[idx + 1] && !argv[idx + 1].startsWith("--") ? argv[idx + 1] : readCurrentVersion()).replace(/^v/, "");
    process.stdout.write(extractReleaseNotes(rawVer));
    return;
  }

  const quick = argv.includes("--quick");
  const strictClean = argv.includes("--strict-clean");
  if (argv.includes("--check")) {
    runPreflight({ quick, strictClean });
    return;
  }

  const positional = argv.find((a) => !a.startsWith("--"));
  const channelIdx = argv.indexOf("--channel");
  const channel = channelIdx >= 0 ? argv[channelIdx + 1] : null;
  const doDeploy = argv.includes("--deploy");
  const doCommit = argv.includes("--commit");
  const doTag = argv.includes("--tag");
  const doPush = argv.includes("--push");

  if (!positional) {
    throw new Error("Provide a target SemVer (e.g., 0.6.1) or pass --check.");
  }
  const targetVer = positional.replace(/^v/, "");

  if (doCommit || doTag || doPush) {
    const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
    if (dirty.stdout.trim().length > 0) {
      throw new Error("Working tree has uncommitted changes. Commit or stash work before running automated --commit/--tag/--push.");
    }
  }

  console.log(`Preparing dislop v${targetVer}...`);
  bumpVersionEverywhere(targetVer, channel);
  runPreflight({ quick });

  if (doDeploy) {
    const localHook = path.join(ROOT, ".private", "deploy.local.sh");
    if (!fs.existsSync(localHook)) {
      throw new Error("Optional local deploy hook .private/deploy.local.sh not found.");
    }
    runStep("Run local deploy hook (.private/deploy.local.sh)", "bash", [localHook, targetVer]);
    await verifyLiveSiteSmoke();
  }

  if (doCommit) {
    runStep("Stage release files", "git", ["add", "-A"]);
    runStep(`Commit v${targetVer}`, "git", ["commit", "-m", `chore(release): v${targetVer}`]);
  }

  if (doTag) {
    runStep(`Create git tag v${targetVer}`, "git", ["tag", "-a", `v${targetVer}`, "-m", `dislop v${targetVer}`]);
  }

  if (doPush) {
    runStep("Push branch and tags to origin", "git", ["push", "origin", "HEAD", "--follow-tags"]);
  }

  console.log(`dislop v${targetVer} ready.`);
}

main().catch((err) => {
  console.error(`\ndislop release error: ${err.message}`);
  process.exit(1);
});
