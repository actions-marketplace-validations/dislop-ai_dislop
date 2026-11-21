from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__", "packs", "tests"}
TEXT_SUFFIXES = {".md", ".markdown", ".txt", ".html", ".htm", ".svg", ".css", ".tsx", ".jsx"}
OFFICE_SUFFIXES = {".docx", ".pptx"}
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
WORD_RE = re.compile(r"[A-Za-z0-9_'-]+")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
INLINE_CODE_RE = re.compile(r"`[^`]*`")


def _packs_dir() -> Path:
    repo_packs = Path(__file__).resolve().parents[2] / "packs"
    if repo_packs.is_dir():
        return repo_packs
    return Path(__file__).resolve().parent / "packs"


def load_packs() -> dict[str, dict[str, Any]]:
    base = _packs_dir()
    packs: dict[str, dict[str, Any]] = {}
    if not base.is_dir():
        return packs
    for child in sorted(base.iterdir()):
        manifest = child / "pack.json"
        if child.is_dir() and manifest.is_file():
            data = json.loads(manifest.read_text(encoding="utf-8"))
            packs[data["id"]] = data
    return packs


def explain_rule(rule_id: str) -> dict[str, Any] | None:
    for pack in load_packs().values():
        for rule in pack.get("rules", []):
            if rule["id"] == rule_id:
                exemplars = [ex for ex in pack.get("exemplars", []) if ex.get("ruleId") == rule_id]
                return {"pack": pack["id"], "rule": rule, "exemplars": exemplars}
    return None


def _strip_code_for_prose(lines: list[str], is_markdown: bool) -> list[str]:
    """Blank out fenced code blocks and inline code spans in Markdown so prose rules never flag code examples."""
    if not is_markdown:
        return lines
    cleaned: list[str] = []
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            cleaned.append("")
            continue
        if in_fence:
            cleaned.append("")
            continue
        cleaned.append(INLINE_CODE_RE.sub(lambda m: " " * len(m.group(0)), line))
    return cleaned


def audit_text(text: str, pack_id: str = "business-brief", *, is_markdown: bool = True) -> dict[str, Any]:
    packs = load_packs()
    if pack_id not in packs:
        raise ValueError(f"Unknown Taste Pack: {pack_id}")
    pack = packs[pack_id]
    raw_lines = text.splitlines()
    prose_lines = _strip_code_for_prose(raw_lines, is_markdown=is_markdown)
    findings: list[dict[str, Any]] = []

    for rule in pack.get("rules", []):
        target_lines = raw_lines if rule.get("category") in ("artifact-hygiene", "visual-cliche") else prose_lines
        compiled = [re.compile(pat, re.IGNORECASE) for pat in rule.get("patterns", [])]
        for line_idx, line in enumerate(target_lines, start=1):
            for regex in compiled:
                for m in regex.finditer(line):
                    findings.append(
                        {
                            "line": line_idx,
                            "column": m.start() + 1,
                            "ruleId": rule["id"],
                            "severity": rule["severity"],
                            "category": rule["category"],
                            "match": m.group(0),
                            "description": rule["description"],
                        }
                    )

    # Structural check: excessive em-dash density in prose (>8 per 1,000 non-space chars)
    joined_prose = "\n".join(prose_lines)
    non_space = len(re.sub(r"\s+", "", joined_prose))
    em_dashes = joined_prose.count("—")
    if non_space >= 300 and (em_dashes * 1000 / non_space) > 10:
        findings.append(
            {
                "line": 1,
                "column": 1,
                "ruleId": "excessive-em-dash-density",
                "severity": "info",
                "category": "structure",
                "match": f"{em_dashes} em-dashes / {non_space} chars",
                "description": "High em-dash frequency flattens sentence cadence; replace part of them with periods or clauses.",
            }
        )

    return {"pack": pack["id"], "count": len(findings), "findings": findings}


def _xml_texts(xml_bytes: bytes) -> list[str]:
    root = ET.fromstring(xml_bytes)
    chunks: list[str] = []
    for elem in root.iter():
        tag = elem.tag.rsplit("}", 1)[-1]
        if tag == "t" and elem.text:
            chunks.append(elem.text)
    return chunks


