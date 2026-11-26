import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isCiEnvironment } from "../kernel/config.mjs";
import { DISLOP_VERSION } from "../kernel/version.mjs";

const DAILY_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

function sha256Short(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function formatUtcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseUtcDayMs(dayStr) {
  const m = String(dayStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function isWorklogActive(config, env = process.env) {
  return Boolean(config?.worklog?.enabled && !isCiEnvironment(env));
}

/**
 * Scrub credentials, API keys, bearer tokens, private keys, and URL auth tokens.
 */
export function scrubSecrets(text) {
  let out = String(text || "");
  if (!out) return "";

  out = out.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    "[REDACTED_PRIVATE_KEY]",
  );
  out = out.replace(/\bdslp_[A-Za-z0-9._-]{4,}\b/g, "[REDACTED_TOKEN]");
  out = out.replace(/\bsk-ant-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]");
  out = out.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_KEY]");
  out = out.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{12,}\b/g, "[REDACTED_TOKEN]");
  out = out.replace(/\bgithub_pat_[A-Za-z0-9_]{12,}\b/g, "[REDACTED_TOKEN]");
  out = out.replace(/\bAIza[0-9A-Za-z_-]{16,}\b/g, "[REDACTED_KEY]");
  out = out.replace(/\bAKIA[0-9A-Z]{12,}\b/g, "[REDACTED_KEY]");
  out = out.replace(/\bBearer\s+[A-Za-z0-9._~+/-]{6,}=*/gi, "Bearer [REDACTED]");
  out = out.replace(/(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi, "$1[REDACTED]@");
  out = out.replace(
    /([?&#](?:token|key|api_key|apikey|secret|password|sig|signature)=)[^&\s#"']+/gi,
    "$1[REDACTED]",
  );

  return out;
}

function maskHomeDirectories(text) {
  return String(text || "")
    .replace(/\/Users\/[^/\s"'`]+/g, "[HOME]")
    .replace(/\/home\/[^/\s"'`]+/g, "[HOME]")
    .replace(/[A-Za-z]:\\Users\\[^\\\s"'`]+/g, "[HOME]");
}

function truncateClean(text, maxLen) {
  const collapsed = String(text || "").replace(/\s+/g, " ").trim();
  if (!maxLen || collapsed.length <= maxLen) return collapsed;
  if (maxLen <= 3) return collapsed.slice(0, maxLen);
  return `${collapsed.slice(0, maxLen - 3)}...`;
}

/**
 * Redact secrets, emails, URLs, home directory paths, and long numeric IDs,
 * then collapse whitespace and truncate to `maxLen`.
 */
export function redactText(text, maxLen = 160) {
  let out = String(text || "");
  out = out.replace(/\bhttps?:\/\/[^\s)>\]"']+/gi, "[URL]");
  out = scrubSecrets(out);
  out = out.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]");
  out = maskHomeDirectories(out);
  out = out.replace(/\b\d{6,}\b/g, "[NUM_ID]");
  return truncateClean(out, maxLen);
}

function scrubTextForLocalFull(text, maxLen = 400) {
  const scrubbed = maskHomeDirectories(scrubSecrets(text));
  return truncateClean(scrubbed, maxLen);
}

/**
 * Map Fact Gate human-readable reasons into coarse privacy-safe categories.
 */
export function classifyFactGateReasons(reasons) {
  const categories = new Set();
  for (const raw of reasons || []) {
    const r = String(raw || "").toLowerCase();
    if (!r) continue;
    if (r.includes("dropped number")) categories.add("dropped_number");
    else if (r.includes("dropped unit")) categories.add("dropped_unit");
    else if (r.includes("dropped url")) categories.add("dropped_url");
    else if (r.includes("dropped inline code")) categories.add("dropped_code");
    else if (r.includes("dropped proper noun")) categories.add("dropped_entity");
    else if (r.includes("injected unverified url")) categories.add("injected_url");
    else if (r.includes("injected unverified inline code")) categories.add("injected_code");
    else if (r.includes("fabricated number")) categories.add("fabricated_number");
    else if (r.includes("pack_verify_fix") || r.includes("failed custom verifyfix") || r.includes("pack '")) {
      categories.add("pack_verify_fix");
    } else {
      categories.add("other");
    }
  }
  return Array.from(categories);
}

export function classifyFactGateNote(note) {
  if (!note) return [];
  const raw = String(note);
  const parenMatch = raw.match(/\(([^)]+)\)\.?$/);
  const inner = parenMatch ? parenMatch[1] : raw;
  const parts = inner.split(/;\s*/).filter(Boolean);
  return classifyFactGateReasons(parts.length > 0 ? parts : [raw]);
}

/**
 * Sanitize target file path according to privacy tier.
 * - `metadata`: returns `{ fileHash, ext }` only (zero path/filename exposure).
 * - `redacted` / `local-full`: adds relative `fileRef` inside `cwd`, or `<external>/<fileHash>.<ext>` outside `cwd`.
 */
export function sanitizeFileTarget(filePath, cwd = process.cwd(), privacy = "metadata") {
  const rawPath = String(filePath || "unknown");
  const resolvedCwd = path.resolve(cwd);
  const resolvedTarget = path.resolve(resolvedCwd, rawPath);
  const ext = path.extname(rawPath).replace(/^\./, "").toLowerCase() || "unknown";
  const fileHash = sha256Short(resolvedTarget);

  if (privacy === "metadata") {
    return { fileHash, ext };
  }

  const rel = path.relative(resolvedCwd, resolvedTarget);
  const insideCwd =
    rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  let fileRef;
  if (insideCwd) {
    const cleanRel = (rel || path.basename(resolvedTarget)).replace(/\\/g, "/");
    fileRef = maskHomeDirectories(cleanRel);
  } else {
    fileRef = `<external>/${fileHash}.${ext}`;
  }

  return { fileHash, ext, fileRef };
}

function resolveFileDecisionMeta(decisionsByFile, index, res) {
  if (!decisionsByFile) return { decisions: {}, undoCount: 0, aborted: false };
  if (Array.isArray(decisionsByFile)) {
    return decisionsByFile[index] || { decisions: {}, undoCount: 0, aborted: false };
  }
  if (decisionsByFile instanceof Map) {
    return (
      decisionsByFile.get(res?.doc?.filePath) ||
      decisionsByFile.get(res?.report?.file) ||
      decisionsByFile.get(index) ||
      { decisions: {}, undoCount: 0, aborted: false }
    );
  }
  const key = res?.doc?.filePath || res?.report?.file;
  return decisionsByFile[key] || decisionsByFile[index] || { decisions: {}, undoCount: 0, aborted: false };
}

export function buildCheckOrFixWorklogEntry({
  source = "cli",
  command,
  mode = null,
  cwd = process.cwd(),
  config,
  route = null,
  results = [],
  decisionsByFile = null,
  durationMs = 0,
  exitCode = 0,
  aborted = false,
  now = new Date(),
} = {}) {
  const privacy = config?.worklog?.privacy || "metadata";
  const resolvedCwd = path.resolve(cwd);
  const workspaceHash = sha256Short(resolvedCwd);

  const summary = {
    defects: { error: 0, warning: 0 },
    suggestions: { strong: 0, moderate: 0, hint: 0 },
    applied: 0,
    skipped: 0,
    edited: 0,
    promptCopied: 0,
    undoCount: 0,
    factGateDowngraded: 0,
    aborted: Boolean(aborted),
  };

  let routeFallback = false;
  let observedEngine = route?.engineLabel || null;
  const files = [];

  for (let i = 0; i < results.length; i += 1) {
    const res = results[i] || {};
    const doc = res.doc || {};
    const report = res.report || {};
    const items = Array.isArray(res.items) ? res.items : Array.isArray(report.items) ? report.items : [];
    const fileMeta = resolveFileDecisionMeta(decisionsByFile, i, res);
    const decisionsMap = fileMeta.decisions || {};

    if (fileMeta.undoCount) summary.undoCount += fileMeta.undoCount;
    if (fileMeta.aborted) summary.aborted = true;
    if (res.routeFallback || res.routeHint) routeFallback = true;
    if (report.engine && (!observedEngine || report.engine !== "deterministic")) {
      observedEngine = report.engine;
    }

    const targetInfo = sanitizeFileTarget(doc.filePath || report.file || "unknown", resolvedCwd, privacy);
    const findings = [];

    for (const item of items) {
      if (item.kind === "defect") {
        if (item.severity === "error") summary.defects.error += 1;
        else summary.defects.warning += 1;
      } else if (item.kind === "suggestion") {
        if (item.priority === "strong") summary.suggestions.strong += 1;
        else if (item.priority === "hint") summary.suggestions.hint += 1;
        else summary.suggestions.moderate += 1;
      }

      const decision = decisionsMap[item.id] || null;
      if (decision === "auto_applied" || decision === "accepted") summary.applied += 1;
      else if (decision === "edited") {
        summary.applied += 1;
        summary.edited += 1;
      } else if (decision === "prompt_copied") {
        summary.promptCopied += 1;
        summary.skipped += 1;
      } else if (decision === "skipped") {
        summary.skipped += 1;
      }

      const downgraded = Boolean(item._factGateDowngraded || (item.verificationNote && /withheld/i.test(item.verificationNote)));
      if (downgraded) summary.factGateDowngraded += 1;

      const factGateCategories = downgraded
        ? item._factGateReasons
          ? classifyFactGateReasons(item._factGateReasons)
          : classifyFactGateNote(item.verificationNote)
        : [];

      const findingEntry = {
        ruleId: item.ruleId,
        pack: item.pack,
        kind: item.kind,
        severityOrPriority: item.kind === "defect" ? item.severity || "error" : item.priority || "moderate",
        origin: item._source === "llm" ? "llm" : "deterministic",
        fixSafety: item.fixSafety,
        actionType: item.actionType,
        decision,
        factGateDowngraded: downgraded,
        ...(factGateCategories.length > 0 ? { factGateCategories } : {}),
      };

      if (privacy === "redacted") {
        if (item.originalQuote) findingEntry.quotePreview = redactText(item.originalQuote, 160);
        if (item.suggestedReplacement) {
          findingEntry.replacementPreview = redactText(item.suggestedReplacement, 160);
        }
        if (item.verificationNote) {
          findingEntry.verificationNotePreview = redactText(item.verificationNote, 160);
        }
      } else if (privacy === "local-full") {
        if (item.originalQuote) findingEntry.originalQuote = scrubTextForLocalFull(item.originalQuote, 400);
        if (item.suggestedReplacement) {
          findingEntry.suggestedReplacement = scrubTextForLocalFull(item.suggestedReplacement, 400);
        }
        if (item.reason) findingEntry.reason = scrubTextForLocalFull(item.reason, 400);
        if (item.verificationNote) {
          findingEntry.verificationNote = scrubTextForLocalFull(item.verificationNote, 400);
        }
      }

      findings.push(findingEntry);
    }

    files.push({
      ...targetInfo,
      language: doc.language || report.language || "unknown",
      modality: doc.modality || "unknown",
      segmentCount: Array.isArray(doc.segments) ? doc.segments.length : 0,
      engine: report.engine || observedEngine || "deterministic",
      durationMs: Number.isFinite(res.durationMs) ? res.durationMs : null,
      mountedPacks: Array.isArray(report.mountedPacks) ? report.mountedPacks : [],
      findings,
    });
  }

  return {
    schema: "dislop.worklog/1",
    id: crypto.randomUUID(),
    timestamp: now.toISOString(),
    version: DISLOP_VERSION,
    privacy,
    source,
    command,
    mode,
    workspaceHash,
    ...(privacy !== "metadata" ? { workspaceName: path.basename(resolvedCwd) || "workspace" } : {}),
    durationMs: Math.max(0, Math.round(durationMs)),
    exitCode,
    routing: config?.routing || "local",
    engine: observedEngine || "deterministic",
    routeFallback,
    fileCount: files.length,
    summary,
    files,
    verify: null,
  };
}

export function buildVerifyWorklogEntry({
  source = "cli",
  command = "verify",
  mode = "verify",
  cwd = process.cwd(),
  config,
  targetLabel = "",
  verification,
  durationMs = 0,
  exitCode = 0,
  now = new Date(),
} = {}) {
  const privacy = config?.worklog?.privacy || "metadata";
  const resolvedCwd = path.resolve(cwd);
  const workspaceHash = sha256Short(resolvedCwd);
  const droppedFacts = Array.isArray(verification?.droppedFacts) ? verification.droppedFacts : [];
  const regressions = Array.isArray(verification?.regressions) ? verification.regressions : [];

  const verifyPayload = {
    ok: Boolean(verification?.ok),
    droppedFactsCount: droppedFacts.length,
    droppedFactTypes: classifyFactGateReasons(droppedFacts),
    regressionIds: regressions.map((r) => r?.id).filter(Boolean),
  };

  if (privacy === "redacted") {
    verifyPayload.targetPreview = redactText(targetLabel, 120);
    verifyPayload.droppedFacts = droppedFacts.map((r) => redactText(r, 160));
    verifyPayload.regressions = regressions.map((r) => ({
      id: r?.id || "unknown",
      message: redactText(r?.message || "", 160),
    }));
  } else if (privacy === "local-full") {
    verifyPayload.targetLabel = scrubTextForLocalFull(targetLabel, 240);
    verifyPayload.droppedFacts = droppedFacts.map((r) => scrubTextForLocalFull(r, 400));
    verifyPayload.regressions = regressions.map((r) => ({
      id: r?.id || "unknown",
      message: scrubTextForLocalFull(r?.message || "", 400),
    }));
  }

  return {
    schema: "dislop.worklog/1",
    id: crypto.randomUUID(),
    timestamp: now.toISOString(),
    version: DISLOP_VERSION,
    privacy,
    source,
    command,
    mode,
    workspaceHash,
    ...(privacy !== "metadata" ? { workspaceName: path.basename(resolvedCwd) || "workspace" } : {}),
    durationMs: Math.max(0, Math.round(durationMs)),
    exitCode,
    routing: config?.routing || "local",
    engine: "deterministic",
    routeFallback: false,
    fileCount: 0,
    summary: {
      defects: { error: 0, warning: 0 },
      suggestions: { strong: 0, moderate: 0, hint: 0 },
      applied: 0,
      skipped: 0,
      edited: 0,
      promptCopied: 0,
      undoCount: 0,
      factGateDowngraded: 0,
      aborted: false,
    },
    files: [],
    verify: verifyPayload,
  };
}

/**
 * Remove daily `YYYY-MM-DD.jsonl` files strictly older than `retentionDays`.
 */
export function pruneExpiredWorklogs(dir, retentionDays, now = new Date()) {
  if (!dir || !fs.existsSync(dir)) return 0;
  const days = Math.max(1, Number(retentionDays) || 30);
  const todayUtcMs = parseUtcDayMs(formatUtcDate(now));
  const maxAgeMs = (days - 1) * 86400000;
  let removed = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const m = entry.name.match(DAILY_FILE_RE);
    if (!m) continue;
    const fileDayMs = parseUtcDayMs(m[1]);
    if (fileDayMs === null) continue;
    if (todayUtcMs - fileDayMs > maxAgeMs) {
      try {
        fs.unlinkSync(path.join(dir, entry.name));
        removed += 1;
      } catch {
        // best-effort prune
      }
    }
  }
  return removed;
}

/**
 * Best-effort non-fatal append to the local daily worklog JSONL file.
 * Never throws and never writes to stdout or stderr.
 */
export function recordWorklogEntry(entry, config, env = process.env, now = new Date()) {
  if (!entry || !isWorklogActive(config, env)) {
    return { written: false };
  }
  const dir = config?.worklog?.dir;
  if (!dir) return { written: false };

  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      // ignore chmod errors on unsupported filesystems
    }

    const fileName = `${formatUtcDate(now)}.jsonl`;
    const filePath = path.join(dir, fileName);
    const line = `${JSON.stringify(entry)}\n`;
    fs.appendFileSync(filePath, line, { encoding: "utf8", mode: 0o600 });
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // ignore chmod errors on unsupported filesystems
    }

    pruneExpiredWorklogs(dir, config.worklog.retentionDays, now);
    return { written: true, filePath };
  } catch {
    return { written: false };
  }
}

export function getWorklogStorageStats(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return { fileCount: 0, entryCount: 0, totalBytes: 0, files: [] };
  }

  let fileCount = 0;
  let entryCount = 0;
  let totalBytes = 0;
  const files = [];

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { fileCount: 0, entryCount: 0, totalBytes: 0, files: [] };
  }

  for (const entry of entries) {
    if (!entry.isFile() || !DAILY_FILE_RE.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    try {
      const stat = fs.statSync(full);
      const raw = fs.readFileSync(full, "utf8");
      let validLines = 0;
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object") validLines += 1;
        } catch {
          // ignore malformed JSONL line
        }
      }
      fileCount += 1;
      entryCount += validLines;
      totalBytes += stat.size;
      files.push({ name: entry.name, entries: validLines, bytes: stat.size });
    } catch {
      // skip unreadable file
    }
  }

  files.sort((a, b) => b.name.localeCompare(a.name));
  return { fileCount, entryCount, totalBytes, files };
}

