import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBuiltinPacks } from "../src/kernel/pack-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACKS_ROOT = path.join(ROOT, "packs");

const result = validateBuiltinPacks(PACKS_ROOT);

if (!result.ok) {
  console.error("SECURITY CHECK FAILED:");
  for (const v of result.violations) {
    const rel = path.relative(ROOT, v.file);
    const loc = v.line ? `:${v.line}` : "";
    console.error(`  - [${v.ruleId}] ${rel}${loc}: ${v.message}`);
  }
  process.exit(1);
}

console.log(
  `SECURITY CHECK PASSED (${result.packCount} built-in packs verified across ${result.checkedFiles} files, 0 violations).`,
);
