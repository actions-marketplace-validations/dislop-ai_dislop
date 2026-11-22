"""Zero-dependency MCP stdio JSON-RPC server matching `bin/dislop.mjs --mcp`."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import math
import zipfile
from .engine import (
    ENGINE_VERSION,
    analyze_text_profile,
    audit_text,
    build_catalog,
    detect_modality,
    extract_voice_profile_offline,
    fnv1a_hex,
    inspect_file,
    load_all_packs,
    load_config,
    load_pattern_library,
    pick_pack_for_file,
    query_catalog,
    resolve_effective_pack,
)
from .local_model import build_model_status_report
from .pattern_engine import audit_patterns, load_pattern_banks
from .pocket_model import analyze_document_with_pocket_models, predict_pack_with_pocket_router


def _merge_pattern_bank_findings(
    existing_findings: list[dict[str, Any]],
    pat_findings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    seen = {f"{f.get('ruleId')}:{f.get('line')}" for f in existing_findings}
    out = list(existing_findings)
    for pf in pat_findings:
        key = f"{pf.get('ruleId')}:{pf.get('line')}"
        if key in seen:
            continue
        seen.add(key)
        out.append(pf)
    return out


def _build_pocket_ml_findings_mcp(
    text: str,
    filename: str,
    existing_findings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    doc = analyze_document_with_pocket_models(text)
    extras: list[dict[str, Any]] = []
    mod = detect_modality(filename) or "markdown"
    for p in doc["paragraphs"]:
        if not p["flagged"]:
            continue
        if any(p["startLine"] <= f.get("line", -1) <= p["endLine"] for f in existing_findings):
            continue
        pct = int(math.floor(p["slopProbability"] * 100.0 + 0.5))
        drv_en = "; ".join(d["reason"]["en"] for d in p["topDrivers"]) or "uniform abstract phrasing"
        drv_zh = "、".join(d["reason"]["zh"] for d in p["topDrivers"]) or "句式与用词高度均质"
        loc = str(p["startLine"])
        clean_excerpt = str(p.get("excerpt") or "")
        fp = f"pocket-stealth-vapor:{fnv1a_hex(f'pocket-stealth-vapor|{clean_excerpt.lower()}|{loc}')}"
        extras.append({
            "fingerprint": fp,
            "ruleId": "pocket-stealth-vapor",
            "packId": "pocket-model",
            "severity": "warning",
            "tier": "taste",
            "family": "rhythm/pocket-stealth-vapor",
            "category": "statistical-vapor",
            "modality": mod,
            "file": filename,
            "location": loc,
            "line": p["startLine"],
            "col": 1,
            "endLine": p["endLine"],
            "match": clean_excerpt,
            "excerpt": clean_excerpt,
            "mlProbability": p["slopProbability"],
            "message": {
                "en": f"Paragraph reads as predictable low-concreteness AI filler ({pct}% pocket-ML score: {drv_en}).",
                "zh": f"段落呈高度可预测、低事实密度的温吞水套话（内置模型评分 {pct}%：{drv_zh}）。",
            },
            "deletionTest": {
                "en": "Cut this paragraph or replace abstract cushion wrappers with one concrete event, number, file path, or direct action.",
                "zh": "删掉整段空泛铺垫，或把抽象缓冲外壳直接换成具体事件、数字、文件路径或明确动作。",
            },
        })
    return extras


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


def _localize_obj(obj: Any, lang: str | None) -> Any:
    if not isinstance(obj, dict) or lang not in {"en", "zh"}:
        return obj
    return {lang: obj.get(lang) or obj.get("en") or ""}


def _format_rule_for_explain(rule: dict[str, Any], pack_id: str, lang: Any) -> dict[str, Any]:
    clean_lang = lang if lang in {"en", "zh"} else None
    out: dict[str, Any] = {
        "packId": pack_id,
        "id": rule["id"],
        "tier": rule.get("tier"),
        "severity": rule.get("severity"),
    }
    if rule.get("category"):
        out["category"] = rule["category"]
    if rule.get("family"):
        out["family"] = rule["family"]
    out["modalities"] = rule.get("modalities") or []
    if isinstance(rule.get("tags"), list):
        out["tags"] = rule["tags"]
    out["message"] = _localize_obj(rule.get("message"), clean_lang)
    out["deletionTest"] = _localize_obj(rule.get("deletionTest"), clean_lang)
    if rule.get("exemplar"):
        ex = dict(rule["exemplar"])
        if ex.get("note"):
            ex["note"] = _localize_obj(ex["note"], clean_lang)
        out["exemplar"] = ex
    return out


def _format_findings_for_mcp(findings: list[dict[str, Any]], verbosity: str, lang: Any) -> list[dict[str, Any]]:
    clean_lang = lang if lang in {"en", "zh"} else None
    if verbosity == "full":
        if not clean_lang:
            return findings
        return [
            {
                **f,
                "message": _localize_obj(f.get("message"), clean_lang),
                "deletionTest": _localize_obj(f.get("deletionTest"), clean_lang),
            }
            for f in findings
        ]
    return [
        {
            "fingerprint": f.get("fingerprint"),
            "ruleId": f.get("ruleId"),
            "tier": f.get("tier") if f.get("tier") is not None else "taste",
            "severity": f.get("severity"),
            "family": f.get("family") if f.get("family") is not None else (f"{f['dimension']}/{f['ruleId']}" if f.get("dimension") else None),
            "file": f.get("file"),
            "modality": f.get("modality"),
            "location": f.get("location"),
            "line": f.get("line"),
            "col": f.get("col"),
            "match": f.get("match"),
            "message": _localize_obj(f.get("message"), clean_lang),
            "deletionTest": _localize_obj(f.get("deletionTest"), clean_lang) if f.get("deletionTest") else None,
        }
        for f in findings
    ]


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
                "pack": {"type": "string", "description": "Style pack ID (auto, business-brief, engineering-spec, regulated-comms, literary-essay, deck-and-ui, executive-deck)"},
                "filename": {"type": "string", "description": "Virtual filename hint when inspecting `text`"},
                "profile": {"type": "boolean", "description": "Include 5-axis rhythm & concreteness telemetry on text/markdown (default true)"},
                "ml": {"type": "boolean", "description": "Enable bundled 15 KB Pocket ML stealth-vapor paragraph detection (default false)"},
                "patterns": {"type": "boolean", "description": "Include extended 6-dimension pattern-bank probes (default false)"},
                "verbosity": {"type": "string", "enum": ["compact", "full"], "description": "Default compact (omits per-hit exemplars to save context tokens; pass full to inline exemplars)"},
                "lang": {"type": "string", "enum": ["en", "zh"], "description": "Optional single-locale filter for finding messages"},
            },
        },
    },
    {
        "name": "dislop_explain",
        "description": "Retrieve the rationale, check question, and before/trap/after examples for a specific `ruleId`.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "ruleId": {"type": "string", "description": "Rule ID returned by dislop_check or dislop_catalog"},
                "lang": {"type": "string", "enum": ["en", "zh"], "description": "en or zh"},
            },
            "required": ["ruleId"],
        },
    },
    {
        "name": "dislop_packs",
        "description": "List installed rule packs, supported formats, and rule counts.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "dislop_catalog",
        "description": "Search and browse dislop's 53-pattern AI-slop catalog by keyword, dimension, category, family, modality, severity, tier, or pack.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Optional bilingual keyword query (matches id, tags, message, deletionTest, exemplar)"},
                "pack": {"type": "string"},
                "category": {"type": "string"},
                "dimension": {"type": "string"},
                "family": {"type": "string"},
                "modality": {"type": "string"},
                "severity": {"type": "string", "enum": ["error", "warning", "info"]},
                "tier": {"type": "string", "enum": ["invariant", "taste"]},
                "lang": {"type": "string", "enum": ["en", "zh"]},
                "includeExemplars": {"type": "boolean", "description": "Default true; set false for compact index listing"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 100},
            },
        },
    },
    {
        "name": "dislop_voice_extract_offline",
        "description": "Extract a deterministic offline `dislop.voice/1` statistical writing profile from 1-15 clean author samples (0 network calls, 0 uploads).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "samples": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 15,
                    "description": "1 to 15 clean sample passages written by the author",
                },
                "lang": {"type": "string", "enum": ["auto", "en", "zh"]},
            },
            "required": ["samples"],
        },
    },
    {
        "name": "dislop_model_score",
        "description": (
            "Run the bundled zero-dependency 15 KB Pocket ML ensemble (`pocket-slop-v1`) + 5-domain pack router on `text` "
            "to detect clean-wordlist stealth AI vapor paragraphs and explain top contributing signals (0 network calls)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Draft text to score with bundled Pocket ML"},
                "threshold": {"type": "number", "description": "Optional paragraph flag threshold (0..1)"},
            },
            "required": ["text"],
        },
    },
    {
        "name": "dislop_model_status",
        "description": "Inspect bundled models, installed optional model weights, hardware memory budget, and recommended optional local model tier.",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def run_mcp_stdio() -> None:
    packs = load_all_packs()
    pattern_by_rule_id = load_pattern_library()
    catalog_entries = build_catalog(packs, pattern_by_rule_id)
    cwd = Path.cwd().resolve()

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

                if name == "dislop_catalog":
                    result = query_catalog(
                        catalog_entries,
                        {
                            "query": args.get("query") or "",
                            "pack": args.get("pack"),
                            "category": args.get("category"),
                            "dimension": args.get("dimension"),
                            "family": args.get("family"),
                            "modality": args.get("modality"),
                            "severity": args.get("severity"),
                            "tier": args.get("tier"),
                            "includeExemplars": args.get("includeExemplars", True) is not False,
                            "limit": args.get("limit") if isinstance(args.get("limit"), int) and args.get("limit") > 0 else None,
                        },
                    )
                    _tool_result(req_id, result)
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
                                found = _format_rule_for_explain(r, p["id"], args.get("lang"))
                                break
                    if not found and rid in pattern_by_rule_id:
                        pat = pattern_by_rule_id[rid]
                        guards_list = pat.get("falsePositiveGuards") or []
                        guards = " ".join(guards_list) if isinstance(guards_list, list) else ""
                        dim = pat.get("dimension")
                        synth_rule: dict[str, Any] = {
                            "id": rid,
                            "tier": "taste",
                            "severity": pat.get("severityDefault") or "info",
                            "category": pat.get("category") or "general",
                            "family": f"{dim}/{rid}" if dim else "pattern-bank",
                            "modalities": list(pat.get("modalities") or ["markdown", "text"]),
                            "tags": list(pat.get("tags") or []),
                            "message": pat.get("mechanism") or pat.get("name") or {"en": "", "zh": ""},
                        }
                        if guards:
                            synth_rule["deletionTest"] = {"en": guards, "zh": guards}
                        if pat.get("exemplar"):
                            synth_rule["exemplar"] = pat["exemplar"]
                        found = _format_rule_for_explain(synth_rule, pat.get("packId") or "pattern-bank", args.get("lang"))
                    if not found and rid == "pocket-stealth-vapor":
                        from .cli import _POCKET_STEALTH_VAPOR_RULE

                        found = _format_rule_for_explain(_POCKET_STEALTH_VAPOR_RULE, "pocket-model", args.get("lang"))
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

                    live_config = load_config(cwd)
                    verbosity = "full" if args.get("verbosity") == "full" else "compact"
                    include_ml = bool(args.get("ml"))
                    include_patterns = bool(args.get("patterns"))
                    want_profile = args.get("profile") is not False
                    banks = load_pattern_banks() if include_patterns else None

                    if has_text:
                        fn = args.get("filename") or "draft.md"
                        mod = detect_modality(fn) or "markdown"
                        eff_pack = (
                            predict_pack_with_pocket_router(args["text"])["recommendedPack"]
                            if args.get("pack") == "auto" and mod in {"markdown", "text"}
                            else (None if args.get("pack") == "auto" else args.get("pack"))
                        )
                        pack_id = pick_pack_for_file(fn, mod, eff_pack, live_config)
                        pack = resolve_effective_pack(pack_id, packs, live_config)
                        res = audit_text(args["text"], filename=fn, modality=mod, pack=pack, config=live_config)
                        findings = list(res["findings"])
                        if include_patterns:
                            pat_res = audit_patterns(args["text"], filename=fn, modality=mod, banks=banks)
                            findings = _merge_pattern_bank_findings(findings, pat_res["findings"])
                        if include_ml and mod in {"markdown", "text"}:
                            findings.extend(_build_pocket_ml_findings_mcp(args["text"], fn, findings))
                        formatted = _format_findings_for_mcp(findings, verbosity, args.get("lang"))
                        payload: dict[str, Any] = {
                            "pack": pack_id,
                            "modality": mod,
                            "checked": True,
                            "skipped": [],
                            "count": len(formatted),
                            "findings": formatted,
                        }
                        if verbosity == "compact" and formatted:
                            payload["explainHint"] = "Call dislop_explain(ruleId) for before/trap/after examples."
                        if want_profile and mod in {"markdown", "text"}:
                            payload["profile"] = analyze_text_profile(args["text"], modality=mod)
                        _tool_result(req_id, payload)
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
                    raw_txt_for_pack: str | None = None
                    if (mod in {"markdown", "text"} and (args.get("pack") == "auto" or want_profile or include_ml)) or (
                        include_patterns and mod not in {"docx", "pptx"}
                    ):
                        try:
                            raw_txt_for_pack = resolved.read_bytes().decode("utf-8")
                        except Exception:
                            raw_txt_for_pack = None
                    eff_pack_arg = (
                        predict_pack_with_pocket_router(raw_txt_for_pack)["recommendedPack"]
                        if args.get("pack") == "auto" and raw_txt_for_pack is not None and mod in {"markdown", "text"}
                        else (None if args.get("pack") == "auto" else args.get("pack"))
                    )
                    res = inspect_file(resolved, rel, packs, eff_pack_arg, live_config)
                    f_list = list(res["findings"])
                    if res["checked"]:
                        if include_patterns:
                            if mod in {"docx", "pptx"}:
                                try:
                                    ooxml_entries: dict[str, str] = {}
                                    with zipfile.ZipFile(resolved, "r") as zf:
                                        for info in zf.infolist():
                                            if info.filename.endswith((".xml", ".rels")):
                                                ooxml_entries[info.filename] = zf.read(info.filename).decode("utf-8", errors="replace")
                                    pat_res = audit_patterns("", filename=rel, modality=mod, banks=banks, ooxml=ooxml_entries)
                                    f_list = _merge_pattern_bank_findings(f_list, pat_res["findings"])
                                except Exception:
                                    pass
                            elif raw_txt_for_pack is not None:
                                pat_res = audit_patterns(raw_txt_for_pack, filename=rel, modality=mod, banks=banks)
                                f_list = _merge_pattern_bank_findings(f_list, pat_res["findings"])
                        if include_ml and raw_txt_for_pack is not None and mod in {"markdown", "text"}:
                            f_list.extend(_build_pocket_ml_findings_mcp(raw_txt_for_pack, rel, f_list))
                    formatted = _format_findings_for_mcp(f_list, verbosity, args.get("lang"))
                    payload = {
                        "pack": pick_pack_for_file(rel, mod, eff_pack_arg, live_config),
                        "modality": mod,
                        "checked": res["checked"],
                        "skipped": res["skipped"],
                        "count": len(formatted),
                        "findings": formatted,
                    }
                    if verbosity == "compact" and formatted:
                        payload["explainHint"] = "Call dislop_explain(ruleId) for before/trap/after examples."
                    if res["checked"] and want_profile and raw_txt_for_pack is not None and mod in {"markdown", "text"}:
                        payload["profile"] = analyze_text_profile(raw_txt_for_pack, modality=mod)
                    _tool_result(req_id, payload)
                    continue

                if name == "dislop_voice_extract_offline":
                    samples = args.get("samples")
                    if not isinstance(samples, list) or not samples:
                        _tool_result(req_id, {"error": "Non-empty `samples` string array is required."}, True)
                        continue
                    if len(samples) > 15:
                        _tool_result(req_id, {"error": "Provide at most 15 sample passages per call."}, True)
                        continue
                    if any(not isinstance(s, str) for s in samples):
                        _tool_result(req_id, {"error": "Every element in `samples` must be a string."}, True)
                        continue
                    non_blank = [s.strip() for s in samples if s.strip()]
                    if not non_blank:
                        _tool_result(req_id, {"error": "At least one non-empty sample passage is required."}, True)
                        continue
                    voice = extract_voice_profile_offline(non_blank, lang=args.get("lang") or "auto")
                    _tool_result(req_id, voice)
                    continue

                if name == "dislop_model_score":
                    text_arg = args.get("text")
                    if not isinstance(text_arg, str):
                        _tool_result(req_id, {"error": "Required string argument `text` missing."}, True)
                        continue
                    thr = args.get("threshold")
                    if thr is not None:
                        if isinstance(thr, bool) or not isinstance(thr, (int, float)) or thr != thr or thr < 0.0 or thr > 1.0:
                            _tool_result(req_id, {"error": "`threshold` must be a number between 0 and 1."}, True)
                            continue
                    thr_val = float(thr) if thr is not None else None
                    _tool_result(req_id, analyze_document_with_pocket_models(text_arg, threshold=thr_val))
                    continue

                if name == "dislop_model_status":
                    rules_cnt = sum(len(p.get("rules", [])) for p in packs.values())
                    st = build_model_status_report(packs_count=len(packs), rules_count=rules_cnt, probe_loopback=False)
                    _tool_result(req_id, st)
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
