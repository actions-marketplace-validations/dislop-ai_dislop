import fs from "node:fs";
import { formatDisplayCoordinate } from "../kernel/document-model.mjs";
import { applyPatchesToText, renderUnifiedDiff } from "../kernel/patcher.mjs";
import { DISLOP_VERSION } from "../kernel/version.mjs";

/**
 * Render `--format json` (`dislop.report/1` verbatim for single file; array of `dislop.report/1` for multi-file).
 */
export function formatJsonReports(results) {
  if (results.length === 1) {
    return `${JSON.stringify(results[0].report, null, 2)}\n`;
  }
  return `${JSON.stringify(results.map((r) => r.report), null, 2)}\n`;
}

/**
 * Render `--format agent`: token-compact structured feed for Coding & Writing Agents.
 */
export function formatAgentReports(results) {
  const blocks = [];

  for (const { report } of results) {
    const defectTotal = (report.summary.defects.error || 0) + (report.summary.defects.warning || 0);
    const suggestionTotal =
      (report.summary.suggestions.strong || 0) +
      (report.summary.suggestions.moderate || 0) +
      (report.summary.suggestions.hint || 0);

    const coverageNote =
      report.coverage && report.coverage.segmentCount === 0 ? " coverage=0-segments" : "";
    const lines = [
      `# dislop file=${report.file} engine=${report.engine} defects=${defectTotal} suggestions=${suggestionTotal}${coverageNote}`,
    ];
    if (report.coverage && report.coverage.segmentCount === 0) {
      lines.push(
        `# notice: ${report.coverage.notice || "0 inspectable text segments extracted; only container checks ran."}`,
      );
    }

    for (const item of report.items) {
      const coord = formatDisplayCoordinate(item.targetId, item.line);
      const headerKind =
        item.kind === "defect"
          ? `DEFECT(${item.severity},${item.fixSafety})`
          : `SUGGESTION(${item.priority},${item.fixSafety})`;
      lines.push(`${coord} ${headerKind} ${item.ruleId}`);
      lines.push(`  quote: ${JSON.stringify(item.originalQuote)}`);
      lines.push(`  reason: ${item.reason}`);

      if (item.actionType === "delete" && item.fixSafety !== "manual") {
        lines.push("  fix: DELETE");
      } else if (item.suggestedReplacement) {
        lines.push(`  fix: ${JSON.stringify(item.suggestedReplacement)}`);
      } else if (item.rewritePrompt) {
        lines.push(`  prompt: ${item.rewritePrompt}`);
      }
      if (item.verificationNote) {
        lines.push(`  note: ${item.verificationNote}`);
      }
    }

    blocks.push(lines.join("\n"));
  }

  return `${blocks.join("\n\n")}\n`;
}

/**
 * Render `--format sarif` (SARIF 2.1.0).
 * Maps `Suggestion` items strictly to `"note"` so IDE/GitHub integrations NEVER display red errors for prose.
 */
export function formatSarifReports(results) {
  const rulesMap = new Map();
  const sarifResults = [];

  for (const { report } of results) {
    for (const item of report.items) {
      if (!rulesMap.has(item.ruleId)) {
        rulesMap.set(item.ruleId, {
          id: item.ruleId,
          shortDescription: { text: item.reason },
        });
      }

      const level =
        item.kind === "defect"
          ? item.severity === "error"
            ? "error"
            : "warning"
          : "note";

      sarifResults.push({
        ruleId: item.ruleId,
        level,
        message: {
          text: item.rewritePrompt ? `${item.reason} (${item.rewritePrompt})` : item.reason,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: report.file },
              region: {
                startLine: item.line || 1,
                snippet: { text: item.originalQuote },
              },
            },
          },
        ],
      });
    }
  }

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "dislop",
            version: DISLOP_VERSION,
            informationUri: "https://dislop.com",
            rules: Array.from(rulesMap.values()),
          },
        },
        results: sarifResults,
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

/**
 * Render `--format diff`: preview unified diff for all `safe` / `review` items without modifying disk.
 */
export function formatDiffReports(results) {
  const chunks = [];
  for (const { doc, items, report } of results) {
    const patchable = items.filter(
      (i) =>
        i.fixSafety !== "manual" &&
        (i.actionType === "delete" || (i.actionType === "replace" && i.suggestedReplacement !== "")),
    );
    if (patchable.length === 0) continue;

    if (doc.format === "docx" || doc.format === "pptx") {
      for (const p of patchable) {
        chunks.push(
          `--- a/${report.file} [${p.targetId}]\n+++ b/${report.file} [${p.targetId}]\n-${p.originalQuote}\n+${p.actionType === "delete" ? "" : p.suggestedReplacement}`,
        );
      }
      continue;
    }

    if (!fs.existsSync(doc.filePath)) continue;
    const orig = fs.readFileSync(doc.filePath, "utf8");
    const next = applyPatchesToText(
      orig,
      doc,
      patchable.map((i) => ({
        targetId: i.targetId,
        locator: i._locator || null,
        originalQuote: i.originalQuote,
        replacement: i.actionType === "delete" ? "" : i.suggestedReplacement,
      })),
    );
    const diff = renderUnifiedDiff(report.file, orig, next);
    if (diff) chunks.push(diff);
  }

  return chunks.length > 0 ? `${chunks.join("\n\n")}\n` : "";
}

