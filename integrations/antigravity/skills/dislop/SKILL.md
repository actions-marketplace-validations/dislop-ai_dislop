---
name: dislop
version: 0.6.2
description: Prevent, diagnose, and clean up AI slop in docs, RFCs, slide decks, and web pages. Local progressive references + offline CLI (7 packs, 42 rules, 14.6 KB Pocket ML, offline voice) + optional Cloud MCP.
---

# dislop

- **Local Skill (`0` network)**: Apply the rules below; read only the matching local file under `./references/`.
- **Offline CLI & 7-tool stdio MCP (`< 250 KB`, `0` uploads)**: 7 packs (`42` rules), `14.6 KB` Pocket ML (`--ml`), 11 bank probes (`--patterns`), and offline voice (`dislop voice`).
- **Optional Cloud MCP (`https://dislop.com/mcp`)**: Non-confidential text when no local shell exists (`30` free credits/mo).

## Local References

- Briefs, PRDs, RFCs, PRs & postmortems -> `./references/business-and-rfc.md`
- Essays, columns & narrative cadence -> `./references/editorial-and-essay.md`
- Web UI (`HTML/CSS/JSX`) & `.pptx` decks -> `./references/web-ui-and-deck.md`
- Regulated comms & rewrite precision -> `./references/regulated-and-precision.md`

*(Web fallback only when `./references/` is absent: `https://dislop.com/llms.txt`.)*

## 1. Write Plainly First

1. Open on a concrete file, metric, ticket, command, or scene.
2. Replace corporate buzz-clusters (`leverage`, `streamline`, `robust`) with facts.
3. Skip 3-part semicolon pitches, `"Why...? Because..."` hooks, 5-comma run-ons, and repeated paragraph openers.
4. Never swap clichés for `"Not X — it's Y"` pivots, staccato slogans, or moralizing closers.
5. Keep languages separate while keeping exact identifiers and units (`Q4`, `TPS`, `P99`, `42ms`).
6. Avoid `href="#"`, unexplained `<button disabled>`, purple-pink gradients, pill walls (`> 6`), and `"Overview"` slide titles.

## 2. Run Offline CLI or Local MCP

Packs (`core` errors always on, or `--pack auto`): `business-brief`, `engineering-spec`, `regulated-comms`, `literary-essay`, `deck-and-ui`, `executive-deck`.

```bash
npx --yes dislop check <path> --pack auto --profile --ml --patterns --format json
npx --yes dislop voice <sample.md> -o .dislop.local/voice.json
npx --yes dislop model status
```

Local stdio MCP (7 tools): `dislop_check`, `dislop_voice_extract_offline`, `dislop_model_score`, `dislop_model_status`, `dislop_explain`, `dislop_packs`, `dislop_catalog`.

## 3. Edit & Re-Check

Fix `core` `error` items first, inspect `dislop explain <rule-id>` as needed, keep numbers, qualifiers (`"up to"`, `"at least"`), URLs, and code spans exact, then re-run `dislop check`.

## Optional Cloud MCP

```json
{
  "mcpServers": {
    "dislop-cloud": {
      "url": "https://dislop.com/mcp",
      "headers": {
        "Authorization": "Bearer dslp_your_token_here"
      }
    }
  }
}
```
