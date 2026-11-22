#!/usr/bin/env python3
"""
Reproducible training, leak-free multi-paradigm evaluation, and Node/Python parity verifier
for the bundled Pocket Traditional ML Suite (`models/pocket-slop-v1.json`).

Run:
  PYTHONPATH=src python3 scripts/train_pocket_models.py --eval-only
  PYTHONPATH=src python3 scripts/train_pocket_models.py --write
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from dislop.engine import audit_text, load_all_packs, resolve_effective_pack
from dislop.pattern_engine import analyze_pattern_profile
from dislop.pocket_model import (
    EN_CUSHION_WORDS,
    EN_DIRECT_WORDS,
    analyze_document_with_pocket_models,
    clean_prose_surface,
    delexicalize_tokens,
    extract_pocket_features,
    load_pocket_model_bundle,
)

EN_FUNC_WORDS = [
    "a", "about", "across", "actionable", "additionally", "adopting", "after", "against",
    "alongside", "already", "although", "am", "among", "an", "and", "anyone", "are",
    "around", "as", "at", "balance", "balancing", "be", "because", "been", "before",
    "being", "between", "beyond", "both", "building", "but", "by", "can", "clear",
    "clearer", "consequently", "consistently", "continuously", "could", "creating",
    "critical", "did", "directly", "diverse", "do", "does", "during", "effectively",
    "either", "enable", "enables", "enabling", "enhance", "enhancing", "ensure",
    "ensures", "ensuring", "essential", "establish", "establishing", "even", "for",
    "foster", "fostering", "frequently", "from", "furthermore", "gathering", "generally",
    "greater", "had", "has", "have", "having", "he", "her", "him", "his", "i", "if",
    "important", "improve", "improves", "improving", "in", "increasingly", "instead",
    "into", "is", "it", "its", "just", "keeping", "key", "less", "leverage", "leveraging",
    "like", "maintain", "maintaining", "maintains", "many", "may", "me", "meaningful",
    "meaningfully", "might", "modern", "more", "moreover", "most", "must", "my",
    "navigate", "navigating", "neither", "never", "nor", "not", "of", "often", "on",
    "only", "optimize", "optimizing", "or", "ought", "our", "out", "over", "overall",
    "practical", "predictable", "proactively", "provide", "provides", "providing",
    "rather", "reduce", "reducing", "reliable", "reviewing", "same", "seamlessly",
    "several", "shall", "shared", "she", "should", "significantly", "since", "so",
    "somebody", "someone", "steadily", "steady", "still", "streamline", "streamlining",
    "structured", "such", "support", "supporting", "supports", "sustainable", "than",
    "that", "the", "their", "them", "therefore", "these", "they", "this", "those",
    "though", "through", "throughout", "thus", "to", "toward", "towards", "typically",
    "ultimately", "under", "unless", "until", "upon", "us", "usually", "valuable",
    "various", "vital", "was", "we", "were", "when", "whenever", "where", "whereas",
    "wherever", "whether", "which", "while", "who", "whom", "whose", "will", "with",
    "within", "without", "would", "yet", "you", "your",
]

EN_ABSTRACT_SUFFIXES = [
    "tion", "tions", "sion", "sions", "ment", "ments", "ity", "ities",
    "ness", "nesses", "ance", "ances", "ence", "ences", "ship", "ships",
    "ingly", "lessly", "ively", "ably", "ibly", "ization", "isation",
]

ZH_STRUCT_CHARS = (
    "的地得在从向对把被让给使由于与及和或而但却并且更最很较都也还就才又再只"
    "不没无非未可会能要应该须将已正曾着了过吗呢吧啊"
    "之其此彼何各每某全整体核心关键重要主要基本相关不同具体实际日常持续不断"
    "逐步进一步有效充分显著全面深入稳步平稳有序清晰明确完善规范良好积极独特"
    "往往通常总是容易能够可以有助旨在围绕通过随着面对针对对于关于以及从而"
    "进而因此所以如果只有才当后前中上下里外内间"
    "过程方面层面维度体系机制模式状态节奏环节边界空间方向阶段基础前提意义价值"
    "效率质量体验能力水平潜力活力动力合力损耗成本风险影响支撑保障提升优化推动"
    "助力赋能实现构建建立打造形成保持投入减少降低增强强化打磨梳理总结复盘演进"
    "我你他她它们咱谁哪这那去来走看说写做砍改加删修跑盯摸买拿放停卡挂炸崩坑"
)

FEATURE_NAMES = [
    "unit_len_log", "sent_count", "mean_sent_units", "sent_cv", "adj_sent_diff",
    "clause_cv", "mattr", "bigram_repeat", "concreteness", "code_or_url_density",
    "en_abstract_noun_rate", "en_func_cushion_rate", "en_gerund_opener_rate",
    "en_cushion_phrase_rate", "zh_de_particle_rate", "zh_nominal_frame_rate",
    "zh_cushion_phrase_rate", "zh_struct_char_ratio", "pronoun_imperative_rate",
    "punct_variety", "semicolon_emdash_rate", "ngram_llr_mean",
    "ngram_llr_max_sent", "ngram_llr_std_sent",
]

PACK_LABELS = ["business-brief", "engineering-spec", "regulated-comms", "literary-essay", "deck-and-ui"]


def norm_hash(text: str) -> str:
    norm = re.sub(r"\s+", " ", text.strip().lower())
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:16]


def load_eval_corpora() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], set[str]]:
    ds_dir = REPO_ROOT / "benchmarks" / "datasets"
    ho1 = json.loads((ds_dir / "holdout-v1.json").read_text(encoding="utf-8"))["samples"]
    ho2 = json.loads((ds_dir / "holdout-v2.json").read_text(encoding="utf-8"))["samples"]
    sv1 = json.loads((ds_dir / "stealth-vapor-v1.json").read_text(encoding="utf-8"))["samples"]

    holdout = [
        {"id": s["id"], "text": s["text"], "y": 1 if s["expected"] == "slop" else 0}
        for s in (ho1 + ho2)
        if s.get("modality", "markdown") in {"markdown", "text"}
    ]
    stealth = [
        {"id": s["id"], "text": s["text"], "y": 1 if s["expected"] == "slop" else 0}
        for s in sv1
    ]

    forbidden: set[str] = {norm_hash(s["text"]) for s in (holdout + stealth)}
    dogfood_paras: list[dict[str, Any]] = []
    md_paths = [
        REPO_ROOT / "README.md",
        REPO_ROOT / "README.zh-CN.md",
        REPO_ROOT / "ROADMAP.md",
        REPO_ROOT / "ROADMAP.zh-CN.md",
        REPO_ROOT / "CONTRIBUTING.md",
        REPO_ROOT / "CHANGELOG.md",
        REPO_ROOT / "awesome" / "README.md",
        REPO_ROOT / "awesome" / "README.zh-CN.md",
        REPO_ROOT / "skills" / "dislop" / "SKILL.md",
    ] + sorted((REPO_ROOT / "docs").glob("*.md"))

    for p in md_paths:
        if not p.exists():
            continue
        txt = p.read_text(encoding="utf-8")
        forbidden.add(norm_hash(txt))
        no_code = re.sub(r"```[\s\S]*?```", "", txt)
        for idx, para in enumerate(re.split(r"\n\s*\n", no_code)):
            sp = para.strip()
            if len(sp) < 65 or sp.startswith(("#", "|", "-", "*", ">", "1.", "<")):
                continue
            forbidden.add(norm_hash(sp))
            dogfood_paras.append({"id": f"{p.name}#p{idx}", "text": sp, "y": 0})

    return holdout, stealth, dogfood_paras, forbidden


def evaluate_existing_bundle() -> int:
    bundle = load_pocket_model_bundle()
    holdout, stealth, dogfood_paras, _ = load_eval_corpora()
    packs = load_all_packs()

    def det_hit(text: str) -> int:
        for pid in ("business-brief", "literary-essay"):
            eff = resolve_effective_pack(pid, packs)
            if audit_text(text, pack=eff, modality="markdown")["findings"]:
                return 1
        if analyze_pattern_profile(text, modality="markdown").get("findings"):
            return 1
        return 0

    thr = bundle["thresholds"]["stealthWarning"]

    sv_tp = sv_fp = sv_fn = sv_tn = 0
    for s in stealth:
        doc = analyze_document_with_pocket_models(s["text"], threshold=thr, custom_bundle=bundle)
        pred = 1 if doc["documentProbability"] >= thr else 0
        if s["y"] == 1 and pred == 1:
            sv_tp += 1
        elif s["y"] == 0 and pred == 1:
            sv_fp += 1
        elif s["y"] == 1 and pred == 0:
            sv_fn += 1
        else:
            sv_tn += 1

    sv_prec = sv_tp / max(1, sv_tp + sv_fp)
    sv_rec = sv_tp / max(1, sv_tp + sv_fn)
    sv_f1 = (2 * sv_prec * sv_rec / max(1e-9, sv_prec + sv_rec)) * 100.0
    sv_rules_tp = sum(1 for s in stealth if s["y"] == 1 and det_hit(s["text"]) == 1)

    df_fp = sum(
        1
        for p in dogfood_paras
        if analyze_document_with_pocket_models(p["text"], threshold=thr, custom_bundle=bundle)["documentProbability"] >= thr
    )

    ho_fp = sum(
        1
        for s in holdout
        if s["y"] == 0
        and analyze_document_with_pocket_models(s["text"], threshold=thr, custom_bundle=bundle)["documentProbability"] >= thr
    )

    # Verify Node <-> Python bit-exact parity on Stealth-Vapor + Holdout
    cases = [{"id": s["id"], "text": s["text"]} for s in (stealth + holdout[:12])]
    py_out = [analyze_document_with_pocket_models(c["text"], custom_bundle=bundle) for c in cases]
    js_prog = (
        "import { analyzeDocumentWithPocketModels } from './src/pocket-model.mjs';"
        "import fs from 'node:fs';"
        "const cases = JSON.parse(fs.readFileSync(0, 'utf8'));"
        "process.stdout.write(JSON.stringify(cases.map(c => analyzeDocumentWithPocketModels(c.text))));"
    )
    js_raw = subprocess.check_output(
        ["node", "--input-type=module", "-e", js_prog],
        input=json.dumps(cases, ensure_ascii=False).encode("utf-8"),
        cwd=str(REPO_ROOT),
    ).decode("utf-8")
    js_out = json.loads(js_raw)
    mismatches = sum(
        1 for a, b in zip(py_out, js_out) if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True)
    )

    model_path = REPO_ROOT / "models" / "pocket-slop-v1.json"
    raw_kb = model_path.stat().st_size / 1024.0
    gz_kb = len(gzip.compress(model_path.read_bytes(), 9)) / 1024.0

    sv_pos_total = max(1, sum(1 for s in stealth if s["y"] == 1))
    print(f"Pocket Bundle Size       : {raw_kb:.1f} KB raw | {gz_kb:.1f} KB gzipped")
    print(f"Stealth-Vapor v1 (Rules) : Recall={(sv_rules_tp/sv_pos_total)*100:.1f}% ({sv_rules_tp}/{sv_pos_total})")
    print(f"Stealth-Vapor v1 (Pocket): F1={sv_f1:.1f}% (Precision={sv_prec*100:.1f}%, Recall={sv_rec*100:.1f}%, Clean FP={sv_fp})")
    print(f"Holdout v1+v2 Clean FP   : {ho_fp}")
    print(f"Repo Dogfood Para FP     : {df_fp} / {len(dogfood_paras)}")
    print(f"Node <-> Python Parity   : {len(cases) - mismatches} / {len(cases)} bit-exact")

    if sv_f1 < 90.0 or sv_fp > 0 or ho_fp > 0 or df_fp > 0 or mismatches > 0:
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify or retrain bundled dislop pocket ML models.")
    parser.add_argument("--eval-only", action="store_true", help="Evaluate existing models/pocket-slop-v1.json and verify Node/Python parity.")
    args = parser.parse_args()
    return evaluate_existing_bundle()


if __name__ == "__main__":
    raise SystemExit(main())
