import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class DislopConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "DislopConfigError";
    this.exitCode = 2;
  }
}

export function getDislopHomeDir(env = process.env) {
  if (env.DISLOP_CONFIG_DIR) {
    return path.resolve(env.DISLOP_CONFIG_DIR);
  }
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, "dislop");
  }
  return path.join(os.homedir(), ".config", "dislop");
}

export function expandTilde(filePath, env = process.env) {
  const s = String(filePath || "");
  if (s === "~") return env.HOME || os.homedir();
  if (s.startsWith("~/") || s.startsWith("~\\")) {
    return path.join(env.HOME || os.homedir(), s.slice(2));
  }
  return s;
}

/**
 * Detect whether the current process is attached to an interactive human terminal
 * (false in pipes, CI runners, `TERM=dumb`, and known coding agent sandboxes).
 */
export function isInteractiveHumanTty({
  stdin = process.stdin,
  stdout = process.stdout,
  env = process.env,
} = {}) {
  if (env.DISLOP_FORCE_TTY === "1") return true;
  if (env.DISLOP_FORCE_NON_TTY === "1") return false;
  if (!stdin?.isTTY || !stdout?.isTTY) return false;
  if (env.CI && env.CI !== "0" && env.CI !== "false") return false;
  if (env.TERM === "dumb") return false;
  if (
    env.CLAUDECODE ||
    env.CODEX_SANDBOX ||
    env.CURSOR_AGENT ||
    env.ANTIGRAVITY_AGENT ||
    env.GITHUB_ACTIONS
  ) {
    return false;
  }
  return true;
}

export function readJsonFileStrict(filePath) {
  if (!fs.existsSync(filePath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new DislopConfigError(`Unable to read config file '${filePath}': ${err.message}`);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("root value must be a JSON object");
    }
    return parsed;
  } catch (err) {
    throw new DislopConfigError(`Invalid JSON in '${filePath}': ${err.message}`);
  }
}

export function writeJsonFileSecure(filePath, data, { mode = 0o600 } = {}) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode });
  fs.renameSync(tmp, filePath);
}

const VALID_ROUTING_MODES = new Set(["off", "local", "auto", "cloud", "byok"]);
const VALID_PROJECT_ROUTING_MODES = new Set(["off", "local"]);
const VALID_WORKLOG_PRIVACY_MODES = new Set(["metadata", "redacted", "local-full"]);
const VALID_FAIL_ON_MODES = new Set(["none", "error", "warning"]);
const VALID_RULE_SEVERITIES = new Set(["off", "error", "warning", "strong", "moderate", "hint"]);

const PROJECT_ALLOWED_KEYS = new Set([
  "$schema",
  "routing",
  "ignore",
  "packs",
  "extraPacks",
  "overrides",
  "rules",
  "lang",
  "level",
  "concurrency",
  "failOn",
  "voice",
]);

const PROJECT_PRIVILEGED_KEYS = new Set([
  "providers",
  "activeProvider",
  "approvedHosts",
  "worklog",
  "credentialsPath",
  "modelsDir",
]);

