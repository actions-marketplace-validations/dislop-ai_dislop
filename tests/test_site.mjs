#!/usr/bin/env node
// Deterministic offline verification tests for site/ and scripts/build_site.mjs.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditText, contrastRatio, resolveEffectivePack, verifyRevision } from "../src/core.mjs";
import { PACKS_BY_ID } from "../site/engine/packs-data.mjs";
import { RADAR_DATA } from "../site/radar/radar-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "site");

const INVISIBLE_BIDI_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/;

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function parseHex(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// 1. Verify packs-data.mjs ships zero raw fixtures arrays & all 23 Try rules trigger cleanly
let totalRules = 0;
let tryRulesChecked = 0;
const textMods = new Set(["markdown", "text", "html", "css", "jsx", "svg"]);

for (const [pid, pack] of Object.entries(PACKS_BY_ID)) {
  for (const rule of pack.rules || []) {
    totalRules += 1;
    assert.equal("fixtures" in rule, false, `packs-data.mjs leaked fixtures on ${pid}/${rule.id}`);
    const mods = rule.modalities || [];
    if (rule.exemplar && mods.some((m) => textMods.has(m))) {
      tryRulesChecked += 1;
      let modality = "markdown";
      let ext = "md";
      if (mods.includes("css") && !mods.includes("markdown")) {
        modality = "css";
        ext = "css";
      } else if (mods.includes("svg") && !mods.includes("markdown") && !mods.includes("html")) {
        modality = "svg";
        ext = "svg";
      } else if (mods.includes("html") && !mods.includes("markdown")) {
        modality = "html";
        ext = "html";
      }
      const targetPack =
        pid === "core" ? (modality === "html" || modality === "css" || modality === "svg" ? "deck-and-ui" : "business-brief") : pid;
      const effPack = resolveEffectivePack(targetPack, PACKS_BY_ID);
      let sample = rule.exemplar.bad;
      let res = auditText(sample, { filename: `${rule.id}.${ext}`, modality, pack: effPack });
      if (!res.findings.some((f) => f.ruleId === rule.id) && rule.demo?.bad) {
        sample = rule.demo.bad;
        res = auditText(sample, { filename: `${rule.id}.${ext}`, modality, pack: effPack });
      }
      assert.equal(
        res.findings.some((f) => f.ruleId === rule.id),
        true,
        `Try rule ${rule.id} did not trigger itself in browser workbench sample`
      );
    }
  }
}
assert.equal(totalRules, 29, `Expected 29 total rules, got ${totalRules}`);
assert.equal(tryRulesChecked, 23, `Expected 23 Try rules, got ${tryRulesChecked}`);

// 2. Verify all 5 built-in specimens in site/app.js: bad hits, good = 0 findings & verify ACCEPTED, trap = REJECTED
const appSource = fs.readFileSync(path.join(SITE_DIR, "app.js"), "utf8");
const specimenBlockMatch = appSource.match(/const localPathDemo =[\s\S]*?const SPECIMENS = \[[\s\S]*?\n\];/);
assert.ok(specimenBlockMatch, "Could not locate SPECIMENS in site/app.js");
const specimens = new Function(`${specimenBlockMatch[0]}\nreturn SPECIMENS;`)();
assert.equal(specimens.length, 5, "Expected 5 built-in specimens");

for (const sp of specimens) {
  const pack = resolveEffectivePack(sp.pack, PACKS_BY_ID);
  const badRes = auditText(sp.bad, { filename: sp.filename, modality: sp.modality, pack });
  const goodRes = auditText(sp.good, { filename: sp.filename, modality: sp.modality, pack });
  const vTrap = verifyRevision(sp.bad, sp.trap, { filename: sp.filename, modality: sp.modality, pack });
  assert.equal(goodRes.findings.length, 0, `Specimen ${sp.id} good revision had ${goodRes.findings.length} findings`);
  assert.equal(vTrap.ok, false, `Specimen ${sp.id} trap was unexpectedly accepted by verifyRevision`);
  if (sp.id === "clean-nearmiss") {
    assert.equal(badRes.findings.length, 0, "Specimen 05 clean-nearmiss should have 0 findings");
  } else {
    assert.ok(badRes.findings.length > 0, `Specimen ${sp.id} bad draft should have >= 1 finding`);
    const vGood = verifyRevision(sp.bad, sp.good, { filename: sp.filename, modality: sp.modality, pack });
    assert.equal(vGood.ok, true, `Specimen ${sp.id} good revision rejected by verifyRevision: ${vGood.reasons.join("; ")}`);
  }
}

// 3. Verify catalog.json hashes, byte lengths, token estimates, and zero hidden chars/comments
const catalogStr = fs.readFileSync(path.join(SITE_DIR, "catalog.json"), "utf8");
const catalog = JSON.parse(catalogStr);
assert.equal(catalog.schema, "dislop.catalog/1");
assert.ok(catalog.resources.length >= 50, "Expected >= 50 catalog resources");

for (const res of catalog.resources) {
  const diskPath = path.join(SITE_DIR, res.path.replace(/^\//, ""));
  assert.ok(fs.existsSync(diskPath), `Missing catalog resource on disk: ${res.path}`);
  const body = fs.readFileSync(diskPath, "utf8");
  assert.equal(Buffer.byteLength(body, "utf8"), res.bytes, `Byte mismatch for ${res.path}`);
  assert.equal(sha256(body), res.sha256, `SHA-256 mismatch for ${res.path}`);
  assert.equal(INVISIBLE_BIDI_RE.test(body), false, `Invisible/bidi char found in ${res.path}`);
  assert.equal(body.includes("<!--"), false, `HTML comment found in agent resource ${res.path}`);
}

// 4. Verify Radar URLs are strictly HTTPS and free of bidi/invisible control chars
assert.equal(RADAR_DATA.entries.length, 87, "Expected 87 radar entries");
for (const entry of RADAR_DATA.entries) {
  assert.match(entry.url, /^https:\/\//i, `Non-HTTPS URL in radar entry ${entry.id}: ${entry.url}`);
  if (entry.homepage) {
    assert.match(entry.homepage, /^https:\/\//i, `Non-HTTPS homepage in radar entry ${entry.id}: ${entry.homepage}`);
  }
  assert.equal(INVISIBLE_BIDI_RE.test(JSON.stringify(entry)), false, `Invisible/bidi char in radar entry ${entry.id}`);
}

// 5. Verify WCAG 2.2 AA contrast of CSS text & control-border tokens in site/styles.css
const css = fs.readFileSync(path.join(SITE_DIR, "styles.css"), "utf8");
const lightTokens = {
  sheet: "#FFFFFF",
  raised: "#ECEEE9",
  inset: "#F1F3F0",
  ink: "#14171A",
  ink2: "#474C55",
  ink3: "#5E646E",
  err: "#B42318",
  warn: "#1B52B0",
  stet: "#1E6B47",
  ctrl: "#767C85",
};
const darkTokens = {
  sheet: "#15181C",
  raised: "#1D2127",
  inset: "#0A0C0E",
  ink: "#ECEEF0",
  ink2: "#A6ACB5",
  ink3: "#8C939E",
  err: "#FF7A6B",
  warn: "#85B4FF",
  stet: "#6CD49B",
  ctrl: "#6F7784",
};
assert.ok(css.includes(`--control-border: ${lightTokens.ctrl};`), "Missing light --control-border token");
assert.ok(css.includes(`--control-border: ${darkTokens.ctrl};`), "Missing dark --control-border token");

for (const [mode, t] of [
  ["light", lightTokens],
  ["dark", darkTokens],
]) {
  for (const fg of [t.ink, t.ink2, t.ink3, t.err, t.warn, t.stet]) {
    assert.ok(
      contrastRatio(parseHex(fg), parseHex(t.sheet)) >= 4.5,
      `${mode} text token ${fg} on sheet failed 4.5:1`
    );
  }
  for (const bg of [t.sheet, t.raised, t.inset]) {
    assert.ok(
      contrastRatio(parseHex(t.ctrl), parseHex(bg)) >= 3.0,
      `${mode} --control-border ${t.ctrl} on ${bg} failed 3.0:1 WCAG non-text contrast`
    );
  }
}

// 6. Verify OG card assets exist in site/assets/ and HTML references them cleanly
assert.ok(fs.existsSync(path.join(SITE_DIR, "assets", "og-card.png")), "Missing site/assets/og-card.png");
assert.ok(fs.existsSync(path.join(SITE_DIR, "assets", "og-card.svg")), "Missing site/assets/og-card.svg");
const indexHtml = fs.readFileSync(path.join(SITE_DIR, "index.html"), "utf8");
assert.ok(indexHtml.includes('property="og:image" content="https://dislop.com/assets/og-card.png"'));
assert.equal(indexHtml.includes('data-theme="light"'), false, "index.html should not force data-theme=light before hydration");
assert.equal(/^[ \t]+$/m.test(indexHtml), false, "index.html contains whitespace-only lines");

console.log(
  `dislop site-test: ok (${totalRules} rules, ${tryRulesChecked} Try demos, ${specimens.length} specimens, ` +
    `${catalog.resources.length} catalog resources, ${RADAR_DATA.entries.length} radar entries, WCAG AA & 3:1 control contrast passed)`
);
