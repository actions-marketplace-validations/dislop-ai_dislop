from __future__ import annotations

import json
import sys
from pathlib import Path

from . import __version__
from .engine import audit_path, audit_text, load_packs


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def run_stdio() -> None:
    packs = load_packs()
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            req = json.loads(raw)
        except json.JSONDecodeError:
            continue
        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params") or {}
        if method == "initialize":
            _emit(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "dislop", "version": __version__},
                    },
                }
            )
        elif method == "tools/list":
            _emit(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": [
                            {
                                "name": "dislop_check",
                                "description": "Audit prose text or a local file/directory (MD, HTML, DOCX, PPTX) against a Taste Pack before delivery.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "text": {"type": "string", "description": "Raw text/Markdown to audit"},
                                        "path": {"type": "string", "description": "Optional path to MD, HTML, DOCX, PPTX, or directory"},
                                        "pack": {"type": "string", "default": "business-brief"},
                                    },
                                },
                            },
                            {
                                "name": "dislop_packs",
                                "description": "List installed Taste Packs and their supported modalities.",
                                "inputSchema": {"type": "object", "properties": {}},
                            },
                            {
                                "name": "dislop_exemplars",
                                "description": "Fetch before/after editorial exemplars and rationales from a Taste Pack.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {"pack": {"type": "string", "default": "business-brief"}},
                                },
                            },
                        ]
                    },
                }
            )
        elif method == "tools/call":
            name = params.get("name")
            arguments = params.get("arguments") or {}
            try:
                if name == "dislop_check":
                    if arguments.get("path"):
                        report = audit_path(Path(str(arguments["path"])), arguments.get("pack"))
                    else:
                        report = audit_text(str(arguments.get("text", "")), str(arguments.get("pack") or "business-brief"))
                    _emit({"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(report, ensure_ascii=False, indent=2)}]}})
                elif name == "dislop_packs":
                    summary = [
                        {"id": p["id"], "name": p["name"], "modalities": p.get("modalities", []), "rules": len(p.get("rules", []))}
                        for p in packs.values()
                    ]
                    _emit({"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(summary, ensure_ascii=False, indent=2)}]}})
                elif name == "dislop_exemplars":
                    pack = packs.get(str(arguments.get("pack", "business-brief"))) or {}
                    _emit({"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(pack.get("exemplars", []), ensure_ascii=False, indent=2)}]}})
                else:
                    _emit({"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {name}"}})
            except Exception as exc:
                _emit({"jsonrpc": "2.0", "id": req_id, "error": {"code": -32000, "message": str(exc)}})
        elif req_id is not None:
            _emit({"jsonrpc": "2.0", "id": req_id, "result": {}})


def main() -> None:
    run_stdio()


if __name__ == "__main__":
    main()