export function readWorklogEntries(
  dir,
  { days = 30, command = null, limit = null, now = new Date() } = {},
) {
  if (!dir || !fs.existsSync(dir)) return [];

  const daysWindow = days !== null && days !== undefined ? Math.max(1, Number(days) || 30) : null;
  const todayUtcMs = parseUtcDayMs(formatUtcDate(now));
  const cutoffMs = daysWindow ? todayUtcMs - (daysWindow - 1) * 86400000 : null;

  let dirEntries = [];
  try {
    dirEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const matchedFiles = dirEntries
    .filter((e) => e.isFile())
    .map((e) => {
      const m = e.name.match(DAILY_FILE_RE);
      return m ? { name: e.name, dayMs: parseUtcDayMs(m[1]) } : null;
    })
    .filter((f) => f && f.dayMs !== null && (cutoffMs === null || f.dayMs >= cutoffMs))
    .sort((a, b) => b.name.localeCompare(a.name));

  const parsed = [];
  for (const f of matchedFiles) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(dir, f.name), "utf8");
    } catch {
      continue;
    }
    const lines = raw.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (!obj || typeof obj !== "object") continue;
        if (command && obj.command !== command) continue;
        parsed.push(obj);
      } catch {
        // Ignore malformed JSONL line gracefully
      }
    }
  }

  parsed.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  if (limit && limit > 0) {
    return parsed.slice(0, limit);
  }
  return parsed;
}