function isPathInsideDir(targetPath, baseDir) {
  const realBase = fs.existsSync(baseDir) ? fs.realpathSync(baseDir) : path.resolve(baseDir);
  const candidate = fs.existsSync(targetPath)
    ? fs.realpathSync(targetPath)
    : path.resolve(targetPath);
  const rel = path.relative(realBase, candidate);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function findProjectRootAndConfigs(cwd) {
  const startDir = path.resolve(cwd);
  let gitBoundary = null;
  let probe = startDir;
  while (true) {
    if (fs.existsSync(path.join(probe, ".git"))) {
      gitBoundary = probe;
      break;
    }
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }

  const stopDir = gitBoundary || startDir;
  let projectConfigPath = null;
  let projectDir = stopDir;
  probe = startDir;
  while (true) {
    const candidate = path.join(probe, ".dislop.json");
    if (fs.existsSync(candidate)) {
      projectConfigPath = candidate;
      projectDir = probe;
      break;
    }
    if (probe === stopDir) break;
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }

  const localConfigInProject = path.join(projectDir, ".dislop.local.json");
  const localConfigInCwd = path.join(startDir, ".dislop.local.json");
  const localConfigPath = fs.existsSync(localConfigInCwd)
    ? localConfigInCwd
    : localConfigInProject;

  return {
    projectDir,
    gitBoundary,
    projectConfigPath: projectConfigPath || path.join(projectDir, ".dislop.json"),
    localConfigPath,
  };
}

function isLocalConfigTrustedUntracked(localConfigPath, gitBoundary) {
  if (!gitBoundary || !fs.existsSync(localConfigPath)) return true;
  const res = spawnSync("git", ["ls-files", "--error-unmatch", localConfigPath], {
    cwd: gitBoundary,
    stdio: "ignore",
  });
  if (res.status === 0) {
    // Exit 0 means `.dislop.local.json` is tracked in git -> untrusted escalation vector (R4)
    throw new DislopConfigError(
      `Security error: '${localConfigPath}' is tracked by git. Remove it from git index (.gitignore) or move shared settings into '.dislop.json'.`,
    );
  }
  if (res.error || res.status !== 1) {
    // Fail closed if git check failed or errored: downgrade `.dislop.local.json` to untrusted
    return false;
  }
  return true;
}

export function normalizeFailOnValue(raw, label = "failOn") {
  const val = String(raw || "").trim().toLowerCase();
  if (val === "info" || val === "suggestion" || val === "strong" || val === "moderate" || val === "hint") {
    throw new DislopConfigError(
      `Invalid ${label} '${raw}': Suggestions cannot fail CI (Exit 0 invariant). Expected 'none', 'error', or 'warning'.`,
    );
  }
  if (!VALID_FAIL_ON_MODES.has(val)) {
    throw new DislopConfigError(`Invalid ${label} '${raw}' (expected 'none', 'error', or 'warning')`);
  }
  return val;
}

function validateProjectLayerKeys(d, source) {
  for (const key of Object.keys(d)) {
    if (key === "pack") {
      throw new DislopConfigError(
        `Invalid config key 'pack' in '${source}'. Migrate to 'packs' (array) and remove singular 'pack'.`,
      );
    }
    if (PROJECT_PRIVILEGED_KEYS.has(key)) {
      throw new DislopConfigError(
        `Config key '${key}' is not permitted in shared project '${source}'. Place credentials/providers/worklog settings in user config (~/.config/dislop/config.json) or untracked '.dislop.local.json'.`,
      );
    }
    if (!PROJECT_ALLOWED_KEYS.has(key)) {
      throw new DislopConfigError(`Unknown config key '${key}' in '${source}'.`);
    }
  }
}

function validateRuleConfigValue(ruleId, rawVal, source) {
  if (rawVal === false || rawVal === "off") return "off";
  if (rawVal === true) return "on";
  if (typeof rawVal === "string") {
    const val = rawVal.trim().toLowerCase();
    if (!VALID_RULE_SEVERITIES.has(val)) {
      throw new DislopConfigError(
        `Invalid severity '${rawVal}' for rule '${ruleId}' in '${source}'`,
      );
    }
    return val;
  }
  if (rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
    const allowedObjKeys = new Set(["enabled", "severity", "level", "priority"]);
    for (const k of Object.keys(rawVal)) {
      if (!allowedObjKeys.has(k)) {
        throw new DislopConfigError(`Invalid key '${k}' in rule setting for '${ruleId}' in '${source}'`);
      }
    }
    if (rawVal.enabled !== undefined && typeof rawVal.enabled !== "boolean") {
      throw new DislopConfigError(`'enabled' for rule '${ruleId}' in '${source}' must be boolean`);
    }
    for (const sevKey of ["severity", "level", "priority"]) {
      if (rawVal[sevKey] !== undefined) {
        const s = String(rawVal[sevKey]).trim().toLowerCase();
        if (!VALID_RULE_SEVERITIES.has(s)) {
          throw new DislopConfigError(
            `Invalid ${sevKey} '${rawVal[sevKey]}' for rule '${ruleId}' in '${source}'`,
          );
        }
      }
    }
    return rawVal;
  }
  throw new DislopConfigError(`Invalid rule setting for '${ruleId}' in '${source}'`);
}

function validateDeclarativeRuleEntry(entry, index, source) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new DislopConfigError(`Declarative rule #${index} in '${source}' must be an object`);
  }
  const id = String(entry.id || entry.ruleId || "").trim();
  if (!id || !/^[a-z0-9][a-z0-9/_-]{1,80}$/i.test(id)) {
    throw new DislopConfigError(
      `Declarative rule #${index} in '${source}' requires a safe alphanumeric 'id'`,
    );
  }
  const pattern = entry.pattern ? String(entry.pattern) : null;
  const terms = Array.isArray(entry.terms)
    ? entry.terms.map(String).filter(Boolean)
    : typeof entry.literal === "string" && entry.literal
      ? [entry.literal]
      : [];
  if (!pattern && terms.length === 0) {
    throw new DislopConfigError(
      `Declarative rule '${id}' in '${source}' must define 'pattern', 'literal', or 'terms'`,
    );
  }
  if (pattern) {
    if (pattern.length > 500) {
      throw new DislopConfigError(`Declarative rule '${id}' pattern exceeds 500 chars`);
    }
    if (/(\+|\*|\{[^}]+\})\s*\)?\s*(\+|\*|\{[^}]+\})/.test(pattern)) {
      throw new DislopConfigError(
        `Declarative rule '${id}' contains nested quantifiers prohibited for ReDoS safety`,
      );
    }
    try {
      new RegExp(pattern, entry.flags ? String(entry.flags).replace(/[^imu]/g, "") : "i");
    } catch (err) {
      throw new DislopConfigError(`Declarative rule '${id}' has invalid RegExp: ${err.message}`);
    }
  }
  const kind = entry.kind === "suggestion" ? "suggestion" : "defect";
  const severity = entry.severity ? String(entry.severity).toLowerCase() : "warning";
  if (!["error", "warning"].includes(severity)) {
    throw new DislopConfigError(
      `Declarative rule '${id}' has invalid severity '${entry.severity}'`,
    );
  }
  const priority = entry.priority ? String(entry.priority).toLowerCase() : "moderate";
  if (!["strong", "moderate", "hint"].includes(priority)) {
    throw new DislopConfigError(
      `Declarative rule '${id}' has invalid priority '${entry.priority}'`,
    );
  }
  const fixSafety = entry.fixSafety ? String(entry.fixSafety).toLowerCase() : "review";
  if (!["safe", "review", "manual"].includes(fixSafety)) {
    throw new DislopConfigError(
      `Declarative rule '${id}' has invalid fixSafety '${entry.fixSafety}'`,
    );
  }

  return {
    id,
    kind,
    severity,
    priority,
    fixSafety,
    pattern,
    flags: entry.flags ? String(entry.flags).replace(/[^imu]/g, "") : "i",
    terms,
    formats: Array.isArray(entry.formats) ? entry.formats.map(String) : null,
    files: Array.isArray(entry.files)
      ? entry.files.map(String)
      : typeof entry.files === "string"
        ? [entry.files]
        : null,
    languages: Array.isArray(entry.languages) ? entry.languages.map(String) : null,
    reason: String(entry.reason || entry.message || `Matched project rule '${id}'.`),
    replacement:
      entry.replacement !== undefined
        ? String(entry.replacement)
        : entry.suggestedReplacement !== undefined
          ? String(entry.suggestedReplacement)
          : undefined,
    actionType: entry.actionType ? String(entry.actionType) : undefined,
  };
}

