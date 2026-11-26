import { parseArgs } from "node:util";
import { runCheckCommand, runFixCommand } from "./commands/check-fix.mjs";
import { runDoctorCommand } from "./commands/doctor.mjs";
import { runInitCommand } from "./commands/init.mjs";
import { runLoginCommand, runLogoutCommand } from "./commands/login.mjs";
import { runModelCommand } from "./commands/model.mjs";
import { runPacksCommand } from "./commands/packs.mjs";
import { runVerifyCommand } from "./commands/verify.mjs";
import { runVoiceCommand } from "./commands/voice.mjs";
import { runWorklogCommand } from "./commands/worklog.mjs";
import { DislopConfigError } from "./kernel/config.mjs";
import { DISLOP_VERSION } from "./kernel/version.mjs";
import { startStdioMcpServer } from "./mcp/stdio-server.mjs";
import { detectOllamaBinary } from "./runtime/providers/local-model.mjs";

export const CLI_VERSION = DISLOP_VERSION;

export function buildHelpText(env = process.env) {
  const ollama = detectOllamaBinary(env);
  const ollamaStatusLine = ollama.installed
    ? `  Status: Ollama detected (${ollama.binaryPath}).`
    : "  Status: Ollama is MISSING on this machine — install from https://ollama.com (e.g., 'brew install ollama') before using Tier 3 local LLM checks or 'dislop model pull'.";

  return `dislop v${CLI_VERSION} — Pluggable Editorial & Artifact Linter (Node.js Micro-Kernel)

Usage:
  dislop check <files/globs...> [options]     Read-only Dual-Track audit (Defects & Suggestions)
  dislop fix <files/globs...> [options]       Interactive hunk review in TTY, or batch safe fixes (--auto)
  dislop verify <before> <after> [--json]     Verify edits preserved facts, units, links, and entities
  dislop verify --git [ref] <file> [--json]   Verify working-tree edits against a Git revision
  dislop init [--global] [--voice <glob>]     Initialize .dislop.json or ~/.config/dislop/config.json
  dislop login [--token <dslp_*>]             Save Official Cloud credentials (~/.config/dislop/credentials.json)
  dislop logout                               Remove saved Official Cloud credentials
  dislop voice <extract|show|clear> [files]   Manage personal voice baseline (voice.json)
  dislop model <list|pull|rm> [name]          Manage Tier 3 local models (requires Ollama)
  dislop packs [list|lint <path>] [--json]    List built-in Packs or lint external .pack.md / Pack dirs
  dislop doctor [--json]                      Inspect active routing tier, Ollama status, auth, config, and Packs
  dislop worklog <status|list|show|stats|reflect|clear>  Inspect local dev worklog & reflection summaries
  dislop mcp                                  Start local stdio MCP server for coding & office agents

Options (check / fix):
  --auto, -y                                  (fix only) Apply verified fixSafety === "safe" items non-interactively
  --json                                      Emit pure dislop.report/1 JSON to stdout (diagnostics to stderr)
  --format <text|diff|json|agent|sarif>       Output format ('agent' = token-compact feed for AI agents)
  --stdin-filename <name>                     Filename/extension hint when reading document from stdin ('-')
  --changed                                   Inspect git-modified, staged, and untracked deliverable files
  --since <ref>                               Inspect deliverable files changed since git <ref>
  --fail-on <none|error|warning>              Minimum Defect severity to fail with Exit 1 (default: error; Suggestions always Exit 0)
  --pack <names/paths...>                     Mount specific Packs (comma-separated or repeated)
  --no-llm                                    Run deterministic Script Packs (pack.check) only
  --voice <files/globs...>                    Align review with hand-written voice reference files
  --level <strong|moderate|hint|all>          Filter Suggestion priority threshold (default: all)
  --engine <off|local|auto|cloud|byok>        Routing tier (default: local; Tier 3 local LLM requires Ollama)
  --provider <name>                           Select named or built-in provider (openai, anthropic, gemini)
  --model <name>                              Override LLM model identifier for the active provider
  --concurrency <n>                           Max parallel files during 'check' (1-16; default 4 for LLM)
  --dry-run                                   Preview unified diff without modifying files on disk
  --backup                                    Create <file>.bak before atomic write
  --lang <auto|en|zh>                         Diagnostic language ('auto' matches target document language)
  --help, -h                                  Show this help message
  --version, -v                               Print version

Tier 3 Local LLM Prerequisite (Ollama):
  Tier 3 local semantic checks ('--engine local' & 'dislop model pull') require Ollama (https://ollama.com).
  Without Ollama or an installed local model, default 'local' routing runs offline deterministic Packs only.
  Setup: install Ollama ('brew install ollama'), start 'ollama serve', then run 'dislop model pull'.
${ollamaStatusLine}

Exit Codes:
  0  Pass (zero unresolved Defect: error items; prose Suggestions never fail CI)
  1  Unresolved Defect: error found (or Fact Gate failure in 'dislop verify')
  2  CLI usage, configuration, auth, missing Ollama on 'model pull', or unreadable file error
`;
}

