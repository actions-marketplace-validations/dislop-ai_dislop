import fs from "node:fs";
import path from "node:path";
import { DislopConfigError } from "../kernel/config.mjs";
import { listBuiltinPackIds, loadSinglePack } from "../kernel/pack-loader.mjs";
import { validatePackPath } from "../kernel/pack-validator.mjs";

/**
 * `dislop packs [list | lint <path>] [--json]` — inspect built-in Packs via `pack.json` metadata
 * or validate external `.pack.md` / Pack directories against security & schema checks.
 */
export async function runPacksCommand(positionals = [], flags = {}, io = {}) {
  const { cwd = process.cwd(), stdout = process.stdout, stderr = process.stderr } = io;
  const subcommand = (positionals[0] || "list").trim();

  if (subcommand === "lint" || subcommand === "validate") {
    const target = positionals[1];
    if (!target) {
      throw new DislopConfigError("Usage: dislop packs lint <pack-dir|file.pack.md>");
    }
    const result = validatePackPath(target, { cwd });
    if (!result.exists) {
      throw new DislopConfigError(`Pack path does not exist: ${target}`);
    }
    if (flags.json || flags.format === "json") {
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (result.ok) {
      const relTarget = path.relative(cwd, result.targetPath) || ".";
      stdout.write(
        `OK ${relTarget}: ${result.checkedFiles} file(s) validated with 0 violations.\n`,
      );
    } else {
      for (const v of result.violations) {
        const rel = path.relative(cwd, v.file) || v.file;
        const loc = v.line ? `:${v.line}` : "";
        stderr.write(`FAIL [${v.ruleId}] ${rel}${loc}: ${v.message}\n`);
      }
    }
    return result.ok ? 0 : 1;
  }

  if (subcommand !== "list") {
    throw new DislopConfigError(
      `Unknown packs subcommand '${subcommand}'. Expected 'list', 'lint', or 'validate'.`,
    );
  }

  const ids = listBuiltinPackIds();
  const details = [];
  for (const id of ids) {
    const p = await loadSinglePack(id, { cwd });
    details.push({
      name: p.name,
      version: p.version,
      description: p.description,
      languages: p.languages || ["all"],
      formats: p.formats || ["all"],
      hasScripts: Boolean(p.hasScripts),
      hasPrompts: Boolean(p.hasPrompts),
      scriptFileCount: p.loadStats?.scriptFileCount ?? 0,
      promptFileCount: p.loadStats?.promptFileCount ?? 0,
    });
  }

  if (flags.json || flags.format === "json") {
    stdout.write(`${JSON.stringify({ packs: details }, null, 2)}\n`);
    return 0;
  }

  stdout.write("Built-in Packs (Layout: packs/<scope-or-lang>/<scenario>/{pack.json,scripts/,prompts/}):\n");
  for (const d of details) {
    const layers = [
      d.hasScripts ? `scripts(${d.scriptFileCount})` : null,
      d.hasPrompts ? `prompts(${d.promptFileCount})` : null,
    ]
      .filter(Boolean)
      .join(", ");
    stdout.write(`  - ${d.name} (v${d.version}) [${layers}]\n`);
    stdout.write(`    ${d.description}\n`);
  }
  return 0;
}