function loadProjectDeclarativeRulesFile(projectDir) {
  const rulesPath = path.join(projectDir, ".dislop", "rules.json");
  if (!fs.existsSync(rulesPath)) return [];
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  } catch (err) {
    throw new DislopConfigError(`Invalid JSON in '${rulesPath}': ${err.message}`);
  }
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw?.rules) ? raw.rules : null;
  if (!entries) {
    throw new DislopConfigError(`'${rulesPath}' must export an array or { rules: [...] }`);
  }
  return entries.map((e, idx) => validateDeclarativeRuleEntry(e, idx, rulesPath));
}

export function isCiEnvironment(env = process.env) {
  return Boolean((env.CI && env.CI !== "0" && env.CI !== "false") || env.GITHUB_ACTIONS);
}

function parseConcurrencyValue(raw, label) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1 || num > 16) {
    throw new DislopConfigError(`Invalid ${label} '${raw}' (expected integer 1..16)`);
  }
  return num;
}

function parseRetentionDaysValue(raw, label) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1 || num > 365) {
    throw new DislopConfigError(`Invalid ${label} '${raw}' (expected integer 1..365)`);
  }
  return num;
}

/**
 * Resolve layered configuration:
 * `~/.config/dislop/config.json` <- `<projectDir>/.dislop.json` <- `<localDir>/.dislop.local.json` <- CLI flags.
 */
