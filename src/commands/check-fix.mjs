import fs from "node:fs";
import path from "node:path";
import { DislopConfigError, isInteractiveHumanTty, resolveLayeredConfig } from "../kernel/config.mjs";
import { discoverChangedFiles, expandTargetInputs } from "../kernel/file-discovery.mjs";
import { arbitrateExitCode, runDocumentPipeline } from "../kernel/pipeline.mjs";
import { resolveOrExtractVoiceProfile } from "../kernel/voice-profile.mjs";
import { runAutoFixOnDocumentResult } from "../runners/auto-fix.mjs";
import { runInteractiveTtySession } from "../runners/interactive-tty.mjs";
import { renderReports } from "../runners/reporters.mjs";
import { resolveExecutionRoute } from "../runtime/router.mjs";
import { buildCheckOrFixWorklogEntry, recordWorklogEntry } from "../runtime/worklog.mjs";

const VALID_FORMATS = new Set(["text", "diff", "json", "agent", "sarif"]);

async function readStreamBuffer(stream, preloaded = null) {
  if (Buffer.isBuffer(preloaded)) return preloaded;
  if (typeof preloaded === "string") return Buffer.from(preloaded, "utf8");
  if (!stream) return Buffer.alloc(0);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8"));
  }
  return Buffer.concat(chunks);
}