export function findWorklogEntryById(dir, idQuery) {
  const query = String(idQuery || "").trim();
  if (!query) return { entry: null, ambiguous: false };
  const all = readWorklogEntries(dir, { days: null });
  const exact = all.find((e) => e.id === query);
  if (exact) return { entry: exact, ambiguous: false };

  const prefixMatches = all.filter((e) => typeof e.id === "string" && e.id.startsWith(query));
  if (prefixMatches.length === 1) return { entry: prefixMatches[0], ambiguous: false };
  if (prefixMatches.length > 1) return { entry: null, ambiguous: true, count: prefixMatches.length };
  return { entry: null, ambiguous: false };
}

export function clearWorklogEntries(dir, { olderThanDays = null, now = new Date() } = {}) {
  if (!dir || !fs.existsSync(dir)) {
    return { removedFiles: 0, removedEntries: 0 };
  }

  const todayUtcMs = parseUtcDayMs(formatUtcDate(now));
  const cutoffMs =
    olderThanDays !== null && olderThanDays !== undefined
      ? todayUtcMs - (Math.max(1, Number(olderThanDays)) - 1) * 86400000
      : null;

  let removedFiles = 0;
  let removedEntries = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const m = entry.name.match(DAILY_FILE_RE);
    if (!m) continue;
    const dayMs = parseUtcDayMs(m[1]);
    if (dayMs === null) continue;
    if (cutoffMs !== null && dayMs >= cutoffMs) continue;

    const full = path.join(dir, entry.name);
    try {
      const raw = fs.readFileSync(full, "utf8");
      const lineCount = raw.split("\n").filter((l) => l.trim().length > 0).length;
      fs.unlinkSync(full);
      removedFiles += 1;
      removedEntries += lineCount;
    } catch {
      // best-effort delete
    }
  }

  return { removedFiles, removedEntries };
}

