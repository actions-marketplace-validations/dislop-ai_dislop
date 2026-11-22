#!/usr/bin/env python3
"""
Controlled multi-paradigm text anti-slop experiment harness.
Compares 5 offline paradigms across v1 + holdout + text-hard-v2 (95 text samples):
  1. Legacy single-word blacklist + readability baseline (shows why legacy tools fail/over-flag)
  2. Pure statistical & information-theoretic stylometrics (burstiness, MATTR, zlib NCR, concreteness, skeleton echo)
  3. Classical NLP / ML (TF-IDF char/word n-grams + stylometric fusion via scikit-learn, 5-fold CV & OOD transfer)
  4. Multi-angle deterministic structural & co-occurrence probes (explainable spans)
  5. Integrated hybrid architecture (deterministic spans + calibrated statistical telemetry)

Run:
  PYTHONPATH=src python3 scripts/run_text_paradigm_experiments.py
"""

from __future__ import annotations

import json
import math
import re
import statistics
import time
import zlib
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

from dislop.engine import analyze_text_profile, audit_text, load_all_packs, resolve_effective_pack

ROOT = Path(__file__).resolve().parent.parent
DATASETS_DIR = ROOT / "benchmarks" / "datasets"

# Exact pinned v1 rule IDs (25 rules) so v1_baseline stays 100% reproducible even after packs upgrade
V1_RULE_IDS = {
    "unfilled-placeholder", "chatbot-artifact", "markdown-leak", "ui-dead-control",
    "en-throat-clearing-opener", "en-cliche-lexicon", "zh-bureaucratic-padding",
    "negation-pivot-frame", "staccato-slogan-run", "zh-four-char-triad",
    "unsourced-attribution", "bold-lead-list-wall",
    "zh-essay-moralizing-ending", "en-essay-moralizing-ending", "literary-negation-pivot",
    "excessive-em-dash-density", "zh-halfwidth-punctuation",
    "slide-word-wall", "slide-bullet-overload", "slide-autofit-shrink",
    "slide-weak-topic-title", "ui-ai-gradient", "ui-pill-soup",
    "ui-box-in-box", "ui-prompt-echo-badge",
}


def load_text_corpus() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    v1 = json.loads((DATASETS_DIR / "detection-v1.json").read_text(encoding="utf-8"))["samples"]
    ho = json.loads((DATASETS_DIR / "holdout-v1.json").read_text(encoding="utf-8"))["samples"]
    v2 = json.loads((DATASETS_DIR / "text-hard-v2.json").read_text(encoding="utf-8"))["samples"]

    def is_text(s: dict[str, Any]) -> bool:
        return s.get("modality", "markdown") in {"markdown", "text"}

    base_text = [s for s in (v1 + ho) if is_text(s)]
    hard_text = [s for s in v2 if is_text(s)]
    return base_text, hard_text


# ---------- Shared Text Feature Extractors ----------

ZH_SUBTLE_MARKERS = [
    "有效推动", "持续优化", "显著提升", "进一步助力", "助力", "精细化运营",
    "深度融合", "充分释放", "创新潜能", "高度敏捷", "决策支撑体系", "复杂多变",
    "整体服务质量", "品牌竞争力", "协同效率", "交互体验", "核心竞争力",
    "新篇章", "新台阶", "新阶段", "充分保障", "轻量化交互", "一线响应速度",
    "不可逆转", "集体记忆", "呼吸感", "宏大叙事", "触手可及",
]

EN_SUBTLE_MARKERS = [
    "leverages", "leverage", "leveraging", "seamlessly", "streamline", "streamlines",
    "foster", "fostering", "robust", "empowers", "empower", "stakeholders",
    "navigate", "comprehensive", "harnesses", "harness", "elevate", "pivotal",
    "alignment", "transformative", "outcomes", "resilience", "synergy",
    "holistic", "ecosystem", "actionable", "unparalleled", "grounding", "stillness",
]

ZH_DISCOURSE_MARKERS = [
    "此外", "与此同时", "不仅如此", "总而言之", "综上所述", "换言之",
    "进一步来看", "诚然", "综合来看", "归根结底",
]

EN_DISCOURSE_MARKERS = [
    "furthermore", "moreover", "additionally", "consequently",
    "in conclusion", "notably", "at the same time", "while ",
]


def split_sentences(text: str) -> list[str]:
    cleaned = re.sub(r"```[\s\S]*?```", " ", text)
    cleaned = re.sub(r"`[^`\n]+`", "CODE", cleaned)
    parts = re.split(r"[。！？.!?\n]+", cleaned)
    return [p.strip() for p in parts if len(p.strip()) >= 3]


