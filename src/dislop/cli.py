from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .engine import audit_path, explain_rule, load_packs
from .mcp_server import run_stdio


def _print_file_report(report: dict) -> None:
    file_label = report.get("file", "<input>")
    for f in report.get("findings", []):
        print(f"{file_label}:{f['line']}:{f['column']} [{f['severity']}] {f['ruleId']}: \"{f['match']}\" — {f['description']}")


def main(argv: list[str] | None = None) -> int:
    args_raw = list(sys.argv[1:] if argv is None else argv)
    if "--mcp" in args_raw:
        run_stdio()
        return 0

    parser = argparse.ArgumentParser(prog="dislop", description="Cross-modal anti-AI-slop quality gate")
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command")

    p_packs = sub.add_parser("packs", help="List available Taste Packs")
    p_packs.add_argument("--json", action="store_true", dest="as_json")

    p_explain = sub.add_parser("explain", help="Show rationale and before/after exemplars for a rule")
    p_explain.add_argument("rule_id", help="Rule identifier")

    p_check = sub.add_parser("check", help="Audit a file or directory against a Taste Pack")
    p_check.add_argument("path", help="File or directory path")
    p_check.add_argument("--pack", default=None, help="Taste Pack ID (business-brief, literary-essay, deck-and-ui)")
    p_check.add_argument("--json", action="store_true", dest="as_json", help="Emit JSON output")

    args = parser.parse_args(args_raw)
    if args.command == "packs":
        packs = list(load_packs().values())
        if args.as_json:
            print(json.dumps(packs, ensure_ascii=False, indent=2))
        else:
            for pack in packs:
                print(f"{pack['id']}\t({len(pack.get('rules', []))} rules)\t{pack['description']}")
        return 0

    if args.command == "explain":
        info = explain_rule(args.rule_id)
        if not info:
            print(f"Unknown rule: {args.rule_id}", file=sys.stderr)
            return 1
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return 0

    if args.command == "check":
        target = Path(args.path)
        if not target.exists():
            print(f"Path not found: {args.path}", file=sys.stderr)
            return 2
        report = audit_path(target, args.pack)
        if args.as_json:
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 0 if report["count"] == 0 else 1
        if report["count"] == 0:
            scanned = f"{report['filesScanned']} files" if "filesScanned" in report else report.get("pack", "ok")
            print(f"ok ({scanned}): 0 findings")
            return 0
        if "results" in report:
            for item in report["results"]:
                _print_file_report(item)
        else:
            _print_file_report(report)
        return 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
