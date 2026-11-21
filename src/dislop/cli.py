"""Python CLI entrypoint matching `bin/dislop.mjs`."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from .engine import (
    ENGINE_VERSION,
    SEVERITY_RANK,
    audit_text,
    collect_target_files,
    detect_modality,
    inspect_file,
    load_all_packs,
    load_config,
    pick_pack_for_file,
    resolve_effective_pack,
    verify_revision,
)
from .mcp_server import run_mcp_stdio


def _format_sarif(report: dict[str, Any], lang: str = "en") -> dict[str, Any]:
    rules_map: dict[str, dict[str, Any]] = {}
    for f in report["findings"]:
        rid = f["ruleId"]
        if rid not in rules_map:
            msg = (f.get("message") or {}).get(lang) or (f.get("message") or {}).get("en") or rid
            help_txt = (f.get("deletionTest") or {}).get(lang) or (f.get("deletionTest") or {}).get("en") or msg
            rules_map[rid] = {
                "id": rid,
                "shortDescription": {"text": msg},
                "help": {"text": help_txt},
                "helpUri": f"https://dislop.com/#rule-{rid}",
                "defaultConfiguration": {
                    "level": "error" if f["severity"] == "error" else "warning" if f["severity"] == "warning" else "note"
                },
            }
    return {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "dislop",
                        "version": ENGINE_VERSION,
                        "informationUri": "https://dislop.com",
                        "rules": list(rules_map.values()),
                    }
                },
                "results": [
                    {
                        "ruleId": f["ruleId"],
                        "level": "error" if f["severity"] == "error" else "warning" if f["severity"] == "warning" else "note",
                        "message": {
                            "text": f"{(f.get('message') or {}).get(lang) or (f.get('message') or {}).get('en')} — \"{f['match']}\""
                        },
                        "locations": [
                            {
                                "physicalLocation": {
                                    "artifactLocation": {"uri": str(f["file"]).removeprefix("./")},
                                    "region": {
                                        "startLine": max(1, int(f.get("line") or 1)),
                                        "startColumn": max(1, int(f.get("col") or 1)),
                                    },
                                }
                            }
                        ],
                        "partialFingerprints": {"primaryLocationLineHash": f["fingerprint"]},
                    }
                    for f in report["findings"]
                ],
            }
        ],
    }


def format_report(report: dict[str, Any], fmt: str = "text", lang: str = "en") -> str:
    findings = report["findings"]
    checked_count = report["checkedCount"]
    skipped = report.get("skipped", [])
    unused = report.get("unusedSuppressions", [])

    if fmt == "json":
        return json.dumps(report, ensure_ascii=False, indent=2)
    if fmt == "sarif":
        return json.dumps(_format_sarif(report, lang), ensure_ascii=False, indent=2)
    if fmt == "github":
        lines = []
        for f in findings:
            lvl = "error" if f["severity"] == "error" else "warning" if f["severity"] == "warning" else "notice"
            msg = ((f.get("message") or {}).get(lang) or (f.get("message") or {}).get("en") or "").replace("\n", " ")
            lines.append(f"::{lvl} file={f['file']},line={f.get('line', 1)},col={f.get('col', 1)},title={f['ruleId']}::{msg} ({f['match']})")
        return "\n".join(lines)
    if fmt == "md":
        rows = [
            "| Severity | File | Location | Rule | Match | Guidance |",
            "|---|---|---|---|---|---|",
        ]
        for f in findings:
            match_esc = str(f["match"]).replace("|", "\\|")
            msg = (f.get("message") or {}).get(lang) or (f.get("message") or {}).get("en") or ""
            rows.append(f"| `{f['severity']}` | `{f['file']}` | `{f['location']}` | `{f['ruleId']}` | `{match_esc}` | {msg} |")
        return "\n".join(rows)

    skip_note = f", {len(skipped)} skipped" if skipped else ""
    out: list[str] = []
    if not findings and not unused:
        out.append(f"dislop: ok ({checked_count} checked{skip_note}, 0 findings)")
    else:
        out.append(f"dislop: {len(findings)} finding(s) across {checked_count} checked file(s){skip_note}")
        for f in findings:
            msg = (f.get("message") or {}).get(lang) or (f.get("message") or {}).get("en") or ""
            out.append(f"  [{f['severity'].upper()}] {f['file']}:{f['location']}  {f['ruleId']}")
            out.append(f'    match: "{f["match"]}"')
            out.append(f"    why:   {msg}")
            dt = f.get("deletionTest")
            if dt:
                out.append(f"    test:  {dt.get(lang) or dt.get('en')}")
        for u in unused:
            out.append(f"  [UNUSED] {u['file']}:{u['line']}  stale dislop-ignore ({', '.join(u['ruleIds'])})")
    for s in skipped:
        out.append(f"  [SKIP] {s['file']} — {s['reason']}")
    return "\n".join(out)


def _get_changed_lines(cwd: Path, git_ref: str, staged: bool) -> dict[str, set[int] | str]:
    cmd = ["git", "diff", "--cached", "-U0", "--no-color"] if staged else ["git", "diff", "-U0", "--no-color", git_ref]
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=True)
    changed: dict[str, set[int] | str] = {}
    cur_file: str | None = None
    for line in res.stdout.splitlines():
        if line.startswith("diff --git "):
            dm = re.match(r"^diff --git a/.+ b/(.+)$", line)
            cur_file = dm.group(1).strip() if dm else None
        elif line.startswith("+++ b/"):
            cur_file = line[6:].strip()
            changed.setdefault(cur_file, set())
        elif line.startswith("Binary files ") and cur_file:
            changed[cur_file] = "ALL"
        elif line.startswith("@@ ") and cur_file:
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            if m and isinstance(changed.get(cur_file), set):
                start = int(m.group(1))
                cnt = int(m.group(2)) if m.group(2) is not None else 1
                target_set = changed[cur_file]
                assert isinstance(target_set, set)
                for k in range(max(1, cnt)):
                    target_set.add(start + k)
    return changed


def _cmd_check(ns: argparse.Namespace, packs: dict[str, dict[str, Any]]) -> int:
    cwd = Path.cwd()
    config = load_config(cwd, ns.config)
    fmt = "json" if ns.json else ns.format
    fail_on = ns.fail_on or config.get("failOn", "error")
    if fail_on not in SEVERITY_RANK:
        print(f"dislop: invalid --fail-on '{fail_on}'", file=sys.stderr)
        return 2

    if "-" in ns.paths:
        stdin_text = sys.stdin.read()
        fn = ns.stdin_filename or "stdin.md"
        mod = detect_modality(fn) or "markdown"
        pack_id = pick_pack_for_file(fn, mod, ns.pack, config)
        pack = resolve_effective_pack(pack_id, packs, config)
        res = audit_text(stdin_text, filename=fn, modality=mod, pack=pack, config=config)
        report = {
            "version": ENGINE_VERSION,
            "checkedCount": 1,
            "skipped": [],
            "findings": res["findings"],
            "unusedSuppressions": res["unusedSuppressions"] if ns.report_unused else [],
        }
        print(format_report(report, fmt, ns.lang))
        triggered = any(SEVERITY_RANK[f["severity"]] >= SEVERITY_RANK[fail_on] for f in res["findings"]) or (
            ns.report_unused and len(res["unusedSuppressions"]) > 0
        )
        return 1 if triggered else 0

    changed_map: dict[str, set[int] | str] | None = None
    if ns.changed is not None or ns.staged:
        try:
            changed_map = _get_changed_lines(cwd, ns.changed or "HEAD", ns.staged)
        except Exception as exc:
            print(f"dislop: failed to read git diff: {exc}", file=sys.stderr)
            return 2

    targets = ns.paths or ([p for p in (changed_map or {}) if (cwd / p).exists()] if changed_map is not None else ["."])
    try:
        files, skipped_init = collect_target_files(targets, cwd, config)
    except Exception as exc:
        print(f"dislop: {exc}", file=sys.stderr)
        return 2

    all_findings: list[dict[str, Any]] = []
    all_skipped = list(skipped_init)
    all_unused: list[dict[str, Any]] = []
    checked_count = 0
    explicit_targets = {(cwd / p).resolve() for p in ns.paths}
    explicit_uninspectable = bool(skipped_init)

    for abs_p, rel in files:
        if changed_map is not None and rel not in changed_map:
            continue
        try:
            res = inspect_file(abs_p, rel, packs, ns.pack, config)
        except Exception as exc:
            print(f"dislop: {exc}", file=sys.stderr)
            return 2
        if res["checked"]:
            checked_count += 1
        elif abs_p in explicit_targets:
            explicit_uninspectable = True

        f_list = res["findings"]
        if changed_map is not None and rel in changed_map:
            allowed = changed_map[rel]
            if isinstance(allowed, set):
                f_list = [f for f in f_list if f.get("line") in allowed]

        all_findings.extend(f_list)
        all_skipped.extend(res["skipped"])
        if ns.report_unused:
            all_unused.extend(res["unusedSuppressions"])

    report = {
        "version": ENGINE_VERSION,
        "checkedCount": checked_count,
        "skipped": all_skipped,
        "findings": all_findings,
        "unusedSuppressions": all_unused,
    }
    rendered = format_report(report, fmt, ns.lang)
    if rendered:
        print(rendered)

    if explicit_uninspectable or (checked_count == 0 and len(all_skipped) > 0):
        return 2
    should_fail = any(SEVERITY_RANK[f["severity"]] >= SEVERITY_RANK[fail_on] for f in all_findings) or (
        ns.report_unused and len(all_unused) > 0
    )
    return 1 if should_fail else 0


def _cmd_verify(ns: argparse.Namespace, packs: dict[str, dict[str, Any]]) -> int:
    cwd = Path.cwd()
    config = load_config(cwd, ns.config)
    before_text = ns.before_text if ns.before_text is not None else (cwd / ns.before).read_text(encoding="utf-8") if ns.before else None
    after_text = ns.after_text if ns.after_text is not None else (cwd / ns.after).read_text(encoding="utf-8") if ns.after else None
    if before_text is None or after_text is None:
        print("Usage: dislop verify <before> <after> [--pack <id>] [--allow-drop] [--json]", file=sys.stderr)
        return 2

    fn = ns.after or ns.before or "draft.md"
    mod = detect_modality(fn) or "markdown"
    pack_id = pick_pack_for_file(fn, mod, ns.pack, config)
    pack = resolve_effective_pack(pack_id, packs, config)
    res = verify_revision(before_text, after_text, filename=fn, modality=mod, pack=pack, config=config, allow_fact_drop=ns.allow_drop)
    if ns.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    elif res["ok"]:
        print(f"dislop verify: ACCEPTED (findings {res['beforeCount']} -> {res['afterCount']}; all protected facts preserved)")
    else:
        print(f"dislop verify: REJECTED (findings {res['beforeCount']} -> {res['afterCount']})")
        for reason in res["reasons"]:
            print(f"  - {reason}")
    return 0 if res["ok"] else 1


def _cmd_explain(ns: argparse.Namespace, packs: dict[str, dict[str, Any]]) -> int:
    for pack in packs.values():
        for rule in pack.get("rules", []):
            if rule["id"] == ns.rule_id:
                if ns.json:
                    print(json.dumps({"packId": pack["id"], **rule}, ensure_ascii=False, indent=2))
                    return 0
                lang = ns.lang
                print(f"{rule['id']}  [{rule.get('tier')} / {rule.get('severity')}]  (pack: {pack['id']})")
                print(f"Modalities: {', '.join(rule.get('modalities', []))}")
                print(f"Why:        {rule['message'].get(lang) or rule['message'].get('en')}")
                dt = rule.get("deletionTest")
                if dt:
                    print(f"Test:       {dt.get(lang) or dt.get('en')}")
                ex = rule.get("exemplar")
                if ex:
                    print(f"\nBefore (bad):  {ex['bad']}")
                    if ex.get("trap"):
                        print(f"Trap (avoid):  {ex['trap']}")
                    print(f"After (good):  {ex['good']}")
                    if ex.get("note"):
                        print(f"Note:          {ex['note'].get(lang) or ex['note'].get('en')}")
                return 0
    print(f"dislop: unknown rule '{ns.rule_id}'", file=sys.stderr)
    return 2


def _cmd_packs(ns: argparse.Namespace, packs: dict[str, dict[str, Any]]) -> int:
    items = [
        {
            "id": p["id"],
            "version": p["version"],
            "tier": p.get("tier"),
            "extends": p.get("extends", []),
            "name": p["name"],
            "modalities": p["modalities"],
            "ruleCount": len(p.get("rules", [])),
            "summary": p["summary"],
        }
        for p in packs.values()
    ]
    if ns.json:
        print(json.dumps(items, ensure_ascii=False, indent=2))
        return 0
    for item in items:
        print(f"{item['id']:<18} [{item['tier']}] ({item['ruleCount']} rules) — {item['name']['en']} / {item['name']['zh']}")
        print(f"  modalities: {', '.join(item['modalities'])}")
    return 0


def _cmd_pack_test(packs: dict[str, dict[str, Any]]) -> int:
    errors: list[str] = []
    assertions = 0
    for pack in packs.values():
        if pack.get("schema") != "dislop.pack/2":
            errors.append(f"{pack['id']}: expected schema 'dislop.pack/2'")
        eff = resolve_effective_pack(pack["id"], packs, {})
        for rule in pack.get("rules", []):
            rid = rule["id"]
            if not (rule.get("deletionTest") or {}).get("en") or not (rule.get("deletionTest") or {}).get("zh"):
                errors.append(f"{pack['id']}/{rid}: missing bilingual deletionTest")
            ex = rule.get("exemplar") or {}
            if not ex.get("bad") or not ex.get("good") or not ex.get("source"):
                errors.append(f"{pack['id']}/{rid}: missing exemplar")
            hits = (rule.get("fixtures") or {}).get("hit", [])
            cleans = (rule.get("fixtures") or {}).get("clean", [])
            if not hits or not cleans:
                errors.append(f"{pack['id']}/{rid}: requires hit and clean fixtures")
            mod = (rule.get("modalities") or ["markdown"])[0]
            for h in hits:
                assertions += 1
                res = audit_text(h, filename=f"fixture.{mod}", modality=mod, pack=eff, allow_synthetic_fixtures=True)
                if not any(f["ruleId"] == rid for f in res["findings"]):
                    errors.append(f"{pack['id']}/{rid}: hit fixture missed: {h!r}")
            for c in cleans:
                assertions += 1
                res = audit_text(c, filename=f"fixture.{mod}", modality=mod, pack=eff, allow_synthetic_fixtures=True)
                if any(f["ruleId"] == rid for f in res["findings"]):
                    errors.append(f"{pack['id']}/{rid}: clean fixture falsely triggered: {c!r}")
    if errors:
        print(f"dislop pack-test: FAILED ({len(errors)} error(s) across {assertions} assertions)", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print(f"dislop pack-test: ok ({len(packs)} packs, {assertions} fixture assertions passed)")
    return 0


def _cmd_init() -> int:
    cwd = Path.cwd()
    cfg = cwd / ".dislop.json"
    if not cfg.exists():
        starter = {
            "failOn": "error",
            "ignore": ["vendor/**", "dist/**"],
            "overrides": [{"files": ["docs/**/*.md"], "pack": "business-brief"}],
            "allow": [],
            "rules": {},
        }
        cfg.write_text(json.dumps(starter, indent=2) + "\n", encoding="utf-8")
        print(f"Created {cfg}")
    else:
        print(f"{cfg} already exists")
    gi = cwd / ".gitignore"
    if gi.is_file():
        cur = gi.read_text(encoding="utf-8")
        if ".dislop.local.json" not in cur.splitlines():
            gi.write_text(cur.rstrip() + "\n.dislop.local.json\n", encoding="utf-8")
            print("Added .dislop.local.json to .gitignore")
    return 0


def main(argv: list[str] | None = None) -> None:
    args = list(sys.argv[1:] if argv is None else argv)
    if "--mcp" in args:
        run_mcp_stdio()
        return

    parser = argparse.ArgumentParser(prog="dislop", description="Local linter for AI-written docs, slides, and web pages")
    parser.add_argument("-v", "--version", action="version", version=ENGINE_VERSION)
    sub = parser.add_subparsers(dest="cmd")

    p_check = sub.add_parser("check", help="Audit files or directories")
    p_check.add_argument("paths", nargs="*")
    p_check.add_argument("--pack", default=None)
    p_check.add_argument("--config", default=None)
    p_check.add_argument("--fail-on", default=None)
    p_check.add_argument("--format", default="text", choices=["text", "json", "sarif", "github", "md"])
    p_check.add_argument("--json", action="store_true")
    p_check.add_argument("--changed", nargs="?", const="HEAD", default=None)
    p_check.add_argument("--staged", action="store_true")
    p_check.add_argument("--stdin-filename", default=None)
    p_check.add_argument("--report-unused", action="store_true")
    p_check.add_argument("--lang", default="en", choices=["en", "zh"])

    p_ver = sub.add_parser("verify", help="Verify a candidate revision preserves protected facts and reduces findings")
    p_ver.add_argument("before", nargs="?")
    p_ver.add_argument("after", nargs="?")
    p_ver.add_argument("--before-text", default=None)
    p_ver.add_argument("--after-text", default=None)
    p_ver.add_argument("--pack", default=None)
    p_ver.add_argument("--config", default=None)
    p_ver.add_argument("--allow-drop", action="store_true")
    p_ver.add_argument("--json", action="store_true")

    p_exp = sub.add_parser("explain", help="Show Deletion Test and before/trap/after exemplar for a rule")
    p_exp.add_argument("rule_id")
    p_exp.add_argument("--lang", default="en", choices=["en", "zh"])
    p_exp.add_argument("--json", action="store_true")

    p_packs = sub.add_parser("packs", help="List installed Taste Packs")
    p_packs.add_argument("--json", action="store_true")

    sub.add_parser("pack-test", help="Validate Pack Schema v2 manifests and embedded fixtures")
    sub.add_parser("init", help="Create starter .dislop.json config")

    if not args:
        parser.print_help()
        return

    ns = parser.parse_args(args)
    packs = load_all_packs()

    if ns.cmd == "check":
        sys.exit(_cmd_check(ns, packs))
    if ns.cmd == "verify":
        sys.exit(_cmd_verify(ns, packs))
    if ns.cmd == "explain":
        sys.exit(_cmd_explain(ns, packs))
    if ns.cmd == "packs":
        sys.exit(_cmd_packs(ns, packs))
    if ns.cmd == "pack-test":
        sys.exit(_cmd_pack_test(packs))
    if ns.cmd == "init":
        sys.exit(_cmd_init())

    parser.print_help()


if __name__ == "__main__":
    main()
