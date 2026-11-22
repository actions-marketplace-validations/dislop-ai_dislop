#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertLiveNetworkAllowed, main as liveBenchMain } from "../scripts/run_live_model_bench.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function runTests() {
  // 1. Dry-run executes completely offline across all 16 Suite B text tasks (10 v1 + 6 hard-v2)
  const dry = await liveBenchMain(["--dry-run", "--models", "qwen3:1.7b,gemini-3.1-flash-lite", "--repeats", "2"]);
  assert.equal(dry.dryRun, true);
  assert.equal(dry.taskCount, 16);
  assert.equal(dry.models.length, 2);
  assert.equal(dry.models[0].plannedCalls, 64);

  // 2. Test-mode circuit breaker blocks live fetch calls
  const prev = process.env.DISLOP_TEST_MODE;
  process.env.DISLOP_TEST_MODE = "1";
  try {
    assert.throws(() => assertLiveNetworkAllowed(), /DISLOP_TEST_MODE=1/);
  } finally {
    if (prev === undefined) delete process.env.DISLOP_TEST_MODE;
    else process.env.DISLOP_TEST_MODE = prev;
  }

  // 3. CLI --dry-run invocation exits 0
  const cli = spawnSync("node", ["scripts/run_live_model_bench.mjs", "--dry-run"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.taskCount, 16);
  console.log("test_live_bench_dryrun: ALL PASSED");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