function percentile(sortedNums, p) {
  if (!sortedNums || sortedNums.length === 0) return 0;
  const idx = Math.min(sortedNums.length - 1, Math.max(0, Math.ceil(sortedNums.length * p) - 1));
  return sortedNums[idx];
}

export function computeWorklogStats(entries = []) {
  const byCommand = {};
  const bySource = {};
  const byEngine = {};
  const byExitCode = {};
  const durations = [];
  const ruleMap = new Map();
  const formatLatencies = new Map();

  let fallbackRuns = 0;
  let totalFiles = 0;
  let totalDefectsError = 0;
  let totalDefectsWarning = 0;
  let totalSuggestionsStrong = 0;
  let totalSuggestionsModerate = 0;
  let totalSuggestionsHint = 0;
  let totalApplied = 0;
  let totalSkipped = 0;
  let totalEdited = 0;
  let totalPromptCopied = 0;
  let totalFactGateDowngraded = 0;

  const verifyStats = {
    total: 0,
    passed: 0,
    failed: 0,
    droppedFactTypes: {},
    regressionIds: {},
  };

  for (const entry of entries) {
    const cmd = entry.command || "unknown";
    const src = entry.source || "cli";
    const eng = entry.engine || "deterministic";
    const code = String(entry.exitCode ?? 0);

    byCommand[cmd] = (byCommand[cmd] || 0) + 1;
    bySource[src] = (bySource[src] || 0) + 1;
    byEngine[eng] = (byEngine[eng] || 0) + 1;
    byExitCode[code] = (byExitCode[code] || 0) + 1;

    if (Number.isFinite(entry.durationMs)) {
      durations.push(entry.durationMs);
    }
    if (entry.routeFallback) {
      fallbackRuns += 1;
    }

    const s = entry.summary || {};
    totalFiles += Number(entry.fileCount || 0);
    totalDefectsError += Number(s.defects?.error || 0);
    totalDefectsWarning += Number(s.defects?.warning || 0);
    totalSuggestionsStrong += Number(s.suggestions?.strong || 0);
    totalSuggestionsModerate += Number(s.suggestions?.moderate || 0);
    totalSuggestionsHint += Number(s.suggestions?.hint || 0);
    totalApplied += Number(s.applied || 0);
    totalSkipped += Number(s.skipped || 0);
    totalEdited += Number(s.edited || 0);
    totalPromptCopied += Number(s.promptCopied || 0);
    totalFactGateDowngraded += Number(s.factGateDowngraded || 0);

    if (entry.verify) {
      verifyStats.total += 1;
      if (entry.verify.ok) verifyStats.passed += 1;
      else verifyStats.failed += 1;

      for (const dt of entry.verify.droppedFactTypes || []) {
        verifyStats.droppedFactTypes[dt] = (verifyStats.droppedFactTypes[dt] || 0) + 1;
      }
      for (const rid of entry.verify.regressionIds || []) {
        verifyStats.regressionIds[rid] = (verifyStats.regressionIds[rid] || 0) + 1;
      }
    }

    for (const fileRec of entry.files || []) {
      const ext = fileRec.ext || "unknown";
      if (Number.isFinite(fileRec.durationMs)) {
        if (!formatLatencies.has(ext)) {
          formatLatencies.set(ext, []);
        }
        formatLatencies.get(ext).push(fileRec.durationMs);
      }

      for (const f of fileRec.findings || []) {
        const rid = f.ruleId || "unknown";
        if (!ruleMap.has(rid)) {
          ruleMap.set(rid, {
            ruleId: rid,
            pack: f.pack || "unknown",
            kind: f.kind || "suggestion",
            hits: 0,
            deterministicHits: 0,
            llmHits: 0,
            accepted: 0,
            autoApplied: 0,
            skipped: 0,
            edited: 0,
            promptCopied: 0,
            factGateDowngrades: 0,
            factGateCategories: {},
          });
        }
        const rec = ruleMap.get(rid);
        rec.hits += 1;
        if (f.origin === "llm") rec.llmHits += 1;
        else rec.deterministicHits += 1;

        if (f.decision === "accepted") rec.accepted += 1;
        else if (f.decision === "auto_applied") rec.autoApplied += 1;
        else if (f.decision === "skipped") rec.skipped += 1;
        else if (f.decision === "edited") rec.edited += 1;
        else if (f.decision === "prompt_copied") {
          rec.promptCopied += 1;
          rec.skipped += 1;
        }

        if (f.factGateDowngraded) {
          rec.factGateDowngrades += 1;
          for (const cat of f.factGateCategories || []) {
            rec.factGateCategories[cat] = (rec.factGateCategories[cat] || 0) + 1;
          }
        }
      }
    }
  }

  durations.sort((a, b) => a - b);

  const rules = Array.from(ruleMap.values())
    .map((r) => {
      const interactiveDecisions = r.accepted + r.skipped + r.edited;
      const skipRate = interactiveDecisions > 0 ? Number((r.skipped / interactiveDecisions).toFixed(3)) : null;
      return {
        ...r,
        interactiveDecisions,
        skipRate,
      };
    })
    .sort((a, b) => b.hits - a.hits || a.ruleId.localeCompare(b.ruleId));

  const latencyByFormat = {};
  for (const [ext, list] of formatLatencies.entries()) {
    const sorted = [...list].sort((a, b) => a - b);
    latencyByFormat[ext] = {
      files: sorted.length,
      p50Ms: percentile(sorted, 0.5),
      p95Ms: percentile(sorted, 0.95),
      maxMs: sorted[sorted.length - 1] || 0,
    };
  }

  return {
    totalRuns: entries.length,
    totalFiles,
    byCommand,
    bySource,
    byEngine,
    byExitCode,
    fallbackRuns,
    fallbackRate: entries.length > 0 ? Number((fallbackRuns / entries.length).toFixed(3)) : 0,
    latency: {
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      maxMs: durations.length > 0 ? durations[durations.length - 1] : 0,
    },
    latencyByFormat,
    findingsSummary: {
      defects: { error: totalDefectsError, warning: totalDefectsWarning },
      suggestions: {
        strong: totalSuggestionsStrong,
        moderate: totalSuggestionsModerate,
        hint: totalSuggestionsHint,
      },
      applied: totalApplied,
      skipped: totalSkipped,
      edited: totalEdited,
      promptCopied: totalPromptCopied,
      factGateDowngraded: totalFactGateDowngraded,
    },
    verify: verifyStats,
    rules,
  };
}

