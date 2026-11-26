import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { parseDocumentFile, parseDocumentText } from "../src/kernel/document-model.mjs";
import { buildZipArchive } from "../src/kernel/ooxml-binary.mjs";
import {
  applyPatchesToOoxmlBuffer,
  applyPatchesToText,
  patchDocumentOnDisk,
} from "../src/kernel/patcher.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dislop-doc-test-"));
}

test("Markdown DocumentModel masks frontmatter & code blocks, keeps abbreviations/links intact, and indexes [P{i}-S{j}]", () => {
  const md = [
    "---",
    "title: Sample Post",
    "draft: [TODO]",
    "---",
    "",
    "# Release Notes",
    "",
    "Queue latency dropped from 14.5ms to 3.2ms (e.g. on Node v20.11). See [guide](https://example.com/a.b) for `cfg.timeout`.",
    "",
    "```js",
    "// [TODO] inside fenced code must be ignored",
    "const x = 1;",
    "```",
    "",
    "- First bullet sentence. Second sentence in bullet.",
  ].join("\n");

  const doc = parseDocumentText(md, "notes.md", "md");
  assert.equal(doc.format, "md");
  assert.equal(doc.language, "en");
  assert.equal(doc.artifacts.codeBlocks.length, 1);
  assert.equal(doc.artifacts.links.length, 1);
  assert.equal(doc.artifacts.links[0].url, "https://example.com/a.b");

  // Heading is P1-S1, body paragraph has 2 sentences (P2-S1, P2-S2), bullet has 2 sentences (P3-S1, P3-S2)
  assert.equal(doc.segments[0].id, "P1-S1");
  assert.equal(doc.segments[0].text, "Release Notes");
  assert.equal(doc.segments[1].id, "P2-S1");
  assert.match(doc.segments[1].text, /14\.5ms to 3\.2ms \(e\.g\. on Node v20\.11\)\./);
  assert.equal(doc.segments[2].id, "P2-S2");
  assert.equal(doc.segments[3].id, "P3-S1");
  assert.equal(doc.segments[4].id, "P3-S2");
});

test("patcher.mjs deletes filler sentences cleanly without double spaces or triple blank lines and preserves CRLF", () => {
  const src = [
    "First paragraph stays intact.",
    "",
    "In today's fast-paced world, change is constant.",
    "",
    "Keep the opening claim. Delete this middle filler. Keep the final metric of 42ms.",
  ].join("\r\n");

  const doc = parseDocumentText(src, "crlf.md", "md");
  const patched = applyPatchesToText(src, doc, [
    { targetId: "P2-S1", replacement: "" },
    { targetId: "P3-S2", replacement: "" },
  ]);

  assert.ok(patched.includes("\r\n"), "CRLF line endings should be preserved");
  assert.ok(!patched.includes("\r\n\r\n\r\n"), "Should collapse triple blank lines after full paragraph deletion");
  assert.ok(
    patched.includes("Keep the opening claim. Keep the final metric of 42ms."),
    `Unexpected spacing in: ${JSON.stringify(patched)}`,
  );
});