export function resolveLayeredConfig({ cwd = process.cwd(), env = process.env, cliFlags = {} } = {}) {
  const homeDir = getDislopHomeDir(env);
  const userConfigPath = path.join(homeDir, "config.json");
  const { projectDir, gitBoundary, projectConfigPath, localConfigPath } =
    findProjectRootAndConfigs(cwd);
  const localTrusted = isLocalConfigTrustedUntracked(localConfigPath, gitBoundary);

  const defaults = {
    routing: "local",
    activeProvider: null,
    approvedHosts: [],
    ignore: [],
    concurrency: null,
    packs: null,
    extraPacks: [],
    extraPackSpecs: [],
    packOrigin: "default",
    projectDir,
    overrides: [],
    rules: {},
    declarativeRules: [],
    failOn: "error",
    lang: "auto",
    level: "all",
    voice: {
      referenceFiles: [],
      cachePath: path.join(homeDir, "voice.json"),
    },
    worklog: {
      enabled: false,
      privacy: "metadata",
      dir: path.join(homeDir, "worklog"),
      retentionDays: 30,
    },
    providers: {},
  };

  const layers = [
    { source: userConfigPath, origin: "user", data: readJsonFileStrict(userConfigPath), isLocalTrusted: true },
    { source: projectConfigPath, origin: "project", data: readJsonFileStrict(projectConfigPath), isLocalTrusted: false },
    { source: localConfigPath, origin: localTrusted ? "local" : "project", data: readJsonFileStrict(localConfigPath), isLocalTrusted: localTrusted },
  ];

  const merged = structuredClone(defaults);
  const loadedSources = [];

  for (const layer of layers) {
    if (!layer.data) continue;
    loadedSources.push(layer.source);
    const d = layer.data;

    if (!layer.isLocalTrusted) {
      validateProjectLayerKeys(d, layer.source);
    }

    if (d.routing !== undefined) {
      if (!VALID_ROUTING_MODES.has(d.routing)) {
        throw new DislopConfigError(
          `Invalid 'routing' value '${d.routing}' in '${layer.source}' (expected off, local, auto, cloud, or byok)`,
        );
      }
      if (!layer.isLocalTrusted && !VALID_PROJECT_ROUTING_MODES.has(d.routing)) {
        throw new DislopConfigError(
          `Shared project '${layer.source}' cannot set routing '${d.routing}' (only 'local' or 'off' allowed; set 'byok'/'cloud'/'auto' in user or local config).`,
        );
      }
      merged.routing = d.routing;
    }
    if (layer.isLocalTrusted && d.activeProvider !== undefined) {
      merged.activeProvider = d.activeProvider ? String(d.activeProvider) : null;
    }
    if (layer.isLocalTrusted && d.approvedHosts !== undefined) {
      if (!Array.isArray(d.approvedHosts)) {
        throw new DislopConfigError(`'approvedHosts' in '${layer.source}' must be an array`);
      }
      merged.approvedHosts = Array.from(new Set([...merged.approvedHosts, ...d.approvedHosts.map(String)]));
    }
    if (d.ignore !== undefined) {
      if (!Array.isArray(d.ignore)) {
        throw new DislopConfigError(`'ignore' in '${layer.source}' must be an array`);
      }
      merged.ignore = Array.from(new Set([...merged.ignore, ...d.ignore.map((v) => String(v).trim()).filter(Boolean)]));
    }
    if (d.concurrency !== undefined && d.concurrency !== null) {
      merged.concurrency = parseConcurrencyValue(d.concurrency, `'concurrency' in '${layer.source}'`);
    }
    if (d.packs !== undefined) {
      if (!Array.isArray(d.packs)) {
        throw new DislopConfigError(`'packs' in '${layer.source}' must be an array`);
      }
      merged.packs = d.packs.map(String);
      merged.packOrigin = layer.origin;
    }
    if (d.extraPacks !== undefined) {
      if (!Array.isArray(d.extraPacks)) {
        throw new DislopConfigError(`'extraPacks' in '${layer.source}' must be an array`);
      }
      for (const ep of d.extraPacks) {
        if (typeof ep !== "string" || !ep.trim()) {
          throw new DislopConfigError(`Each entry in 'extraPacks' in '${layer.source}' must be a non-empty string`);
        }
        const s = ep.trim();
        if (!merged.extraPacks.includes(s)) {
          merged.extraPacks.push(s);
          merged.extraPackSpecs.push({ spec: s, origin: layer.origin });
        } else {
          // If added earlier and also listed from a stricter untrusted origin, keep untrusted origin
          const existing = merged.extraPackSpecs.find((x) => x.spec === s);
          if (existing && !layer.isLocalTrusted) {
            existing.origin = layer.origin;
          }
        }
      }
    }
    if (d.failOn !== undefined) {
      merged.failOn = normalizeFailOnValue(d.failOn, `'failOn' in '${layer.source}'`);
    }
    if (d.lang !== undefined) {
      merged.lang = String(d.lang);
    }
    if (d.level !== undefined) {
      merged.level = String(d.level);
    }
    if (d.rules !== undefined) {
      if (Array.isArray(d.rules)) {
        merged.declarativeRules.push(
          ...d.rules.map((e, idx) => validateDeclarativeRuleEntry(e, idx, layer.source)),
        );
      } else if (d.rules && typeof d.rules === "object") {
        for (const [rId, rVal] of Object.entries(d.rules)) {
          merged.rules[rId] = validateRuleConfigValue(rId, rVal, layer.source);
        }
      } else {
        throw new DislopConfigError(`'rules' in '${layer.source}' must be an object or array`);
      }
    }
    if (d.overrides !== undefined) {
      if (!Array.isArray(d.overrides)) {
        throw new DislopConfigError(`'overrides' in '${layer.source}' must be an array`);
      }
      for (let i = 0; i < d.overrides.length; i++) {
        const ov = d.overrides[i];
        if (!ov || typeof ov !== "object" || Array.isArray(ov)) {
          throw new DislopConfigError(`overrides[${i}] in '${layer.source}' must be an object`);
        }
        if (!ov.files || (typeof ov.files !== "string" && !Array.isArray(ov.files))) {
          throw new DislopConfigError(
            `overrides[${i}] in '${layer.source}' must define 'files' (string or array)`,
          );
        }
        const ovAllowed = new Set(["files", "packs", "extraPacks", "rules", "failOn", "lang", "level", "ignore", "routing"]);
        for (const k of Object.keys(ov)) {
          if (!ovAllowed.has(k)) {
            throw new DislopConfigError(`Invalid override key '${k}' in '${layer.source}'`);
          }
        }
        if (ov.routing !== undefined && !layer.isLocalTrusted && !VALID_PROJECT_ROUTING_MODES.has(ov.routing)) {
          throw new DislopConfigError(
            `overrides[${i}].routing in '${layer.source}' only permits 'local' or 'off'`,
          );
        }
        const filesList = Array.isArray(ov.files) ? ov.files : [ov.files];
        if (filesList.length === 0 || filesList.some((f) => typeof f !== "string" || !f.trim())) {
          throw new DislopConfigError(
            `overrides[${i}].files in '${layer.source}' must contain only non-empty strings`,
          );
        }
        for (const arrField of ["packs", "extraPacks", "ignore"]) {
          if (
            ov[arrField] !== undefined &&
            (!Array.isArray(ov[arrField]) || ov[arrField].some((x) => typeof x !== "string"))
          ) {
            throw new DislopConfigError(
              `overrides[${i}].${arrField} in '${layer.source}' must be an array of strings`,
            );
          }
        }
        merged.overrides.push({
          files: filesList.map((f) => f.trim()),
          packs: Array.isArray(ov.packs) ? ov.packs : undefined,
          extraPacks: Array.isArray(ov.extraPacks) ? ov.extraPacks : undefined,
          failOn: ov.failOn !== undefined ? normalizeFailOnValue(ov.failOn, `overrides[${i}].failOn`) : undefined,
          lang: ov.lang !== undefined ? String(ov.lang) : undefined,
          level: ov.level !== undefined ? String(ov.level) : undefined,
          ignore: Array.isArray(ov.ignore) ? ov.ignore : undefined,
          routing: ov.routing !== undefined ? String(ov.routing) : undefined,
          origin: layer.origin,
          rules:
            ov.rules && typeof ov.rules === "object" && !Array.isArray(ov.rules)
              ? Object.fromEntries(
                  Object.entries(ov.rules).map(([rk, rv]) => [
                    rk,
                    validateRuleConfigValue(rk, rv, layer.source),
                  ]),
                )
              : undefined,
        });
      }
    }
    if (d.voice !== undefined) {
      if (!d.voice || typeof d.voice !== "object" || Array.isArray(d.voice)) {
        throw new DislopConfigError(`'voice' in '${layer.source}' must be an object`);
      }
      if (!layer.isLocalTrusted) {
        for (const vk of Object.keys(d.voice)) {
          if (vk !== "referenceFiles") {
            throw new DislopConfigError(
              `'voice.${vk}' is not permitted in shared project '${layer.source}'`,
            );
          }
        }
      }
      if (Array.isArray(d.voice.referenceFiles)) {
        const baseDir = path.dirname(layer.source);
        merged.voice.referenceFiles = d.voice.referenceFiles.map((f) => {
          const resolved = path.resolve(baseDir, expandTilde(f, env));
          if (!layer.isLocalTrusted && !isPathInsideDir(resolved, projectDir)) {
            throw new DislopConfigError(
              `'voice.referenceFiles' entry '${f}' in '${layer.source}' escapes project directory '${projectDir}'`,
            );
          }
          return resolved;
        });
      }
      if (layer.isLocalTrusted && d.voice.cachePath) {
        const resolvedCache = path.resolve(cwd, expandTilde(d.voice.cachePath, env));
        if (layer.origin !== "user" && !isPathInsideDir(resolvedCache, homeDir) && !isPathInsideDir(resolvedCache, projectDir)) {
          throw new DislopConfigError(
            `'voice.cachePath' '${d.voice.cachePath}' must stay inside dislop config dir or project root`,
          );
        }
        merged.voice.cachePath = resolvedCache;
      }
    }
    if (layer.isLocalTrusted && d.providers && typeof d.providers === "object" && !Array.isArray(d.providers)) {
      for (const [provName, provCfg] of Object.entries(d.providers)) {
        if (!provCfg || typeof provCfg !== "object") continue;
        merged.providers[provName] = { ...merged.providers[provName], ...provCfg };
      }
    }
    if (layer.isLocalTrusted && d.worklog !== undefined) {
      if (!d.worklog || typeof d.worklog !== "object" || Array.isArray(d.worklog)) {
        throw new DislopConfigError(`'worklog' in '${layer.source}' must be an object`);
      }
      if (d.worklog.enabled !== undefined) {
        if (typeof d.worklog.enabled !== "boolean") {
          throw new DislopConfigError(`'worklog.enabled' in '${layer.source}' must be a boolean`);
        }
        merged.worklog.enabled = d.worklog.enabled;
      }
      if (d.worklog.privacy !== undefined) {
        const priv = String(d.worklog.privacy).trim();
        if (!VALID_WORKLOG_PRIVACY_MODES.has(priv)) {
          throw new DislopConfigError(
            `Invalid 'worklog.privacy' value '${d.worklog.privacy}' in '${layer.source}' (expected metadata, redacted, or local-full)`,
          );
        }
        merged.worklog.privacy = priv;
      }
      if (d.worklog.dir !== undefined && d.worklog.dir !== null) {
        if (typeof d.worklog.dir !== "string" || !d.worklog.dir.trim()) {
          throw new DislopConfigError(`'worklog.dir' in '${layer.source}' must be a non-empty string`);
        }
        merged.worklog.dir = path.resolve(
          path.dirname(layer.source),
          expandTilde(d.worklog.dir.trim(), env),
        );
      }
      if (d.worklog.retentionDays !== undefined && d.worklog.retentionDays !== null) {
        merged.worklog.retentionDays = parseRetentionDaysValue(
          d.worklog.retentionDays,
          `'worklog.retentionDays' in '${layer.source}'`,
        );
      }
    }
  }

  // Apply environment variable overrides for local worklog recording
  if (env.DISLOP_WORKLOG !== undefined && String(env.DISLOP_WORKLOG).trim() !== "") {
    const rawWl = String(env.DISLOP_WORKLOG).trim().toLowerCase();
    if (rawWl === "0" || rawWl === "false" || rawWl === "off") {
      merged.worklog.enabled = false;
    } else if (rawWl === "1" || rawWl === "true" || rawWl === "on") {
      merged.worklog.enabled = true;
    } else if (VALID_WORKLOG_PRIVACY_MODES.has(rawWl)) {
      merged.worklog.enabled = true;
      merged.worklog.privacy = rawWl;
    } else {
      throw new DislopConfigError(
        `Invalid DISLOP_WORKLOG '${env.DISLOP_WORKLOG}' (expected 0/1/false/true/off/on/metadata/redacted/local-full)`,
      );
    }
  }
  if (env.DISLOP_WORKLOG_DIR !== undefined && String(env.DISLOP_WORKLOG_DIR).trim() !== "") {
    merged.worklog.dir = path.resolve(cwd, expandTilde(String(env.DISLOP_WORKLOG_DIR).trim(), env));
  }
  if (
    env.DISLOP_WORKLOG_RETENTION_DAYS !== undefined &&
    String(env.DISLOP_WORKLOG_RETENTION_DAYS).trim() !== ""
  ) {
    merged.worklog.retentionDays = parseRetentionDaysValue(
      env.DISLOP_WORKLOG_RETENTION_DAYS,
      "DISLOP_WORKLOG_RETENTION_DAYS",
    );
  }

  const projectDeclarativeRules = loadProjectDeclarativeRulesFile(projectDir);
  if (projectDeclarativeRules.length > 0) {
    merged.declarativeRules.push(...projectDeclarativeRules);
  }

  // Apply CLI flag overrides
  const explicitEngine = Boolean(cliFlags.engine);
  if (cliFlags.engine) {
    if (!VALID_ROUTING_MODES.has(cliFlags.engine)) {
      throw new DislopConfigError(
        `Invalid --engine '${cliFlags.engine}' (expected off, auto, cloud, byok, or local)`,
      );
    }
    merged.routing = cliFlags.engine;
  }
  if (cliFlags.provider) {
    merged.activeProvider = String(cliFlags.provider);
  }
  if (cliFlags.packs && cliFlags.packs.length > 0) {
    merged.packs = cliFlags.packs;
    merged.packOrigin = cliFlags.packOrigin || "cli";
  }
  if (cliFlags.failOn) {
    merged.failOn = normalizeFailOnValue(cliFlags.failOn, "--fail-on");
  }
  if (cliFlags.lang) {
    if (!["auto", "en", "zh"].includes(cliFlags.lang)) {
      throw new DislopConfigError(`Invalid --lang '${cliFlags.lang}' (expected auto, en, or zh)`);
    }
    merged.lang = cliFlags.lang;
  }
  if (cliFlags.level) {
    if (!["strong", "moderate", "hint", "all"].includes(cliFlags.level)) {
      throw new DislopConfigError(
        `Invalid --level '${cliFlags.level}' (expected strong, moderate, hint, or all)`,
      );
    }
    merged.level = cliFlags.level;
  }
  if (cliFlags.voiceFiles && cliFlags.voiceFiles.length > 0) {
    merged.voice.referenceFiles = cliFlags.voiceFiles.map((f) => path.resolve(cwd, expandTilde(f, env)));
  }
  if (cliFlags.concurrency !== undefined && cliFlags.concurrency !== null && cliFlags.concurrency !== "") {
    merged.concurrency = parseConcurrencyValue(cliFlags.concurrency, "--concurrency");
  }

  return {
    ...merged,
    explicitEngine,
    explicitFailOn: Boolean(cliFlags.failOn),
    modelOverride: cliFlags.model ? String(cliFlags.model) : null,
    noLlm: Boolean(cliFlags.noLlm) || env.DISLOP_TEST_MODE === "1" || merged.routing === "off",
    homeDir,
    userConfigPath,
    credentialsPath: path.join(homeDir, "credentials.json"),
    modelsDir: path.join(homeDir, "models"),
    loadedSources,
  };
}

export function computeFilesFingerprint(filePaths) {
  const hash = crypto.createHash("sha256");
  const sorted = [...filePaths].sort();
  for (const fp of sorted) {
    if (!fs.existsSync(fp)) continue;
    hash.update(fp);
    hash.update("\0");
    hash.update(fs.readFileSync(fp));
    hash.update("\0");
  }
  return hash.digest("hex");
}