/**
 * Generate actionable optimization signals from local worklog entries.
 */
export function buildReflectionReport(entries = [], { days = 30 } = {}) {
  const stats = computeWorklogStats(entries);

  const highSkipRules = stats.rules
    .filter((r) => r.interactiveDecisions >= 3 && r.skipRate !== null && r.skipRate >= 0.5)
    .sort((a, b) => b.skipRate - a.skipRate || b.skipped - a.skipped)
    .map((r) => ({
      ruleId: r.ruleId,
      pack: r.pack,
      hits: r.hits,
      skipped: r.skipped,
      interactiveDecisions: r.interactiveDecisions,
      skipRate: r.skipRate,
      recommendation:
        "Review rule specificity or false-positive boundaries; users skipped >=50% of interactive hunks.",
    }));

  const highEditRules = stats.rules
    .filter((r) => r.edited >= 2)
    .sort((a, b) => b.edited - a.edited)
    .map((r) => ({
      ruleId: r.ruleId,
      pack: r.pack,
      edited: r.edited,
      hits: r.hits,
      recommendation:
        "Users repeatedly edited this rule manually via $EDITOR; tighten suggestedReplacement or rewritePrompt.",
    }));

  const factGateHotspots = stats.rules
    .filter((r) => r.factGateDowngrades > 0)
    .sort((a, b) => b.factGateDowngrades - a.factGateDowngrades)
    .map((r) => ({
      ruleId: r.ruleId,
      pack: r.pack,
      downgrades: r.factGateDowngrades,
      categories: r.factGateCategories,
      recommendation:
        "LLM/pack suggestions dropped or fabricated protected anchors; reinforce prompt preservation instructions.",
    }));

  const verifyHotspots = {
    total: stats.verify.total,
    failed: stats.verify.failed,
    failRate:
      stats.verify.total > 0 ? Number((stats.verify.failed / stats.verify.total).toFixed(3)) : 0,
    droppedFactTypes: Object.entries(stats.verify.droppedFactTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    regressionIds: Object.entries(stats.verify.regressionIds)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count),
  };

  const slowFiles = [];
  for (const entry of entries) {
    const isLlm = entry.engine && entry.engine !== "deterministic";
    const thresholdMs = isLlm ? 5000 : 500;
    for (const fileRec of entry.files || []) {
      if (Number.isFinite(fileRec.durationMs) && fileRec.durationMs > thresholdMs) {
        slowFiles.push({
          entryId: entry.id,
          timestamp: entry.timestamp,
          file: fileRec.fileRef || `${fileRec.fileHash}.${fileRec.ext}`,
          ext: fileRec.ext,
          modality: fileRec.modality,
          engine: fileRec.engine || entry.engine,
          durationMs: fileRec.durationMs,
          segmentCount: fileRec.segmentCount,
        });
      }
    }
  }
  slowFiles.sort((a, b) => b.durationMs - a.durationMs);

  const routingFriction = {
    totalRuns: stats.totalRuns,
    fallbackRuns: stats.fallbackRuns,
    fallbackRate: stats.fallbackRate,
    recommendation:
      stats.fallbackRuns > 0
        ? "Some runs fell back from LLM routing to deterministic mode; check Ollama or provider health with 'dislop doctor'."
        : null,
  };

  return {
    schema: "dislop.worklog.reflect/1",
    windowDays: days,
    stats,
    signals: {
      highSkipRules,
      highEditRules,
      factGateHotspots,
      verifyHotspots,
      slowFiles: slowFiles.slice(0, 20),
      routingFriction,
    },
  };
}