/**
 * Render `--format text`: Dual-Track human-readable terminal report.
 */
export function formatTextReports(results, { lang = "en" } = {}) {
  const sections = [];

  for (const { report } of results) {
    const defects = report.items.filter((i) => i.kind === "defect");
    const suggestions = report.items.filter((i) => i.kind === "suggestion");

    const lines = [
      `${report.file}  (engine: ${report.engine}, packs: ${report.mountedPacks.join(", ")})`,
    ];

    if (report.documentToneAnchor) {
      lines.push(`  Tone: ${report.documentToneAnchor}`);
    }

    if (report.coverage && report.coverage.segmentCount === 0) {
      lines.push(
        lang === "zh"
          ? `  \u63d0\u793a: ${report.coverage.notice || "\u672a\u63d0\u53d6\u5230\u53ef\u5ba1\u8ba1\u6587\u672c\u6bb5\u843d\uff08\u53ef\u80fd\u662f\u626b\u63cf\u4ef6\u6216\u7eaf\u56fe\u7247\u5bb9\u5668\uff09\uff0c\u4ec5\u8fd0\u884c\u4e86\u5bb9\u5668\u5c42\u68c0\u67e5\u3002"}`
          : `  Notice: ${report.coverage.notice || "0 inspectable prose segments extracted (scanned PDF or visual-only container); container-level checks only."}`,
      );
    }

    if (defects.length === 0 && suggestions.length === 0) {
      lines.push(
        lang === "zh"
          ? "  \u672a\u53d1\u73b0\u5df2\u77e5\u786c\u4f24\u6216\u53bb\u5473\u5efa\u8bae\u3002"
          : "  No artifact defects or editorial suggestions found.",
      );
      sections.push(lines.join("\n"));
      continue;
    }

    if (defects.length > 0) {
      lines.push(lang === "zh" ? "\n  [\u4ea4\u4ed8\u786c\u4f24 DEFECTS]" : "\n  [DEFECTS]");
      for (const d of defects) {
        const coord = formatDisplayCoordinate(d.targetId, d.line);
        lines.push(`  - ${d.severity.toUpperCase().padEnd(7)} ${coord} ${d.ruleId} (${d.fixSafety})`);
        lines.push(`    Quote : "${d.originalQuote}"`);
        lines.push(`    Reason: ${d.reason}`);
        if (d.actionType === "delete" && d.fixSafety !== "manual") {
          lines.push("    Fix   : (Delete span)");
        } else if (d.suggestedReplacement) {
          lines.push(`    Fix   : "${d.suggestedReplacement}"`);
        } else if (d.rewritePrompt) {
          lines.push(`    Action: ${d.rewritePrompt}`);
        }
      }
    }

    if (suggestions.length > 0) {
      lines.push(
        lang === "zh"
          ? "\n  [\u7f16\u8f91\u5efa\u8bae SUGGESTIONS \u2014 exit 0]"
          : "\n  [SUGGESTIONS — non-blocking, exit 0]",
      );
      for (const s of suggestions) {
        const coord = formatDisplayCoordinate(s.targetId, s.line);
        lines.push(`  - ${s.priority.toUpperCase().padEnd(8)} ${coord} ${s.ruleId} (${s.fixSafety})`);
        lines.push(`    Quote : "${s.originalQuote}"`);
        lines.push(`    Reason: ${s.reason}`);
        if (s.actionType === "delete" && s.fixSafety !== "manual") {
          lines.push("    Fix   : (Delete sentence)");
        } else if (s.suggestedReplacement) {
          lines.push(`    Fix   : "${s.suggestedReplacement}"`);
        } else if (s.rewritePrompt) {
          lines.push(`    Prompt: ${s.rewritePrompt}`);
        }
        if (s.verificationNote) {
          lines.push(`    Gate  : ${s.verificationNote}`);
        }
      }
    }

    sections.push(lines.join("\n"));
  }

  return `${sections.join("\n\n")}\n`;
}

export function renderReports(results, format = "text", { lang = "en" } = {}) {
  switch (format) {
    case "json":
      return formatJsonReports(results);
    case "agent":
      return formatAgentReports(results);
    case "sarif":
      return formatSarifReports(results);
    case "diff":
      return formatDiffReports(results);
    case "text":
    default:
      return formatTextReports(results, { lang });
  }
}
