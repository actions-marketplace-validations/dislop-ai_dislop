"""Zero-dependency Python 3.10+ core engine matching `src/core.mjs`."""

from __future__ import annotations

import bisect
import colorsys
import fnmatch
import json
import os
import re
import zipfile
from pathlib import Path
from typing import Any

ENGINE_VERSION = "0.3.0"

SEVERITY_RANK = {
    "info": 1,
    "warning": 2,
    "error": 3,
    "never": 99,
}

EXT_TO_MODALITY = {
    ".md": "markdown",
    ".mdx": "markdown",
    ".txt": "text",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".jsx": "jsx",
    ".tsx": "jsx",
    ".svg": "svg",
    ".docx": "docx",
    ".pptx": "pptx",
}

DEFAULT_IGNORE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
}


def find_packs_dir() -> Path:
    pkg_packs = Path(__file__).resolve().parent / "packs"
    if pkg_packs.is_dir():
        return pkg_packs
    return Path(__file__).resolve().parent.parent.parent / "packs"


def load_all_packs(packs_dir: Path | None = None) -> dict[str, dict[str, Any]]:
    root = packs_dir or find_packs_dir()
    packs: dict[str, dict[str, Any]] = {}
    if not root.is_dir():
        return packs
    for child in sorted(root.iterdir()):
        manifest = child / "pack.json"
        if child.is_dir() and manifest.is_file():
            data = json.loads(manifest.read_text(encoding="utf-8"))
            packs[data["id"]] = data
    return packs


def load_config(cwd: Path | None = None, explicit_path: str | None = None) -> dict[str, Any]:
    root = cwd or Path.cwd()
    base: dict[str, Any] = {}
    candidates = (
        [root / explicit_path]
        if explicit_path
        else [root / ".dislop.json", root / "dislop.json", root / ".disloprc.json"]
    )
    for cand in candidates:
        if cand.is_file():
            base = json.loads(cand.read_text(encoding="utf-8"))
            break

    local_path = root / ".dislop.local.json"
    if local_path.is_file():
        local_cfg = json.loads(local_path.read_text(encoding="utf-8"))
        merged = {**base, **local_cfg}
        merged["rules"] = {**base.get("rules", {}), **local_cfg.get("rules", {})}
        merged["allow"] = [*base.get("allow", []), *local_cfg.get("allow", [])]
        merged["ignore"] = [*base.get("ignore", []), *local_cfg.get("ignore", [])]
        merged["forbid"] = [*base.get("forbid", []), *local_cfg.get("forbid", [])]
        base = merged
    return base


def detect_modality(filename: str) -> str | None:
    if not filename or filename == "<memory>":
        return "markdown"
    ext = Path(filename).suffix.lower()
    if not ext:
        return None
    return EXT_TO_MODALITY.get(ext)


def default_pack_for_modality(modality: str) -> str:
    if modality in {"html", "css", "jsx", "svg", "pptx"}:
        return "deck-and-ui"
    return "business-brief"


def _expand_braces(pattern: str) -> list[str]:
    m = re.search(r"\{([^{}]+)\}", pattern)
    if not m:
        return [pattern]
    prefix, suffix = pattern[: m.start()], pattern[m.end() :]
    out: list[str] = []
    for part in m.group(1).split(","):
        out.extend(_expand_braces(prefix + part.strip() + suffix))
    return out


def _glob_to_regex(glob_pat: str) -> re.Pattern[str]:
    norm = glob_pat.replace("\\", "/").removeprefix("./")
    rx = ["^"]
    i = 0
    while i < len(norm):
        ch = norm[i]
        if ch == "*" and i + 1 < len(norm) and norm[i + 1] == "*":
            if i + 2 < len(norm) and norm[i + 2] == "/":
                rx.append("(?:.+/)?")
                i += 3
                continue
            rx.append(".*")
            i += 2
            continue
        if ch == "*":
            rx.append("[^/]*")
        elif ch == "?":
            rx.append("[^/]")
        elif ch in "+.^$|()[]{}":
            rx.append("\\" + ch)
        else:
            rx.append(ch)
        i += 1
    rx.append("$")
    return re.compile("".join(rx))


def matches_any_glob(rel_posix: str, globs: list[str]) -> bool:
    clean = rel_posix.removeprefix("./")
    for raw in globs:
        for pat in _expand_braces(raw):
            if _glob_to_regex(pat).match(clean):
                return True
    return False


def pick_pack_for_file(rel_posix: str, modality: str, explicit_pack: str | None, config: dict[str, Any]) -> str:
    if explicit_pack:
        return explicit_pack
    for ov in config.get("overrides", []):
        files = ov.get("files", [])
        patterns = files if isinstance(files, list) else [files]
        if ov.get("pack") and matches_any_glob(rel_posix, patterns):
            return ov["pack"]
    if config.get("pack"):
        return str(config["pack"])
    return default_pack_for_modality(modality)


