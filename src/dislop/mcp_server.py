"""Zero-dependency MCP stdio JSON-RPC server matching `bin/dislop.mjs --mcp`."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from .engine import (
    ENGINE_VERSION,
    audit_text,
    detect_modality,
    inspect_file,
    load_all_packs,
    load_config,
    pick_pack_for_file,
    resolve_effective_pack,
)


def _send(msg: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _tool_result(req_id: Any, payload: dict[str, Any], is_error: bool = False) -> None:
    _send(
        {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "isError": is_error,
                "content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False, indent=2)}],
            },
        }
    )


TOOLS = [
    {
        "name": "dislop_check",
        "description": (
            "Check a draft (`text` or workspace-relative `path`) for AI-generation artifacts, clichés, and template slop "
            "across Markdown, HTML/CSS/JSX/SVG, Word (.docx), and PowerPoint (.pptx). Edit only the flagged spans, then run `dislop_check` again."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Draft text to inspect in memory"},
                "path": {"type": "string", "description": "Workspace-relative file path (.md, .html, .css, .jsx, .svg, .docx, .pptx)"},
                "pack": {"type": "string", "description": "Style pack ID (business-brief, literary-essay, deck-and-ui)"},
                "filename": {"type": "string", "description": "Virtual filename hint when inspecting `text`"},
            },
        },
    },
    {
        "name": "dislop_explain",
        "description": "Retrieve the rationale, check question, and before/trap/after examples for a specific `ruleId`.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "ruleId": {"type": "string"},
                "lang": {"type": "string"},
            },
            "required": ["ruleId"],
        },
    },
    {
        "name": "dislop_packs",
        "description": "List installed rule packs, supported formats, and rule counts.",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def run_mcp_stdio() -> None:
    packs = load_all_packs()
    cwd = Path.cwd().resolve()
    config = load_config(cwd)

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        if req_id is None:
            continue
        method = req.get("method")
        params = req.get("params") or {}

        if method == "initialize":
            client_ver = params.get("protocolVersion", "2024-11-05")
            _send(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": client_ver,
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "dislop", "version": ENGINE_VERSION},
                    },
                }
            )
            continue

        if method == "ping":
            _send({"jsonrpc": "2.0", "id": req_id, "result": {}})
            continue

        if method == "tools/list":
            _send({"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}})
            continue

        if method == "tools/call":
            name = params.get("name")
            args = params.get("arguments") or {}
            try:
                if name == "dislop_packs":
                    items = [
                        {
                            "id": p["id"],
                            "tier": p.get("tier"),
                            "name": p["name"],
                            "modalities": p["modalities"],
                            "ruleCount": len(p.get("rules", [])),
                            "summary": p["summary"],
                        }
                        for p in packs.values()
                    ]
                    _tool_result(req_id, {"packs": items})
                    continue

                if name == "dislop_explain":
                    rid = args.get("ruleId")
                    if not rid:
                        _tool_result(req_id, {"error": "Missing required argument `ruleId`"}, True)
                        continue
                    found = None
                    for p in packs.values():
                        for r in p.get("rules", []):
                            if r["id"] == rid:
                                found = {"packId": p["id"], **r}
                                break
                    if found:
                        _tool_result(req_id, found)
                    else:
                        _tool_result(req_id, {"error": f"Unknown ruleId '{rid}'"}, True)
                    continue

                if name == "dislop_check":
                    has_text = isinstance(args.get("text"), str)
                    has_path = isinstance(args.get("path"), str) and bool(args["path"].strip())
                    if has_text == has_path:
                        _tool_result(
                            req_id,
                            {"error": "Provide exactly one of `text` (in-memory string) or `path` (workspace file path)."},
                            True,
                        )
                        continue

                    if has_text:
                        fn = args.get("filename") or "draft.md"
                        mod = detect_modality(fn) or "markdown"
                        pack_id = pick_pack_for_file(fn, mod, args.get("pack"), config)
                        pack = resolve_effective_pack(pack_id, packs, config)
                        res = audit_text(args["text"], filename=fn, modality=mod, pack=pack, config=config)
                        _tool_result(
                            req_id,
                            {
                                "pack": pack_id,
                                "modality": mod,
                                "checked": True,
                                "skipped": [],
                                "count": len(res["findings"]),
                                "findings": res["findings"],
                            },
                        )
                        continue

                    resolved = (cwd / args["path"]).resolve()
                    try:
                        rel = resolved.relative_to(cwd).as_posix()
                    except ValueError:
                        _tool_result(req_id, {"error": "Path must stay within the current workspace directory."}, True)
                        continue
                    if not resolved.is_file():
                        _tool_result(req_id, {"error": f"File not found: {args['path']}"}, True)
                        continue
                    mod = detect_modality(resolved.name)
                    if not mod:
                        _tool_result(req_id, {"error": f"Unsupported file extension for '{args['path']}'"}, True)
                        continue
                    res = inspect_file(resolved, rel, packs, args.get("pack"), config)
                    _tool_result(
                        req_id,
                        {
                            "pack": pick_pack_for_file(rel, mod, args.get("pack"), config),
                            "modality": mod,
                            "checked": res["checked"],
                            "skipped": res["skipped"],
                            "count": len(res["findings"]),
                            "findings": res["findings"],
                        },
                    )
                    continue

                _tool_result(req_id, {"error": f"Unknown tool '{name}'"}, True)
            except Exception as exc:
                _tool_result(req_id, {"error": str(exc)}, True)
            continue

        _send({"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}})


def main() -> None:
    run_mcp_stdio()


if __name__ == "__main__":
    main()
