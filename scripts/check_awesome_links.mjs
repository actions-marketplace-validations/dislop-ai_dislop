#!/usr/bin/env node
/**
 * Zero-dependency link & repository health checker for Awesome Anti-Slop (`anti-slop-radar-index.json`).
 *
 * Usage:
 *   node scripts/check_awesome_links.mjs [--concurrency 8] [--timeout 8000] [--limit N] [--github] [--json] [--out path]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RADAR_PATH = path.join(ROOT, "docs", "research", "anti-slop-radar-index.json");

function parseArgs(argv) {
  const opts = {
    concurrency: 8,
    timeoutMs: 8000,
    limit: null,
    github: false,
    json: false,
    out: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--concurrency" && argv[i + 1]) {
      opts.concurrency = Math.max(1, Math.min(32, Number(argv[++i]) || 8));
    } else if (a === "--timeout" && argv[i + 1]) {
      opts.timeoutMs = Math.max(1000, Number(argv[++i]) || 8000);
    } else if (a === "--limit" && argv[i + 1]) {
      opts.limit = Math.max(1, Number(argv[++i]) || 1);
    } else if (a === "--github") {
      opts.github = true;
    } else if (a === "--json") {
      opts.json = true;
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[++i];
    }
  }
  return opts;
}

async function fetchStatus(url, method, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "dislop-link-checker/0.6 (+https://dislop.com)",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
    return { status: res.status, finalUrl: res.url, error: null };
  } catch (err) {
    return { status: 0, finalUrl: url, error: err?.name === "AbortError" ? "timeout" : err?.message || "fetch error" };
  } finally {
    clearTimeout(timer);
  }
}

function checkGithubRepo(url) {
  const m = String(url).match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, "");
  const res = spawnSync("gh", ["api", `repos/${owner}/${repo}`, "--jq", "{archived,stars:.stargazers_count,pushedAt:.pushed_at}"], {
    encoding: "utf8",
  });
  if (res.status !== 0 || !res.stdout.trim()) return null;
  try {
    return JSON.parse(res.stdout.trim());
  } catch {
    return null;
  }
}

async function checkEntry(entry, opts) {
  let probe = await fetchStatus(entry.url, "HEAD", opts.timeoutMs);
  if (probe.status === 405 || probe.status === 403 || probe.status === 501 || probe.status === 0) {
    probe = await fetchStatus(entry.url, "GET", opts.timeoutMs);
  }

  let health = "broken";
  if (probe.status >= 200 && probe.status < 400) {
    health = "ok";
  } else if (probe.status === 403 || probe.status === 429) {
    health = "warn";
  }

  const ghMeta = opts.github ? checkGithubRepo(entry.url) : null;
  if (ghMeta?.archived && health === "ok") {
    health = "warn";
  }

  return {
    id: entry.id,
    name: entry.name,
    url: entry.url,
    finalUrl: probe.finalUrl,
    status: probe.status,
    health,
    error: probe.error,
    github: ghMeta,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const radar = JSON.parse(fs.readFileSync(RADAR_PATH, "utf8"));
  let entries = radar.entries || [];
  if (opts.limit) entries = entries.slice(0, opts.limit);

  const results = new Array(entries.length);
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const idx = cursor++;
      results[idx] = await checkEntry(entries[idx], opts);
    }
  }

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, entries.length || 1) }, () => worker()));

  const summary = {
    checkedAt: new Date().toISOString(),
    total: results.length,
    ok: results.filter((r) => r.health === "ok").length,
    warn: results.filter((r) => r.health === "warn").length,
    broken: results.filter((r) => r.health === "broken").length,
  };

  const payload = { summary, results };
  if (opts.out) {
    const outPath = path.resolve(process.cwd(), opts.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  }

  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(
      `Awesome Anti-Slop link check: ${summary.total} checked · ${summary.ok} ok · ${summary.warn} warn · ${summary.broken} broken`
    );
    for (const r of results.filter((item) => item.health !== "ok")) {
      const note = r.github?.archived ? "archived" : r.error || `HTTP ${r.status}`;
      console.log(`  [${r.health.toUpperCase()}] ${r.id} (${note}) -> ${r.url}`);
    }
  }
}

main().catch((err) => {
  console.error("Link check failed:", err.message);
  process.exit(1);
});
