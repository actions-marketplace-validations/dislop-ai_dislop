import { DislopConfigError, isCiEnvironment, resolveLayeredConfig } from "../kernel/config.mjs";
import {
  buildReflectionReport,
  clearWorklogEntries,
  computeWorklogStats,
  findWorklogEntryById,
  getWorklogStorageStats,
  isWorklogActive,
  readWorklogEntries,
} from "../runtime/worklog.mjs";

function parseBoundedInt(raw, label, min, max) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new DislopConfigError(`Invalid ${label} '${raw}' (expected integer ${min}..${max})`);
  }
  return num;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderStatusText(status) {
  const stateLabel = status.active
    ? "active"
    : status.ciDisabled
      ? "disabled (suppressed in CI environment)"
      : "disabled (off by default)";

  const lines = [
    "dislop worklog",
    `  State          : ${stateLabel}`,
    `  Privacy Tier   : ${status.privacy}`,
    `  Storage Dir    : ${status.dir}`,
    `  Retention Days : ${status.retentionDays}`,
    `  Stored Files   : ${status.fileCount} daily file(s), ${status.entryCount} entry(ies), ${formatBytes(status.totalBytes)}`,
  ];

  if (!status.enabled) {
    lines.push(
      "  Enable Locally : set DISLOP_WORKLOG=1 or add {\"worklog\":{\"enabled\":true}} in .dislop.local.json or ~/.config/dislop/config.json",
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderListText(entries, windowDays) {
  if (entries.length === 0) {
    return `No worklog entries found in the last ${windowDays} day(s).\n`;
  }

  const lines = [`Recent worklog entries (${entries.length}, window=${windowDays}d):`];
  for (const e of entries) {
    const shortId = String(e.id || "").slice(0, 8);
    const ts = String(e.timestamp || "").replace("T", " ").slice(0, 19);
    const cmdLabel = e.mode ? `${e.source || "cli"}:${e.command}/${e.mode}` : `${e.source || "cli"}:${e.command}`;
    if (e.verify) {
      lines.push(
        `  ${shortId}  ${ts}  ${cmdLabel}  verify=${e.verify.ok ? "PASS" : "FAIL"}  dropped=${e.verify.droppedFactsCount || 0}  regressions=${(e.verify.regressionIds || []).length}  ${e.durationMs || 0}ms  exit=${e.exitCode ?? 0}`,
      );
    } else {
      const s = e.summary || {};
      const defects = (s.defects?.error || 0) + (s.defects?.warning || 0);
      const suggestions =
        (s.suggestions?.strong || 0) + (s.suggestions?.moderate || 0) + (s.suggestions?.hint || 0);
      lines.push(
        `  ${shortId}  ${ts}  ${cmdLabel}  engine=${e.engine || "deterministic"}  files=${e.fileCount || 0}  defects=${defects}  suggestions=${suggestions}  applied=${s.applied || 0}  skipped=${s.skipped || 0}  ${e.durationMs || 0}ms  exit=${e.exitCode ?? 0}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderEntryDetailText(entry) {
  const lines = [
    `Worklog Entry ${entry.id}`,
    `  Timestamp      : ${entry.timestamp}`,
    `  Source/Command : ${entry.source || "cli"}:${entry.command}${entry.mode ? ` (${entry.mode})` : ""}`,
    `  Version        : ${entry.version || "unknown"}`,
    `  Privacy Tier   : ${entry.privacy}`,
    `  Workspace      : ${entry.workspaceName ? `${entry.workspaceName} (${entry.workspaceHash})` : entry.workspaceHash}`,
    `  Engine/Routing : ${entry.engine} (routing=${entry.routing}${entry.routeFallback ? ", fallback=yes" : ""})`,
    `  Duration/Exit  : ${entry.durationMs}ms (exit=${entry.exitCode})`,
  ];

  if (entry.verify) {
    lines.push(
      `  Verify         : ${entry.verify.ok ? "PASS" : "FAIL"} (droppedFacts=${entry.verify.droppedFactsCount || 0}, regressions=${(entry.verify.regressionIds || []).join(", ") || "none"})`,
    );
    if ((entry.verify.droppedFactTypes || []).length > 0) {
      lines.push(`  Dropped Types  : ${entry.verify.droppedFactTypes.join(", ")}`);
    }
    if (Array.isArray(entry.verify.droppedFacts) && entry.verify.droppedFacts.length > 0) {
      lines.push(`  Dropped Detail : ${entry.verify.droppedFacts.join(" | ")}`);
    }
  } else {
    const s = entry.summary || {};
    lines.push(
      `  Summary        : defects(err=${s.defects?.error || 0}, warn=${s.defects?.warning || 0}) suggestions(strong=${s.suggestions?.strong || 0}, mod=${s.suggestions?.moderate || 0}, hint=${s.suggestions?.hint || 0}) applied=${s.applied || 0} edited=${s.edited || 0} skipped=${s.skipped || 0} factGateDowngraded=${s.factGateDowngraded || 0}`,
    );
    for (const fileRec of entry.files || []) {
      const label = fileRec.fileRef || `${fileRec.fileHash}.${fileRec.ext}`;
      lines.push(
        `  File           : ${label} (${fileRec.language}/${fileRec.modality}, segments=${fileRec.segmentCount}, ${fileRec.durationMs ?? "-"}ms, findings=${(fileRec.findings || []).length})`,
      );
      for (const f of fileRec.findings || []) {
        const extra = [
          f.origin,
          f.fixSafety,
          f.decision ? `decision=${f.decision}` : null,
          f.factGateDowngraded ? `factGate=[${(f.factGateCategories || []).join(",")}]` : null,
        ]
          .filter(Boolean)
          .join(", ");
        lines.push(`    - [${f.kind}:${f.severityOrPriority}] ${f.ruleId} (${extra})`);
        if (f.quotePreview || f.originalQuote) {
          lines.push(`      quote: ${f.quotePreview || f.originalQuote}`);
        }
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderStatsText(stats, windowDays) {
  const lines = [
    `dislop worklog stats (window=${windowDays}d)`,
    `  Total Runs     : ${stats.totalRuns} (${stats.totalFiles} file inspections)`,
    `  By Command     : ${Object.entries(stats.byCommand).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
    `  By Source      : ${Object.entries(stats.bySource).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
    `  By Engine      : ${Object.entries(stats.byEngine).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
    `  Route Fallback : ${stats.fallbackRuns} (${Math.round(stats.fallbackRate * 100)}%)`,
    `  Latency        : p50=${stats.latency.p50Ms}ms, p95=${stats.latency.p95Ms}ms, max=${stats.latency.maxMs}ms`,
    `  Findings       : defects(err=${stats.findingsSummary.defects.error}, warn=${stats.findingsSummary.defects.warning}) suggestions(strong=${stats.findingsSummary.suggestions.strong}, mod=${stats.findingsSummary.suggestions.moderate}, hint=${stats.findingsSummary.suggestions.hint})`,
    `  Fix Decisions  : applied=${stats.findingsSummary.applied}, edited=${stats.findingsSummary.edited}, skipped=${stats.findingsSummary.skipped}, promptCopied=${stats.findingsSummary.promptCopied}, factGateDowngraded=${stats.findingsSummary.factGateDowngraded}`,
    `  Verify         : total=${stats.verify.total}, passed=${stats.verify.passed}, failed=${stats.verify.failed}`,
  ];

  if (stats.rules.length > 0) {
    lines.push("  Top Rules:");
    for (const r of stats.rules.slice(0, 15)) {
      const skipStr = r.skipRate !== null ? ` skipRate=${Math.round(r.skipRate * 100)}%` : "";
      const fgStr = r.factGateDowngrades > 0 ? ` fgDowngrades=${r.factGateDowngrades}` : "";
      lines.push(
        `    - ${r.ruleId} [${r.kind}] hits=${r.hits} (det=${r.deterministicHits}, llm=${r.llmHits}) applied=${r.accepted + r.autoApplied} edited=${r.edited} skipped=${r.skipped}${skipStr}${fgStr}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderReflectMarkdown(report) {
  const { stats, signals, windowDays } = report;
  const lines = [
    `# dislop Worklog Reflection (${windowDays}d)`,
    "",
    `- Total runs: **${stats.totalRuns}** (${stats.totalFiles} file inspections)`,
    `- Latency: p50 **${stats.latency.p50Ms}ms**, p95 **${stats.latency.p95Ms}ms**, max **${stats.latency.maxMs}ms**`,
    `- Routing fallbacks: **${stats.fallbackRuns}** (${Math.round(stats.fallbackRate * 100)}%)`,
    `- Fact Gate downgrades: **${stats.findingsSummary.factGateDowngraded}**`,
    `- Verify checks: **${stats.verify.total}** (failed: **${stats.verify.failed}**)`,
    "",
    "## 1. High-Skip Rules (Possible False Positives / Noise)",
  ];

  if (signals.highSkipRules.length === 0) {
    lines.push("- None observed (requires >=3 interactive fix decisions and >=50% skip rate).");
  } else {
    for (const r of signals.highSkipRules) {
      lines.push(
        `- \`${r.ruleId}\` (${r.pack}): skipped **${r.skipped}/${r.interactiveDecisions}** (${Math.round(r.skipRate * 100)}%) — ${r.recommendation}`,
      );
    }
  }

  lines.push("", "## 2. Frequently Edited Rules (Improve Suggested Fix / Prompt)");
  if (signals.highEditRules.length === 0) {
    lines.push("- None observed (requires >=2 manual `[e]` edits).");
  } else {
    for (const r of signals.highEditRules) {
      lines.push(
        `- \`${r.ruleId}\` (${r.pack}): manually edited **${r.edited}** time(s) across ${r.hits} hits — ${r.recommendation}`,
      );
    }
  }

  lines.push("", "## 3. Fact Gate Downgrade Hotspots");
  if (signals.factGateHotspots.length === 0) {
    lines.push("- None observed.");
  } else {
    for (const r of signals.factGateHotspots) {
      const cats = Object.entries(r.categories)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");
      lines.push(
        `- \`${r.ruleId}\` (${r.pack}): **${r.downgrades}** downgrade(s) [${cats || "other"}] — ${r.recommendation}`,
      );
    }
  }

  lines.push("", "## 4. Verify Regressions & Dropped Fact Categories");
  if (signals.verifyHotspots.total === 0) {
    lines.push("- No `verify` runs recorded in window.");
  } else {
    lines.push(
      `- Pass rate: **${signals.verifyHotspots.total - signals.verifyHotspots.failed}/${signals.verifyHotspots.total}** (failRate=${Math.round(signals.verifyHotspots.failRate * 100)}%)`,
    );
    if (signals.verifyHotspots.droppedFactTypes.length > 0) {
      lines.push(
        `- Dropped fact categories: ${signals.verifyHotspots.droppedFactTypes.map((d) => `\`${d.type}\` (${d.count})`).join(", ")}`,
      );
    }
    if (signals.verifyHotspots.regressionIds.length > 0) {
      lines.push(
        `- Second-order regressions: ${signals.verifyHotspots.regressionIds.map((r) => `\`${r.id}\` (${r.count})`).join(", ")}`,
      );
    }
  }

  lines.push("", "## 5. Slow Files & Routing Friction");
  if (signals.slowFiles.length === 0) {
    lines.push("- No slow files exceeded latency thresholds (>500ms deterministic, >5000ms LLM).");
  } else {
    for (const sf of signals.slowFiles.slice(0, 10)) {
      lines.push(
        `- \`${sf.file}\` (${sf.ext}/${sf.modality}, ${sf.engine}): **${sf.durationMs}ms** across ${sf.segmentCount} segments`,
      );
    }
  }
  if (signals.routingFriction.recommendation) {
    lines.push(`- Routing friction: ${signals.routingFriction.recommendation}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderReflectText(report) {
  const { stats, signals, windowDays } = report;
  const lines = [
    `dislop worklog reflect (window=${windowDays}d)`,
    `  Runs=${stats.totalRuns}, Files=${stats.totalFiles}, p50=${stats.latency.p50Ms}ms, p95=${stats.latency.p95Ms}ms, Fallbacks=${stats.fallbackRuns}, FactGateDowngrades=${stats.findingsSummary.factGateDowngraded}, VerifyFailed=${stats.verify.failed}/${stats.verify.total}`,
    "",
    "Signals:",
  ];

  let anySignal = false;
  for (const r of signals.highSkipRules) {
    anySignal = true;
    lines.push(`  [HIGH-SKIP] ${r.ruleId}: ${r.skipped}/${r.interactiveDecisions} (${Math.round(r.skipRate * 100)}%)`);
  }
  for (const r of signals.highEditRules) {
    anySignal = true;
    lines.push(`  [HIGH-EDIT] ${r.ruleId}: edited ${r.edited} time(s)`);
  }
  for (const r of signals.factGateHotspots) {
    anySignal = true;
    const cats = Object.entries(r.categories).map(([k, v]) => `${k}:${v}`).join(", ");
    lines.push(`  [FACT-GATE] ${r.ruleId}: ${r.downgrades} downgrade(s) (${cats || "other"})`);
  }
  for (const dt of signals.verifyHotspots.droppedFactTypes) {
    anySignal = true;
    lines.push(`  [VERIFY-DROP] ${dt.type}: ${dt.count}`);
  }
  for (const reg of signals.verifyHotspots.regressionIds) {
    anySignal = true;
    lines.push(`  [VERIFY-REG] ${reg.id}: ${reg.count}`);
  }
  for (const sf of signals.slowFiles.slice(0, 5)) {
    anySignal = true;
    lines.push(`  [SLOW-FILE] ${sf.file} (${sf.ext}, ${sf.engine}): ${sf.durationMs}ms`);
  }
  if (signals.routingFriction.recommendation) {
    anySignal = true;
    lines.push(`  [ROUTING] ${signals.routingFriction.recommendation}`);
  }

  if (!anySignal) {
    lines.push("  (No optimization anomalies detected in the current window.)");
  }
  return `${lines.join("\n")}\n`;
}

/**
 * `dislop worklog <status|list|show|stats|reflect|clear> [options]`
 */
export async function runWorklogCommand(positionals, flags, io = {}) {
  const { cwd = process.cwd(), env = process.env, stdout = process.stdout } = io;
  const config = resolveLayeredConfig({ cwd, env, cliFlags: flags });
  const subcommand = positionals[0] || "status";
  const dir = config.worklog.dir;
  const wantJson = Boolean(flags.json || flags.format === "json");

  if (subcommand === "status") {
    const storage = getWorklogStorageStats(dir);
    const payload = {
      schema: "dislop.worklog.status/1",
      enabled: config.worklog.enabled,
      active: isWorklogActive(config, env),
      ciDisabled: isCiEnvironment(env),
      privacy: config.worklog.privacy,
      dir,
      retentionDays: config.worklog.retentionDays,
      fileCount: storage.fileCount,
      entryCount: storage.entryCount,
      totalBytes: storage.totalBytes,
    };
    stdout.write(wantJson ? `${JSON.stringify(payload, null, 2)}\n` : renderStatusText(payload));
    return 0;
  }

  if (subcommand === "list") {
    const days =
      flags.days !== null && flags.days !== undefined
        ? parseBoundedInt(flags.days, "--days", 1, 3650)
        : 14;
    const limit =
      flags.limit !== null && flags.limit !== undefined
        ? parseBoundedInt(flags.limit, "--limit", 1, 1000)
        : 20;
    const command = flags.command ? String(flags.command).trim() : null;
    const entries = readWorklogEntries(dir, { days, command, limit });
    if (wantJson) {
      stdout.write(
        `${JSON.stringify({ schema: "dislop.worklog.list/1", windowDays: days, count: entries.length, entries }, null, 2)}\n`,
      );
    } else {
      stdout.write(renderListText(entries, days));
    }
    return 0;
  }

  if (subcommand === "show") {
    const targetId = positionals[1];
    if (!targetId) {
      throw new DislopConfigError("Usage: dislop worklog show <id>");
    }
    const found = findWorklogEntryById(dir, targetId);
    if (found.ambiguous) {
      throw new DislopConfigError(
        `Worklog id prefix '${targetId}' matched ${found.count} entries; provide a longer prefix.`,
      );
    }
    if (!found.entry) {
      throw new DislopConfigError(`Worklog entry not found: '${targetId}'`);
    }
    stdout.write(
      wantJson ? `${JSON.stringify(found.entry, null, 2)}\n` : renderEntryDetailText(found.entry),
    );
    return 0;
  }

  if (subcommand === "stats") {
    const days =
      flags.days !== null && flags.days !== undefined
        ? parseBoundedInt(flags.days, "--days", 1, 3650)
        : 30;
    const command = flags.command ? String(flags.command).trim() : null;
    const entries = readWorklogEntries(dir, { days, command });
    const stats = computeWorklogStats(entries);
    if (wantJson) {
      stdout.write(
        `${JSON.stringify({ schema: "dislop.worklog.stats/1", windowDays: days, ...stats }, null, 2)}\n`,
      );
    } else {
      stdout.write(renderStatsText(stats, days));
    }
    return 0;
  }

  if (subcommand === "reflect") {
    const days =
      flags.days !== null && flags.days !== undefined
        ? parseBoundedInt(flags.days, "--days", 1, 3650)
        : 30;
    const format = flags.json ? "json" : flags.format || "text";
    if (!["text", "markdown", "json"].includes(format)) {
      throw new DislopConfigError(
        `Invalid --format '${format}' for worklog reflect (expected text, markdown, or json)`,
      );
    }
    const command = flags.command ? String(flags.command).trim() : null;
    const entries = readWorklogEntries(dir, { days, command });
    const report = buildReflectionReport(entries, { days });
    if (format === "json") {
      stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else if (format === "markdown") {
      stdout.write(renderReflectMarkdown(report));
    } else {
      stdout.write(renderReflectText(report));
    }
    return 0;
  }

  if (subcommand === "clear") {
    const olderThan =
      flags.olderThan !== null && flags.olderThan !== undefined
        ? parseBoundedInt(flags.olderThan, "--older-than", 1, 3650)
        : null;
    if (olderThan === null && !flags.yes && !flags.auto && !flags.force) {
      throw new DislopConfigError(
        "Refusing to delete all worklog entries without confirmation. Pass '--yes' (or '--older-than <days>') to proceed.",
      );
    }
    const cleared = clearWorklogEntries(dir, { olderThanDays: olderThan });
    if (wantJson) {
      stdout.write(
        `${JSON.stringify({ schema: "dislop.worklog.clear/1", olderThanDays: olderThan, ...cleared }, null, 2)}\n`,
      );
    } else {
      stdout.write(
        `Cleared ${cleared.removedEntries} entry(ies) across ${cleared.removedFiles} file(s) from ${dir}.\n`,
      );
    }
    return 0;
  }

  throw new DislopConfigError(
    `Unknown worklog subcommand '${subcommand}' (expected status, list, show, stats, reflect, or clear).`,
  );
}
