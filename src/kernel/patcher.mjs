import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { decodeXmlEntities } from "./document-model.mjs";
import { readZipArchive, repackZipArchive } from "./ooxml-binary.mjs";

export function escapeXmlText(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Expand a deleted `[start, end]` span slightly to consume orphaned adjacent single space
 * or empty list/heading lines so sentence deletion leaves clean typography.
 */
function adjustTextSpanForDeletion(source, start, end) {
  let s = start;
  let e = end;

  // Check if deleting this span leaves the rest of the line empty (or an empty list marker like `- `)
  let lineStart = source.lastIndexOf("\n", s - 1);
  lineStart = lineStart === -1 ? 0 : lineStart + 1;
  let lineEnd = source.indexOf("\n", e);
  const rawLineEnd = lineEnd === -1 ? source.length : lineEnd + 1;
  if (lineEnd === -1) lineEnd = source.length;
  const contentLineEnd = lineEnd > lineStart && source[lineEnd - 1] === "\r" ? lineEnd - 1 : lineEnd;

  const prefix = source.slice(lineStart, s);
  const suffix = source.slice(e, contentLineEnd);

  if (/^\s*(?:(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?|>\s+|#{1,6}\s+)?$/.test(prefix) && /^\s*$/.test(suffix)) {
    return { start: lineStart, end: rawLineEnd };
  }

  // Mid-line sentence deletion: eat trailing horizontal whitespace first, otherwise leading horizontal whitespace
  if (e < contentLineEnd && /[ \t]/.test(source[e])) {
    while (e < contentLineEnd && /[ \t]/.test(source[e])) e += 1;
  } else if (s > lineStart && /[ \t]/.test(source[s - 1])) {
    while (s > lineStart && /[ \t]/.test(source[s - 1])) s -= 1;
  }

  return { start: s, end: e };
}

function normalizePostPatchWhitespace(patched, eol, { hadLeadingNewline = false } = {}) {
  const lf = patched.replace(/\r\n/g, "\n");
  let cleaned = lf
    // Strip orphaned leading comma/semicolon after sentence/clause deletion on a line
    .replace(/(^|\n)([ \t]*)[,;:，；：]+[ \t]*/g, "$1$2")
    // Collapse 3+ consecutive blank lines into a single blank line (2 newlines)
    .replace(/\n{3,}/g, "\n\n");
  if (!hadLeadingNewline) {
    cleaned = cleaned.replace(/^\n+/, "");
  }
  return eol === "\r\n" ? cleaned.replace(/\n/g, "\r\n") : cleaned;
}

function resolveLocatorForPatch(doc, patch) {
  if (patch.locator) return patch.locator;
  if (!patch.targetId) return null;
  const seg = doc.segments.find((s) => s.id === patch.targetId);
  if (seg?.locator) {
    if (patch.originalQuote && patch.originalQuote !== seg.text) {
      const idx = seg.text.indexOf(patch.originalQuote);
      if (idx === -1 || seg.text.indexOf(patch.originalQuote, idx + 1) !== -1) {
        return null;
      }
      if (seg.locator.kind === "ooxml-span") {
        return {
          ...seg.locator,
          charStart: seg.locator.charStart + idx,
          charEnd: seg.locator.charStart + idx + patch.originalQuote.length,
        };
      }
      return {
        ...seg.locator,
        start: seg.locator.start + idx,
        end: seg.locator.start + idx + patch.originalQuote.length,
      };
    }
    return seg.locator;
  }
  const para = doc.paragraphs?.find((p) => p.id === patch.targetId);
  return para?.locator || null;
}

/**
 * Apply accepted patches to an in-memory UTF-8 text/markup document string,
 * returning both the patched text and exact set of applied patch indices.
 */
export function applyPatchesToTextDetailed(sourceText, doc, patches) {
  const appliedIndices = new Set();
  if (!patches || patches.length === 0) return { text: sourceText, appliedIndices };
  const eol = detectEol(sourceText);

  const resolved = [];
  for (let patchIdx = 0; patchIdx < patches.length; patchIdx += 1) {
    const patch = patches[patchIdx];
    const loc = resolveLocatorForPatch(doc, patch);
    if (!loc || (loc.kind !== "text-span" && loc.kind !== "html-span")) continue;
    let replacement = String(patch.replacement ?? "");
    let span =
      replacement === "" && loc.kind === "text-span"
        ? adjustTextSpanForDeletion(sourceText, loc.start, loc.end)
        : { start: loc.start, end: loc.end };
    if (replacement !== "" && loc.kind === "text-span") {
      const orig = sourceText.slice(span.start, span.end);
      const minLen = Math.min(orig.length, replacement.length);
      let cp = 0;
      while (cp < minLen && orig[cp] === replacement[cp]) cp += 1;
      let cs = 0;
      while (cs < minLen - cp && orig[orig.length - 1 - cs] === replacement[replacement.length - 1 - cs]) cs += 1;
      if (cp > 0 || cs > 0) {
        span = { start: span.start + cp, end: span.end - cs };
        replacement = replacement.slice(cp, replacement.length - cs);
      }
    }
    resolved.push({
      patchIdx,
      start: span.start,
      end: span.end,
      replacement,
    });
  }

  if (resolved.length === 0) return { text: sourceText, appliedIndices };

  resolved.sort((a, b) => b.start - a.start || b.end - a.end);

  let out = sourceText;
  let minAppliedStart = Infinity;
  for (const edit of resolved) {
    if (edit.end > minAppliedStart) continue; // overlap guard
    const beforeSlice = out.slice(edit.start, edit.end);
    if (beforeSlice === edit.replacement) continue;
    out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end);
    minAppliedStart = edit.start;
    appliedIndices.add(edit.patchIdx);
  }

  const finalText = normalizePostPatchWhitespace(out, eol, {
    hadLeadingNewline: /^\r?\n/.test(sourceText),
  });
  return { text: finalText, appliedIndices };
}

/**
 * Apply accepted patches (`Array<{ targetId?, locator?, originalQuote?, replacement: string }>`)
 * to an in-memory UTF-8 text/markup document string.
 */
export function applyPatchesToText(sourceText, doc, patches) {
  return applyPatchesToTextDetailed(sourceText, doc, patches).text;
}

function patchSingleOoxmlParagraphXmlDetailed(pXml, nsPrefix, charEdits) {
  const rTagRe = nsPrefix === "w" ? /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g : /<a:r\b[^>]*>[\s\S]*?<\/a:r>/g;
  const rPrTagRe = nsPrefix === "w" ? /<w:rPr\b[\s\S]*?<\/w:rPr>/ : /<a:rPr\b[\s\S]*?(?:\/>|<\/a:rPr>)/;
  const tTagRe = nsPrefix === "w" ? /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g : /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g;

  const hasProtectedNodes = /<(?:w:hyperlink|a:hlinkClick|w:fldSimple|w:instrText)\b/.test(pXml);
  const runMatches = Array.from(pXml.matchAll(rTagRe));
  const distinctRPr = new Set(
    runMatches.map((rm) => {
      const m = rm[0].match(rPrTagRe);
      return m ? m[0] : "";
    }),
  );

  // Locate each <w:t> / <a:t> slice in fullText and pXml
  const tNodes = [];
  let cursor = 0;
  let tm;
  while ((tm = tTagRe.exec(pXml)) !== null) {
    const decoded = decodeXmlEntities(tm[1]);
    const whole = tm[0];
    const openEnd = whole.indexOf(">") + 1;
    const closeStart = whole.lastIndexOf("</");
    tNodes.push({
      xmlStart: tm.index,
      xmlEnd: tm.index + whole.length,
      openTag: whole.slice(0, openEnd),
      closeTag: whole.slice(closeStart),
      textStart: cursor,
      textEnd: cursor + decoded.length,
      decoded,
    });
    cursor += decoded.length;
  }

  // If the paragraph holds hyperlinks, field codes, or mixed run styling, ONLY allow edits contained
  // cleanly within a single <w:t>/<a:t> run (declining cross-run edits so formatting & links survive).
  if (hasProtectedNodes || distinctRPr.size > 1) {
    const sorted = [...charEdits].sort((a, b) => b.charStart - a.charStart);
    const nodeTexts = tNodes.map((n) => n.decoded);
    const appliedIndices = new Set();

    for (const ed of sorted) {
      const targetIdx = tNodes.findIndex((n) => ed.charStart >= n.textStart && ed.charEnd <= n.textEnd);
      if (targetIdx === -1) continue;
      const node = tNodes[targetIdx];
      let s = ed.charStart - node.textStart;
      let e = ed.charEnd - node.textStart;
      let curStr = nodeTexts[targetIdx];
      if (ed.replacement === "") {
        if (e < curStr.length && curStr[e] === " ") e += 1;
        else if (s > 0 && curStr[s - 1] === " ") s -= 1;
      }
      nodeTexts[targetIdx] = curStr.slice(0, s) + ed.replacement + curStr.slice(e);
      if (ed.patchIndex !== undefined) appliedIndices.add(ed.patchIndex);
    }

    if (appliedIndices.size === 0) {
      return { xml: pXml, appliedIndices };
    }

    let rebuilt = "";
    let lastXml = 0;
    for (let idx = 0; idx < tNodes.length; idx += 1) {
      const node = tNodes[idx];
      rebuilt += pXml.slice(lastXml, node.xmlStart);
      const nextRaw = nodeTexts[idx];
      const needsPreserve =
        nsPrefix === "w" && (/^\s|\s$/.test(nextRaw) || /xml:space="preserve"/.test(node.openTag));
      const openTag =
        needsPreserve && !/xml:space=/.test(node.openTag)
          ? node.openTag.replace(/^<w:t\b/, '<w:t xml:space="preserve"')
          : node.openTag;
      rebuilt += `${openTag}${escapeXmlText(nextRaw)}${node.closeTag}`;
      lastXml = node.xmlEnd;
    }
    rebuilt += pXml.slice(lastXml);
    return { xml: rebuilt, appliedIndices };
  }

  let firstRPr = "";
  if (runMatches.length > 0) {
    const rPrMatch = runMatches[0][0].match(rPrTagRe);
    if (rPrMatch) firstRPr = rPrMatch[0];
  }

  let fullText = tNodes.map((n) => n.decoded).join("");
  const appliedIndices = new Set();

  // Apply edits in descending charStart order
  const sorted = [...charEdits].sort((a, b) => b.charStart - a.charStart);
  let minStart = Infinity;
  for (const ed of sorted) {
    if (ed.charEnd > minStart) continue;
    let s = ed.charStart;
    let e = ed.charEnd;
    if (ed.replacement === "") {
      if (e < fullText.length && fullText[e] === " ") e += 1;
      else if (s > 0 && fullText[s - 1] === " ") s -= 1;
    }
    fullText = fullText.slice(0, s) + ed.replacement + fullText.slice(e);
    minStart = s;
    if (ed.patchIndex !== undefined) appliedIndices.add(ed.patchIndex);
  }

  const pPrRe = nsPrefix === "w" ? /<w:pPr\b[\s\S]*?<\/w:pPr>/ : /<a:pPr\b[\s\S]*?(?:\/>|<\/a:pPr>)/;
  const openTagMatch = pXml.match(/^<(?:w|a):p\b[^>]*>/);
  const openTag = openTagMatch ? openTagMatch[0] : `<${nsPrefix}:p>`;
  const pPrMatch = pXml.match(pPrRe);
  const pPr = pPrMatch ? pPrMatch[0] : "";

  if (!fullText.trim()) {
    return { xml: `${openTag}${pPr}</${nsPrefix}:p>`, appliedIndices };
  }

  const escaped = escapeXmlText(fullText);
  if (nsPrefix === "w") {
    return {
      xml: `${openTag}${pPr}<w:r>${firstRPr}<w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`,
      appliedIndices,
    };
  }
  return {
    xml: `${openTag}${pPr}<a:r>${firstRPr}<a:t>${escaped}</a:t></a:r></a:p>`,
    appliedIndices,
  };
}

/**
 * Apply accepted patches to an OOXML (`.docx` / `.pptx`) archive buffer, returning a new Buffer.
 */
export function applyPatchesToOoxmlBufferDetailed(originalBuffer, doc, patches) {
  if (!patches || patches.length === 0) {
    return { buffer: originalBuffer, appliedIndices: new Set() };
  }
  const { xmlEntries } = readZipArchive(originalBuffer);

  // Group edits by entryName -> paragraphOrd
  const byEntry = new Map();
  for (let patchIdx = 0; patchIdx < patches.length; patchIdx += 1) {
    const patch = patches[patchIdx];
    const loc = resolveLocatorForPatch(doc, patch);
    if (!loc || loc.kind !== "ooxml-span") continue;
    let entryGroup = byEntry.get(loc.entryName);
    if (!entryGroup) {
      entryGroup = { nsPrefix: loc.nsPrefix, byPara: new Map() };
      byEntry.set(loc.entryName, entryGroup);
    }
    let paraEdits = entryGroup.byPara.get(loc.paragraphOrd);
    if (!paraEdits) {
      paraEdits = [];
      entryGroup.byPara.set(loc.paragraphOrd, paraEdits);
    }
    paraEdits.push({
      charStart: loc.charStart,
      charEnd: loc.charEnd,
      replacement: String(patch.replacement ?? ""),
      patchIndex: patchIdx,
    });
  }

  if (byEntry.size === 0) {
    return { buffer: originalBuffer, appliedIndices: new Set() };
  }

  const updatedXml = {};
  const appliedIndices = new Set();
  for (const [entryName, group] of byEntry.entries()) {
    const xml = xmlEntries[entryName];
    if (!xml) continue;
    const pTagRe =
      group.nsPrefix === "w" ? /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g : /<a:p\b[^>]*>[\s\S]*?<\/a:p>/g;
    let pOrd = 0;
    updatedXml[entryName] = xml.replace(pTagRe, (pXml) => {
      const idx = pOrd;
      pOrd += 1;
      const edits = group.byPara.get(idx);
      if (!edits || edits.length === 0) return pXml;
      const res = patchSingleOoxmlParagraphXmlDetailed(pXml, group.nsPrefix, edits);
      if (res.xml !== pXml) {
        for (const aIdx of res.appliedIndices) appliedIndices.add(aIdx);
      }
      return res.xml;
    });
  }

  if (appliedIndices.size === 0) {
    return { buffer: originalBuffer, appliedIndices };
  }
  return { buffer: repackZipArchive(originalBuffer, updatedXml), appliedIndices };
}

export function applyPatchesToOoxmlBuffer(originalBuffer, doc, patches) {
  return applyPatchesToOoxmlBufferDetailed(originalBuffer, doc, patches).buffer;
}

/**
 * Render a compact unified diff preview between `beforeText` and `afterText`.
 */
export function renderUnifiedDiff(filePath, beforeText, afterText) {
  if (beforeText === afterText) return "";
  const aLines = beforeText.replace(/\r\n/g, "\n").split("\n");
  const bLines = afterText.replace(/\r\n/g, "\n").split("\n");

  const out = [`--- a/${filePath}`, `+++ b/${filePath}`];
  const maxLen = Math.max(aLines.length, bLines.length);
  let i = 0;
  while (i < maxLen) {
    if (aLines[i] === bLines[i]) {
      i += 1;
      continue;
    }
    const start = Math.max(0, i - 1);
    let endA = i;
    let endB = i;
    while (endA < aLines.length || endB < bLines.length) {
      if (endA < aLines.length && endB < bLines.length && aLines[endA] === bLines[endB]) break;
      if (endA < aLines.length) endA += 1;
      if (endB < bLines.length) endB += 1;
    }
    out.push(`@@ -${start + 1},${endA - start} +${start + 1},${endB - start} @@`);
    if (start < i) out.push(` ${aLines[start]}`);
    for (let k = i; k < endA; k += 1) {
      if (aLines[k] !== undefined) out.push(`-${aLines[k]}`);
    }
    for (let k = i; k < endB; k += 1) {
      if (bLines[k] !== undefined) out.push(`+${bLines[k]}`);
    }
    i = Math.max(endA, endB);
  }
  return out.join("\n");
}

/**
 * Apply patches to `doc.filePath` (supporting `--dry-run` and `--backup` atomic temp-file rename).
 */
export function patchDocumentOnDisk(doc, patches, { dryRun = false, backup = false, displayPath = null } = {}) {
  if (!patches || patches.length === 0) {
    return { modified: false, appliedIndices: new Set(), appliedCount: 0, diff: "" };
  }

  const filePath = doc.filePath;
  const diffLabel = (displayPath || filePath).replace(/^\/+/, "");
  if (doc.format === "docx" || doc.format === "pptx") {
    const origBuf = fs.readFileSync(filePath);
    const { buffer: nextBuf, appliedIndices } = applyPatchesToOoxmlBufferDetailed(origBuf, doc, patches);
    if (origBuf.equals(nextBuf) || appliedIndices.size === 0) {
      return { modified: false, appliedIndices: new Set(), appliedCount: 0, diff: "" };
    }
    const diffSummary = Array.from(appliedIndices)
      .sort((a, b) => a - b)
      .map((idx) => patches[idx])
      .map(
        (p) =>
          `--- a/${diffLabel} [${p.targetId || "ooxml"}]\n+++ b/${diffLabel} [${p.targetId || "ooxml"}]\n-${p.originalQuote || ""}\n+${p.replacement || "(deleted)"}`,
      )
      .join("\n");
    if (!dryRun) {
      atomicWriteBuffer(filePath, nextBuf, { backup });
    }
    return {
      modified: true,
      appliedIndices,
      appliedCount: appliedIndices.size,
      diff: diffSummary,
    };
  }

  const origText = fs.readFileSync(filePath, "utf8");
  const { text: nextText, appliedIndices } = applyPatchesToTextDetailed(origText, doc, patches);
  if (origText === nextText || appliedIndices.size === 0) {
    return { modified: false, appliedIndices: new Set(), appliedCount: 0, diff: "" };
  }

  const diff = renderUnifiedDiff(diffLabel, origText, nextText);
  if (!dryRun) {
    atomicWriteBuffer(filePath, Buffer.from(nextText, "utf8"), { backup });
  }
  return {
    modified: true,
    appliedIndices,
    appliedCount: appliedIndices.size,
    diff,
  };
}

function atomicWriteBuffer(filePath, buffer, { backup = false } = {}) {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  const mode = fs.existsSync(resolved) ? fs.statSync(resolved).mode : 0o644;

  if (backup && fs.existsSync(resolved)) {
    fs.copyFileSync(resolved, `${resolved}.bak`);
  }

  const tmpName = `.dislop-tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  const tmpPath = path.join(dir, tmpName);
  try {
    fs.writeFileSync(tmpPath, buffer, { mode });
    fs.renameSync(tmpPath, resolved);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup failure
      }
    }
    throw err;
  }
}
