import {
  SEVERITY_RANK,
  auditText,
  defaultPackForModality,
  detectModality,
  resolveEffectivePack,
} from "../../../src/core.mjs";

export const SUPPORTED_LANGUAGES = new Set([
  "markdown",
  "mdx",
  "plaintext",
  "html",
  "css",
  "javascriptreact",
  "typescriptreact",
]);

/**
 * Convert a Unicode codepoint offset into a UTF-16 code-unit index for VS Code ranges.
 */
export function codepointOffsetToUtf16(text, targetCp) {
  if (!Number.isFinite(targetCp) || targetCp <= 0) return 0;
  let cp = 0;
  let i = 0;
  while (i < text.length && cp < targetCp) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 2;
        cp += 1;
        continue;
      }
    }
    i += 1;
    cp += 1;
  }
  return i;
}

export function pickLocaleText(field, lang = "en") {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || field.zh || "";
}

export function buildHoverMarkdown(finding, lang = "en") {
  const lines = [];
  const label = finding.severity === "error" ? "error" : finding.severity === "info" ? "info" : "warning";
  lines.push(`**dislop** \`${finding.ruleId}\` (${label})`);
  const msg = pickLocaleText(finding.message, lang);
  if (msg) lines.push("", msg);
  const delTest = pickLocaleText(finding.deletionTest, lang);
  if (delTest) lines.push("", `**Deletion test:** ${delTest}`);
  if (finding.exemplar && typeof finding.exemplar === "object") {
    const { bad, trap, good } = finding.exemplar;
    if (bad || trap || good) lines.push("");
    if (bad) lines.push(`- **Original:** ${bad}`);
    if (trap) lines.push(`- **Overcorrected:** ${trap}`);
    if (good) lines.push(`- **Clean:** ${good}`);
  }
  return lines.join("\n");
}

export function buildIgnoreComment(ruleId, modality = "markdown", reason = "intentional phrasing") {
  if (modality === "css") {
    return `/* dislop-ignore-next-line ${ruleId} -- ${reason} */`;
  }
  if (modality === "jsx") {
    return `// dislop-ignore-next-line ${ruleId} -- ${reason}`;
  }
  return `<!-- dislop-ignore-next-line ${ruleId} -- ${reason} -->`;
}

export function runDiagnosticsAudit(
  text,
  { filename = "draft.md", packId = "auto", packsById, minSeverity = "info", config = {} }
) {
  const modality = detectModality(filename) || "markdown";
  const resolvedPackId = !packId || packId === "auto" ? defaultPackForModality(modality) : packId;
  const pack = resolveEffectivePack(resolvedPackId, packsById, config);
  const result = auditText(text, { filename, modality, pack, config });
  const minRank = SEVERITY_RANK[minSeverity] || 1;

  const items = [];
  for (const finding of result.findings || []) {
    if ((SEVERITY_RANK[finding.severity] || 2) < minRank) continue;
    let startOffset = 0;
    let endOffset = 0;
    if (finding.span && Number.isFinite(finding.span.start) && Number.isFinite(finding.span.end)) {
      startOffset = codepointOffsetToUtf16(text, finding.span.start);
      endOffset = Math.max(startOffset + 1, codepointOffsetToUtf16(text, finding.span.end));
    } else {
      startOffset = 0;
      endOffset = Math.min(text.length, 1);
    }
    items.push({
      finding,
      modality,
      packId: resolvedPackId,
      startOffset,
      endOffset,
      line: finding.line || 1,
      col: finding.col || 1,
    });
  }

  return {
    modality,
    packId: resolvedPackId,
    items,
    unusedSuppressions: result.unusedSuppressions || [],
  };
}
