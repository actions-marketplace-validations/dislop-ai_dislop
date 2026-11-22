#!/usr/bin/env node
/**
 * Synchronize and validate all multi-surface distribution manifests from a single source of truth.
 *
 * Usage:
 *   node scripts/sync_manifests.mjs                  # Write/update manifests (default channel: github)
 *   node scripts/sync_manifests.mjs --check          # Verify all manifests match SSOT and pass schema guards
 *   node scripts/sync_manifests.mjs --channel registry  # Switch .mcp.json / mcp.json to published npm `dislop@<version>`
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const channelIdx = args.indexOf("--channel");
const explicitChannel = channelIdx >= 0 ? args[channelIdx + 1] : null;

const coreMjs = fs.readFileSync(path.join(ROOT, "src", "core.mjs"), "utf8");
const pyEngine = fs.readFileSync(path.join(ROOT, "src", "dislop", "engine.py"), "utf8");
const jsVerMatch = coreMjs.match(/export const ENGINE_VERSION = "([^"]+)";/);
const pyVerMatch = pyEngine.match(/ENGINE_VERSION = "([^"]+)"/);

assert.ok(jsVerMatch, "Could not extract ENGINE_VERSION from src/core.mjs");
assert.ok(pyVerMatch, "Could not extract ENGINE_VERSION from src/dislop/engine.py");
assert.equal(
  jsVerMatch[1],
  pyVerMatch[1],
  `Engine version mismatch: src/core.mjs (${jsVerMatch[1]}) !== src/dislop/engine.py (${pyVerMatch[1]})`
);

const VERSION = jsVerMatch[1];

// Detect existing channel in .mcp.json if --channel is not explicitly provided
let channel = explicitChannel;
if (!channel) {
  try {
    const curMcp = JSON.parse(fs.readFileSync(path.join(ROOT, ".mcp.json"), "utf8"));
    const curArgs = curMcp?.mcpServers?.dislop?.args || [];
    channel = curArgs.some((a) => String(a).startsWith("github:")) ? "github" : "registry";
  } catch {
    channel = "github";
  }
}
assert.ok(channel === "github" || channel === "registry", `Invalid --channel '${channel}' (expected github or registry)`);

const npxPackageSpec = channel === "registry" ? `dislop@${VERSION}` : "github:dislop-ai/dislop";

const META = {
  name: "dislop",
  mcpName: "io.github.dislop-ai/dislop",
  version: VERSION,
  homepage: "https://dislop.com",
  privacyUrl: "https://dislop.com/privacy.md",
  remoteMcpUrl: "https://dislop.com/mcp",
  repoUrl: "https://github.com/dislop-ai/dislop",
  author: {
    name: "dislop-ai",
    url: "https://dislop.com",
  },
  license: "Apache-2.0",
  brandColor: "#F04438",
  shortSubtitle: "Catch AI slop before shipping",
  serverDescription: "Zero-dependency anti-slop linter & Cloud MCP for AI-written docs, slides, and web UI.",
  pluginDescription:
    "Zero-dependency anti-slop Skill, CLI, and MCP linter for AI-written docs, Word/PowerPoint decks, and web pages (7 built-in packs, 42 rules, 53 patterns, and bundled 15 KB Pocket ML).",
  keywords: [
    "anti-slop",
    "de-slop",
    "ai-slop",
    "writing",
    "linter",
    "proofreading",
    "mcp",
    "agent-skill",
    "docx",
    "pptx",
  ],
  defaultPrompts: [
    "Check my draft for AI slop, replacement slogans, and template UI while keeping every number and qualifier intact.",
    "Audit docs/ and slides for AI artifacts, clichés, and rhythm monotony with dislop.",
    "Review this HTML/JSX page with the deck-and-ui pack for dead links, neon gradients, and pill soup.",
  ],
};

// Schema invariants enforced at build/CI time
assert.ok(
  META.serverDescription.length <= 100,
  `server.json description exceeds 100-char MCP Registry cap (${META.serverDescription.length} chars)`
);
assert.ok(
  META.shortSubtitle.length <= 30,
  `OpenAI interface.shortDescription exceeds 30-char cap (${META.shortSubtitle.length} chars)`
);

const stdioServerEntry = {
  command: "npx",
  args: ["--yes", npxPackageSpec, "--mcp"],
};

const targets = [
  {
    rel: ".mcp.json",
    content:
      JSON.stringify(
        {
          mcpServers: {
            dislop: stdioServerEntry,
          },
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: "mcp.json",
    content:
      JSON.stringify(
        {
          $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
          mcpServers: {
            dislop: stdioServerEntry,
          },
        },
        null,
        2
      ) + "\n",
  },
  {
    // Strictly closed top-level schema per https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
    rel: "plugin.json",
    content:
      JSON.stringify(
        {
          $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
          name: META.name,
          version: META.version,
          description: META.pluginDescription,
          author: META.author,
          homepage: META.homepage,
          repository: META.repoUrl,
          license: META.license,
          keywords: META.keywords,
          extensions: {
            "com.openai": {
              interface: {
                displayName: "dislop",
                shortDescription: META.shortSubtitle,
                longDescription: META.pluginDescription,
                developerName: META.author.name,
                category: "Productivity",
                capabilities: ["Interactive", "Read"],
                defaultPrompt: META.defaultPrompts[0],
              },
            },
          },
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: ".codex-plugin/plugin.json",
    content:
      JSON.stringify(
        {
          name: META.name,
          version: META.version,
          description: META.pluginDescription,
          author: META.author,
          homepage: META.homepage,
          repository: META.repoUrl,
          license: META.license,
          keywords: META.keywords,
          skills: "./skills/",
          mcpServers: "./.mcp.json",
          interface: {
            displayName: "dislop",
            shortDescription: META.shortSubtitle,
            longDescription: META.pluginDescription,
            developerName: META.author.name,
            category: "Productivity",
            capabilities: ["Interactive", "Read"],
            websiteURL: META.homepage,
            privacyPolicyURL: META.privacyUrl,
            composerIcon: "./assets/logo.svg",
            logo: "./assets/logo.svg",
            logoDark: "./assets/logo.svg",
            defaultPrompt: META.defaultPrompts,
            brandColor: META.brandColor,
            screenshots: [],
          },
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: ".agents/plugins/marketplace.json",
    content:
      JSON.stringify(
        {
          name: "dislop-ai",
          interface: {
            displayName: "dislop Official Plugins",
          },
          plugins: [
            {
              name: META.name,
              source: {
                source: "local",
                path: ".",
              },
              policy: {
                installation: "AVAILABLE",
                authentication: "ON_INSTALL",
              },
              category: "Productivity",
            },
          ],
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: ".claude-plugin/plugin.json",
    content:
      JSON.stringify(
        {
          name: META.name,
          version: META.version,
          description: META.pluginDescription,
          author: META.author,
          homepage: META.homepage,
          repository: META.repoUrl,
          license: META.license,
          keywords: ["anti-slop", "de-slop", "writing", "linter", "mcp", "skill"],
          skills: "./skills/",
          mcpServers: "./.mcp.json",
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: ".claude-plugin/marketplace.json",
    content:
      JSON.stringify(
        {
          name: "dislop-ai",
          owner: {
            name: "dislop-ai",
            url: "https://github.com/dislop-ai",
          },
          metadata: {
            description: "Official dislop plugin marketplace: anti-slop Agent Skill and local stdio MCP linter.",
            version: META.version,
          },
          plugins: [
            {
              name: META.name,
              source: "./",
              description: META.pluginDescription,
              version: META.version,
              author: META.author,
              homepage: META.homepage,
              repository: META.repoUrl,
              license: META.license,
              keywords: ["anti-slop", "writing", "ui", "mcp", "skill"],
            },
          ],
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: "gemini-extension.json",
    content:
      JSON.stringify(
        {
          name: META.name,
          version: META.version,
          description: META.pluginDescription,
          mcpServers: {
            dislop: {
              command: "node",
              args: ["${extensionPath}/bin/dislop-mcp.mjs"],
            },
          },
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: "server.json",
    content:
      JSON.stringify(
        {
          $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
          name: META.mcpName,
          title: "dislop",
          description: META.serverDescription,
          version: META.version,
          websiteUrl: META.homepage,
          repository: {
            url: META.repoUrl,
            source: "github",
          },
          packages: [
            {
              registryType: "npm",
              identifier: META.name,
              version: META.version,
              runtimeHint: "npx",
              packageArguments: [
                {
                  type: "positional",
                  value: "--mcp",
                },
              ],
              transport: {
                type: "stdio",
              },
            },
            {
              registryType: "pypi",
              identifier: META.name,
              version: META.version,
              runtimeHint: "uvx",
              packageArguments: [
                {
                  type: "positional",
                  value: "--mcp",
                },
              ],
              transport: {
                type: "stdio",
              },
            },
          ],
          remotes: [
            {
              type: "streamable-http",
              url: META.remoteMcpUrl,
            },
          ],
        },
        null,
        2
      ) + "\n",
  },
  {
    rel: "skills/dislop/agents/openai.yaml",
    content: [
      "interface:",
      '  display_name: "dislop"',
      '  short_description: "Catch AI slop in docs, Word/PPT decks, and web UI"',
      `  default_prompt: "Use $dislop to check my draft for AI slop, replacement slogans, and template UI while keeping every number, link, and qualifier intact."`,
      "policy:",
      "  allow_implicit_invocation: true",
      "",
    ].join("\n"),
  },
];

// Validate package.json, pyproject.toml, and SKILL.md version lockstep
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const pyproject = fs.readFileSync(path.join(ROOT, "pyproject.toml"), "utf8");
const skillMd = fs.readFileSync(path.join(ROOT, "skills", "dislop", "SKILL.md"), "utf8");

const pyProjVer = pyproject.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const skillVer = skillMd.match(/^version:\s*([^\s]+)/m)?.[1];

const driftErrors = [];
if (pkgJson.version !== VERSION) {
  driftErrors.push(`package.json version (${pkgJson.version}) !== ENGINE_VERSION (${VERSION})`);
}
if (pkgJson.mcpName !== META.mcpName) {
  driftErrors.push(`package.json mcpName (${pkgJson.mcpName}) !== ${META.mcpName}`);
}
if (pyProjVer !== VERSION) {
  driftErrors.push(`pyproject.toml version (${pyProjVer}) !== ENGINE_VERSION (${VERSION})`);
}
if (skillVer !== VERSION) {
  driftErrors.push(`skills/dislop/SKILL.md version (${skillVer}) !== ENGINE_VERSION (${VERSION})`);
}

// Closed top-level schema check on portable plugin.json
const ALLOWED_AGENT_PLUGIN_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const portableManifest = JSON.parse(targets.find((t) => t.rel === "plugin.json").content);
for (const k of Object.keys(portableManifest)) {
  if (!ALLOWED_AGENT_PLUGIN_KEYS.has(k)) {
    driftErrors.push(`plugin.json contains disallowed top-level key '${k}' under agent-plugins.org/1.0.0`);
  }
}

for (const t of targets) {
  const fullPath = path.join(ROOT, t.rel);
  if (checkOnly) {
    if (!fs.existsSync(fullPath)) {
      driftErrors.push(`Missing manifest: ${t.rel}`);
      continue;
    }
    const existing = fs.readFileSync(fullPath, "utf8");
    if (existing !== t.content) {
      driftErrors.push(`Out-of-sync manifest: ${t.rel} (run 'node scripts/sync_manifests.mjs' to update)`);
    }
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, t.content, "utf8");
  }
}

if (driftErrors.length > 0) {
  console.error("dislop manifest check failed:");
  for (const e of driftErrors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `dislop manifests ${checkOnly ? "verified" : "synced"}: v${VERSION} (${targets.length} manifests, channel=${channel})`
);
