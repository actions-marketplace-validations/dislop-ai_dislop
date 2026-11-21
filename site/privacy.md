---
content-type: reference-data
version: 0.4.0
snapshot: 2026-11-21
---

# Privacy & Data Boundaries

`dislop` separates its **open-source offline tools** from its **optional hosted cloud service** so you always know whether text leaves your machine.

## 1. Open-Source Offline Tools (Zero Uploads, Zero Telemetry)

- **CLI (`dislop check`, `explain`, `packs`, `resources`)**, **Agent Skill (`SKILL.md`)**, **Local stdio MCP (`--mcp`)**, and the **default browser workbench** run 100% locally.
- `dislop check` makes zero network calls.
- `dislop.com` loads zero third-party fonts, analytics, or external scripts (`Content-Security-Policy: connect-src 'self'`).

## 2. Optional Hosted Cloud AI (`/api/v1/*` & `/mcp`)

Data is sent to `dislop.com` **only** when you explicitly click an AI button in the workbench, claim a free token, submit the early-access waitlist, or call an authenticated Remote MCP tool:

- **Upstream Model Provider**: Google Gemini API on a **paid-tier key** (prompts and outputs are not used to train Google models under paid-tier terms).
- **Zero Draft Storage**: Draft text is processed in memory and never written to disk or server logs.
- **Account & Abuse-Control Records**:
  - When you claim a free token (`POST /api/v1/auth/register`), we store your email, a one-way **SHA-256 hash** of your Bearer token (never the plaintext key), and your monthly credit counter.
  - For anonymous web demos (5 credits/day), we keep an in-memory/ephemeral daily counter keyed by `YYYY-MM-DD:<client-ip>` that is pruned after the day ends.
  - Re-registering with the same email rotates and invalidates the previous token immediately.
- **Confidential Drafts**: Never send confidential, regulated, or unreleased source documents to any hosted cloud endpoint; use the local offline CLI or local stdio MCP instead.