async function mapWithConcurrency(items, concurrency, worker) {
  const limit = Math.max(1, Math.min(concurrency || 1, items.length || 1));
  const results = new Array(items.length);
  let nextIdx = 0;

  async function runWorker() {
    while (nextIdx < items.length) {
      const idx = nextIdx;
      nextIdx += 1;
      results[idx] = await worker(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  return results;
}

/**
 * `dislop check <files/globs...> [options]` — strictly read-only inspection.
 */
export async function runCheckCommand(targets, flags, io = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
    fetchImpl = globalThis.fetch,
    promptFn = null,
  } = io;

  const startedAt = Date.now();
  const format = flags.json ? "json" : flags.format || "text";
  if (!VALID_FORMATS.has(format)) {
    throw new DislopConfigError(
      `Invalid --format '${format}' (expected text, diff, json, agent, or sarif)`,
    );
  }

  const isTty = isInteractiveHumanTty({ stdin, stdout, env });
  const config = resolveLayeredConfig({ cwd, env, cliFlags: flags });

  const hasStdinTarget = Array.isArray(targets) && targets.includes("-");
  if (hasStdinTarget && targets.length > 1) {
    throw new DislopConfigError("Cannot mix '-' (stdin) with additional file paths.");
  }
  if ((flags.changed || flags.since) && targets && targets.length > 0) {
    throw new DislopConfigError("Cannot combine '--changed' / '--since' with explicit file targets.");
  }

  let files = [];
  let stdinBufferContent = null;
  if (hasStdinTarget) {
    stdinBufferContent = await readStreamBuffer(stdin, io.stdinText ?? null);
    const virtualName = flags.stdinFilename || "stdin.md";
    files = [path.resolve(cwd, virtualName)];
  } else if (flags.changed || flags.since) {
    files = discoverChangedFiles({
      cwd,
      since: flags.since || null,
      ignorePatterns: config.ignore,
      projectRoot: config.projectDir || cwd,
    });
  } else {
    files = expandTargetInputs(targets, {
      cwd,
      ignorePatterns: config.ignore,
      projectRoot: config.projectDir || cwd,
    });
  }

  if (files.length === 0) {
    const emptyMsg = flags.changed || flags.since
      ? "No changed deliverable files to check.\n"
      : "No matching deliverable files to check.\n";
    if (format === "json") {
      stdout.write("[]\n");
    } else {
      stdout.write(emptyMsg);
    }
    return 0;
  }

  const route = await resolveExecutionRoute({
    config,
    isTty,
    env,
    stdin,
    stderr,
    fetchImpl,
    promptFn,
  });

  const voiceProfile = config.noLlm ? null : await resolveOrExtractVoiceProfile(config, { route });
  const workerCount = config.concurrency || (route?.execute ? Math.min(4, files.length) : 1);

  const rawResults = await mapWithConcurrency(files, workerCount, (filePath) =>
    runDocumentPipeline({
      filePath,
      bufferContent: hasStdinTarget ? stdinBufferContent : null,
      config,
      route,
      voiceProfile,
      cwd,
    }),
  );
  const results = rawResults.filter((r) => !r.skippedByIgnore);

  if (results.length === 0) {
    stdout.write(format === "json" ? "[]\n" : "No matching deliverable files to check.\n");
    return 0;
  }

  let emittedHint = false;
  for (const res of results) {
    if (res.routeHint && !emittedHint) {
      stderr.write(`${res.routeHint}\n`);
      emittedHint = true;
    }
  }

  const uiLang =
    config.lang && config.lang !== "auto"
      ? config.lang
      : results[0]?.doc?.language || "en";

  const rendered = renderReports(results, format, { lang: uiLang });
  if (rendered) {
    stdout.write(rendered);
  }

  const exitCode = arbitrateExitCode(results, {
    failOn: config.failOn,
    explicitFailOn: config.explicitFailOn,
  });
  recordWorklogEntry(
    buildCheckOrFixWorklogEntry({
      source: "cli",
      command: "check",
      mode: format,
      cwd,
      config,
      route,
      results,
      durationMs: Date.now() - startedAt,
      exitCode,
    }),
    config,
    env,
  );
  return exitCode;
}

/**
 * `dislop fix <files/globs...> [options]`
 * - With `--auto` / `--yes`: non-interactive batch application of `fixSafety === "safe"` items.
 * - Without `--auto`: interactive `git add -p` TTY hunk loop (`y/n/e/p/a/A/s/u/q`).
 */
export async function runFixCommand(targets, flags, io = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
    fetchImpl = globalThis.fetch,
    promptFn = null,
    keyReader = null,
    editorRunner = null,
    clipboardRunner = null,
  } = io;

  const startedAt = Date.now();
  const isAuto = Boolean(flags.auto || flags.yes);
  const isTty = isInteractiveHumanTty({ stdin, stdout, env }) || Boolean(keyReader);

  if (!isAuto && !isTty) {
    throw new DislopConfigError(
      "Interactive 'dislop fix' requires an interactive terminal. Pass '--auto' to apply verified safe fixes in batch/CI/agent mode, or run 'dislop check' for read-only reports.",
    );
  }

  const config = resolveLayeredConfig({ cwd, env, cliFlags: flags });
  if (Array.isArray(targets) && targets.includes("-")) {
    throw new DislopConfigError("'dislop fix' does not modify '-' (stdin). Pass file paths or run 'dislop check - --format diff'.");
  }
  const files =
    flags.changed || flags.since
      ? discoverChangedFiles({
          cwd,
          since: flags.since || null,
          ignorePatterns: config.ignore,
          projectRoot: config.projectDir || cwd,
        })
      : expandTargetInputs(targets, {
          cwd,
          ignorePatterns: config.ignore,
          projectRoot: config.projectDir || cwd,
        });
  if (files.length === 0) {
    stdout.write("No matching deliverable files to fix.\n");
    return 0;
  }
  const route = await resolveExecutionRoute({
    config,
    isTty,
    env,
    stdin,
    stderr,
    fetchImpl,
    promptFn,
  });
  const voiceProfile = config.noLlm ? null : await resolveOrExtractVoiceProfile(config, { route });

  const results = [];
  const decisionsByFile = [];
  let aborted = false;
  let emittedHint = false;

  for (const filePath of files) {
    const docRes = await runDocumentPipeline({
      filePath,
      config,
      route,
      voiceProfile,
      cwd,
    });
    if (docRes.skippedByIgnore) continue;
    if (docRes.routeHint && !emittedHint) {
      stderr.write(`${docRes.routeHint}\n`);
      emittedHint = true;
    }

    if (isAuto) {
      const fixRes = runAutoFixOnDocumentResult(docRes, {
        dryRun: Boolean(flags.dryRun),
        backup: Boolean(flags.backup),
      });
      if (flags.dryRun && fixRes.diff && !flags.json) {
        stdout.write(`${fixRes.diff}\n`);
      } else if (!flags.json && flags.format !== "json") {
        stdout.write(
          `${docRes.report.file}: applied ${fixRes.appliedCount} safe fix(es); remaining defects=${docRes.report.summary.defects.error + docRes.report.summary.defects.warning}, suggestions=${docRes.report.summary.suggestions.strong + docRes.report.summary.suggestions.moderate + docRes.report.summary.suggestions.hint}\n`,
        );
      }
      results.push(docRes);
      decisionsByFile.push({
        decisions: fixRes.decisions || {},
        undoCount: 0,
        aborted: false,
      });
    } else {
      const ttyRes = await runInteractiveTtySession(docRes, {
        stdin,
        stdout,
        env,
        dryRun: Boolean(flags.dryRun),
        backup: Boolean(flags.backup),
        keyReader,
        editorRunner,
        clipboardRunner,
      });
      if (ttyRes.aborted) aborted = true;
      results.push(docRes);
      decisionsByFile.push({
        decisions: ttyRes.decisions || {},
        undoCount: ttyRes.undoCount || 0,
        aborted: Boolean(ttyRes.aborted),
      });
    }
  }

  if (flags.json || flags.format === "json") {
    stdout.write(renderReports(results, "json"));
  }

  const exitCode = arbitrateExitCode(results, {
    failOn: config.failOn,
    explicitFailOn: config.explicitFailOn,
  });
  recordWorklogEntry(
    buildCheckOrFixWorklogEntry({
      source: "cli",
      command: "fix",
      mode: isAuto ? (flags.dryRun ? "auto-dry-run" : "auto") : (flags.dryRun ? "tty-dry-run" : "tty"),
      cwd,
      config,
      route,
      results,
      decisionsByFile,
      durationMs: Date.now() - startedAt,
      exitCode,
      aborted,
    }),
    config,
    env,
  );
  return exitCode;
}
