#!/usr/bin/env node
if (!process.argv.includes("--mcp")) {
  process.argv.push("--mcp");
}
await import("./dislop.mjs");