def extract_docx(path: Path) -> tuple[str, dict[str, Any]]:
    paragraphs: list[str] = []
    embedded_images = 0
    with zipfile.ZipFile(path) as zf:
        for name in zf.namelist():
            if name.startswith("word/media/") and not name.endswith("/"):
                embedded_images += 1
        if "word/document.xml" in zf.namelist():
            root = ET.fromstring(zf.read("word/document.xml"))
            for elem in root.iter():
                if elem.tag.rsplit("}", 1)[-1] == "p":
                    txt = "".join(t.text for t in elem.iter() if t.tag.rsplit("}", 1)[-1] == "t" and t.text).strip()
                    if txt:
                        paragraphs.append(txt)
    return "\n".join(paragraphs), {"modality": "docx", "paragraphs": len(paragraphs), "embeddedImages": embedded_images}


def audit_pptx(path: Path, pack_id: str = "deck-and-ui") -> dict[str, Any]:
    packs = load_packs()
    if pack_id not in packs:
        raise ValueError(f"Unknown Taste Pack: {pack_id}")
    pack = packs[pack_id]
    structural = pack.get("structural") or {}
    max_words = int(structural.get("maxSlideWords", 120))
    max_cjk = int(structural.get("maxSlideCjkChars", 280))

    findings: list[dict[str, Any]] = []
    slide_texts: list[str] = []
    with zipfile.ZipFile(path) as zf:
        slide_names = sorted(
            (n for n in zf.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
            key=lambda s: int(re.search(r"(\d+)", s).group(1)),  # type: ignore[union-attr]
        )
        for idx, name in enumerate(slide_names, start=1):
            chunks = _xml_texts(zf.read(name))
            slide_body = "\n".join(chunks)
            slide_texts.append(slide_body)
            words = len(WORD_RE.findall(slide_body))
            cjk = len(CJK_RE.findall(slide_body))
            if words > max_words or cjk > max_cjk:
                findings.append(
                    {
                        "line": idx,
                        "column": 1,
                        "ruleId": "pptx-slide-word-wall",
                        "severity": "warning",
                        "category": "layout-density",
                        "match": f"slide {idx}: {words} words, {cjk} CJK chars",
                        "description": f"Slide exceeds readable density cap ({max_words} words / {max_cjk} CJK chars); split or trim.",
                    }
                )
            sub = audit_text(slide_body, pack_id, is_markdown=False)
            for f in sub["findings"]:
                f["line"] = idx
                f["match"] = f"slide {idx}: {f['match']}"
                findings.append(f)

    return {"pack": pack["id"], "modality": "pptx", "slides": len(slide_texts), "count": len(findings), "findings": findings}


def audit_path(path: Path, pack_id: str | None = None) -> dict[str, Any]:
    if path.is_dir():
        files = [
            p
            for p in sorted(path.rglob("*"))
            if p.is_file()
            and p.suffix.lower() in (TEXT_SUFFIXES | OFFICE_SUFFIXES)
            and not any(part in SKIP_DIRS or part.startswith(".") for part in p.relative_to(path).parts)
        ]
        results = [audit_path(f, pack_id) for f in files]
        total = sum(r["count"] for r in results)
        return {"target": str(path), "filesScanned": len(results), "count": total, "results": results}

    suffix = path.suffix.lower()
    chosen_pack = pack_id or ("deck-and-ui" if suffix in {".pptx", ".html", ".htm", ".svg", ".css"} else "business-brief")
    if suffix == ".pptx":
        res = audit_pptx(path, chosen_pack)
        return {"file": str(path), **res}
    if suffix == ".docx":
        text, meta = extract_docx(path)
        res = audit_text(text, chosen_pack, is_markdown=False)
        return {"file": str(path), **meta, **res}
    content = path.read_text(encoding="utf-8")
    is_md = suffix in {".md", ".markdown"}
    res = audit_text(content, chosen_pack, is_markdown=is_md)
    return {"file": str(path), "modality": suffix.lstrip(".") or "text", **res}