def unit_length(s: str) -> float:
    cjk = len(re.findall(r"[\u4e00-\u9fff]", s))
    en = len(re.findall(r"[A-Za-z0-9]+", s))
    return cjk * 0.6 + en


def extract_stylometrics(text: str) -> dict[str, float]:
    raw = str(text or "")
    stripped = re.sub(r"```[\s\S]*?```", "", raw)
    sents = split_sentences(stripped)
    lengths = [unit_length(s) for s in sents if unit_length(s) > 0]
    n_sents = len(lengths)

    if n_sents >= 2:
        mean_len = statistics.mean(lengths)
        std_len = statistics.pstdev(lengths)
        cv = std_len / mean_len if mean_len > 0 else 0.0
        diffs = [abs(lengths[i] - lengths[i - 1]) for i in range(1, n_sents)]
        adj_contrast = (statistics.mean(diffs) / mean_len) if mean_len > 0 else 0.0
    elif n_sents == 1:
        mean_len, cv, adj_contrast = lengths[0], 0.5, 0.5
    else:
        mean_len, cv, adj_contrast = 0.0, 0.5, 0.5

    # Lexical tokens (CJK chars + EN words)
    tokens = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]{2,}", stripped.lower())
    n_tok = len(tokens)
    ttr = len(set(tokens)) / max(1, n_tok)

    # Moving-Average TTR (window 25)
    win = 25
    if n_tok > win:
        mattr = statistics.mean(len(set(tokens[i:i + win])) / win for i in range(0, n_tok - win + 1, 5))
    else:
        mattr = ttr

    # Bigram echo ratio
    bigrams = list(zip(tokens, tokens[1:])) if n_tok >= 2 else []
    bigram_repeat = 1.0 - (len(set(bigrams)) / max(1, len(bigrams))) if bigrams else 0.0

    # zlib Normalized Compression Ratio (lower = more repetitive/predictable)
    b = stripped.encode("utf-8")
    ncr = len(zlib.compress(b, level=6)) / max(1, len(b))

    # Shannon char entropy
    if stripped:
        counts = Counter(stripped)
        total_c = len(stripped)
        entropy = -sum((c / total_c) * math.log2(c / total_c) for c in counts.values())
    else:
        entropy = 0.0

    # Concreteness anchors: numbers, units, dates, code spans, file paths, versions, PR/issue refs
    anchors = 0
    anchors += len(re.findall(r"\b\d+(?:[.,:]\d+)?%?\b", raw))
    anchors += len(re.findall(r"`[^`\n]+`", raw))
    anchors += len(re.findall(r"[/\\][A-Za-z0-9._-]+\.[a-z]{1,5}\b", raw))
    anchors += len(re.findall(r"\b(?:PR\s*#?\d+|v\d+\.\d+|HTTP\s*\d{3}|UTC|Q[1-4])\b", raw))
    anchors += len(re.findall(r"(?:[一二三四五六七八九十两百千万]+[天月年次个张条座块斤米秒分时]|周[一二三四五六日天]|昨天|昨晚|今早|上周|下周|去年|前年|清晨|傍晚|凌晨|午后|十月|十一月|十二月)", raw))
    total_units = max(1.0, unit_length(stripped))
    concreteness_per_100 = (anchors / total_units) * 100.0

    # Punctuation features
    max_semi_in_sent = max([(s.count(";") + s.count("；")) for s in sents], default=0)
    max_comma_in_sent = max([(s.count(",") + s.count("，")) for s in sents], default=0)
    em_dashes = len(re.findall(r"——|—", stripped))
    em_dash_density = (em_dashes / total_units) * 300.0
    q_marks = stripped.count("?") + stripped.count("？")

    # Subtle marker counts
    low = stripped.lower()
    zh_cooc = len({w for w in ZH_SUBTLE_MARKERS if w in stripped})
    en_cooc = len({w for w in EN_SUBTLE_MARKERS if re.search(rf"\b{re.escape(w)}\b", low)})
    cooc_count = zh_cooc + en_cooc

    zh_disc = sum(len(re.findall(re.escape(w), stripped)) for w in ZH_DISCOURSE_MARKERS)
    en_disc = sum(len(re.findall(rf"\b{re.escape(w.strip())}\b", low)) for w in EN_DISCOURSE_MARKERS)
    disc_count = zh_disc + en_disc

    # Paragraph/sentence opener skeleton repetition (modernized plagiarism shingling)
    paras = [p.strip() for p in re.split(r"\n\s*\n", stripped) if p.strip()]
    units_for_skel = paras if len(paras) >= 3 else sents
    skel_echo_max = 0
    if len(units_for_skel) >= 3:
        skels = []
        for u in units_for_skel:
            # Normalize to structural opener skeleton
            if re.match(r"^在[\u4e00-\u9fff]{2,6}方面[，,]", u):
                skels.append("ZH_ZAI_X_FANGMIAN")
            elif re.match(r"^(?:首先|其次|再次|最后|第一|第二|第三|第四)[，,]", u):
                skels.append("ZH_ORDINAL_STEP")
            elif re.match(r"^By\s+[a-z]+ing\b", u, re.I):
                skels.append("EN_BY_GERUND")
            elif re.match(r"^(?:First|Second|Third|Fourth|Finally|Lastly),\s+", u, re.I):
                skels.append("EN_ORDINAL_STEP")
            else:
                # Generic 2-token syntactic prefix skeleton
                m_en = re.match(r"^([A-Za-z]+\s+[A-Za-z]+)", u)
                if m_en:
                    skels.append("EN_PRE:" + m_en.group(1).lower())
                else:
                    skels.append("ZH_PRE:" + u[:3])
        if skels:
            skel_echo_max = Counter(skels).most_common(1)[0][1]

    # Rhetorical Q&A flag
    rhet_qa = int(bool(
        re.search(r"(?:为什么|为何)[^？?\n]{3,35}[？?]\s*(?:因为|原因(?:很|其实)?(?:简单|在于))", stripped)
        or re.search(r"(?:结果呢|原因呢|真相呢|代价呢)[？?]", stripped)
        or re.search(r"\bWhy\s+(?:do|does|did|is|are)\s+[^?\n]{6,80}\?\s*Because\b", stripped, re.I)
        or re.search(r"(?:^|[.!?]\s+)(?:The\s+(?:result|reason|catch|truth|reality|secret))\?\s+[A-Z]", stripped)
    ))

    # Narrative sandwich flags
    macro_opener = int(bool(
        re.search(r"^(?:随着[^，。\n]{2,18}(?:飞速|快速|不断|持续)(?:发展|深入|演进|推进)|在(?:当今|快节奏的|这个)[^，。\n]{2,16}(?:时代|生活|社会)中?)", stripped)
        or re.search(r"^(?:As\s+(?:organizations|teams|companies|distributed\s+teams)\s+(?:navigate|scale|adapt)|In\s+an\s+era\s+(?:defined\s+by|of|where))", stripped, re.I)
    ))
    future_closer = int(bool(
        re.search(r"(?:展望未来[，,]|携手[^，。！？\n]{1,16}(?:开启|迈向)[^。！？\n]{2,20}|必将迎来[^。！？\n]{2,16}|值得每一个[^。！？\n]{2,16}深思|或许[，,]\s*真正值得珍惜的从来不是)", stripped)
        or re.search(r"\b(?:Looking\s+ahead,|Moving\s+forward,)[^.!?\n]{5,120}(?:well-positioned\s+to\s+thrive|vital\s+role|essential\s+for|year\s+ahead|remind\s+us)\b", stripped, re.I)
    ))

    return {
        "n_sents": float(n_sents),
        "mean_len": mean_len,
        "burstiness_cv": cv,
        "adj_contrast": adj_contrast,
        "ttr": ttr,
        "mattr": mattr,
        "bigram_repeat": bigram_repeat,
        "ncr": ncr,
        "entropy": entropy,
        "concreteness": concreteness_per_100,
        "max_semi_in_sent": float(max_semi_in_sent),
        "max_comma_in_sent": float(max_comma_in_sent),
        "em_dash_density": em_dash_density,
        "q_marks": float(q_marks),
        "cooc_count": float(cooc_count),
        "disc_count": float(disc_count),
        "skel_echo_max": float(skel_echo_max),
        "rhet_qa": float(rhet_qa),
        "macro_opener": float(macro_opener),
        "future_closer": float(future_closer),
    }


