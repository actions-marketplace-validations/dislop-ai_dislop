#!/usr/bin/env node
/**
 * dislop-bench v3 — Multi-modal, Semantic, Security & Revision Benchmark Runner.
 *
 * Usage:
 *   node ./scripts/run-benchmark.mjs                  # Run all suites and print summary
 *   node ./scripts/run-benchmark.mjs --assert         # Fail non-zero if any gate misses threshold
 *   node ./scripts/run-benchmark.mjs --write-report   # Write benchmarks/REPORT.md & results/latest.json
 *   node ./scripts/run-benchmark.mjs --eval <file>    # Score an external JSON run against v3 gates
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { resolveLayeredConfig } from "../src/kernel/config.mjs";
import { runDocumentPipeline, arbitrateExitCode } from "../src/kernel/pipeline.mjs";
import { buildZipArchive } from "../src/kernel/ooxml-binary.mjs";
import { verifyDocumentRevision } from "../src/kernel/fact-gate.mjs";
import { parseDocumentFile } from "../src/kernel/document-model.mjs";
import { runAutoFixOnDocumentResult } from "../src/runners/auto-fix.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { assert: false, writeReport: false, evalPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--assert") args.assert = true;
    else if (a === "--write-report") args.writeReport = true;
    else if (a === "--eval" && argv[i + 1]) args.evalPath = path.resolve(argv[++i]);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Zero-dependency Synthetic PNG & PDF Builders (standard specs)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildSyntheticPng({ width = 32, height = 32, textChunks = [] }) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const chunks = [sig, pngChunk("IHDR", ihdr)];
  for (const { key, value } of textChunks) {
    chunks.push(pngChunk("tEXt", Buffer.from(`${key}\0${value}`, "latin1")));
  }
  const rawScanlines = Buffer.alloc(height * (1 + width * 3), 0);
  chunks.push(pngChunk("IDAT", zlib.deflateSync(rawScanlines)));
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function escapePdfLiteral(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function encodeAscii85(buf) {
  const out = [];
  for (let i = 0; i < buf.length; i += 4) {
    const rem = Math.min(4, buf.length - i);
    const b0 = buf[i] || 0;
    const b1 = rem > 1 ? buf[i + 1] : 0;
    const b2 = rem > 2 ? buf[i + 2] : 0;
    const b3 = rem > 3 ? buf[i + 3] : 0;
    const val = (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0);
    if (rem === 4 && val === 0) {
      out.push("z");
      continue;
    }
    let tmp = val;
    const digits = new Array(5);
    for (let k = 4; k >= 0; k -= 1) {
      digits[k] = String.fromCharCode((tmp % 85) + 33);
      tmp = Math.floor(tmp / 85);
    }
    out.push(digits.slice(0, rem + 1).join(""));
  }
  return `${out.join("")}~>`;
}

function buildSyntheticPdf({ compress = true, ascii85 = false, useFormXObject = false, pages = [] }) {
  // Objects:
  // 1: Catalog, 2: Pages, 3: Helvetica (/F1), 4: Courier (/F2),
  // Optional 5: CJK Type0/Type1 font (/F3) + 6: ToUnicode CMap stream
  const codeMap = new Map();
  let nextGlyphCode = 1;
  const usesCjk = pages.some((p) => (p.runs || []).some((r) => r.font === "CJK-ToUnicode"));

  if (usesCjk) {
    for (const p of pages) {
      for (const r of p.runs || []) {
        if (r.font !== "CJK-ToUnicode") continue;
        for (const ch of Array.from(r.text || "")) {
          if (!codeMap.has(ch)) {
            codeMap.set(ch, nextGlyphCode++);
          }
        }
      }
    }
  }

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObj(null); // 1 Catalog placeholder
  addObj(null); // 2 Pages placeholder
  const f1 = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const f2 = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  let f3 = null;
  if (usesCjk) {
    const entries = [...codeMap.entries()].map(([ch, gid]) => {
      const gHex = gid.toString(16).toUpperCase().padStart(4, "0");
      const cp = ch.codePointAt(0);
      let uHex;
      if (cp <= 0xffff) {
        uHex = cp.toString(16).toUpperCase().padStart(4, "0");
      } else {
        const hi = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
        const lo = ((cp - 0x10000) % 0x400) + 0xdc00;
        uHex = hi.toString(16).toUpperCase().padStart(4, "0") + lo.toString(16).toUpperCase().padStart(4, "0");
      }
      return `<${gHex}> <${uHex}>`;
    });
    const cmapText = [
      "/CIDInit /ProcSet findresource begin",
      "12 dict begin begincmap",
      "/CMapType 2 def",
      "1 begincodespacerange",
      "<0001> <FFFF>",
      "endcodespacerange",
      `${entries.length} beginbfchar`,
      ...entries,
      "endbfchar",
      "endcmap CMapName currentdict /CMap defineresource pop end end",
    ].join("\n");
    const cmapBytes = compress ? zlib.deflateSync(Buffer.from(cmapText, "utf8")) : Buffer.from(cmapText, "utf8");
    const cmapObjNum = objects.length + 2; // font first, then cmap
    f3 = addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /PingFangSC-Regular /Encoding /Identity-H /ToUnicode ${cmapObjNum} 0 R >>`);
    const filterPart = compress ? "/Filter /FlateDecode " : "";
    addObj({
      dict: `<< ${filterPart}/Length ${cmapBytes.length} >>`,
      stream: cmapBytes,
    });
  }

  const fontDictParts = [`/F1 ${f1} 0 R`, `/F2 ${f2} 0 R`];
  if (f3) fontDictParts.push(`/F3 ${f3} 0 R`);
  const fontSubDictNum = addObj(`<< ${fontDictParts.join(" ")} >>`);
  const resDict = `<< /Font ${fontSubDictNum} 0 R >>`;

  const encodeContentStream = (rawBuf) => {
    let encoded = compress ? zlib.deflateSync(rawBuf) : rawBuf;
    if (ascii85) {
      encoded = Buffer.from(encodeAscii85(encoded), "ascii");
      const filterStr = compress ? "/Filter [ /ASCII85Decode /FlateDecode ] " : "/Filter /ASCII85Decode ";
      return { dict: `<< ${filterStr}/Length ${encoded.length} >>`, stream: encoded };
    }
    const filterPart = compress ? "/Filter /FlateDecode " : "";
    return { dict: `<< ${filterPart}/Length ${encoded.length} >>`, stream: encoded };
  };

  const pageObjNums = [];
  for (const p of pages) {
    const w = p.width || 612;
    const h = p.height || 792;
    const ops = ["BT"];
    let y = h - 60;
    for (const r of p.runs || []) {
      const size = r.size || 12;
      if (r.font === "Courier") {
        ops.push(`/F2 ${size} Tf`);
        ops.push(`1 0 0 1 54 ${y} Tm`);
        ops.push(`(${escapePdfLiteral(r.text)}) Tj`);
      } else if (r.font === "CJK-ToUnicode") {
        ops.push(`/F3 ${size} Tf`);
        ops.push(`1 0 0 1 54 ${y} Tm`);
        const hex = Array.from(r.text || "")
          .map((ch) => codeMap.get(ch).toString(16).toUpperCase().padStart(4, "0"))
          .join("");
        ops.push(`<${hex}> Tj`);
      } else {
        ops.push(`/F1 ${size} Tf`);
        ops.push(`1 0 0 1 54 ${y} Tm`);
        ops.push(`(${escapePdfLiteral(r.text)}) Tj`);
      }
      y -= size * 1.6;
    }
    ops.push("ET");
    const streamStr = ops.join("\n");
    const rawBuf = Buffer.from(streamStr, "latin1");

    if (useFormXObject) {
      const formEncoded = encodeContentStream(rawBuf);
      const formObjNum = addObj({
        dict: `<< /Type /XObject /Subtype /Form /BBox [0 0 ${w} ${h}] /Resources ${resDict} ${formEncoded.dict.slice(3, -2).trim()} >>`,
        stream: formEncoded.stream,
      });
      const outerEncoded = encodeContentStream(Buffer.from(`q\n/X1 Do\nQ\n`, "ascii"));
      const contentObjNum = addObj(outerEncoded);
      const pageObjNum = addObj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /X1 ${formObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`
      );
      pageObjNums.push(pageObjNum);
    } else {
      const contentObjNum = addObj(encodeContentStream(rawBuf));
      const pageObjNum = addObj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources ${resDict} /Contents ${contentObjNum} 0 R >>`
      );
      pageObjNums.push(pageObjNum);
    }
  }

  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[1] = `<< /Type /Pages /Count ${pageObjNums.length} /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] >>`;

  const parts = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  let cursor = parts[0].length;
  for (let i = 0; i < objects.length; i++) {
    offsets.push(cursor);
    const obj = objects[i];
    const header = Buffer.from(`${i + 1} 0 obj\n`, "ascii");
    let bodyBuf;
    if (typeof obj === "string") {
      bodyBuf = Buffer.from(`${obj}\nendobj\n`, "ascii");
    } else {
      bodyBuf = Buffer.concat([
        Buffer.from(`${obj.dict}\nstream\n`, "ascii"),
        obj.stream,
        Buffer.from(`\nendstream\nendobj\n`, "ascii"),
      ]);
    }
    parts.push(header, bodyBuf);
    cursor += header.length + bodyBuf.length;
  }

  const xrefOffset = cursor;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  xrefLines.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  parts.push(Buffer.from(xrefLines.join(""), "ascii"));
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// Materialization helpers
// ---------------------------------------------------------------------------

function writeSampleFile(tmpDir, sample, idx) {
  const safeId = String(sample.id || `sample-${idx}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = sample.format === "slide-deck" ? "pptx" : sample.format || "md";
  const filePath = path.join(tmpDir, `${safeId}.${ext}`);
  if (sample.ooxml) {
    fs.writeFileSync(filePath, buildZipArchive(sample.ooxml));
  } else if (sample.synthPng) {
    fs.writeFileSync(filePath, buildSyntheticPng(sample.synthPng));
  } else if (sample.synthPdf) {
    fs.writeFileSync(filePath, buildSyntheticPdf(sample.synthPdf));
  } else {
    fs.writeFileSync(filePath, String(sample.content || ""), "utf8");
  }
  return filePath;
}

function extractTextForOoxml(filePath) {
  const doc = parseDocumentFile(filePath);
  return doc.segments.map((s) => s.text).join("\n");
}

// ---------------------------------------------------------------------------
// Suite Runners
// ---------------------------------------------------------------------------

async function runActiveMultimodalSuite(dataset, tmpDir) {
  const baseConfig = await resolveLayeredConfig({
    cwd: tmpDir,
    env: {},
    cliFlags: { noLlm: true },
  });

  const a1 = { pos: 0, tp: 0, fn: 0, clean: 0, fp: 0, failures: [] };
  const a2 = { pos: 0, tp: 0, fn: 0, clean: 0, fp: 0, failures: [] };

  for (let i = 0; i < dataset.samples.length; i++) {
    const sample = dataset.samples[i];
    const filePath = writeSampleFile(tmpDir, sample, i);
    const result = await runDocumentPipeline({
      filePath,
      config: baseConfig,
      route: null,
      voiceProfile: null,
      cwd: tmpDir,
    });
    const exitCode = arbitrateExitCode([result.report]);
    const items = result.items || [];
    const defects = items.filter((it) => it.kind === "defect");
    const suggestions = items.filter((it) => it.kind === "suggestion");
    const ruleIds = new Set(items.map((it) => it.ruleId));

    if (sample.track === "A1-defect") {
      if (sample.expected === "slop") {
        a1.pos++;
        const matchedExpected =
          !sample.expectedRuleIds || sample.expectedRuleIds.some((id) => ruleIds.has(id));
        const expectedErrorDefect = !defects.every((d) => d.severity === "warning");
        const exitOk = expectedErrorDefect ? exitCode === 1 : exitCode === 0;
        if (defects.length > 0 && exitOk && matchedExpected) {
          a1.tp++;
        } else {
          a1.fn++;
          a1.failures.push({
            id: sample.id,
            reason: `expected defect (${(sample.expectedRuleIds || []).join(",")}), got rules=[${[...ruleIds].join(",")}] exit=${exitCode}`,
          });
        }
      } else {
        a1.clean++;
        if (defects.length === 0 && exitCode === 0) {
          // clean passed
        } else {
          a1.fp++;
          a1.failures.push({
            id: sample.id,
            reason: `expected clean (0 defects), got defects=[${defects.map((d) => d.ruleId).join(",")}]`,
          });
        }
      }
    } else if (sample.track === "A2-suggestion") {
      if (sample.expected === "slop") {
        a2.pos++;
        const matchedExpected =
          !sample.expectedRuleIds || sample.expectedRuleIds.some((id) => ruleIds.has(id));
        if (suggestions.length > 0 && exitCode === 0 && matchedExpected) {
          a2.tp++;
        } else {
          a2.fn++;
          a2.failures.push({
            id: sample.id,
            reason: `expected suggestion (${(sample.expectedRuleIds || []).join(",")}), got rules=[${[...ruleIds].join(",")}] exit=${exitCode}`,
          });
        }
      } else {
        a2.clean++;
        if (items.length === 0 && exitCode === 0) {
          // strict zero-FP across both defects and suggestions
        } else {
          a2.fp++;
          a2.failures.push({
            id: sample.id,
            reason: `expected clean (0 items), got items=[${items.map((x) => `${x.kind}:${x.ruleId}`).join(",")}]`,
          });
        }
      }
    }
  }

  const pct = (num, den) => (den === 0 ? 100 : Number(((num / den) * 100).toFixed(2)));
  return {
    total: dataset.samples.length,
    trackA1: {
      positives: a1.pos,
      tp: a1.tp,
      fn: a1.fn,
      clean: a1.clean,
      fp: a1.fp,
      precision: pct(a1.tp, a1.tp + a1.fp),
      recall: pct(a1.tp, a1.pos),
      cleanFpr: pct(a1.fp, a1.clean),
      failures: a1.failures,
    },
    trackA2: {
      positives: a2.pos,
      tp: a2.tp,
      fn: a2.fn,
      clean: a2.clean,
      fp: a2.fp,
      recall: pct(a2.tp, a2.pos),
      cleanFpr: pct(a2.fp, a2.clean),
      failures: a2.failures,
    },
  };
}

async function runSemanticAndSecuritySuite(dataset, tmpDir) {
  const baseConfig = await resolveLayeredConfig({
    cwd: tmpDir,
    env: {},
    cliFlags: {},
  });

  let passed = 0;
  const failures = [];

  for (let i = 0; i < dataset.cases.length; i++) {
    const c = dataset.cases[i];
    const filePath = writeSampleFile(tmpDir, { id: c.id, format: c.format, content: c.content }, i);
    let capturedPayload = null;
    const mockRoute = {
      tier: "byok",
      engineLabel: "byok:mock-v3",
      maxInputTokens: 12000,
      execute: async (payload) => {
        capturedPayload = payload;
        return c.mockResponse;
      },
    };

    const result = await runDocumentPipeline({
      filePath,
      config: baseConfig,
      route: mockRoute,
      voiceProfile: null,
      cwd: tmpDir,
    });
    const exitCode = arbitrateExitCode([result.report]);
    const items = result.items || [];
    const exp = c.expect || {};
    const errs = [];

    if (exp.ciExitCode !== undefined && exitCode !== exp.ciExitCode) {
      errs.push(`exitCode expected ${exp.ciExitCode}, got ${exitCode}`);
    }
    if (exp.itemCount !== undefined && items.length !== exp.itemCount) {
      errs.push(`itemCount expected ${exp.itemCount}, got ${items.length}`);
    }
    if (exp.escapedUserPromptMustNotContain !== undefined) {
      const userPrompt = String(capturedPayload?.userPrompt || "");
      if (userPrompt.includes(exp.escapedUserPromptMustNotContain)) {
        errs.push(`raw boundary tag leaked into userPrompt`);
      }
    }
    if (exp.ruleId || exp.kind || exp.fixSafety || exp.actionType || exp.suggestedReplacement !== undefined || exp.verificationNoteMatch) {
      const target = exp.ruleId ? items.find((it) => it.ruleId === exp.ruleId) : items[0];
      if (!target) {
        errs.push(`missing expected item (items=${items.length})`);
      } else {
        if (exp.kind && target.kind !== exp.kind) errs.push(`kind expected ${exp.kind}, got ${target.kind}`);
        if (exp.fixSafety && target.fixSafety !== exp.fixSafety) errs.push(`fixSafety expected ${exp.fixSafety}, got ${target.fixSafety}`);
        if (exp.actionType && target.actionType !== exp.actionType) errs.push(`actionType expected ${exp.actionType}, got ${target.actionType}`);
        if (exp.suggestedReplacement !== undefined && String(target.suggestedReplacement || "") !== exp.suggestedReplacement) {
          errs.push(`suggestedReplacement expected ${JSON.stringify(exp.suggestedReplacement)}, got ${JSON.stringify(target.suggestedReplacement)}`);
        }
        if (exp.verificationNoteMatch && !String(target.verificationNote || "").includes(exp.verificationNoteMatch)) {
          errs.push(`verificationNote expected to include "${exp.verificationNoteMatch}", got "${target.verificationNote || ""}"`);
        }
      }
    }

    if (errs.length === 0) {
      passed++;
    } else {
      failures.push({ id: c.id, errs });
    }
  }

  return {
    total: dataset.cases.length,
    passed,
    passRate: Number(((passed / dataset.cases.length) * 100).toFixed(2)),
    failures,
  };
}

async function runRevisionAndFactGateSuite(dataset, tmpDir) {
  const baseConfig = await resolveLayeredConfig({
    cwd: tmpDir,
    env: {},
    cliFlags: { noLlm: true },
  });

  // 1. 18 End-to-End Revision Tasks
  let revFactGatePassed = 0;
  let rawAiItems = 0;
  let dislopCleanItems = 0;
  let naiveHumanizerFactFails = 0;
  const revFailures = [];

  for (let i = 0; i < dataset.revisionTasks.length; i++) {
    const task = dataset.revisionTasks[i];
    const ext = task.modality === "pptx" ? "pptx" : task.modality === "html" ? "html" : "md";
    const armFiles = {};
    const armTexts = {};

    for (const arm of ["raw_ai", "naive_humanizer", "dislop_clean"]) {
      const fPath = path.join(tmpDir, `${task.id}-${arm}.${ext}`);
      const payload = task.arms[arm];
      if (typeof payload === "object" && payload !== null) {
        fs.writeFileSync(fPath, buildZipArchive(payload));
        armTexts[arm] = extractTextForOoxml(fPath);
      } else {
        fs.writeFileSync(fPath, String(payload), "utf8");
        armTexts[arm] = String(payload);
      }
      armFiles[arm] = fPath;
    }

    const rawRes = await runDocumentPipeline({ filePath: armFiles.raw_ai, config: baseConfig, route: null, voiceProfile: null, cwd: tmpDir });
    const cleanRes = await runDocumentPipeline({ filePath: armFiles.dislop_clean, config: baseConfig, route: null, voiceProfile: null, cwd: tmpDir });
    rawAiItems += (rawRes.items || []).length;
    dislopCleanItems += (cleanRes.items || []).length;

    if ((cleanRes.items || []).length > 0) {
      revFailures.push({
        id: task.id,
        reason: `dislop_clean still flagged: ${(cleanRes.items || []).map((x) => `${x.kind}:${x.ruleId}`).join(", ")}`,
      });
    }

    const fgClean = verifyDocumentRevision(armTexts.raw_ai, armTexts.dislop_clean);
    if (fgClean.ok) {
      revFactGatePassed++;
    } else {
      revFailures.push({
        id: task.id,
        reason: `Fact Gate failed on dislop_clean: droppedFacts=${JSON.stringify(fgClean.droppedFacts)} regressions=${JSON.stringify(fgClean.regressions)}`,
      });
    }

    const fgNaive = verifyDocumentRevision(armTexts.raw_ai, armTexts.naive_humanizer);
    if (!fgNaive.ok) naiveHumanizerFactFails++;
  }

  // 2. 8 Adversarial Fact Gate Pairs
  let advPassed = 0;
  const advFailures = [];
  for (const p of dataset.factGatePairs) {
    const res = verifyDocumentRevision(p.before, p.after);
    const reasons = [
      ...(res.droppedFacts || []),
      ...(res.regressions || []).map((r) => `${r.id}: ${r.message}`),
    ].join("; ");
    const okMatch = res.ok === p.expectOk;
    const reasonMatch = !p.expectReason || reasons.includes(p.expectReason);
    if (okMatch && reasonMatch) {
      advPassed++;
    } else {
      advFailures.push({ id: p.id, expectedOk: p.expectOk, gotOk: res.ok, reasons });
    }
  }

  // 3. 4 fix --auto Lossless Round-Trips
  let autoFixPassed = 0;
  const autoFixFailures = [];
  for (let i = 0; i < dataset.autoFixRoundTrips.length; i++) {
    const rt = dataset.autoFixRoundTrips[i];
    const fPath = writeSampleFile(tmpDir, { id: rt.id, format: rt.format, content: rt.content, ooxml: rt.ooxml }, i);
    const res = await runDocumentPipeline({
      filePath: fPath,
      config: baseConfig,
      route: null,
      voiceProfile: null,
      cwd: tmpDir,
    });
    const fixOut = await runAutoFixOnDocumentResult(res, { dryRun: false, backup: false });
    const afterText =
      rt.format === "docx" || rt.format === "pptx"
        ? extractTextForOoxml(fPath)
        : fs.readFileSync(fPath, "utf8");

    const errs = [];
    if (!fixOut.modified || fixOut.appliedCount < 1) {
      errs.push(`expected auto-fix to modify file, appliedCount=${fixOut.appliedCount}`);
    }
    for (const bad of rt.mustNotContain || []) {
      if (afterText.includes(bad)) errs.push(`mustNotContain failed: ${JSON.stringify(bad)}`);
    }
    for (const good of rt.mustContain || []) {
      if (!afterText.includes(good)) errs.push(`mustContain failed: ${JSON.stringify(good)}`);
    }
    if (errs.length === 0) autoFixPassed++;
    else autoFixFailures.push({ id: rt.id, errs, afterText });
  }

  return {
    revisionTasks: {
      total: dataset.revisionTasks.length,
      factGatePassed: revFactGatePassed,
      factGatePassRate: Number(((revFactGatePassed / dataset.revisionTasks.length) * 100).toFixed(2)),
      rawAiSlopItems: rawAiItems,
      dislopCleanSlopItems: dislopCleanItems,
      slopClearanceRate: rawAiItems > 0 ? Number((((rawAiItems - dislopCleanItems) / rawAiItems) * 100).toFixed(2)) : 100,
      naiveHumanizerFactFailures: naiveHumanizerFactFails,
      failures: revFailures,
    },
    adversarialPairs: {
      total: dataset.factGatePairs.length,
      passed: advPassed,
      passRate: Number(((advPassed / dataset.factGatePairs.length) * 100).toFixed(2)),
      failures: advFailures,
    },
    autoFixRoundTrips: {
      total: dataset.autoFixRoundTrips.length,
      passed: autoFixPassed,
      passRate: Number(((autoFixPassed / dataset.autoFixRoundTrips.length) * 100).toFixed(2)),
      failures: autoFixFailures,
    },
  };
}

function evaluateGates(results) {
  const gates = [
    {
      name: "Track A1 Defect Clean FPR === 0.0%",
      actual: `${results.multimodal.trackA1.cleanFpr}% (${results.multimodal.trackA1.fp}/${results.multimodal.trackA1.clean})`,
      ok: results.multimodal.trackA1.cleanFpr === 0,
    },
    {
      name: "Track A1 Defect Precision >= 98.0%",
      actual: `${results.multimodal.trackA1.precision}%`,
      ok: results.multimodal.trackA1.precision >= 98,
    },
    {
      name: "Track A1 Defect Recall >= 96.0%",
      actual: `${results.multimodal.trackA1.recall}% (${results.multimodal.trackA1.tp}/${results.multimodal.trackA1.positives})`,
      ok: results.multimodal.trackA1.recall >= 96,
    },
    {
      name: "Track A2 Suggestion Clean FPR === 0.0%",
      actual: `${results.multimodal.trackA2.cleanFpr}% (${results.multimodal.trackA2.fp}/${results.multimodal.trackA2.clean})`,
      ok: results.multimodal.trackA2.cleanFpr === 0,
    },
    {
      name: "Track A2 Suggestion Recall >= 95.0%",
      actual: `${results.multimodal.trackA2.recall}% (${results.multimodal.trackA2.tp}/${results.multimodal.trackA2.positives})`,
      ok: results.multimodal.trackA2.recall >= 95,
    },
    {
      name: "Semantic & Security Invariants === 100.0%",
      actual: `${results.semanticSecurity.passRate}% (${results.semanticSecurity.passed}/${results.semanticSecurity.total})`,
      ok: results.semanticSecurity.passed === results.semanticSecurity.total,
    },
    {
      name: "Revision Tasks Fact Gate === 100.0%",
      actual: `${results.revisionAndFactGate.revisionTasks.factGatePassRate}% (${results.revisionAndFactGate.revisionTasks.factGatePassed}/${results.revisionAndFactGate.revisionTasks.total})`,
      ok: results.revisionAndFactGate.revisionTasks.factGatePassed === results.revisionAndFactGate.revisionTasks.total,
    },
    {
      name: "Revision Tasks Slop Clearance === 100.0%",
      actual: `${results.revisionAndFactGate.revisionTasks.slopClearanceRate}% (${results.revisionAndFactGate.revisionTasks.dislopCleanSlopItems} remaining)`,
      ok: results.revisionAndFactGate.revisionTasks.dislopCleanSlopItems === 0,
    },
    {
      name: "Adversarial Fact Gate Pairs === 100.0%",
      actual: `${results.revisionAndFactGate.adversarialPairs.passRate}% (${results.revisionAndFactGate.adversarialPairs.passed}/${results.revisionAndFactGate.adversarialPairs.total})`,
      ok: results.revisionAndFactGate.adversarialPairs.passed === results.revisionAndFactGate.adversarialPairs.total,
    },
    {
      name: "fix --auto Lossless Round-Trips === 100.0%",
      actual: `${results.revisionAndFactGate.autoFixRoundTrips.passRate}% (${results.revisionAndFactGate.autoFixRoundTrips.passed}/${results.revisionAndFactGate.autoFixRoundTrips.total})`,
      ok: results.revisionAndFactGate.autoFixRoundTrips.passed === results.revisionAndFactGate.autoFixRoundTrips.total,
    },
  ];
  return { gates, passed: gates.every((g) => g.ok) };
}

function renderReportMarkdown(summary) {
  const { results, evaluation, generatedAt, nodeVersion } = summary;
  const lines = [
    "# dislop-bench v3 Report",
    "",
    `Run date: ${generatedAt} | Runtime: Node.js ${nodeVersion} | Kernel: v1.0.0 Micro-Kernel`,
    "",
    "## Summary Gates",
    "",
    "| Gate | Actual | Status |",
    "| :--- | :--- | :--- |",
    ...evaluation.gates.map((g) => `| ${g.name} | ${g.actual} | ${g.ok ? "PASS" : "FAIL"} |`),
    "",
    "## Suite Details",
    "",
    "- **Multimodal Detection (`active-multimodal-v3.json`, " + `${results.multimodal.total}` + ` samples)**: Track A1 Defect Precision ${results.multimodal.trackA1.precision}%, Recall ${results.multimodal.trackA1.recall}%, Clean FPR ${results.multimodal.trackA1.cleanFpr}%; Track A2 Suggestion Recall ${results.multimodal.trackA2.recall}%, Clean FPR ${results.multimodal.trackA2.cleanFpr}%.`,
    `- **Semantic & Security (\`semantic-and-security-v3.json\`, ${results.semanticSecurity.total} cases)**: ${results.semanticSecurity.passed}/${results.semanticSecurity.total} (${results.semanticSecurity.passRate}%) passed prompt escaping, trust clamping, and anti-fabrication Fact Gate verification.`,
    `- **Revision & Fact Gate (\`revision-and-factgate-v3.json\`)**: ${results.revisionAndFactGate.revisionTasks.factGatePassed}/${results.revisionAndFactGate.revisionTasks.total} revision tasks preserved 100% of facts (\`dislop_clean\` cleared ${results.revisionAndFactGate.revisionTasks.rawAiSlopItems} -> ${results.revisionAndFactGate.revisionTasks.dislopCleanSlopItems} findings; \`naive_humanizer\` triggered ${results.revisionAndFactGate.revisionTasks.naiveHumanizerFactFailures} fact-integrity failures); ${results.revisionAndFactGate.adversarialPairs.passed}/${results.revisionAndFactGate.adversarialPairs.total} adversarial Fact Gate pairs passed; ${results.revisionAndFactGate.autoFixRoundTrips.passed}/${results.revisionAndFactGate.autoFixRoundTrips.total} \`fix --auto\` lossless round-trips passed.`,
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.evalPath) {
    const external = JSON.parse(fs.readFileSync(args.evalPath, "utf8"));
    const evaluation = evaluateGates(external.results || external);
    for (const g of evaluation.gates) {
      console.log(`[${g.ok ? "PASS" : "FAIL"}] ${g.name}: ${g.actual}`);
    }
    if (!evaluation.passed) process.exit(1);
    return;
  }

  const multimodalData = JSON.parse(fs.readFileSync(path.join(ROOT, "benchmarks/datasets/active-multimodal-v3.json"), "utf8"));
  const semanticData = JSON.parse(fs.readFileSync(path.join(ROOT, "benchmarks/datasets/semantic-and-security-v3.json"), "utf8"));
  const revisionData = JSON.parse(fs.readFileSync(path.join(ROOT, "benchmarks/datasets/revision-and-factgate-v3.json"), "utf8"));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dislop-bench-v3-"));
  let summary;
  try {
    // Seed clean local link fixture targets inside isolated tmpDir (nonexistent-spec-file-xyz.md stays absent)
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Bench Fixture\n", "utf8");
    fs.writeFileSync(path.join(tmpDir, "report.html"), "<html><body>Report</body></html>\n", "utf8");
    fs.writeFileSync(path.join(tmpDir, "benchmark.html"), "<html><body>Benchmark</body></html>\n", "utf8");

    const multimodal = await runActiveMultimodalSuite(multimodalData, tmpDir);
    const semanticSecurity = await runSemanticAndSecuritySuite(semanticData, tmpDir);
    const revisionAndFactGate = await runRevisionAndFactGateSuite(revisionData, tmpDir);
    const results = { multimodal, semanticSecurity, revisionAndFactGate };
    const evaluation = evaluateGates(results);
    summary = {
      schema: "dislop.bench-report/3",
      generatedAt: new Date().toISOString(),
      nodeVersion: process.version,
      results,
      evaluation,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  for (const g of summary.evaluation.gates) {
    console.log(`[${g.ok ? "PASS" : "FAIL"}] ${g.name}: ${g.actual}`);
  }

  const failureLists = [
    ["A1", summary.results.multimodal.trackA1.failures],
    ["A2", summary.results.multimodal.trackA2.failures],
    ["Semantic/Security", summary.results.semanticSecurity.failures],
    ["Revision", summary.results.revisionAndFactGate.revisionTasks.failures],
    ["AdversarialFG", summary.results.revisionAndFactGate.adversarialPairs.failures],
    ["AutoFixRT", summary.results.revisionAndFactGate.autoFixRoundTrips.failures],
  ];
  for (const [label, list] of failureLists) {
    if (list.length > 0) {
      console.error(`\n${label} failures (${list.length}):`);
      for (const f of list) console.error(`  - ${f.id}: ${JSON.stringify(f)}`);
    }
  }

  if (args.writeReport) {
    const resultsDir = path.join(ROOT, "benchmarks/results");
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(path.join(resultsDir, "latest.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(ROOT, "benchmarks/REPORT.md"), renderReportMarkdown(summary), "utf8");
    console.log("\nUpdated benchmarks/REPORT.md and benchmarks/results/latest.json.");
  }

  if (args.assert && !summary.evaluation.passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