def resolve_effective_pack(
    pack_id: str,
    packs_by_id: dict[str, dict[str, Any]],
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = config or {}
    if pack_id not in packs_by_id:
        available = ", ".join(sorted(packs_by_id))
        raise ValueError(f"Unknown Taste Pack '{pack_id}'. Available packs: {available}")

    chain: list[dict[str, Any]] = []
    visited: set[str] = set()

    def collect(pid: str) -> None:
        if pid in visited:
            return
        visited.add(pid)
        p = packs_by_id.get(pid)
        if not p:
            return
        for parent in p.get("extends", []):
            collect(parent)
        chain.append(p)

    collect(pack_id)

    merged_thresholds: dict[str, Any] = {}
    rules_by_id: dict[str, dict[str, Any]] = {}
    rule_overrides = cfg.get("rules", {})

    for p in chain:
        merged_thresholds.update(p.get("thresholds", {}))
        for rule in p.get("rules", []):
            rid = rule["id"]
            ov = rule_overrides.get(rid)
            if ov == "off" and rule.get("tier") != "invariant":
                rules_by_id.pop(rid, None)
                continue
            eff = dict(rule)
            if isinstance(ov, str) and ov in SEVERITY_RANK and rule.get("tier") != "invariant":
                eff["severity"] = ov
            rules_by_id[rid] = eff

    forbid_list = cfg.get("forbid", [])
    if isinstance(forbid_list, list) and forbid_list:
        rules_by_id["local-custom-forbid"] = {
            "id": "local-custom-forbid",
            "tier": "invariant",
            "severity": "error",
            "family": "hygiene/forbid",
            "probe": "regex",
            "zones": ["raw"],
            "modalities": ["markdown", "text", "html", "css", "jsx", "svg", "docx", "pptx", "pdf"],
            "patterns": forbid_list,
            "message": {
                "en": "Matched forbidden pattern from local `.dislop.local.json` policy.",
                "zh": "命中本地 `.dislop.local.json` 私有禁止词规则。",
            },
            "deletionTest": {
                "en": "Remove or de-identify the forbidden private term before committing.",
                "zh": "提交前删除或脱敏该私有敏感词。",
            },
            "exemplar": None,
        }

    target = dict(packs_by_id[pack_id])
    target["thresholds"] = merged_thresholds
    target["rules"] = list(rules_by_id.values())
    return target


def fnv1a_hex(text: str) -> str:
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def _preserve_lines_blank(match: re.Match[str]) -> str:
    return re.sub(r"[^\r\n]", " ", match.group(0))


def build_line_starts(text: str) -> list[int]:
    starts = [0]
    for idx, ch in enumerate(text):
        if ch == "\n":
            starts.append(idx + 1)
    return starts


def offset_to_line_col(line_starts: list[int], offset: int) -> tuple[int, int]:
    line_idx = max(0, bisect.bisect_right(line_starts, offset) - 1)
    col = (offset - line_starts[line_idx]) + 1
    return line_idx + 1, col


def enclosing_sentence(text: str, start: int, end: int) -> str:
    left = start
    while left > 0 and text[left - 1] not in "\n.!?。！？":
        left -= 1
    right = end
    while right < len(text) and text[right] not in "\n.!?。！？":
        right += 1
    if right < len(text) and text[right] in ".!?。！？":
        right += 1
    return text[left:right].strip()[:240]


def parse_suppressions(text: str) -> tuple[dict[int, list[dict[str, Any]]], list[dict[str, Any]]]:
    lines = text.splitlines()
    by_target: dict[int, list[dict[str, Any]]] = {}
    directives: list[dict[str, Any]] = []
    patterns = [
        re.compile(r"<!--\s*dislop-(?:ignore|disable)-next-line\s+([a-z0-9_*, -]+?)\s*--\s*(.+?)\s*-->", re.I),
        re.compile(r"/\*\s*dislop-(?:ignore|disable)-next-line\s+([a-z0-9_*, -]+?)\s*--\s*(.+?)\s*\*/", re.I),
    ]
    for i, line in enumerate(lines):
        for pat in patterns:
            m = pat.search(line)
            if m:
                rule_ids = [s.strip() for s in re.split(r"[,\s]+", m.group(1)) if s.strip()]
                reason = m.group(2).strip()
                target_line = i + 2
                while target_line <= len(lines) and not lines[target_line - 1].strip():
                    target_line += 1
                entry = {
                    "directiveLine": i + 1,
                    "targetLine": target_line,
                    "ruleIds": rule_ids,
                    "reason": reason,
                    "used": False,
                }
                directives.append(entry)
                by_target.setdefault(target_line, []).append(entry)
    return by_target, directives


def build_zones(raw_text: str, modality: str) -> dict[str, str]:
    raw = re.sub(r"<!--\s*dislop-[\s\S]*?-->", _preserve_lines_blank, raw_text, flags=re.I)
    raw = re.sub(r"/\*\s*dislop-[\s\S]*?\*/", _preserve_lines_blank, raw, flags=re.I)

    ui_text = re.sub(
        r"<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->",
        _preserve_lines_blank,
        raw,
        flags=re.I,
    )
    ui_text = re.sub(r"<!--[\s\S]*?-->", _preserve_lines_blank, ui_text)
    ui_text = re.sub(r"<(script|style|code|pre|del|kbd)\b[^>]*>[\s\S]*?</\1>", _preserve_lines_blank, ui_text, flags=re.I)

    prose = ui_text
    if modality in {"markdown", "text"}:
        prose = re.sub(r"^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)", _preserve_lines_blank, prose)
        prose = re.sub(r"```[\s\S]*?```", _preserve_lines_blank, prose)
        prose = re.sub(r"~~~[\s\S]*?~~~", _preserve_lines_blank, prose)
        prose = re.sub(r"`[^`\n]+`", _preserve_lines_blank, prose)
        prose = re.sub(r"~~[^~\n]+~~", _preserve_lines_blank, prose)
        prose = re.sub(r"^[ \t]*>.*$", _preserve_lines_blank, prose, flags=re.M)
        prose = re.sub(r"\]\([^)\n]+\)", lambda m: "]" + re.sub(r"[^\r\n]", " ", m.group(0)[1:]), prose)
    elif modality in {"html", "jsx", "svg"}:
        prose = re.sub(r"<[^>]+>", _preserve_lines_blank, prose)

    prose = re.sub(r"https?://[^\s)>\"'`]+", _preserve_lines_blank, prose)
    if modality in {"html", "jsx", "svg"}:
        ui_text = re.sub(r"<[^>]+>", _preserve_lines_blank, ui_text)

    return {"raw": raw, "prose": prose, "ui-text": ui_text}


def make_finding(
    *,
    rule: dict[str, Any],
    filename: str,
    modality: str,
    location: str,
    line: int = 1,
    col: int = 1,
    span: dict[str, int] | None = None,
    match: str,
    sentence: str = "",
) -> dict[str, Any]:
    norm_match = match.lower().strip()
    norm_sent = re.sub(r"\s+", " ", (sentence or norm_match).lower()).strip()
    fp = f"{rule['id']}:{fnv1a_hex(f'{rule['id']}|{norm_match}|{norm_sent}')}"
    return {
        "fingerprint": fp,
        "ruleId": rule["id"],
        "tier": rule.get("tier", "taste"),
        "severity": rule.get("severity", "warning"),
        "family": rule.get("family", "general"),
        "file": filename,
        "modality": modality,
        "location": location,
        "line": line,
        "col": col,
        "span": span,
        "match": match,
        "message": rule["message"],
        "deletionTest": rule.get("deletionTest"),
        "exemplar": rule.get("exemplar"),
    }


# ---------- Probes ----------

def _probe_negation_pivot(prose_text: str, raw_text: str) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    zh_re = re.compile(
        r"(?:(?:这|那|它)?(?:并)?不(?:是|只是|仅仅?是)|与其说是?)([^，。！？；\n]{1,22})[，,；—]+\s*(?:而是|更是|不如说是?)([^。！？；\n]{1,28})"
    )
    for m in zh_re.finditer(prose_text):
        clause_a, clause_b = m.group(1) or "", m.group(2) or ""
        raw_slice = raw_text[m.start() : m.end()]
        both_concrete = (
            (bool(re.search(r"\d", clause_a)) and bool(re.search(r"\d", clause_b)))
            or "`" in raw_slice
            or bool(re.search(r"\.[a-z]{2,4}\b", raw_slice, re.I))
            or bool(re.search(r"(?:第一次|第二次|站台|号楼|排第|星期|周[一二三四五六日天])", raw_slice))
        )
        if both_concrete or len(clause_b.strip()) > 26:
            continue
        if not clause_a.strip() or not clause_b.strip():
            continue
        hits.append({"index": m.start(), "length": m.end() - m.start()})

    en_re = re.compile(
        r"\b(?:(?:it|this|that)(?:'s| is| was| isn't| wasn't)|they(?:'re| are| aren't))\s+(?:not\s+)?(?:just|merely|simply|only)\s+([^.;!?\n—–]{2,50}?)(?:[,;—–-]\s*(?:but|it(?:'s| is| was)|that(?:'s| is| was)|they(?:'re| are))\s+)([^.!?\n]{2,70})"
        r"|\b(?:It|This|That)\s+(?:isn't|wasn't|is not|was not)\s+(?:a\s+|an\s+|just\s+)?([A-Za-z][A-Za-z0-9 -]{1,32}?)\s*(?:[.!]\s+|[—–-]\s*)(?:it's|it is|it was|that's)\s+([^.!?\n]{2,70})",
        re.I,
    )
    for m in en_re.finditer(prose_text):
        clause_a = m.group(1) or m.group(3) or ""
        clause_b = m.group(2) or m.group(4) or ""
        raw_slice = raw_text[m.start() : m.end()]
        if (bool(re.search(r"\d", clause_a)) and bool(re.search(r"\d", clause_b))) or "`" in raw_slice or re.search(r"\.[a-z]{2,4}\b", raw_slice, re.I):
            continue
        hits.append({"index": m.start(), "length": m.end() - m.start()})
    return hits


def _probe_staccato_run(prose_text: str) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    for pm in re.finditer(r"[^\n]+(?:\n(?!\s*\n)[^\n]+)*", prose_text):
        para = pm.group(0)
        trimmed = para.strip()
        if not trimmed or re.match(r"^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)", trimmed):
            continue
        sentences: list[dict[str, Any]] = []
        for sm in re.finditer(r"[^.!?。！？\n]+[.!?。！？]", para):
            s = sm.group(0).strip()
            if not s:
                continue
            body = re.sub(r"[.!?。！？]+$", "", s).strip()
            if not body:
                continue
            cjk = len(re.findall(r"[\u4e00-\u9fff]", body))
            en_words = len([w for w in body.split() if re.search(r"[A-Za-z0-9]", w)])
            is_short = (
                2 <= cjk <= 6 and en_words <= 1 and not re.search(r"[，,：:；;]", body)
            ) or (cjk == 0 and 2 <= en_words <= 4 and not re.search(r"[,:;]", body))
            lead_offset = sm.group(0).find(s)
            start = pm.start() + sm.start() + lead_offset
            sentences.append({"start": start, "end": start + len(s), "isShort": is_short})

        run_start = -1
        run_count = 0
        for idx in range(len(sentences) + 1):
            cur = sentences[idx] if idx < len(sentences) else None
            if cur and cur["isShort"]:
                if run_count == 0:
                    run_start = idx
                run_count += 1
            else:
                if run_count >= 3:
                    first = sentences[run_start]
                    last = sentences[idx - 1]
                    hits.append({"index": first["start"], "length": last["end"] - first["start"]})
                run_count = 0
    return hits


def _probe_zh_four_char_triad(prose_text: str) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    entity_suffix = re.compile(r"(?:大学|学院|学校|公司|集团|银行|医院|中心|委员|政府|部门|机场|车站|高速|铁路|[省市区县镇乡])$")
    broken_slice = re.compile(r"[的了在或与及把被]")
    pat = re.compile(
        r"(?:^|[，。！？；：、“‘（\s]|(?:实现|具备|坚持|保持|做到|形成|打造|追求|提供|确保|了|是|的|以|向|为))"
        r"([\u4e00-\u9fff]{4})[、，,]\s*([\u4e00-\u9fff]{4})[、，,]\s*([\u4e00-\u9fff]{4})"
        r"(?=$|[，。！？；：、”’）\s]|[的地等])"
    )
    for m in pat.finditer(prose_text):
        items = [m.group(1), m.group(2), m.group(3)]
        if any(entity_suffix.search(w) or broken_slice.search(w) for w in items):
            continue
        start_offset = m.start(1)
        if start_offset > 0 and prose_text[start_offset - 1] == "《":
            continue
        hits.append({"index": start_offset, "length": m.end() - start_offset})
    return hits


def _probe_unsourced_attribution(prose_text: str, raw_text: str) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    pat = re.compile(
        r"\b(?:[Ss]tudies|[Rr]esearch|[Ii]ndustry\s+research|[Ee]xperts|[Dd]ata)\s+(?:shows?|suggests?|indicates?|proves?)\b"
        r"|(?:研究|数据|专家|业内人士|行业报告)(?:表明|显示|指出|认为)[，,]?"
    )
    for m in pat.finditer(prose_text):
        win = raw_text[max(0, m.start() - 30) : min(len(raw_text), m.start() + 180)]
        has_source = bool(
            re.search(r"\[\^?\d+\]", win)
            or re.search(r"\]\([^)]+\)", win)
            or "http://" in win
            or "https://" in win
            or re.search(r"\([^()\n]{2,40},\s*(?:19|20)\d{2}[a-z]?\)", win)
            or re.search(r"《[^》\n]{2,30}》", win)
            or re.search(r"(?:见|参见|详见)\s*\[", win)
        )
        if not has_source:
            hits.append({"index": m.start(), "length": m.end() - m.start()})
    return hits


def _probe_bold_lead_list_wall(prose_text: str, raw_text: str, min_run: int = 4) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    lines = raw_text.splitlines()
    offset = 0
    run_start = 0
    run_end = 0
    run_count = 0

    for i in range(len(lines) + 1):
        line = lines[i] if i < len(lines) else ""
        prose_line = prose_text[offset : offset + len(line)] if i < len(lines) else ""
        is_bullet = bool(
            prose_line.strip()
            and re.match(r"^\s*(?:[-*+]|\d+[.)])\s+\*\*([^*\n`]{2,36})\*\*\s*[:：—-]", line)
        )
        if is_bullet:
            if run_count == 0:
                first_non_ws = len(line) - len(line.lstrip())
                run_start = offset + first_non_ws
            run_count += 1
            run_end = offset + len(line)
        elif i == len(lines) or line.strip():
            if run_count >= min_run:
                hits.append({"index": run_start, "length": run_end - run_start})
            run_count = 0
        offset += len(line) + 1
    return hits


def _probe_em_dash_density(prose_text: str, max_per_300: int = 4) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    for pm in re.finditer(r"[^\n]+(?:\n(?!\s*\n)[^\n]+)*", prose_text):
        para = pm.group(0)
        if para.lstrip().startswith("|"):
            continue
        normalized = para.replace("——", "—")
        dashes = normalized.count("—")
        if dashes < 5:
            continue
        cjk = len(re.findall(r"[\u4e00-\u9fff]", normalized))
        en_words = len([w for w in normalized.split() if re.search(r"[A-Za-z0-9]", w)])
        units = max(1.0, en_words + cjk * 0.6)
        if (dashes / units) * 300 > max_per_300:
            first_dash = max(0, para.find("—"))
            hits.append({"index": pm.start() + first_dash, "length": min(len(para), 48)})
    return hits


def _parse_color_rgb(raw: str | None) -> tuple[int, int, int] | None:
    if not raw:
        return None
    val = raw.strip().lower()
    m6 = re.match(r"^#([0-9a-f]{6})$", val)
    if m6:
        n = int(m6.group(1), 16)
        return ((n >> 16) & 255, (n >> 8) & 255, n & 255)
    m3 = re.match(r"^#([0-9a-f]{3})$", val)
    if m3:
        s = m3.group(1)
        return (int(s[0] * 2, 16), int(s[1] * 2, 16), int(s[2] * 2, 16))
    mrgb = re.match(r"^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$", val)
    if mrgb:
        return (int(mrgb.group(1)), int(mrgb.group(2)), int(mrgb.group(3)))
    if val == "white":
        return (255, 255, 255)
    if val == "black":
        return (0, 0, 0)
    return None


def _probe_ui_dead_control(raw_text: str) -> list[dict[str, Any]]:
    clean = re.sub(
        r"<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->",
        _preserve_lines_blank,
        raw_text,
        flags=re.I,
    )
    clean = re.sub(r"<!--[\s\S]*?-->", _preserve_lines_blank, clean)
    clean = re.sub(r"<(script|style|code|pre)\b[^>]*>[\s\S]*?</\1>", _preserve_lines_blank, clean, flags=re.I)

    hits: list[dict[str, Any]] = []
    for m in re.finditer(r"<a\b([^>]*)>", clean, re.I):
        attrs = m.group(1) or ""
        hm = re.search(r"\bhref\s*=\s*(?:\"([^\"]*)\"|'([^']*)')", attrs, re.I)
        href = (hm.group(1) if hm and hm.group(1) is not None else hm.group(2) if hm else None)
        if href is not None:
            href = href.strip()
        has_handler = bool(re.search(r"\b(?:onClick|onclick|@click|hx-get|hx-post)\b", attrs))
        if not has_handler and (href in {"#", ""} or (href and href.lower().startswith("javascript:"))):
            hits.append({"index": m.start(), "length": m.end() - m.start(), "severity": "error"})

    for m in re.finditer(r"<button\b([^>]*)>([\s\S]*?)</button>", clean, re.I):
        attrs = m.group(1) or ""
        inner = re.sub(r"<[^>]+>", "", m.group(2) or "").strip()
        has_label = bool(inner) or bool(re.search(r"\b(?:aria-label|aria-labelledby|title)\s*=\s*[\"'][^\"']+[\"']", attrs, re.I))
        if not has_label and "{..." not in attrs:
            hits.append({"index": m.start(), "length": m.end() - m.start(), "severity": "error"})
            continue
        static_disabled = bool(re.search(r"\bdisabled(?:\s*=\s*(?:\"\"|\"disabled\"|'disabled'|\{true\}))?(?=[\s/>]|$)", attrs, re.I))
        has_reason = bool(re.search(r"\b(?:title|aria-describedby|data-allow-disabled)\b", attrs, re.I))
        if static_disabled and not has_reason:
            hits.append({"index": m.start(), "length": m.end() - m.start(), "severity": "warning"})
    return hits


def _probe_ui_ai_gradient(raw_text: str) -> list[dict[str, Any]]:
    clean = re.sub(
        r"<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->",
        _preserve_lines_blank,
        raw_text,
        flags=re.I,
    )
    clean = re.sub(r"<!--[\s\S]*?-->", _preserve_lines_blank, clean)
    clean = re.sub(r"/\*[\s\S]*?\*/", _preserve_lines_blank, clean)
    clean = re.sub(r"<(script|code|pre)\b[^>]*>[\s\S]*?</\1>", _preserve_lines_blank, clean, flags=re.I)

    hits: list[dict[str, Any]] = []
    tw_re = re.compile(
        r"\b(?:from-(?:indigo|purple|violet)-\d{2,3}[^\"'\n>]{0,60}(?:to|via)-(?:purple|pink|fuchsia|violet)-\d{2,3}|bg-clip-text\s+text-transparent|text-transparent\s+bg-clip-text)\b",
        re.I,
    )
    for m in tw_re.finditer(clean):
        hits.append({"index": m.start(), "length": m.end() - m.start()})

    for m in re.finditer(r"(?:linear|radial)-gradient\(([^)]+)\)", clean, re.I):
        hexes = re.findall(r"#[0-9a-fA-F]{3,6}\b", m.group(1))
        stops = 0
        for hx in hexes:
            rgb = _parse_color_rgb(hx)
            if not rgb:
                continue
            h, l, s = colorsys.rgb_to_hls(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
            deg = h * 360.0
            if 245.0 <= deg <= 345.0 and (s * 100.0) >= 45.0:
                stops += 1
        near = clean[m.start() : min(len(clean), m.end() + 120)]
        if stops >= 2 or re.search(r"background-clip\s*:\s*text", near, re.I):
            hits.append({"index": m.start(), "length": m.end() - m.start()})
    return hits


def _probe_ui_pill_soup(raw_text: str, max_pills: int = 6) -> list[dict[str, Any]]:
    clean = re.sub(
        r"<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->",
        _preserve_lines_blank,
        raw_text,
        flags=re.I,
    )
    clean = re.sub(r"<!--[\s\S]*?-->", _preserve_lines_blank, clean)
    clean = re.sub(r"<(script|style|code|pre)\b[^>]*>[\s\S]*?</\1>", _preserve_lines_blank, clean, flags=re.I)

    matches: list[dict[str, Any]] = []
    for m in re.finditer(
        r"<([a-z0-9]+)\b([^>]*(?:\brounded-full\b|border-radius\s*:\s*999\d*px)[^>]*)>([^<]{1,48})</\1>",
        clean,
        re.I,
    ):
        attrs = m.group(2) or ""
        txt = (m.group(3) or "").strip()
        if not txt or re.search(r"\bsize-\d", attrs):
            continue
        wh = re.search(r"\bw-(\d+)\b.*\bh-(\d+)\b", attrs)
        if wh and wh.group(1) == wh.group(2):
            continue
        matches.append({"index": m.start(), "length": m.end() - m.start()})
    return [matches[0]] if len(matches) > max_pills else []


def _probe_ui_box_in_box(raw_text: str) -> list[dict[str, Any]]:
    clean = re.sub(
        r"<!--\s*dislop-quote-start\s*-->[\s\S]*?<!--\s*dislop-quote-end\s*-->",
        _preserve_lines_blank,
        raw_text,
        flags=re.I,
    )
    clean = re.sub(r"<!--[\s\S]*?-->", _preserve_lines_blank, clean)
    clean = re.sub(r"<(script|style|code|pre|svg)\b[^>]*>[\s\S]*?</\1>", _preserve_lines_blank, clean, flags=re.I)

    void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
    stack: list[tuple[str, int]] = []
    hits: list[dict[str, Any]] = []
    for m in re.finditer(r"</?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(/?)>", clean):
        full = m.group(0)
        tag = m.group(1).lower()
        attrs = m.group(2) or ""
        self_close = m.group(3) == "/" or tag in void_tags
        if full.startswith("</"):
            for i in range(len(stack) - 1, -1, -1):
                if stack[i][0] == tag:
                    del stack[i:]
                    break
            continue
        has_border = bool(re.search(r"\b(?:border(?:-[a-z0-9]+)?|ring-1|shadow(?:-[a-z]+)?)\b|border\s*:", attrs, re.I)) and not bool(
            re.search(r"\bborder-(?:t|b|l|r|0|none)\b", attrs, re.I)
        )
        has_radius = bool(re.search(r"\brounded(?:-[a-z0-9]+)?\b|border-radius\s*:", attrs, re.I)) and not bool(
            re.search(r"\brounded-none\b", attrs, re.I)
        )
        has_pad = bool(re.search(r"\bp[xy]?-\d|padding\s*:", attrs, re.I))
        is_box = has_border and has_radius and has_pad
        depth = (stack[-1][1] if stack else 0) + (1 if is_box else 0)
        if is_box and depth >= 3 and not hits:
            hits.append({"index": m.start(), "length": len(full)})
        if not self_close:
            stack.append((tag, depth))
    return hits


def _eval_synthetic_binary_fixture(fixture: str, rule: dict[str, Any], thresholds: dict[str, Any]) -> list[dict[str, str]]:
    probe = rule.get("probe")
    if probe == "office-markdown-leak" and fixture.startswith("DOCX_RAW_MARKDOWN:"):
        return [{"location": "para 1", "match": "**Key Milestone**"}]
    if probe == "slide-word-wall" and fixture.startswith("PPTX_WORD_WALL:"):
        cnt = int(fixture.split(":")[1])
        if cnt > thresholds.get("maxSlideWords", 120):
            return [{"location": "slide 1", "match": f"{cnt} words"}]
    if probe == "slide-bullet-overload" and fixture.startswith("PPTX_BULLETS:"):
        cnt = int(fixture.split(":")[1])
        if cnt > thresholds.get("maxSlideBullets", 6):
            return [{"location": "slide 1", "match": f"{cnt} bullets"}]
    if probe == "slide-autofit-shrink" and fixture.startswith("PPTX_AUTOFIT:"):
        scale = int(fixture.split(":")[1])
        if scale < thresholds.get("minAutofitScale", 80000):
            return [{"location": "slide 1", "match": f"fontScale={scale}"}]
    if probe == "slide-weak-topic-title" and fixture.startswith("PPTX_WEAK_TITLE:"):
        return [{"location": "slide 1", "match": fixture.split(":")[1]}]
    return []


def audit_text(
    text: str,
    *,
    filename: str = "<memory>",
    modality: str | None = None,
    pack: dict[str, Any],
    config: dict[str, Any] | None = None,
    allow_synthetic_fixtures: bool = False,
) -> dict[str, Any]:
    cfg = config or {}
    mod = modality or detect_modality(filename) or "markdown"
    line_starts = build_line_starts(text)
    zones = build_zones(text, mod)
    by_target, directives = parse_suppressions(text)
    allow_list = [str(a).lower() for a in cfg.get("allow", [])]
    findings: list[dict[str, Any]] = []
    thresholds = pack.get("thresholds", {})

    for rule in pack.get("rules", []):
        if rule.get("modalities") and mod not in rule["modalities"]:
            continue

        if allow_synthetic_fixtures and text.startswith(("DOCX_", "PPTX_")):
            for sh in _eval_synthetic_binary_fixture(text, rule, thresholds):
                findings.append(
                    make_finding(
                        rule=rule,
                        filename=filename,
                        modality=mod,
                        location=sh["location"],
                        match=sh["match"],
                        sentence=text,
                        span={"start": 0, "end": len(text)},
                    )
                )
            continue

        zone_name = (rule.get("zones") or ["prose"])[0]
        zone_text = zones.get(zone_name, zones["prose"])
        probe = rule.get("probe", "regex")
        raw_hits: list[dict[str, Any]] = []

        if probe == "regex":
            for pattern in rule.get("patterns", []):
                for m in re.finditer(pattern, zone_text, re.I | re.M):
                    if m.end() > m.start():
                        idx = m.start()
                        length = m.end() - m.start()
                        if zone_name == "prose":
                            lead = re.match(r"^[.!?。！？\s]+", m.group(0))
                            if lead and len(lead.group(0)) < length:
                                idx += len(lead.group(0))
                                length -= len(lead.group(0))
                        raw_hits.append({"index": idx, "length": length})
        elif probe == "negation-pivot":
            raw_hits = _probe_negation_pivot(zone_text, text)
        elif probe == "staccato-run":
            raw_hits = _probe_staccato_run(zone_text)
        elif probe == "zh-four-char-triad":
            raw_hits = _probe_zh_four_char_triad(zone_text)
        elif probe == "unsourced-attribution":
            raw_hits = _probe_unsourced_attribution(zone_text, text)
        elif probe == "bold-lead-list-wall":
            raw_hits = _probe_bold_lead_list_wall(zone_text, text, thresholds.get("boldLeadListRun", 4))
        elif probe == "em-dash-density":
            raw_hits = _probe_em_dash_density(zone_text, thresholds.get("maxEmDashesPer300Words", 4))
        elif probe == "zh-halfwidth-punctuation":
            raw_hits = [
                {"index": m.start(), "length": m.end() - m.start()}
                for m in re.finditer(r"[\u4e00-\u9fff][,;:!?][\u4e00-\u9fff]", zone_text)
            ]
        elif probe == "ui-dead-control":
            raw_hits = _probe_ui_dead_control(text)
        elif probe == "ui-ai-gradient":
            raw_hits = _probe_ui_ai_gradient(text)
        elif probe == "ui-pill-soup":
            raw_hits = _probe_ui_pill_soup(text, thresholds.get("maxPillsPerFile", 6))
        elif probe == "ui-box-in-box":
            raw_hits = _probe_ui_box_in_box(text)

        raw_hits.sort(key=lambda h: (h["index"], -h["length"]))
        dedup_hits: list[dict[str, Any]] = []
        for h in raw_hits:
            if dedup_hits and h["index"] < dedup_hits[-1]["index"] + dedup_hits[-1]["length"]:
                continue
            dedup_hits.append(h)

        for hit in dedup_hits:
            start = hit["index"]
            end = start + hit["length"]
            matched_raw = text[start:end]
            low_match = matched_raw.lower()
            if any(al in low_match for al in allow_list):
                continue

            line, col = offset_to_line_col(line_starts, start)
            suppressed = False
            for sup in by_target.get(line, []):
                if "all" in sup["ruleIds"] or "*" in sup["ruleIds"] or rule["id"] in sup["ruleIds"]:
                    sup["used"] = True
                    suppressed = True
            if suppressed:
                continue

            eff_rule = {**rule, "severity": hit["severity"]} if "severity" in hit else rule
            findings.append(
                make_finding(
                    rule=eff_rule,
                    filename=filename,
                    modality=mod,
                    location=f"{line}:{col}",
                    line=line,
                    col=col,
                    span={"start": start, "end": end},
                    match=re.sub(r"\s+", " ", matched_raw).strip()[:140],
                    sentence=enclosing_sentence(text, start, end),
                )
            )

    unused = [
        {"file": filename, "line": d["directiveLine"], "ruleIds": d["ruleIds"], "reason": d["reason"]}
        for d in directives
        if not d["used"]
    ]
    findings.sort(key=lambda f: (f.get("line", 0), f.get("col", 0)))
    return {"findings": findings, "unusedSuppressions": unused}


# ---------- OOXML Inspection (.docx / .pptx) ----------

def _decode_xml_entities(s: str) -> str:
    return (
        s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&amp;", "&")
    )


def audit_ooxml_entries(
    entries: dict[str, str],
    *,
    filename: str,
    modality: str,
    pack: dict[str, Any],
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    rules_by_id = {r["id"]: r for r in pack.get("rules", [])}

    if modality == "docx":
        doc_xml = entries.get("word/document.xml")
        if not doc_xml:
            return {"findings": findings, "skipped": [{"file": filename, "reason": "Missing word/document.xml inside DOCX archive"}]}

        md_leak_rule = rules_by_id.get("markdown-leak")
        para_idx = 0
        for pm in re.finditer(r"<w:p\b[^>]*>([\s\S]*?)</w:p>", doc_xml):
            p_body = re.sub(r"<w:del\b[\s\S]*?</w:del>", "", pm.group(1))
            runs = [_decode_xml_entities(tm.group(1)) for tm in re.finditer(r"<w:t(?:\s[^>]*)?>([\s\S]*?)</w:t>", p_body)]
            para_text = "".join(runs).strip()
            if not para_text:
                continue
            para_idx += 1
            if md_leak_rule and (re.search(r"\*\*[^*\n]{1,80}\*\*", para_text) or re.match(r"^#{1,6}\s+\S", para_text)):
                findings.append(
                    make_finding(rule=md_leak_rule, filename=filename, modality=modality, location=f"para {para_idx}", line=para_idx, match=para_text[:100])
                )
            sub = audit_text(para_text, filename=filename, modality="markdown", pack=pack, config=config)
            for f in sub["findings"]:
                if f["ruleId"] == "markdown-leak":
                    continue
                findings.append({**f, "modality": "docx", "location": f"para {para_idx}", "line": para_idx})
        return {"findings": findings, "skipped": skipped}

    if modality == "pptx":
        pres_xml = entries.get("ppt/presentation.xml", "")
        pres_rels = entries.get("ppt/_rels/presentation.xml.rels", "")

        rel_map: dict[str, str] = {}
        for rm in re.finditer(r'<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"|<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"', pres_rels):
            rid = rm.group(1) or rm.group(4)
            target = (rm.group(2) or rm.group(3) or "").lstrip("/").removeprefix("../")
            if not target.startswith("ppt/"):
                target = "ppt/" + target
            rel_map[rid] = target

        ordered_slides: list[str] = []
        for sm in re.finditer(r'<p:sldId\b[^>]*\br:id="([^"]+)"', pres_xml):
            t = rel_map.get(sm.group(1))
            if t and t in entries:
                ordered_slides.append(t)
        if not ordered_slides:
            ordered_slides = sorted(
                [k for k in entries if re.match(r"^ppt/slides/slide\d+\.xml$", k)],
                key=lambda k: int(re.search(r"\d+", k).group(0)),  # type: ignore[union-attr]
            )
        if not ordered_slides:
            return {"findings": findings, "skipped": [{"file": filename, "reason": "Missing ppt/slides/*.xml inside PPTX archive"}]}

        md_leak_rule = rules_by_id.get("markdown-leak")
        word_wall_rule = rules_by_id.get("slide-word-wall")
        bullet_rule = rules_by_id.get("slide-bullet-overload")
        autofit_rule = rules_by_id.get("slide-autofit-shrink")
        weak_title_rule = rules_by_id.get("slide-weak-topic-title")
        thresholds = pack.get("thresholds", {})

        for idx, slide_entry in enumerate(ordered_slides):
            slide_num = idx + 1
            xml = entries[slide_entry]
            is_hidden = bool(re.search(r'<p:sld\b[^>]*\bshow="0"', xml))
            if is_hidden:
                skipped.append({"file": f"{filename}#slide-{slide_num}", "reason": "Hidden slide (show=0) skipped for density rules"})

            if autofit_rule and not is_hidden:
                af_m = re.search(r'<a:normAutofit\b[^>]*\bfontScale="(\d+)"', xml)
                if af_m and int(af_m.group(1)) < thresholds.get("minAutofitScale", 80000):
                    pct = int(int(af_m.group(1)) / 1000.0 + 0.5)
                    findings.append(
                        make_finding(rule=autofit_rule, filename=filename, modality=modality, location=f"slide {slide_num}", line=slide_num, match=f"normAutofit fontScale={pct}%")
                    )

            slide_paras: list[str] = []
            title_text = ""
            bullet_count = 0
            for spm in re.finditer(r"<p:sp\b[\s\S]*?</p:sp>", xml):
                sp = spm.group(0)
                is_title = bool(re.search(r'<p:ph\b[^>]*\btype="(?:title|ctrTitle)"', sp))
                is_footer = bool(re.search(r'<p:ph\b[^>]*\btype="(?:sldNum|ftr|dt)"', sp))
                paras: list[str] = []
                for apm in re.finditer(r"<a:p\b[^>]*>([\s\S]*?)</a:p>", sp):
                    p_inner = apm.group(1)
                    runs = [_decode_xml_entities(atm.group(1)) for atm in re.finditer(r"<a:t(?:\s[^>]*)?>([\s\S]*?)</a:t>", p_inner)]
                    joined = "".join(runs).strip()
                    if not joined:
                        continue
                    paras.append(joined)
                    if not is_title and not is_footer and re.search(r"<a:buChar\b|<a:buAutoNum\b", p_inner):
                        bullet_count += 1
                if not paras:
                    continue
                if is_title and not title_text:
                    title_text = " ".join(paras)
                if not is_footer:
                    slide_paras.extend(paras)

            full_text = "\n".join(slide_paras)
            if md_leak_rule and (re.search(r"\*\*[^*\n]{1,80}\*\*", full_text) or re.search(r"^#{1,6}\s+\S", full_text, re.M)):
                findings.append(
                    make_finding(rule=md_leak_rule, filename=filename, modality=modality, location=f"slide {slide_num}", line=slide_num, match=full_text[:90])
                )

            if not is_hidden:
                cjk_chars = len(re.findall(r"[\u4e00-\u9fff]", full_text))
                latin_words = len([w for w in full_text.split() if re.search(r"[A-Za-z0-9]", w)])
                if word_wall_rule and (latin_words > thresholds.get("maxSlideWords", 120) or cjk_chars > thresholds.get("maxSlideCharsZh", 280)):
                    findings.append(
                        make_finding(
                            rule=word_wall_rule,
                            filename=filename,
                            modality=modality,
                            location=f"slide {slide_num}",
                            line=slide_num,
                            match=f"{latin_words} words / {cjk_chars} CJK chars",
                        )
                    )
                if bullet_rule and bullet_count > thresholds.get("maxSlideBullets", 6):
                    findings.append(
                        make_finding(rule=bullet_rule, filename=filename, modality=modality, location=f"slide {slide_num}", line=slide_num, match=f"{bullet_count} bullet items")
                    )
                if weak_title_rule and title_text and (latin_words > 25 or cjk_chars > 50):
                    if re.match(r"^(?:overview|background|agenda|summary|introduction|context|背景|项目背景|概述|数据概述|总结|目录)$", title_text.strip(), re.I):
                        findings.append(
                            make_finding(
                                rule=weak_title_rule,
                                filename=filename,
                                modality=modality,
                                location=f"slide {slide_num}",
                                line=slide_num,
                                match=f'Title: "{title_text.strip()}"',
                            )
                        )

            sub = audit_text(full_text, filename=filename, modality="markdown", pack=pack, config=config)
            for f in sub["findings"]:
                findings.append({**f, "modality": "pptx", "location": f"slide {slide_num}", "line": slide_num})

        return {"findings": findings, "skipped": skipped}

    return {"findings": findings, "skipped": skipped}


def inspect_file(
    abs_path: Path,
    rel_posix: str,
    packs_by_id: dict[str, dict[str, Any]],
    explicit_pack: str | None = None,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = config or {}
    modality = detect_modality(abs_path.name)
    if not modality:
        return {
            "checked": False,
            "findings": [],
            "unusedSuppressions": [],
            "skipped": [{"file": rel_posix, "reason": f"Unsupported file extension '{abs_path.suffix or '(none)'}'"}],
        }

    if abs_path.stat().st_size > 25 * 1024 * 1024:
        return {
            "checked": False,
            "findings": [],
            "unusedSuppressions": [],
            "skipped": [{"file": rel_posix, "reason": "File exceeds 25 MB single-file inspection cap"}],
        }

    pack_id = pick_pack_for_file(rel_posix, modality, explicit_pack, cfg)
    pack = resolve_effective_pack(pack_id, packs_by_id, cfg)

    if modality in {"docx", "pptx"}:
        try:
            entries: dict[str, str] = {}
            total_bytes = 0
            with zipfile.ZipFile(abs_path, "r") as zf:
                infos = zf.infolist()
                if len(infos) > 3000:
                    raise ValueError("Archive exceeds 3000-entry safety cap")
                for info in infos:
                    if info.filename.endswith((".xml", ".rels")):
                        total_bytes += info.file_size
                        if total_bytes > 120 * 1024 * 1024:
                            raise ValueError("OOXML uncompressed XML exceeds 120 MB safety ceiling")
                        entries[info.filename] = zf.read(info.filename).decode("utf-8", errors="replace")
            res = audit_ooxml_entries(entries, filename=rel_posix, modality=modality, pack=pack, config=cfg)
            missing_core = any(s["file"] == rel_posix for s in res["skipped"])
            return {"checked": not missing_core, "findings": res["findings"], "unusedSuppressions": [], "skipped": res["skipped"]}
        except Exception as exc:
            return {
                "checked": False,
                "findings": [],
                "unusedSuppressions": [],
                "skipped": [{"file": rel_posix, "reason": f"Uninspectable {modality.upper()} archive: {exc}"}],
            }

    try:
        text = abs_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {
            "checked": False,
            "findings": [],
            "unusedSuppressions": [],
            "skipped": [{"file": rel_posix, "reason": "Non-UTF-8 text encoding; convert to UTF-8 to inspect"}],
        }

    res = audit_text(text, filename=rel_posix, modality=modality, pack=pack, config=cfg)
    return {"checked": True, "findings": res["findings"], "unusedSuppressions": res["unusedSuppressions"], "skipped": []}


def collect_target_files(targets: list[str], cwd: Path, config: dict[str, Any]) -> tuple[list[tuple[Path, str]], list[dict[str, str]]]:
    files: list[tuple[Path, str]] = []
    skipped: list[dict[str, str]] = []
    ignore_globs = list(config.get("ignore", []))
    is_self_repo = (cwd / "packs" / "core" / "pack.json").is_file() and (cwd / "src" / "core.mjs").is_file()
    effective_ignores = ["packs/**", "tests/**", "scratch/**"] if (is_self_repo and not ignore_globs) else ignore_globs

    def walk(abs_p: Path, explicit: bool) -> None:
        if not abs_p.exists():
            raise FileNotFoundError(f"Target path not found: {abs_p}")
        try:
            rel = abs_p.relative_to(cwd).as_posix()
        except ValueError:
            rel = abs_p.name
        if not explicit and matches_any_glob(rel, effective_ignores):
            return
        if abs_p.is_dir():
            for entry in sorted(abs_p.iterdir()):
                if entry.name in DEFAULT_IGNORE_DIRS:
                    continue
                walk(entry, False)
            return
        if not abs_p.is_file():
            return
        mod = detect_modality(abs_p.name)
        if not mod:
            if explicit:
                skipped.append({"file": rel, "reason": f"Unsupported file extension '{abs_p.suffix or '(none)'}'"})
            return
        files.append((abs_p, rel))

    for t in targets:
        walk((cwd / t).resolve(), True)
    return files, skipped