function splitCommaValues(values) {
  if (!values) return [];
  const arr = Array.isArray(values) ? values : [values];
  return arr
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

const OPTIONS_WITH_VALUE = new Set([
  "--format",
  "--pack",
  "--voice",
  "--level",
  "--engine",
  "--provider",
  "--model",
  "--concurrency",
  "--lang",
  "--token",
  "--endpoint",
  "--since",
  "--fail-on",
  "--stdin-filename",
  "--days",
  "--limit",
  "--command",
  "--older-than",
]);

function countRemainingPositionals(tokens, startIndex) {
  let count = 0;
  for (let j = startIndex; j < tokens.length; j += 1) {
    const tok = tokens[j];
    if (tok === "--") {
      count += tokens.length - j - 1;
      break;
    }
    if (tok.startsWith("-")) {
      if (OPTIONS_WITH_VALUE.has(tok) && !tok.includes("=")) {
        j += 1;
      }
      continue;
    }
    count += 1;
  }
  return count;
}

/**
 * Parse CLI arguments and execute the requested `dislop` subcommand.
 * Returns integer process exit code (`0`, `1`, or `2`).
 */
export async function runCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;

  try {
    // Handle `--git` with optional ref value cleanly before `util.parseArgs`
    const normalizedArgv = [];
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === "--git") {
        const next = argv[i + 1];
        // If another positional target follows `next`, `next` is the git ref; otherwise default to `HEAD`
        const remainingAfterNext = next ? countRemainingPositionals(argv, i + 2) : 0;
        if (next && !next.startsWith("-") && remainingAfterNext >= 1) {
          normalizedArgv.push(`--git=${next}`);
          i += 1;
        } else {
          normalizedArgv.push("--git=HEAD");
        }
      } else {
        normalizedArgv.push(arg);
      }
    }

    let parsed;
    try {
      parsed = parseArgs({
        args: normalizedArgv,
        allowPositionals: true,
        strict: true,
        options: {
          help: { type: "boolean", short: "h" },
          version: { type: "boolean", short: "v" },
          auto: { type: "boolean" },
          yes: { type: "boolean", short: "y" },
          json: { type: "boolean" },
          format: { type: "string" },
          "stdin-filename": { type: "string" },
          changed: { type: "boolean" },
          since: { type: "string" },
          "fail-on": { type: "string" },
          patterns: { type: "boolean" },
          ml: { type: "boolean" },
          deep: { type: "boolean" },
          pack: { type: "string", multiple: true },
          "no-llm": { type: "boolean" },
          voice: { type: "string", multiple: true },
          level: { type: "string" },
          engine: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
          concurrency: { type: "string" },
          "dry-run": { type: "boolean" },
          backup: { type: "boolean" },
          lang: { type: "string" },
          global: { type: "boolean" },
          force: { type: "boolean" },
          token: { type: "string" },
          endpoint: { type: "string" },
          git: { type: "string" },
          days: { type: "string" },
          limit: { type: "string" },
          command: { type: "string" },
          "older-than": { type: "string" },
        },
      });
    } catch (err) {
      throw new DislopConfigError(err.message);
    }

    const { values, positionals } = parsed;

    if (values.patterns) {
      throw new DislopConfigError(
        "Flag '--patterns' was removed in dislop v1.x. Use '--pack <names>' (for example '--pack en/prose' or '--pack common/artifact-qa').",
      );
    }
    if (values.ml || values.deep) {
      throw new DislopConfigError(
        "Flags '--ml' and '--deep' were removed in dislop v1.x. Use '--engine <auto|local|cloud|byok>' or '--no-llm'.",
      );
    }

    if (values.version) {
      stdout.write(`${CLI_VERSION}\n`);
      return 0;
    }

    if (values.help || positionals.length === 0) {
      stdout.write(buildHelpText(io.env || process.env));
      return positionals.length === 0 && !values.help ? 2 : 0;
    }

    const subcommand = positionals[0];
    const restPositionals = positionals.slice(1);

    const flags = {
      auto: Boolean(values.auto),
      yes: Boolean(values.yes),
      json: Boolean(values.json),
      format: values.format || null,
      packs: values.pack ? splitCommaValues(values.pack) : null,
      noLlm: Boolean(values["no-llm"]),
      voiceFiles: values.voice ? splitCommaValues(values.voice) : null,
      level: values.level || null,
      engine: values.engine || null,
      provider: values.provider || null,
      model: values.model || null,
      concurrency: values.concurrency || null,
      dryRun: Boolean(values["dry-run"]),
      backup: Boolean(values.backup),
      lang: values.lang || null,
      stdinFilename: values["stdin-filename"] || null,
      changed: Boolean(values.changed),
      since: values.since || null,
      failOn: values["fail-on"] || null,
      global: Boolean(values.global),
      force: Boolean(values.force),
      token: values.token || null,
      endpoint: values.endpoint || null,
      git: values.git,
      days: values.days || null,
      limit: values.limit || null,
      command: values.command || null,
      olderThan: values["older-than"] || null,
    };

    switch (subcommand) {
      case "check":
        return await runCheckCommand(restPositionals, flags, io);
      case "fix":
        return await runFixCommand(restPositionals, flags, io);
      case "verify":
        return await runVerifyCommand(restPositionals, flags, io);
      case "init":
        return await runInitCommand(restPositionals, flags, io);
      case "login":
        return await runLoginCommand(restPositionals, flags, io);
      case "logout":
        return await runLogoutCommand(restPositionals, flags, io);
      case "voice":
        return await runVoiceCommand(restPositionals, flags, io);
      case "model":
        return await runModelCommand(restPositionals, flags, io);
      case "packs":
        return await runPacksCommand(restPositionals, flags, io);
      case "doctor":
        return await runDoctorCommand(restPositionals, flags, io);
      case "worklog":
        return await runWorklogCommand(restPositionals, flags, io);
      case "mcp":
        startStdioMcpServer(io);
        return 0;
      default:
        throw new DislopConfigError(
          `Unknown subcommand '${subcommand}'. Did you mean 'dislop check ${subcommand}' or 'dislop fix ${subcommand}'? Run 'dislop --help' for usage.`,
        );
    }
  } catch (err) {
    const code = err?.exitCode || 2;
    stderr.write(`dislop error: ${err?.message || String(err)}\n`);
    return code;
  }
}