def metrics_summary(y_true: list[int], y_pred: list[int], y_score: list[float] | None = None) -> dict[str, Any]:
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    auc = roc_auc_score(y_true, y_score) if y_score is not None and len(set(y_true)) == 2 else None
    return {
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "precision": round(prec * 100, 1),
        "recall": round(rec * 100, 1),
        "f1": round(f1 * 100, 1),
        "fpr": round(fpr * 100, 1),
        "auroc": round(auc, 3) if auc is not None else None,
    }


def main() -> None:
    packs = load_all_packs(ROOT / "packs")
    base_samples, hard_samples = load_text_corpus()
    all_samples = base_samples + hard_samples
    y_all = [1 if s["expected"] == "slop" else 0 for s in all_samples]
    y_hard = [1 if s["expected"] == "slop" else 0 for s in hard_samples]
    y_base = [1 if s["expected"] == "slop" else 0 for s in base_samples]

    t0 = time.perf_counter()
    feats_all = [extract_stylometrics(s["text"]) for s in all_samples]
    feat_ms = (time.perf_counter() - t0) * 1000 / len(all_samples)
    feat_names = list(feats_all[0].keys())
    X_all = np.array([[f[k] for k in feat_names] for f in feats_all], dtype=float)
    X_base = X_all[:len(base_samples)]
    X_hard = X_all[len(base_samples):]

    # v1 baseline predictions (strictly filtered to pinned V1_RULE_IDS!)
    def run_v1(samples):
        out = []
        for s in samples:
            p = resolve_effective_pack(s.get("pack", "business-brief"), packs)
            p_v1 = {**p, "rules": [r for r in p.get("rules", []) if r["id"] in V1_RULE_IDS]}
            res = audit_text(s["text"], filename=s.get("filename", "s.md"), modality="markdown", pack=p_v1)
            out.append(1 if res["findings"] else 0)
        return out

    v1_all = run_v1(all_samples)
    v1_hard = v1_all[len(base_samples):]

    # Paradigm 1a: Legacy naive single-word blacklist (banning subtle words individually)
    p1_all = [1 if (v1_all[i] or feats_all[i]["cooc_count"] >= 1) else 0 for i in range(len(all_samples))]
    p1_hard = p1_all[len(base_samples):]

    # Paradigm 1b: Legacy readability-only heuristic (uniform sentence length / low burstiness alone)
    p1b_hard = [1 if (feats_all[len(base_samples) + i]["burstiness_cv"] < 0.25 and feats_all[len(base_samples) + i]["n_sents"] >= 3) else 0 for i in range(len(hard_samples))]

    # Paradigm 2: Pure statistical/stylometric features via 5-fold CV (LogisticRegression)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    pure_stat_cols = ["n_sents", "mean_len", "burstiness_cv", "adj_contrast", "ttr", "mattr", "bigram_repeat", "ncr", "entropy", "concreteness", "max_semi_in_sent", "max_comma_in_sent", "em_dash_density", "q_marks"]
    stat_idx = [feat_names.index(c) for c in pure_stat_cols]
    X_stat = X_all[:, stat_idx]
    p2_oof_prob = np.zeros(len(all_samples))
    for tr, va in skf.split(X_stat, y_all):
        clf = Pipeline([("sc", StandardScaler()), ("lr", LogisticRegression(max_iter=1000, C=1.0))])
        clf.fit(X_stat[tr], np.array(y_all)[tr])
        p2_oof_prob[va] = clf.predict_proba(X_stat[va])[:, 1]
    p2_pred = (p2_oof_prob >= 0.5).astype(int).tolist()

    # Paradigm 3a: Classical NLP TF-IDF char n-grams (5-fold CV on all 95)
    texts_all = [s["text"] for s in all_samples]
    p3a_oof_prob = np.zeros(len(all_samples))
    for tr, va in skf.split(texts_all, y_all):
        clf = Pipeline([
            ("vec", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True)),
            ("lr", LogisticRegression(max_iter=1000, C=2.0)),
        ])
        clf.fit([texts_all[i] for i in tr], np.array(y_all)[tr])
        p3a_oof_prob[va] = clf.predict_proba([texts_all[i] for i in va])[:, 1]
    p3a_pred = (p3a_oof_prob >= 0.5).astype(int).tolist()

    # Paradigm 3b: Classical NLP TF-IDF OOD Transfer (Train on v1+holdout -> Test on unseen text-hard-v2!)
    clf_ood = Pipeline([
        ("vec", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True)),
        ("lr", LogisticRegression(max_iter=1000, C=2.0)),
    ])
    clf_ood.fit([s["text"] for s in base_samples], y_base)
    p3b_ood_prob = clf_ood.predict_proba([s["text"] for s in hard_samples])[:, 1]
    p3b_ood_pred = (p3b_ood_prob >= 0.5).astype(int).tolist()

    # Paradigm 3c: RandomForest on ALL engineered stylometric + structural features (5-fold CV)
    p3c_oof_prob = np.zeros(len(all_samples))
    for tr, va in skf.split(X_all, y_all):
        rf = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42)
        rf.fit(X_all[tr], np.array(y_all)[tr])
        p3c_oof_prob[va] = rf.predict_proba(X_all[va])[:, 1]
    p3c_pred = (p3c_oof_prob >= 0.5).astype(int).tolist()

    # Paradigm 4: Shipped v2 Multi-Angle Deterministic Engine (7 packs / 42 rules, actual `audit_text()`)
    p4_res = []
    for s in all_samples:
        p = resolve_effective_pack(s.get("pack", "business-brief"), packs)
        res = audit_text(s["text"], filename=s.get("filename", "s.md"), modality="markdown", pack=p)
        rids = [f["ruleId"] for f in res["findings"]]
        p4_res.append((1 if rids else 0, rids))
    p4_all = [r[0] for r in p4_res]
    p4_hard = p4_all[len(base_samples):]

    # Paradigm 5: Shipped Integrated Hybrid (actual `audit_text()` + `analyze_text_profile()`)
    p5_scores = []
    for i, s in enumerate(all_samples):
        prof = analyze_text_profile(s["text"], modality="markdown")
        sc = float(prof["telemetryRisk"]["score"]) + (45.0 if p4_all[i] else 0.0)
        p5_scores.append(min(100.0, sc))
    p5_all = [1 if sc >= 20 else 0 for sc in p5_scores]
    p5_hard = p5_all[len(base_samples):]

    report = {
        "corpus": {
            "total_text_samples": len(all_samples),
            "v1_plus_holdout_text": len(base_samples),
            "text_hard_v2": len(hard_samples),
            "feature_extraction_ms_per_doc": round(feat_ms, 3),
        },
        "results_all_95": {
            "v1_baseline": metrics_summary(y_all, v1_all),
            "P1a_legacy_single_word_ban": metrics_summary(y_all, p1_all),
            "P2_pure_stylometrics_5fold_LR": metrics_summary(y_all, p2_pred, p2_oof_prob.tolist()),
            "P3a_tfidf_char_ngram_5fold_LR": metrics_summary(y_all, p3a_pred, p3a_oof_prob.tolist()),
            "P3c_engineered_5fold_RF": metrics_summary(y_all, p3c_pred, p3c_oof_prob.tolist()),
            "P4_upgraded_multi_angle_det": metrics_summary(y_all, p4_all),
            "P5_hybrid_calibrated_telemetry": metrics_summary(y_all, p5_all, p5_scores),
        },
        "results_hard_v2_48": {
            "v1_baseline": metrics_summary(y_hard, v1_hard),
            "P1a_legacy_single_word_ban": metrics_summary(y_hard, p1_hard),
            "P1b_legacy_burstiness_only": metrics_summary(y_hard, p1b_hard),
            "P2_pure_stylometrics_5fold_LR": metrics_summary(y_hard, p2_pred[len(base_samples):], p2_oof_prob[len(base_samples):].tolist()),
            "P3a_tfidf_char_ngram_5fold_LR": metrics_summary(y_hard, p3a_pred[len(base_samples):], p3a_oof_prob[len(base_samples):].tolist()),
            "P3b_tfidf_OOD_train_v1_test_v2": metrics_summary(y_hard, p3b_ood_pred, p3b_ood_prob.tolist()),
            "P3c_engineered_5fold_RF": metrics_summary(y_hard, p3c_pred[len(base_samples):], p3c_oof_prob[len(base_samples):].tolist()),
            "P4_upgraded_multi_angle_det": metrics_summary(y_hard, p4_hard),
            "P5_hybrid_calibrated_telemetry": metrics_summary(y_hard, p5_hard, p5_scores[len(base_samples):]),
        },
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))

    # Print any P4 misses/FPs for error analysis
    errors = []
    for i, s in enumerate(all_samples):
        if p4_all[i] != y_all[i]:
            errors.append((s["id"], s["expected"], p4_res[i][1], feats_all[i]))
    print(f"\nP4 errors ({len(errors)}):")
    for e in errors:
        print(" ", e[0], "expected=", e[1], "hits=", e[2], "cv=", round(e[3]["burstiness_cv"], 2), "conc=", round(e[3]["concreteness"], 2))

    # Top feature importances from RF (for methodology insight)
    rf_full = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42).fit(X_all, y_all)
    imps = sorted(zip(feat_names, rf_full.feature_importances_), key=lambda x: -x[1])
    print("\nTop 10 Statistical/Structural Feature Importances (RandomForest):")
    for name, val in imps[:10]:
        print(f"  {name:22s}: {val:.3f}")


if __name__ == "__main__":
    main()
