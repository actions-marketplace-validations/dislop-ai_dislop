import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runCli } from "../src/cli-main.mjs";
import { resolveLayeredConfig } from "../src/kernel/config.mjs";
import { handleMcpJsonRpcRequest } from "../src/mcp/stdio-server.mjs";
import {
  buildReflectionReport,
  clearWorklogEntries,
  pruneExpiredWorklogs,
  readWorklogEntries,
  redactText,
  scrubSecrets,
} from "../src/runtime/worklog.mjs";

function makeTempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dislop-worklog-test-"));
  const cfgDir = path.join(root, ".cfg");
  const wlDir = path.join(root, ".wl");
  fs.mkdirSync(cfgDir, { recursive: true });
  return { root, cfgDir, wlDir };
}

function makeIo({
  cwd,
  cfgDir,
  extraEnv = {},
  isTty = false,
  keys = [],
  editorRunner = null,
  clipboardRunner = null,
  fetchImpl = null,
} = {}) {
  let out = "";
  let err = "";
  let keyIdx = 0;

  return {
    cwd,
    env: {
      DISLOP_CONFIG_DIR: cfgDir,
      DISLOP_SKIP_OLLAMA_PULL: "1",
      ...(isTty ? { DISLOP_FORCE_TTY: "1" } : { DISLOP_FORCE_NON_TTY: "1" }),
      ...extraEnv,
    },
    stdin: { isTTY: isTty },
    stdout: {
      isTTY: isTty,
      write(s) {
        out += String(s);
      },
    },
    stderr: {
      write(s) {
        err += String(s);
      },
    },
    keyReader:
      keys.length > 0
        ? {
            async nextKey() {
              return keys[keyIdx++] ?? "q";
            },
            dispose() {},
          }
        : null,
    editorRunner,
    clipboardRunner,
    fetchImpl,
    getStdout: () => out,
    getStderr: () => err,
  };
}

