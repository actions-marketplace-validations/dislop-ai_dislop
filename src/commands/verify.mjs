import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DislopConfigError, resolveLayeredConfig } from "../kernel/config.mjs";
import { detectFormatFromPath, parseDocumentFile, parseDocumentText } from "../kernel/document-model.mjs";
import { verifyDocumentRevision } from "../kernel/fact-gate.mjs";
import { buildVerifyWorklogEntry, recordWorklogEntry } from "../runtime/worklog.mjs";

function extractComparableText(filePath) {
  const doc = parseDocumentFile(filePath);
  if (doc.segments.length > 0) {
    return doc.segments.map((s) => s.text).join("\n");
  }
  const ext = path.extname(filePath).toLowerCase();
  if ([".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
    throw new DislopConfigError(
      `Unable to extract inspectable text segments from binary file '${filePath}'. Cannot verify unextractable binary artifacts.`,
    );
  }
  return fs.readFileSync(filePath, "utf8");
}

function extractComparableTextFromBuffer(buf, targetPath) {
  const fmt = detectFormatFromPath(targetPath);
  if (fmt === "docx" || fmt === "pptx" || fmt === "pdf") {
    const tmpFile = path.join(
      os.tmpdir(),
      `dislop-verify-${process.pid}-${crypto.randomBytes(4).toString("hex")}.${fmt}`,
    );
    fs.writeFileSync(tmpFile, buf);
    try {
      return extractComparableText(tmpFile);
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  }
  const text = buf.toString("utf8");
  if (fmt) {
    const doc = parseDocumentText(text, targetPath, fmt);
    if (doc.segments.length > 0) {
      return doc.segments.map((s) => s.text).join("\n");
    }
  }
  return text;
}

/**
 * `dislop verify <beforeFile> <afterFile> [--json]`
 * or `dislop verify --git [ref] <file> [--json]`
 */
export async function runVerifyCommand(positionals, flags, io = {}) {
  const { cwd = process.cwd(), env = process.env, stdout = process.stdout } = io;
  const startedAt = Date.now();

  let beforeText = "";
  let afterText = "";
  let label = "";

  if (flags.git !== undefined && flags.git !== false) {
    const gitRef = typeof flags.git === "string" && flags.git.trim() ? flags.git.trim() : "HEAD";
    const targetArg = positionals[0];
    if (!targetArg) {
      throw new DislopConfigError(
        "Usage: dislop verify --git [ref] <file> (missing target file)",
      );
    }
    const resolvedTarget = path.resolve(cwd, targetArg);
    if (!fs.existsSync(resolvedTarget)) {
      throw new DislopConfigError(`Target file not found: '${targetArg}'`);
    }
    const absTarget = fs.realpathSync(resolvedTarget);

    let repoRoot;
    try {
      repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: path.dirname(absTarget),
        encoding: "utf8",
      }).trim();
    } catch (err) {
      throw new DislopConfigError(`Unable to locate git repository for --git verify: ${err.message}`);
    }

    const relGitPath = path.relative(repoRoot, absTarget).replace(/\\/g, "/");
    let beforeBuf;
    try {
      beforeBuf = execFileSync("git", ["show", `${gitRef}:${relGitPath}`], {
        cwd: repoRoot,
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch (err) {
      throw new DislopConfigError(
        `Could not read '${relGitPath}' at git ref '${gitRef}': ${err.message}`,
      );
    }
    beforeText = extractComparableTextFromBuffer(beforeBuf, absTarget);
    afterText = extractComparableText(absTarget);
    label = `${gitRef}:${relGitPath} -> ${targetArg}`;
  } else {
    if (positionals.length < 2) {
      throw new DislopConfigError(
        "Usage: dislop verify <before-file> <after-file> (or dislop verify --git [ref] <file>)",
      );
    }
    const beforePath = path.resolve(cwd, positionals[0]);
    const afterPath = path.resolve(cwd, positionals[1]);
    if (!fs.existsSync(beforePath)) {
      throw new DislopConfigError(`Before file not found: '${positionals[0]}'`);
    }
    if (!fs.existsSync(afterPath)) {
      throw new DislopConfigError(`After file not found: '${positionals[1]}'`);
    }
    beforeText = extractComparableText(beforePath);
    afterText = extractComparableText(afterPath);
    label = `${positionals[0]} -> ${positionals[1]}`;
  }

  const verification = verifyDocumentRevision(beforeText, afterText);
  const payload = {
    schema: "dislop.verify/1",
    target: label,
    ...verification,
  };

  if (flags.json || flags.format === "json") {
    stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else if (verification.ok) {
    stdout.write(
      `PASS ${label}: anchored tokens & qualifiers preserved; 0 detected slop/polarity regressions.\n`,
    );
  } else {
    stdout.write(`FAIL ${label}:\n`);
    for (const reason of verification.droppedFacts) {
      stdout.write(`  - Fact Gate: ${reason}\n`);
    }
    for (const reg of verification.regressions) {
      stdout.write(`  - Regression (${reg.id}): ${reg.message}\n`);
    }
  }

  const exitCode = verification.ok ? 0 : 1;
  try {
    const config = resolveLayeredConfig({ cwd, env, cliFlags: flags });
    recordWorklogEntry(
      buildVerifyWorklogEntry({
        source: "cli",
        command: "verify",
        mode: flags.git !== undefined && flags.git !== false ? "verify-git" : "verify-files",
        cwd,
        config,
        targetLabel: label,
        verification,
        durationMs: Date.now() - startedAt,
        exitCode,
      }),
      config,
      env,
    );
  } catch {
    // Worklog recording must never break verify
  }

  return exitCode;
}