test("DOCX & PPTX OOXML parsing and lossless ZIP round-trip patching preserve formatting and binary entries", () => {
  const tmpDir = makeTempDir();
  try {
    const fakeMediaBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    const docxPath = path.join(tmpDir, "sample.docx");
    const docxBuf = buildZipArchive({
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`,
      "word/document.xml": [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`,
        `<w:body>`,
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Certainly! Here is the draft. </w:t></w:r><w:r><w:t> Export finished in 12 minutes with **raw bold**.</w:t></w:r></w:p>`,
        `</w:body></w:document>`,
      ].join(""),
      "word/media/image1.png": fakeMediaBytes,
    });
    fs.writeFileSync(docxPath, docxBuf);

    const doc = parseDocumentFile(docxPath);
    assert.equal(doc.format, "docx");
    assert.equal(doc.segments.length, 2);
    assert.equal(doc.segments[0].id, "B1-S1");
    assert.equal(doc.segments[0].text, "Certainly! Here is the draft.");
    assert.equal(doc.artifacts.rawFormattingLeaks.length, 1);
    assert.equal(doc.artifacts.rawFormattingLeaks[0].pattern, "bold-asterisks");

    // Delete B1-S1 and unwrap **raw bold** in B1-S2
    const patchedBuf = applyPatchesToOoxmlBuffer(docxBuf, doc, [
      { targetId: "B1-S1", replacement: "" },
      { targetId: "B1-S2", replacement: "Export finished in 12 minutes with raw bold." },
    ]);
    fs.writeFileSync(docxPath, patchedBuf);

    const reparsed = parseDocumentFile(docxPath);
    assert.equal(reparsed.segments.length, 1);
    assert.equal(reparsed.segments[0].text, "Export finished in 12 minutes with raw bold.");
    assert.equal(reparsed.artifacts.rawFormattingLeaks.length, 0);

    // PPTX slide signals test
    const pptxPath = path.join(tmpDir, "deck.pptx");
    const pptxBuf = buildZipArchive({
      "ppt/slides/slide1.xml": [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`,
        `<p:txBody><a:bodyPr><a:normAutofit fontScale="65000"/></a:bodyPr>`,
        `<a:p><a:r><a:t>Quarterly Latency Summary</a:t></a:r></a:p>`,
        `</p:txBody></p:sld>`,
      ].join(""),
    });
    fs.writeFileSync(pptxPath, pptxBuf);

    const pptxDoc = parseDocumentFile(pptxPath);
    assert.equal(pptxDoc.format, "pptx");
    assert.equal(pptxDoc.artifacts.deckSignals.slideCount, 1);
    assert.equal(pptxDoc.artifacts.deckSignals.slides[0].autofitFontScale, 65);

    // Atomic write with --backup
    const mdFile = path.join(tmpDir, "atomic.md");
    fs.writeFileSync(mdFile, "Certainly! Here is the note.\n\nActual release content.\n", "utf8");
    const mdDoc = parseDocumentFile(mdFile);
    const patchRes = patchDocumentOnDisk(
      mdDoc,
      [{ targetId: "P1-S1", replacement: "" }],
      { backup: true },
    );
    assert.equal(patchRes.modified, true);
    assert.ok(fs.existsSync(`${mdFile}.bak`));
    assert.equal(fs.readFileSync(mdFile, "utf8").trim(), "Actual release content.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("Markdown suppression comments, blockquotes, table cells, and autolink unwrapping work accurately", () => {
  const md = [
    "<!-- dislop-ignore-next-line -->",
    "Certainly! Here is an ignored template line.",
    "",
    "<!-- dislop-quote-start -->",
    "In today's fast-paced world, this quoted passage is preserved verbatim.",
    "<!-- dislop-quote-end -->",
    "",
    "> Quoted assistant remark that stays muted.",
    "",
    "| Service | p95 Latency |",
    "| --- | --- |",
    "| Checkout API | 18ms across 4 nodes |",
    "",
    "Docs live at [guide](<./README.md>) and <https://example.com/spec>.",
  ].join("\n");

  const doc = parseDocumentText(md, "notes.md", "md");
  const joined = doc.segments.map((s) => s.text).join("\n");
  assert.ok(!joined.includes("Certainly! Here is an ignored"));
  assert.ok(!joined.includes("fast-paced world"));
  assert.ok(!joined.includes("Quoted assistant remark"));

  const tableCells = doc.segments.filter((s) => s.blockKind === "table-cell");
  assert.ok(tableCells.length >= 4);
  assert.ok(doc.artifacts.links.some((l) => l.url === "./README.md"));
  assert.ok(joined.includes("<https://example.com/spec>"));
});

test("HTML/JSX nested prose extraction, masking, avatar exemption, PPTX hidden slides, and compressed CJK/mono PDF parsing", () => {
  const html = [
    "<html><body>",
    "<script>const debug='In today\\'s fast-paced world';</script>",
    "<div data-dislop-ignore=\"true\"><p>Happy to help! Ignored block.</p></div>",
    "<section><p>Measured <strong>18ms</strong> via <code>--pool-mode=transaction</code>.</p></section>",
    "<span class=\"w-8 h-8 rounded-full bg-slate-200\">AL</span>",
    "<div class=\"backdrop-blur-lg p-4\">A</div>",
    "<div class=\"backdrop-blur-md p-4\">B</div>",
    "<div class=\"backdrop-blur-sm p-4\">C</div>",
    "</body></html>",
  ].join("\n");

  const htmlDoc = parseDocumentText(html, "card.html", "html");
  const htmlText = htmlDoc.segments.map((s) => s.text).join("\n");
  assert.ok(!htmlText.includes("fast-paced world"));
  assert.ok(!htmlText.includes("Happy to help"));
  assert.ok(htmlText.includes("Measured 18ms via `--pool-mode=transaction`."));
  assert.equal(htmlDoc.artifacts.uiSignals.backdropBlurCount, 3);
  assert.equal(htmlDoc.artifacts.uiSignals.pillBadges.length, 0);

  const tmpDir = makeTempDir();
  try {
    // Hidden PPTX slide (show="0") is skipped
    const pptxPath = path.join(tmpDir, "deck.pptx");
    fs.writeFileSync(
      pptxPath,
      buildZipArchive({
        "ppt/presentation.xml":
          "<p:presentation xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><p:sldIdLst><p:sldId id=\"256\" r:id=\"rId1\"/><p:sldId id=\"257\" r:id=\"rId2\"/></p:sldIdLst></p:presentation>",
        "ppt/_rels/presentation.xml.rels":
          "<Relationships><Relationship Id=\"rId1\" Target=\"slides/slide1.xml\"/><Relationship Id=\"rId2\" Target=\"slides/slide2.xml\"/></Relationships>",
        "ppt/slides/slide1.xml":
          "<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Visible slide latency 18ms.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
        "ppt/slides/slide2.xml":
          "<p:sld show=\"0\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>**Hidden draft**: ignored leak.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
      }),
    );
    const pptxDoc = parseDocumentFile(pptxPath);
    const pptxText = pptxDoc.segments.map((s) => s.text).join("\n");
    assert.ok(pptxText.includes("Visible slide latency 18ms."));
    assert.ok(!pptxText.includes("Hidden draft"));

    // Compressed FlateDecode PDF with /ToUnicode CMap (CJK UTF-16BE) and /Courier monospace stream
    const pdfPath = path.join(tmpDir, "sample.pdf");
    const cjkChars = Array.from("\u5ef6\u8fdf18ms");
    const cmapEntries = cjkChars
      .map((ch, idx) => `<000${idx + 1}> <${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}>`)
      .join("\n");
    const cmapStream = zlib.deflateSync(
      Buffer.from(
        `/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n1 begincodespacerange\n<0001> <FFFF>\nendcodespacerange\n${cjkChars.length} beginbfchar\n${cmapEntries}\nendbfchar\nendcmap end end`,
        "utf8",
      ),
    );
    const pageStream = zlib.deflateSync(
      Buffer.from(
        `BT\n/F1 14 Tf\n1 0 0 1 54 480 Tm\n<${cjkChars.map((_, idx) => `000${idx + 1}`).join("")}> Tj\n/F2 10 Tf\n1 0 0 1 54 450 Tm\n(**mono_literal**) Tj\nET`,
        "latin1",
      ),
    );
    const objs = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 7 0 R >>",
      "<< /Type /Font /Subtype /Type0 /BaseFont /PingFangSC-Regular /Encoding /Identity-H /ToUnicode 5 0 R >>",
      { dict: `<< /Filter /FlateDecode /Length ${cmapStream.length} >>`, stream: cmapStream },
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
      { dict: `<< /Filter /FlateDecode /Length ${pageStream.length} >>`, stream: pageStream },
    ];
    const parts = [Buffer.from("%PDF-1.4\n", "ascii")];
    const offsets = [0];
    let cur = parts[0].length;
    for (let i = 0; i < objs.length; i++) {
      offsets.push(cur);
      const hdr = Buffer.from(`${i + 1} 0 obj\n`, "ascii");
      const o = objs[i];
      const body =
        typeof o === "string"
          ? Buffer.from(`${o}\nendobj\n`, "ascii")
          : Buffer.concat([Buffer.from(`${o.dict}\nstream\n`, "ascii"), o.stream, Buffer.from("\nendstream\nendobj\n", "ascii")]);
      parts.push(hdr, body);
      cur += hdr.length + body.length;
    }
    const xrefPos = cur;
    const xref = [
      `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`,
      ...offsets.slice(1).map((off) => `${String(off).padStart(10, "0")} 00000 n \n`),
      `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`,
    ].join("");
    parts.push(Buffer.from(xref, "ascii"));
    fs.writeFileSync(pdfPath, Buffer.concat(parts));

    const pdfDoc = parseDocumentFile(pdfPath);
    const pdfText = pdfDoc.segments.map((s) => s.text).join("\n");
    assert.ok(pdfText.includes("\u5ef6\u8fdf18ms"));
    assert.ok(pdfText.includes("**mono_literal**"));
    assert.equal(pdfDoc.artifacts.rawFormattingLeaks.length, 0);
    assert.equal(pdfDoc.modality, "presentation");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