test("Worklog is off by default, enforces config trust boundary, and hard-disables in CI", async () => {
  const { root, cfgDir, wlDir } = makeTempWorkspace();
  try {
    const sample = path.join(root, "draft.md");
    fs.writeFileSync(sample, "In today's fast-paced digital world, change happens.\n", "utf8");

    // 1. Off by default -> zero files written
    const ioDefault = makeIo({ cwd: root, cfgDir });
    assert.equal(await runCli(["check", "draft.md", "--no-llm"], ioDefault), 0);
    assert.equal(fs.existsSync(path.join(cfgDir, "worklog")), false);

    // 2. Committed .dislop.json MUST NOT enable worklog or redirect dir
    const evilDir = path.join(root, "evil-wl");
    fs.writeFileSync(
      path.join(root, ".dislop.json"),
      JSON.stringify({
        worklog: {
          enabled: true,
          privacy: "local-full",
          dir: evilDir,
        },
      }),
      "utf8",
    );
    assert.throws(
      () =>
        resolveLayeredConfig({
          cwd: root,
          env: { DISLOP_CONFIG_DIR: cfgDir },
        }),
      /not permitted in shared project/,
    );

    const ioUntrusted = makeIo({ cwd: root, cfgDir });
    assert.equal(await runCli(["check", "draft.md", "--no-llm"], ioUntrusted), 2);
    assert.equal(fs.existsSync(evilDir), false);
    assert.equal(fs.existsSync(path.join(cfgDir, "worklog")), false);
    fs.unlinkSync(path.join(root, ".dislop.json"));

    // 3. Trusted .dislop.local.json CAN enable worklog
    fs.writeFileSync(
      path.join(root, ".dislop.local.json"),
      JSON.stringify({
        worklog: {
          enabled: true,
          privacy: "metadata",
          dir: wlDir,
          retentionDays: 14,
        },
      }),
      "utf8",
    );
    const trustedCfg = resolveLayeredConfig({
      cwd: root,
      env: { DISLOP_CONFIG_DIR: cfgDir },
    });
    assert.equal(trustedCfg.worklog.enabled, true);
    assert.equal(trustedCfg.worklog.dir, wlDir);
    assert.equal(trustedCfg.worklog.retentionDays, 14);

    // 4. CI environment hard-disables recording even with DISLOP_WORKLOG=1
    const ioCi = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { CI: "true", DISLOP_WORKLOG: "1", DISLOP_WORKLOG_DIR: wlDir },
    });
    assert.equal(await runCli(["check", "draft.md", "--no-llm"], ioCi), 0);
    assert.equal(fs.existsSync(wlDir), false);

    const ioGha = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { GITHUB_ACTIONS: "true", DISLOP_WORKLOG: "1", DISLOP_WORKLOG_DIR: wlDir },
    });
    assert.equal(await runCli(["check", "draft.md", "--no-llm"], ioGha), 0);
    assert.equal(fs.existsSync(wlDir), false);

    // 5. doctor --json reflects CI suppression and active local state accurately
    const ioDocCi = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { CI: "true", DISLOP_WORKLOG: "1", DISLOP_WORKLOG_DIR: wlDir },
    });
    assert.equal(await runCli(["doctor", "--json"], ioDocCi), 0);
    const docCi = JSON.parse(ioDocCi.getStdout());
    assert.equal(docCi.worklog.enabled, true);
    assert.equal(docCi.worklog.ciDisabled, true);
    assert.equal(docCi.worklog.active, false);

    const ioDocLocal = makeIo({ cwd: root, cfgDir });
    assert.equal(await runCli(["doctor", "--json"], ioDocLocal), 0);
    const docLocal = JSON.parse(ioDocLocal.getStdout());
    assert.equal(docLocal.worklog.active, true);
    assert.equal(docLocal.worklog.privacy, "metadata");
    assert.equal(docLocal.worklog.dir, wlDir);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Worklog privacy tiers scrub secrets, emails, URLs, and home paths and enforce 0700/0600 permissions", async () => {
  const { root, cfgDir, wlDir } = makeTempWorkspace();
  try {
    const secretFile = path.join(root, "confidential-client-memo.md");
    const secretToken = "sk-proj-testSecret1234567890abcd";
    const dslpToken = "dslp_super_secret_test_token_99";
    const ghToken = "ghp_testAbCdEfGhIjKlMnOpQrStUvWxYz123456";
    const email = "alice.private@example.com";
    const secretUrl = "https://user:pass123@internal.corp.example/ops?api_key=xyz987&id=1";
    const homeExample = "/Users/secretuser/projects/alpha/notes.md";
    const uniqueSentence = `It is worth noting that ${email} sent ${secretToken} and ${dslpToken} and ${ghToken} to ${secretUrl} from ${homeExample}.`;

    fs.writeFileSync(secretFile, `${uniqueSentence}\n`, "utf8");

    // Unit-level scrubber checks
    const scrubbed = scrubSecrets(uniqueSentence);
    assert.equal(scrubbed.includes(secretToken), false);
    assert.equal(scrubbed.includes(dslpToken), false);
    assert.equal(scrubbed.includes(ghToken), false);
    assert.equal(scrubbed.includes("pass123"), false);
    assert.equal(scrubbed.includes("xyz987"), false);

    const redacted = redactText(uniqueSentence, 160);
    assert.equal(redacted.includes(email), false);
    assert.equal(redacted.includes("/Users/secretuser"), false);
    assert.equal(redacted.includes("internal.corp.example"), false);

    // 1. Metadata mode: zero quote text, zero filenames, zero home paths
    const metaDir = path.join(wlDir, "metadata");
    const ioMeta = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { DISLOP_WORKLOG: "metadata", DISLOP_WORKLOG_DIR: metaDir },
    });
    assert.equal(await runCli(["check", "confidential-client-memo.md", "--no-llm"], ioMeta), 0);

    const metaFiles = fs.readdirSync(metaDir).filter((f) => f.endsWith(".jsonl"));
    assert.equal(metaFiles.length, 1);
    const metaRaw = fs.readFileSync(path.join(metaDir, metaFiles[0]), "utf8");
    assert.equal(metaRaw.includes("confidential-client-memo"), false);
    assert.equal(metaRaw.includes("worth noting"), false);
    assert.equal(metaRaw.includes(secretToken), false);
    assert.equal(metaRaw.includes(email), false);
    assert.equal(metaRaw.includes(root), false);
    assert.equal(metaRaw.includes("/Users/"), false);

    if (process.platform !== "win32") {
      const dirMode = fs.statSync(metaDir).mode & 0o777;
      const fileMode = fs.statSync(path.join(metaDir, metaFiles[0])).mode & 0o777;
      assert.equal(dirMode, 0o700);
      assert.equal(fileMode, 0o600);
    }

    // 2. Redacted mode: masks secrets/emails/URLs/home paths and keeps external paths hashed
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "dislop-outside-"));
    try {
      const outsideFile = path.join(outsideDir, "outside-secret.md");
      fs.writeFileSync(outsideFile, `${uniqueSentence}\n`, "utf8");

      const redDir = path.join(wlDir, "redacted");
      const ioRed = makeIo({
        cwd: root,
        cfgDir,
        extraEnv: { DISLOP_WORKLOG: "redacted", DISLOP_WORKLOG_DIR: redDir },
      });
      assert.equal(await runCli(["check", outsideFile, "--no-llm"], ioRed), 0);

      const redEntries = readWorklogEntries(redDir);
      assert.equal(redEntries.length, 1);
      assert.match(redEntries[0].files[0].fileRef, /^<external>\/[a-f0-9]{12}\.md$/);
      const preview = redEntries[0].files[0].findings[0].quotePreview;
      assert.ok(preview && preview.length <= 160);
      assert.equal(preview.includes(secretToken), false);
      assert.equal(preview.includes(email), false);
      assert.equal(preview.includes("internal.corp.example"), false);
      assert.equal(preview.includes("/Users/secretuser"), false);
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }

    // 3. Local-full mode: keeps quote context while STILL scrubbing secrets & home paths
    const fullDir = path.join(wlDir, "local-full");
    const ioFull = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { DISLOP_WORKLOG: "local-full", DISLOP_WORKLOG_DIR: fullDir },
    });
    assert.equal(await runCli(["check", "confidential-client-memo.md", "--no-llm"], ioFull), 0);

    const fullEntries = readWorklogEntries(fullDir);
    assert.equal(fullEntries.length, 1);
    assert.equal(fullEntries[0].files[0].fileRef, "confidential-client-memo.md");
    const proseFinding = fullEntries[0].files[0].findings.find((f) =>
      String(f.originalQuote || "").includes("worth noting"),
    );
    const fullQuote = proseFinding?.originalQuote || "";
    assert.ok(fullQuote.includes("worth noting"));
    assert.equal(fullQuote.includes(secretToken), false);
    assert.equal(fullQuote.includes(dslpToken), false);
    assert.equal(fullQuote.includes(ghToken), false);
    assert.equal(fullQuote.includes("pass123"), false);
    assert.equal(fullQuote.includes("/Users/secretuser"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Records check (with Fact Gate downgrade), fix --auto, interactive TTY fix, verify, and MCP calls end-to-end", async () => {
  const { root, cfgDir, wlDir } = makeTempWorkspace();
  try {
    const wlEnv = { DISLOP_WORKLOG: "metadata", DISLOP_WORKLOG_DIR: wlDir };

    // 1. Mocked BYOK check triggering Step 5 Fact Gate downgrade
    const paperPath = path.join(root, "paper.md");
    fs.writeFileSync(paperPath, "Studies have shown that batching cuts tail latency by 37%.\n", "utf8");
    fs.writeFileSync(
      path.join(root, ".dislop.local.json"),
      JSON.stringify({
        routing: "byok",
        providers: {
          mock: {
            protocol: "openai",
            baseUrl: "http://127.0.0.1:11434/v1",
            apiKey: "test",
            model: "mock-llm",
            structuredOutput: "json_object",
          },
        },
        worklog: { enabled: true, privacy: "metadata", dir: wlDir },
      }),
      "utf8",
    );

    const ioByok = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: wlEnv,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    documentToneAnchor: "Empirical systems paper.",
                    items: [
                      {
                        ruleId: "en/prose/throat-clearing",
                        targetId: "P1-S1",
                        priority: "strong",
                        fixSafety: "safe",
                        actionType: "replace",
                        originalQuote: "Studies have shown that batching cuts tail latency by 37%.",
                        suggestedReplacement: "Batching cuts tail latency.",
                        reason: "Drops 37% intentionally.",
                        rewritePrompt: "Keep 37%.",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });
    assert.equal(await runCli(["check", "paper.md", "--json"], ioByok), 0);

    // 2. fix --auto
    const autoFile = path.join(root, "auto.md");
    fs.writeFileSync(autoFile, "Certainly! Here is your draft.\n\nLatency stayed at 12ms.\n", "utf8");
    assert.equal(
      await runCli(["fix", "auto.md", "--auto", "--no-llm"], makeIo({ cwd: root, cfgDir, extraEnv: wlEnv })),
      0,
    );

    // 3. Interactive TTY fix with p, u, e, y
    const ttyFile = path.join(root, "tty.md");
    fs.writeFileSync(
      ttyFile,
      "Assign ticket to [TODO] with 42ms budget.\n\nIt is worth noting that backups run nightly.\n",
      "utf8",
    );
    const ioTty = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: wlEnv,
      isTty: true,
      keys: ["p", "u", "e", "y"],
      clipboardRunner: async () => true,
      editorRunner: async () => "Assign ticket to @alice with 42ms budget.",
    });
    assert.equal(await runCli(["fix", "tty.md", "--no-llm"], ioTty), 0);

    // 4. verify pass & fail
    const beforeFile = path.join(root, "before.md");
    const afterBad = path.join(root, "after-bad.md");
    fs.writeFileSync(beforeFile, "PostgreSQL latency dropped from 90ms to 15ms.\n", "utf8");
    fs.writeFileSync(afterBad, "PostgreSQL latency improved from 15ms to 90ms.\n", "utf8");
    assert.equal(
      await runCli(["verify", "before.md", "after-bad.md"], makeIo({ cwd: root, cfgDir, extraEnv: wlEnv })),
      1,
    );

    // 5. MCP tool calls (dislop_check, dislop_fix_safe, dislop_verify)
    const mcpEnv = { DISLOP_CONFIG_DIR: cfgDir, DISLOP_WORKLOG: "metadata", DISLOP_WORKLOG_DIR: wlDir };
    await handleMcpJsonRpcRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "dislop_check",
          arguments: { text: "Certainly! Here is your draft.\n\nLatency is 10ms.", format: "md" },
        },
      },
      { cwd: root, env: mcpEnv },
    );

    const mcpFixFile = path.join(root, "mcp-fix.md");
    fs.writeFileSync(mcpFixFile, "Certainly! Here is your summary.\n\nThroughput stayed at 500 req/s.\n", "utf8");
    await handleMcpJsonRpcRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "dislop_fix_safe", arguments: { filePath: "mcp-fix.md" } },
      },
      { cwd: root, env: mcpEnv },
    );

    await handleMcpJsonRpcRequest(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "dislop_verify",
          arguments: { beforeText: "Latency was 12ms.", afterText: "Latency was low." },
        },
      },
      { cwd: root, env: mcpEnv },
    );

    const entries = readWorklogEntries(wlDir);
    assert.equal(entries.length, 7);

    const byokEntry = entries.find((e) => e.engine === "byok:mock-llm");
    assert.ok(byokEntry);
    assert.equal(byokEntry.summary.factGateDowngraded, 1);
    assert.equal(byokEntry.files[0].findings[0].factGateDowngraded, true);
    assert.ok(byokEntry.files[0].findings[0].factGateCategories.includes("dropped_number"));

    const ttyEntry = entries.find((e) => e.command === "fix" && e.mode === "tty");
    assert.ok(ttyEntry);
    assert.equal(ttyEntry.summary.undoCount, 1);
    assert.equal(ttyEntry.summary.edited, 1);
    assert.equal(ttyEntry.summary.applied, 2);

    const verifyCliEntry = entries.find((e) => e.source === "cli" && e.command === "verify");
    assert.ok(verifyCliEntry);
    assert.equal(verifyCliEntry.verify.ok, false);
    assert.ok(verifyCliEntry.verify.regressionIds.includes("metric-direction-reversed"));

    const mcpEntries = entries.filter((e) => e.source === "mcp");
    assert.equal(mcpEntries.length, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Worklog CLI commands (status, list, show, stats, reflect, clear), pruning, and unwritable dir tolerance", async () => {
  const { root, cfgDir, wlDir } = makeTempWorkspace();
  try {
    fs.mkdirSync(wlDir, { recursive: true, mode: 0o700 });
    const now = new Date("2026-11-26T10:00:00.000Z");

    // Seed an expired file and a recent file
    fs.writeFileSync(path.join(wlDir, "2026-09-01.jsonl"), '{"id":"old-1","timestamp":"2026-09-01T10:00:00.000Z"}\n');
    const removed = pruneExpiredWorklogs(wlDir, 30, now);
    assert.equal(removed, 1);
    assert.equal(fs.existsSync(path.join(wlDir, "2026-09-01.jsonl")), false);

    // Seed synthetic entries that trigger highSkip, highEdit, factGateHotspot, verifyHotspot, slowFile, routingFriction
    const seededEntries = [
      {
        schema: "dislop.worklog/1",
        id: "11111111-1111-4111-8111-111111111111",
        timestamp: new Date(Date.now() - 3600_000).toISOString(),
        version: "1.0.1",
        privacy: "metadata",
        source: "cli",
        command: "fix",
        mode: "tty",
        workspaceHash: "abc123def456",
        durationMs: 720,
        exitCode: 0,
        routing: "local",
        engine: "deterministic",
        routeFallback: true,
        fileCount: 1,
        summary: {
          defects: { error: 0, warning: 0 },
          suggestions: { strong: 4, moderate: 0, hint: 0 },
          applied: 2,
          skipped: 3,
          edited: 2,
          promptCopied: 0,
          undoCount: 0,
          factGateDowngraded: 1,
          aborted: false,
        },
        files: [
          {
            fileHash: "deadbeef1234",
            ext: "md",
            language: "en",
            modality: "prose",
            segmentCount: 10,
            engine: "deterministic",
            durationMs: 650,
            mountedPacks: ["en/prose"],
            findings: [
              { ruleId: "en/prose/noisy-rule", pack: "en/prose", kind: "suggestion", severityOrPriority: "strong", origin: "deterministic", fixSafety: "review", actionType: "replace", decision: "skipped", factGateDowngraded: false },
              { ruleId: "en/prose/noisy-rule", pack: "en/prose", kind: "suggestion", severityOrPriority: "strong", origin: "deterministic", fixSafety: "review", actionType: "replace", decision: "skipped", factGateDowngraded: false },
              { ruleId: "en/prose/noisy-rule", pack: "en/prose", kind: "suggestion", severityOrPriority: "strong", origin: "deterministic", fixSafety: "review", actionType: "replace", decision: "skipped", factGateDowngraded: false },
              { ruleId: "en/prose/edit-me", pack: "en/prose", kind: "suggestion", severityOrPriority: "moderate", origin: "llm", fixSafety: "manual", actionType: "prompt", decision: "edited", factGateDowngraded: true, factGateCategories: ["dropped_number"] },
              { ruleId: "en/prose/edit-me", pack: "en/prose", kind: "suggestion", severityOrPriority: "moderate", origin: "llm", fixSafety: "review", actionType: "replace", decision: "edited", factGateDowngraded: false },
            ],
          },
        ],
        verify: null,
      },
      {
        schema: "dislop.worklog/1",
        id: "22222222-2222-4222-8222-222222222222",
        timestamp: new Date(Date.now() - 1800_000).toISOString(),
        version: "1.0.1",
        privacy: "metadata",
        source: "cli",
        command: "verify",
        mode: "verify-files",
        workspaceHash: "abc123def456",
        durationMs: 12,
        exitCode: 1,
        routing: "local",
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
        verify: {
          ok: false,
          droppedFactsCount: 1,
          droppedFactTypes: ["dropped_number"],
          regressionIds: ["introduced-negation-slogan"],
        },
      },
    ];

    const todayFile = `${new Date().toISOString().slice(0, 10)}.jsonl`;
    fs.writeFileSync(
      path.join(wlDir, todayFile),
      `${seededEntries.map((e) => JSON.stringify(e)).join("\n")}\n{malformed-json-line\n`,
      "utf8",
    );

    const wlEnv = { DISLOP_WORKLOG: "metadata", DISLOP_WORKLOG_DIR: wlDir };

    // status
    const ioStatus = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "status", "--json"], ioStatus), 0);
    const statusJson = JSON.parse(ioStatus.getStdout());
    assert.equal(statusJson.entryCount, 2);

    // list
    const ioList = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "list", "--days", "7", "--limit", "5", "--json"], ioList), 0);
    const listJson = JSON.parse(ioList.getStdout());
    assert.equal(listJson.count, 2);

    // show by prefix
    const ioShow = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "show", "11111111", "--json"], ioShow), 0);
    assert.equal(JSON.parse(ioShow.getStdout()).id, "11111111-1111-4111-8111-111111111111");

    // stats
    const ioStats = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "stats", "--json"], ioStats), 0);
    const statsJson = JSON.parse(ioStats.getStdout());
    assert.equal(statsJson.totalRuns, 2);
    assert.equal(statsJson.verify.failed, 1);

    // reflect (JSON + Markdown)
    const ioReflectJson = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "reflect", "--json"], ioReflectJson), 0);
    const reflectJson = JSON.parse(ioReflectJson.getStdout());
    assert.equal(reflectJson.signals.highSkipRules[0].ruleId, "en/prose/noisy-rule");
    assert.equal(reflectJson.signals.highEditRules[0].ruleId, "en/prose/edit-me");
    assert.equal(reflectJson.signals.factGateHotspots[0].ruleId, "en/prose/edit-me");
    assert.equal(reflectJson.signals.verifyHotspots.regressionIds[0].id, "introduced-negation-slogan");
    assert.equal(reflectJson.signals.slowFiles.length, 1);
    assert.equal(reflectJson.signals.routingFriction.fallbackRuns, 1);

    const ioReflectMd = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "reflect", "--format", "markdown"], ioReflectMd), 0);
    assert.match(ioReflectMd.getStdout(), /# dislop Worklog Reflection/);
    assert.match(ioReflectMd.getStdout(), /en\/prose\/noisy-rule/);

    // clear without --yes fails with exit 2
    assert.equal(await runCli(["worklog", "clear"], makeIo({ cwd: root, cfgDir, extraEnv: wlEnv })), 2);

    // clear --yes removes files
    const ioClear = makeIo({ cwd: root, cfgDir, extraEnv: wlEnv });
    assert.equal(await runCli(["worklog", "clear", "--yes"], ioClear), 0);
    assert.equal(readWorklogEntries(wlDir).length, 0);

    // Unwritable worklog path (occupied by regular file) MUST NOT fail `dislop check`
    const blockedPath = path.join(root, "blocked-wl-file");
    fs.writeFileSync(blockedPath, "occupied", "utf8");
    const targetDoc = path.join(root, "clean.md");
    fs.writeFileSync(targetDoc, "Throughput stayed at 120 req/s.\n", "utf8");

    const ioBlocked = makeIo({
      cwd: root,
      cfgDir,
      extraEnv: { DISLOP_WORKLOG: "metadata", DISLOP_WORKLOG_DIR: blockedPath },
    });
    assert.equal(await runCli(["check", "clean.md", "--no-llm", "--json"], ioBlocked), 0);
    assert.equal(JSON.parse(ioBlocked.getStdout()).summary.defects.error, 0);
    assert.equal(ioBlocked.getStderr(), "");

    // Silence unused imports warning check
    assert.equal(typeof buildReflectionReport, "function");
    assert.equal(typeof clearWorklogEntries, "function");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
