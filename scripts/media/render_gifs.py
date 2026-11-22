#!/usr/bin/env python3
"""
Deterministic GIF & static poster renderer for dislop.

Renders:
  1) proof-cycle-{zh,en}-v1.gif (+ -poster.png)
  2) cli-check-{zh,en}-v1.gif (+ -poster.png)
  3) workbench-live-{zh,en}-v1.gif (+ -poster.png) — live Playwright capture against site/
  4) ui-slop-{zh,en}-v1.gif (+ -poster.png)

Plus 6-frame contact sheets under scratch/ for visual inspection.
Zero external runtime dependencies beyond Python stdlib, Playwright Chromium, FFmpeg, Pillow, and optional gifsicle.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import math
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DEMOS_DIR = ROOT / "assets" / "demos"
SITE_DIR = ROOT / "site"
DEFAULT_SHEET_DIR = Path(tempfile.gettempdir()) / "dislop-gif-sheets"

FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
FONT_SERIF = 'Georgia, "Source Serif 4", "Noto Serif CJK SC", "Songti SC", "STSong", "Microsoft YaHei", serif'
FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

LOGO_SVG_INNER = """
<svg viewBox="0 0 64 64" width="22" height="22" fill="none" aria-hidden="true">
  <rect width="64" height="64" rx="12" fill="#14171A"/>
  <line x1="10" y1="38" x2="54" y2="38" stroke="#F4F5F3" stroke-width="4.5" stroke-linecap="round" stroke-opacity="0.26"/>
  <path d="M10 38H34C44.5 38 52 30.8 52 21.5C52 14.5 47.2 10 41.2 10C34.8 10 30.5 15 30.5 22.2C30.5 33.8 39.5 45.5 53 51" stroke="#F04438" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""

BASE_CSS = f"""
* {{ box-sizing: border-box; }}
html, body {{
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #F6F7F5;
  color: #14171A;
  font-family: {FONT_SANS};
  -webkit-font-smoothing: antialiased;
}}
.mono {{
  font-family: {FONT_MONO};
  font-variant-numeric: tabular-nums;
}}
.serif {{
  font-family: {FONT_SERIF};
}}
"""


def proof_cycle_html(lang: str) -> str:
    is_zh = lang == "zh"
    if is_zh:
        copy = {
            "file": "launch-note.md",
            "pack": "business-brief",
            "tabs": ["1 · 原稿", "2 · 换了种 AI 味", "3 · 改干净了"],
            "s1_pre": "",
            "s1_err": "好的，以下是",
            "s1_mid1": "修改后的上线说明。",
            "s1_w1": "值得注意的是，",
            "s1_mid2": "本次改造以队列分级为重要",
            "s1_w2": "抓手",
            "s1_mid3": "，",
            "s1_w3": "全面赋能",
            "s1_end": "一线运维团队，故障恢复时间最多 45 秒。",
            "s1_notes": [
                ("err", "chatbot-artifact", "删掉开头的 AI 对话寒暄壳"),
                ("warn", "zh-bureaucratic-padding", "“值得注意的是”“抓手”“全面赋能”换成具体动作"),
            ],
            "s1_badge": "1 硬伤 · 3 提醒 · 退出码 1",
            "s2_w1": "这不是一次普通升级，而是结算架构的效率跃迁，性能实现数倍提升",
            "s2_end": "。",
            "s2_notes": [
                ("warn", "negation-pivot-frame", "“不是 A，而是 B”二阶 AI 腔，删掉空洞对比并补回真实指标"),
            ],
            "s2_badge": "0 硬伤 · 1 提醒（二阶 AI 腔）",
            "s3_text": "本次上线将结算队列改为分级处理，故障恢复时间最多 45 秒。",
            "s3_notes": [
                ("ok", "0 findings", "寒暄与空话清零，45 秒真实指标保留"),
            ],
            "s3_badge": "0 处问题 · 退出码 0",
            "foot_left": "确定性本地检查 · 0 上传",
            "foot_right": "dislop check launch-note.md --lang zh",
        }
    else:
        copy = {
            "file": "launch-note.md",
            "pack": "business-brief",
            "tabs": ["1 · Draft", "2 · 2nd-order slop", "3 · Clean"],
            "s1_pre": "",
            "s1_err": "Certainly! Here is",
            "s1_mid1": " the launch note. ",
            "s1_w1": "It's worth noting that",
            "s1_mid2": " exports are a ",
            "s1_w2": "game-changer",
            "s1_mid3": "",
            "s1_w3": "",
            "s1_end": ", finishing in up to 12 minutes for workspaces above 500,000 rows.",
            "s1_notes": [
                ("err", "chatbot-artifact", "Strip leftover chatbot greeting"),
                ("warn", "en-throat-clearing-opener", "Cut throat-clearing opener; replace stock hype"),
            ],
            "s1_badge": "1 error · 2 warnings · exit 1",
            "s2_w1": "This isn't just an upgrade — it's a new standard",
            "s2_end": ".",
            "s2_notes": [
                ("warn", "negation-pivot-frame", "'Not X, but Y' slogan caught; restore real metrics"),
            ],
            "s2_badge": "0 errors · 1 warning (2nd-order slop)",
            "s3_text": "Exports now finish in up to 12 minutes for workspaces above 500,000 rows.",
            "s3_notes": [
                ("ok", "0 findings", "Filler removed; 12 min and 500,000 rows preserved"),
            ],
            "s3_badge": "0 issues · exit 0",
            "foot_left": "Deterministic offline check · 0 uploads",
            "foot_right": "dislop check launch-note.md",
        }

    def render_notes(items):
        rows = []
        for kind, rule_id, desc in items:
            cls = "is-err" if kind == "err" else ("is-warn" if kind == "warn" else "is-ok")
            if is_zh:
                tag = "硬伤" if kind == "err" else ("提醒" if kind == "warn" else "通过")
            else:
                tag = "ERROR" if kind == "err" else ("WARN" if kind == "warn" else "PASS")
            rows.append(
                f'<div class="note-row {cls}">'
                f'<span class="note-tag mono">{tag}</span>'
                f'<div class="note-content"><div class="note-rule mono">{rule_id}</div>'
                f'<div class="note-desc">{desc}</div></div></div>'
            )
        return "".join(rows)

    margin_head = "标出问题" if is_zh else "FINDINGS"

    import json

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{BASE_CSS}
body {{
  width: 960px;
  height: 500px;
  background: #F6F7F5;
  padding: 20px 24px;
}}
.frame {{
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  border: 1px solid #D5D7D2;
  display: flex;
  flex-direction: column;
}}
.topbar {{
  height: 48px;
  border-bottom: 1px solid #D5D7D2;
  background: #ECEEE9;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}
.brand {{
  display: flex;
  align-items: center;
  gap: 10px;
}}
.wordmark {{
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.025em;
}}
.file-pill {{
  font-size: 12.5px;
  color: #474C55;
  padding-left: 10px;
  border-left: 1px solid #D5D7D2;
}}
.tabs {{
  display: flex;
  gap: 6px;
}}
.tab {{
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 5px;
  border: 1px solid #B6BAB2;
  background: #FFFFFF;
  color: #474C55;
}}
.tab.active {{
  background: #14171A;
  border-color: #14171A;
  color: #FFFFFF;
}}
.main {{
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 310px;
  min-height: 0;
}}
.galley {{
  padding: 28px 28px 20px 24px;
  border-right: 1px solid #D5D7D2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}}
.manuscript-wrap {{
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  align-items: start;
}}
.lnum {{
  font-size: 13px;
  color: #5E646E;
  padding-top: 7px;
  text-align: right;
  user-select: none;
}}
.manuscript {{
  font-family: {FONT_SERIF};
  font-size: 23px;
  line-height: 1.72;
  color: #14171A;
  margin: 0;
}}
.mark-err {{
  position: relative;
  background: rgba(240, 68, 56, 0.08);
  color: #B42318;
  padding: 1px 2px;
}}
.mark-err::after {{
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2.5px;
  background: #F04438;
  transform-origin: left center;
  transform: scaleX(var(--err-progress, 0));
}}
.mark-err::before {{
  content: "";
  position: absolute;
  left: -2px;
  right: -2px;
  top: 52%;
  height: 2.5px;
  background: #F04438;
  transform-origin: left center;
  transform: scaleX(var(--strike-progress, 0));
}}
.mark-warn {{
  background: rgba(27, 82, 176, var(--warn-bg, 0));
  border-bottom: 2px dashed rgba(27, 82, 176, var(--warn-alpha, 0));
  color: #14171A;
  padding: 1px 1px;
}}
.mark-clean {{
  background: rgba(30, 107, 71, var(--ok-bg, 0));
  padding: 2px 4px;
  border-bottom: 2px solid #1E6B47;
}}
.status-bar {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid #ECEEE9;
}}
.status-badge {{
  font-size: 13.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
}}
.status-badge.is-err {{
  background: #FCE9E7;
  color: #B42318;
  border: 1px solid #F04438;
}}
.status-badge.is-warn {{
  background: #E6EEFC;
  color: #1B52B0;
  border: 1px solid #1B52B0;
}}
.status-badge.is-ok {{
  background: #E3F3EB;
  color: #1E6B47;
  border: 1px solid #1E6B47;
}}
.margin {{
  background: #F6F7F5;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}}
.margin-head {{
  font-size: 12px;
  font-weight: 700;
  color: #474C55;
  padding-bottom: 8px;
  border-bottom: 1px solid #D5D7D2;
}}
.note-row {{
  background: #FFFFFF;
  border: 1px solid #D5D7D2;
  border-left-width: 3px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}}
.note-row.is-err {{ border-left-color: #F04438; }}
.note-row.is-warn {{ border-left-color: #1B52B0; }}
.note-row.is-ok {{ border-left-color: #1E6B47; }}
.note-tag {{
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}}
.note-row.is-err .note-tag {{ color: #B42318; }}
.note-row.is-warn .note-tag {{ color: #1B52B0; }}
.note-row.is-ok .note-tag {{ color: #1E6B47; }}
.note-rule {{
  font-size: 12.5px;
  font-weight: 700;
  color: #14171A;
}}
.note-desc {{
  font-size: 13px;
  line-height: 1.48;
  color: #474C55;
  margin-top: 2px;
}}
.footer {{
  height: 36px;
  border-top: 1px solid #D5D7D2;
  background: #F6F7F5;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #5E646E;
}}
</style>
</head>
<body>
<div class="frame">
  <header class="topbar">
    <div class="brand">
      {LOGO_SVG_INNER}
      <span class="wordmark">dislop</span>
      <span class="file-pill mono">{copy["file"]} · {copy["pack"]}</span>
    </div>
    <div class="tabs">
      <div class="tab active" id="tab-0">{copy["tabs"][0]}</div>
      <div class="tab" id="tab-1">{copy["tabs"][1]}</div>
      <div class="tab" id="tab-2">{copy["tabs"][2]}</div>
    </div>
  </header>

  <main class="main">
    <section class="galley">
      <div class="manuscript-wrap" id="stage-box">
        <div class="lnum mono">01</div>
        <p class="manuscript" id="ms-0">
          <span class="mark-err" id="err-span">{copy["s1_err"]}</span>{copy["s1_mid1"]}<span class="mark-warn" id="w1-span">{copy["s1_w1"]}</span>{copy["s1_mid2"]}<span class="mark-warn" id="w2-span">{copy["s1_w2"]}</span>{copy["s1_mid3"]}{f'<span class="mark-warn" id="w3-span">{copy["s1_w3"]}</span>' if copy["s1_w3"] else ""}{copy["s1_end"]}
        </p>
        <p class="manuscript" id="ms-1" style="display:none;">
          <span class="mark-warn" id="trap-span">{copy["s2_w1"]}</span>{copy["s2_end"]}
        </p>
        <p class="manuscript" id="ms-2" style="display:none;">
          <span class="mark-clean" id="clean-span">{copy["s3_text"]}</span>
        </p>
      </div>

      <div class="status-bar">
        <span class="status-badge is-err mono" id="status-badge">{copy["s1_badge"]}</span>
        <span class="mono" style="font-size:12px;color:#5E646E;">0.4 ms</span>
      </div>
    </section>

    <aside class="margin">
      <div class="margin-head mono" id="margin-head">{margin_head}</div>
      <div id="notes-0" style="display:flex;flex-direction:column;gap:10px;">{render_notes(copy["s1_notes"])}</div>
      <div id="notes-1" style="display:none;flex-direction:column;gap:10px;">{render_notes(copy["s2_notes"])}</div>
      <div id="notes-2" style="display:none;flex-direction:column;gap:10px;">{render_notes(copy["s3_notes"])}</div>
    </aside>
  </main>

  <footer class="footer">
    <span>{copy["foot_left"]}</span>
    <span class="mono">{copy["foot_right"]}</span>
  </footer>
</div>

<script>
const COPY = {json.dumps(copy, ensure_ascii=False)};
function clamp01(v) {{ return Math.max(0, Math.min(1, v)); }}
function easeOut(v) {{ return 1 - Math.pow(1 - clamp01(v), 3); }}

window.__renderAt = function(t) {{
  const tabs = [0, 1, 2].map(i => document.getElementById("tab-" + i));
  const mss = [0, 1, 2].map(i => document.getElementById("ms-" + i));
  const nts = [0, 1, 2].map(i => document.getElementById("notes-" + i));
  const badge = document.getElementById("status-badge");
  const stageBox = document.getElementById("stage-box");

  let active = 0;
  if (t >= 2.35 && t < 4.45) active = 1;
  else if (t >= 4.45) active = 2;

  tabs.forEach((el, i) => el.classList.toggle("active", i === active));
  mss.forEach((el, i) => el.style.display = i === active ? "block" : "none");
  nts.forEach((el, i) => el.style.display = i === active ? "flex" : "none");

  const localT = active === 0 ? t : (active === 1 ? t - 2.35 : t - 4.45);
  const slideIn = easeOut(localT / 0.20);
  stageBox.style.opacity = active === 0 ? 1 : (0.35 + 0.65 * slideIn);
  stageBox.style.transform = active === 0 ? "translateY(0)" : `translateY(${{(1 - slideIn) * 8}}px)`;

  if (active === 0) {{
    badge.className = "status-badge is-err mono";
    badge.textContent = COPY.s1_badge;
    const errP = easeOut((t - 0.15) / 0.30);
    const strikeP = easeOut((t - 0.40) / 0.30);
    const warnP = easeOut((t - 0.55) / 0.35);
    const errEl = document.getElementById("err-span");
    errEl.style.setProperty("--err-progress", errP.toFixed(3));
    errEl.style.setProperty("--strike-progress", strikeP.toFixed(3));
    ["w1-span", "w2-span", "w3-span"].forEach(id => {{
      const el = document.getElementById(id);
      if (el) {{
        el.style.setProperty("--warn-alpha", warnP.toFixed(3));
        el.style.setProperty("--warn-bg", (0.08 * warnP).toFixed(3));
      }}
    }});
    nts[0].style.opacity = easeOut((t - 0.20) / 0.25);
  }} else if (active === 1) {{
    badge.className = "status-badge is-warn mono";
    badge.textContent = COPY.s2_badge;
    const wP = easeOut((localT - 0.12) / 0.28);
    const tr = document.getElementById("trap-span");
    tr.style.setProperty("--warn-alpha", wP.toFixed(3));
    tr.style.setProperty("--warn-bg", (0.08 * wP).toFixed(3));
    nts[1].style.opacity = easeOut((localT - 0.15) / 0.25);
  }} else {{
    badge.className = "status-badge is-ok mono";
    badge.textContent = COPY.s3_badge;
    const okP = easeOut((localT - 0.10) / 0.25);
    document.getElementById("clean-span").style.setProperty("--ok-bg", (0.08 * okP).toFixed(3));
    nts[2].style.opacity = easeOut((localT - 0.12) / 0.25);
  }}
}};
window.__renderAt(0.0);
</script>
</body>
</html>
"""


def cli_check_html(lang: str) -> str:
    is_zh = lang == "zh"
    if is_zh:
        cmd1 = "dislop check launch-note.md --lang zh --profile"
        cmd2 = "dislop check launch-note.clean.md --lang zh --profile"
        out1 = [
            ("head", "dislop: 4 finding(s) across 1 checked file(s)"),
            ("err",  "  [ERROR] launch-note.md:1:1  chatbot-artifact"),
            ("sub",  '    match: "好的，以下是"'),
            ("warn", "  [WARNING] launch-note.md:1:16  zh-bureaucratic-padding"),
            ("sub",  '    match: "值得注意的是，" · "抓手" (1:35) · "全面赋能" (1:38)'),
            ("prof", "  [PROFILE] risk=0/100 | burstiness_cv=0.52 | concreteness=3.1/100u | entropy=5.52"),
            ("exit", "  退出码: 1（命中 AI 残留硬伤）"),
        ]
        out2 = [
            ("ok",   "dislop: ok (1 checked, 0 findings)"),
            ("prof", "  [PROFILE] concreteness=6.5/100u (grounded) | mattr=1 | entropy=4.84"),
            ("ok",   "  退出码: 0（检查通过）"),
        ]
        title = "终端离线校验 · Node / Python 双端同构"
    else:
        cmd1 = "dislop check launch-note.md --profile"
        cmd2 = "dislop check launch-note.clean.md --profile"
        out1 = [
            ("head", "dislop: 3 finding(s) across 1 checked file(s)"),
            ("err",  "  [ERROR] launch-note.md:1:1  chatbot-artifact"),
            ("sub",  '    match: "Certainly! Here is"'),
            ("warn", "  [WARNING] launch-note.md:1:37  en-throat-clearing-opener"),
            ("sub",  '    match: "It\'s worth noting that"'),
            ("info", "  [INFO] launch-note.md:1:74  en-cliche-lexicon  \"game-changer\""),
            ("prof", "  [PROFILE] risk=0/100 | concreteness=7.1/100u | mattr=1 | entropy=4.44"),
            ("exit", "  exit code: 1 (blocked by core AI artifact)"),
        ]
        out2 = [
            ("ok",   "dislop: ok (1 checked, 0 findings)"),
            ("prof", "  [PROFILE] concreteness=14.3/100u (grounded) | mattr=1 | entropy=4.29"),
            ("ok",   "  exit code: 0 (ready to ship)"),
        ]
        title = "Offline CLI gate · zero dependencies · zero uploads"

    import json

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{BASE_CSS}
body {{
  width: 920px;
  height: 460px;
  background: #0E1012;
  color: #ECEEF0;
  padding: 20px;
}}
.term {{
  width: 100%;
  height: 100%;
  background: #15181C;
  border: 1px solid #2A2F37;
  display: flex;
  flex-direction: column;
}}
.term-head {{
  height: 42px;
  background: #1D2127;
  border-bottom: 1px solid #2A2F37;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}
.term-title {{
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #ECEEF0;
}}
.term-badge {{
  font-size: 12px;
  color: #A6ACB5;
}}
.term-body {{
  flex: 1;
  padding: 20px 22px;
  background: #0A0C0E;
  font-family: {FONT_MONO};
  font-size: 14.5px;
  line-height: 1.62;
  display: flex;
  flex-direction: column;
  gap: 4px;
}}
.cmd-line {{
  color: #ECEEF0;
  font-weight: 700;
  margin-bottom: 4px;
}}
.prompt {{ color: #6CD49B; margin-right: 8px; }}
.line {{ white-space: pre; }}
.l-head {{ color: #ECEEF0; font-weight: 600; }}
.l-err {{ color: #FF7A6B; font-weight: 700; }}
.l-warn {{ color: #85B4FF; font-weight: 700; }}
.l-info {{ color: #85B4FF; }}
.l-sub {{ color: #A6ACB5; }}
.l-prof {{ color: #8C939E; font-size: 13px; }}
.l-exit {{ color: #FF7A6B; font-weight: 700; margin-top: 2px; }}
.l-ok {{ color: #6CD49B; font-weight: 700; }}
.sep {{
  height: 1px;
  background: #2A2F37;
  margin: 12px 0;
}}
</style>
</head>
<body>
<div class="term">
  <header class="term-head">
    <div class="term-title">
      {LOGO_SVG_INNER}
      <span>dislop CLI</span>
    </div>
    <span class="term-badge mono">{title}</span>
  </header>
  <div class="term-body" id="term-body">
    <div class="cmd-line" id="cmd1"><span class="prompt">$</span>{cmd1}</div>
    <div id="block1"></div>
    <div class="sep" id="sep" style="opacity:0;"></div>
    <div class="cmd-line" id="cmd2" style="opacity:0;"><span class="prompt">$</span>{cmd2}</div>
    <div id="block2"></div>
  </div>
</div>

<script>
const OUT1 = {json.dumps(out1, ensure_ascii=False)};
const OUT2 = {json.dumps(out2, ensure_ascii=False)};

function buildLines(containerId, rows) {{
  const el = document.getElementById(containerId);
  el.innerHTML = rows.map(([cls, txt], i) => `<div class="line l-${{cls}}" id="${{containerId}}-${{i}}" style="opacity:0;">${{txt}}</div>`).join("");
}}
buildLines("block1", OUT1);
buildLines("block2", OUT2);

window.__renderAt = function(t) {{
  // 0.0 -> 0.45: cmd1 visible, then lines cascade quickly
  document.getElementById("cmd1").style.opacity = 1;
  OUT1.forEach((_, i) => {{
    const el = document.getElementById("block1-" + i);
    const start = 0.40 + i * 0.14;
    el.style.opacity = t >= start ? 1 : 0;
  }});

  // 3.10: second command runs
  const showCmd2 = t >= 3.05;
  document.getElementById("sep").style.opacity = showCmd2 ? 1 : 0;
  document.getElementById("cmd2").style.opacity = showCmd2 ? 1 : 0;
  OUT2.forEach((_, i) => {{
    const el = document.getElementById("block2-" + i);
    const start = 3.45 + i * 0.18;
    el.style.opacity = t >= start ? 1 : 0;
  }});
}};
window.__renderAt(0.0);
</script>
</body>
</html>
"""


def ui_slop_html(lang: str) -> str:
    is_zh = lang == "zh"
    if is_zh:
        copy = {
            "header_bad": "检查网页组件 · 发现 4 处 AI 模板味",
            "header_good": "清理完成 · 0 处界面问题 · 通过",
            "bad_title": "AI 强力驱动 · 新一代智能体验",
            "bad_sub": "重塑企业级工作流范式，打造全方位效率闭环。",
            "bad_pills": ["智能引擎", "极速协同", "深度洞察", "零门槛部署", "企业安全", "全链路"],
            "bad_badge": "AI 强力驱动",
            "bad_btn": "立即体验（href=\"#\"）",
            "flags": [
                ("err", "ui-dead-control", "空链接 # 与无动作禁用按钮"),
                ("warn", "ui-ai-gradient", "默认蓝紫粉渐变标题"),
                ("warn", "ui-pill-soup", "6 枚无实质过滤功能的圆角胶囊墙"),
                ("warn", "ui-prompt-echo-badge", "把提示词贴成“AI 强力驱动”装饰牌"),
            ],
            "good_kicker": "校样检查报告 · 纯色纸面 + 1px 标尺",
            "good_title": "把稿子里的 AI 味挑出来",
            "good_sub": "去掉渐变和装饰徽章，按钮直接连向真实报告路径 ./report.html。",
            "good_btn": "打开检查报告 ./report.html",
            "good_meta": "7 套规则包 · 0 上传 · 通过 WCAG AA 对比度",
        }
    else:
        copy = {
            "header_bad": "Audit UI component · 4 template smells flagged",
            "header_good": "Cleaned · 0 UI issues · passed",
            "bad_title": "AI-Powered Next-Gen Platform",
            "bad_sub": "Revolutionizing workflows with seamless intelligence.",
            "bad_pills": ["Smart Engine", "AI-Ready", "Instant Sync", "Zero Friction", "Enterprise", "Cloud Scale"],
            "bad_badge": "AI-Powered",
            "bad_btn": "Get Started (href=\"#\")",
            "flags": [
                ("err", "ui-dead-control", "Dead href=\"#\" placeholder control"),
                ("warn", "ui-ai-gradient", "Default indigo-purple-pink AI gradient"),
                ("warn", "ui-pill-soup", "6 decorative rounded-full pill badges"),
                ("warn", "ui-prompt-echo-badge", "Prompt-echo marketing badge"),
            ],
            "good_kicker": "Galley audit report · solid paper + 1px rails",
            "good_title": "Catch AI slop before you ship",
            "good_sub": "Drop the gradient and filler badges; wire the button to ./report.html.",
            "good_btn": "Open ./report.html",
            "good_meta": "7 packs · 0 uploads · WCAG AA verified",
        }

    import json

    findings_label = "检查结果" if is_zh else "RULE FINDINGS"
    ok_prefix = "通过 · " if is_zh else "[OK] "
    pills_html = "".join(f'<span class="slop-pill">{p}</span>' for p in copy["bad_pills"])
    flags_html = "".join(
        f'<div class="flag-item {"is-err" if k == "err" else "is-warn"}" id="flag-{i}">'
        f'<span class="mono flag-id">{rid}</span><span class="flag-desc">{desc}</span></div>'
        for i, (k, rid, desc) in enumerate(copy["flags"])
    )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{BASE_CSS}
body {{
  width: 960px;
  height: 500px;
  background: #F6F7F5;
  padding: 20px 24px;
}}
.shell {{
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  border: 1px solid #D5D7D2;
  display: flex;
  flex-direction: column;
}}
.bar {{
  height: 46px;
  padding: 0 18px;
  border-bottom: 1px solid #D5D7D2;
  background: #ECEEE9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}
.bar-left {{
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 15px;
}}
.bar-status {{
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
}}
.bar-status.bad {{ background: #FCE9E7; color: #B42318; border: 1px solid #F04438; }}
.bar-status.good {{ background: #E3F3EB; color: #1E6B47; border: 1px solid #1E6B47; }}
.stage {{
  flex: 1;
  position: relative;
  overflow: hidden;
}}
.view {{
  position: absolute;
  inset: 0;
  padding: 24px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 20px;
  align-items: stretch;
}}
.slop-card {{
  background: #0F172A;
  color: #F8FAFC;
  border-radius: 14px;
  padding: 24px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}}
.slop-badge {{
  display: inline-block;
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366F1, #A855F7, #EC4899);
  color: #FFFFFF;
}}
.slop-h {{
  font-size: 26px;
  font-weight: 800;
  margin: 12px 0 8px;
  background: linear-gradient(90deg, #818CF8, #C084FC, #F472B6);
  -webkit-background-clip: text;
  color: transparent;
}}
.slop-p {{
  margin: 0 0 14px;
  color: #CBD5E1;
  font-size: 15px;
}}
.slop-pills {{
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 16px;
}}
.slop-pill {{
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #E2E8F0;
}}
.slop-btn {{
  display: inline-block;
  align-self: flex-start;
  padding: 9px 16px;
  border-radius: 8px;
  background: #334155;
  color: #94A3B8;
  font-size: 13.5px;
  border: 1px dashed #F04438;
}}
.flags-col {{
  background: #F6F7F5;
  border: 1px solid #D5D7D2;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}}
.flag-item {{
  background: #FFFFFF;
  border: 1px solid #D5D7D2;
  border-left-width: 3px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}}
.flag-item.is-err {{ border-left-color: #F04438; }}
.flag-item.is-warn {{ border-left-color: #1B52B0; }}
.flag-id {{ font-size: 12.5px; font-weight: 700; color: #14171A; }}
.flag-item.is-err .flag-id {{ color: #B42318; }}
.flag-item.is-warn .flag-id {{ color: #1B52B0; }}
.flag-desc {{ font-size: 13px; color: #474C55; }}
.scan-line {{
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #F04438;
  pointer-events: none;
  opacity: 0;
}}
.good-view {{
  position: absolute;
  inset: 0;
  padding: 28px 34px;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
}}
.good-box {{
  border: 1px solid #D5D7D2;
  padding: 28px 30px;
  background: #F6F7F5;
  display: flex;
  flex-direction: column;
  gap: 14px;
}}
.good-kicker {{ font-size: 13px; font-weight: 700; color: #1E6B47; }}
.good-title {{ margin: 0; font-size: 28px; font-weight: 700; color: #14171A; letter-spacing: -0.015em; }}
.good-sub {{ margin: 0; font-size: 17px; color: #474C55; line-height: 1.6; }}
.good-actions {{ display: flex; align-items: center; gap: 16px; margin-top: 6px; }}
.good-btn {{
  padding: 9px 16px;
  border-radius: 6px;
  background: #14171A;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
}}
.good-meta {{ font-size: 13px; color: #5E646E; }}
</style>
</head>
<body>
<div class="shell">
  <header class="bar">
    <div class="bar-left">
      {LOGO_SVG_INNER}
      <span>dislop</span>
      <span class="mono" style="font-size:12.5px;color:#5E646E;font-weight:400;">deck-and-ui</span>
    </div>
    <span class="bar-status bad mono" id="bar-status">{copy["header_bad"]}</span>
  </header>

  <div class="stage">
    <div class="view" id="bad-view">
      <div class="slop-card">
        <div>
          <div class="slop-badge">{copy["bad_badge"]}</div>
          <h2 class="slop-h">{copy["bad_title"]}</h2>
          <p class="slop-p">{copy["bad_sub"]}</p>
          <div class="slop-pills">{pills_html}</div>
        </div>
        <div class="slop-btn mono">{copy["bad_btn"]}</div>
        <div class="scan-line" id="scan-line"></div>
      </div>

      <div class="flags-col">
        <div class="mono" style="font-size:12px;font-weight:700;color:#474C55;border-bottom:1px solid #D5D7D2;padding-bottom:6px;">{findings_label}</div>
        {flags_html}
      </div>
    </div>

    <div class="good-view" id="good-view">
      <div class="good-box">
        <div class="good-kicker mono">{copy["good_kicker"]}</div>
        <h2 class="good-title">{copy["good_title"]}</h2>
        <p class="good-sub">{copy["good_sub"]}</p>
        <div class="good-actions">
          <span class="good-btn">{copy["good_btn"]}</span>
          <span class="good-meta mono">{copy["good_meta"]}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #D5D7D2;background:#FFFFFF;">
        <div style="padding:12px 16px;border-right:1px solid #D5D7D2;display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:13px;color:#474C55;">{"AI 模板问题" if is_zh else "UI template smells"}</span>
          <span class="mono" style="font-size:18px;font-weight:700;color:#1E6B47;">0</span>
        </div>
        <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:13px;color:#474C55;">{"真实跳转" if is_zh else "Action link"}</span>
          <span class="mono" style="font-size:14px;font-weight:700;color:#14171A;">./report.html</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #D5D7D2;padding-top:14px;">
        <span class="mono" style="font-size:13px;color:#1E6B47;font-weight:700;">{ok_prefix}{copy["header_good"]}</span>
        <span class="mono" style="font-size:12px;color:#5E646E;">dislop check card.html --pack deck-and-ui</span>
      </div>
    </div>
  </div>
</div>

<script>
const HEADER_BAD = {json.dumps(copy["header_bad"], ensure_ascii=False)};
const HEADER_GOOD = {json.dumps(copy["header_good"], ensure_ascii=False)};
function clamp01(v) {{ return Math.max(0, Math.min(1, v)); }}
function easeOut(v) {{ return 1 - Math.pow(1 - clamp01(v), 3); }}

window.__renderAt = function(t) {{
  const badView = document.getElementById("bad-view");
  const goodView = document.getElementById("good-view");
  const barStatus = document.getElementById("bar-status");
  const scanLine = document.getElementById("scan-line");

  if (t < 3.30) {{
    badView.style.opacity = 1;
    goodView.style.opacity = 0;
    barStatus.className = "bar-status bad mono";
    barStatus.textContent = HEADER_BAD;

    const scanP = clamp01((t - 0.15) / 1.10);
    scanLine.style.opacity = (t >= 0.15 && t <= 1.35) ? 0.9 : 0;
    scanLine.style.left = (scanP * 100).toFixed(1) + "%";

    for (let i = 0; i < 4; i++) {{
      const el = document.getElementById("flag-" + i);
      const p = easeOut((t - (0.35 + i * 0.28)) / 0.20);
      el.style.opacity = p;
      el.style.transform = `translateX(${{(1 - p) * 10}}px)`;
    }}
  }} else {{
    const p = easeOut((t - 3.30) / 0.25);
    badView.style.opacity = (1 - p).toFixed(3);
    goodView.style.opacity = p.toFixed(3);
    barStatus.className = "bar-status good mono";
    barStatus.textContent = HEADER_GOOD;
  }}
}};
window.__renderAt(0.0);
</script>
</body>
</html>
"""


def encode_gif(frames_dir: Path, out_gif: Path, fps: int, max_colors: int, dither: str, lossy: int) -> None:
    palette = frames_dir / "palette.png"
    raw_gif = frames_dir / "raw.gif"
    pattern = str(frames_dir / "frame_%04d.png")

    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-framerate", str(fps), "-i", pattern,
            "-vf", f"palettegen=max_colors={max_colors}:stats_mode=diff",
            str(palette),
        ],
        check=True,
    )
    dither_arg = "dither=none" if dither == "none" else f"dither={dither}:bayer_scale=3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-framerate", str(fps), "-i", pattern,
            "-i", str(palette),
            "-lavfi", f"[0:v][1:v]paletteuse={dither_arg}:diff_mode=rectangle",
            "-loop", "0",
            str(raw_gif),
        ],
        check=True,
    )
    if shutil.which("gifsicle"):
        cmd = ["gifsicle", "-O3"]
        if lossy > 0:
            cmd.append(f"--lossy={lossy}")
        cmd.extend([str(raw_gif), "-o", str(out_gif)])
        subprocess.run(cmd, check=True)
    else:
        shutil.copyfile(raw_gif, out_gif)


def save_poster(src_png: Path, out_poster: Path) -> None:
    img = Image.open(src_png).convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT)
    img.save(out_poster, format="PNG", optimize=True)


def make_contact_sheet(frame_paths: list[Path], out_sheet: Path, title: str) -> None:
    cols = 3
    rows = math.ceil(len(frame_paths) / cols)
    sample = Image.open(frame_paths[0])
    tw, th = 440, int(440 * sample.height / sample.width)
    pad = 16
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * pad, rows * th + (rows + 1) * pad + 32), (246, 247, 245))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 8), title, fill=(20, 23, 26))
    for idx, fp in enumerate(frame_paths):
        r, c = divmod(idx, cols)
        x = pad + c * (tw + pad)
        y = 32 + pad + r * (th + pad)
        im = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y))
        draw.rectangle([x, y, x + tw - 1, y + th - 1], outline=(213, 215, 210), width=1)
    sheet.save(out_sheet, format="PNG", optimize=True)


def render_virtual_clock_scene(
    playwright_page,
    name: str,
    html_text: str,
    width: int,
    height: int,
    fps: int,
    duration: float,
    poster_t: float,
    sheet_dir: Path,
    max_colors: int = 96,
    dither: str = "none",
    lossy: int = 20,
) -> dict:
    with tempfile.TemporaryDirectory(prefix=f"dislop-gif-{name}-") as td:
        tmp = Path(td)
        html_path = tmp / "scene.html"
        html_path.write_text(html_text, encoding="utf-8")

        playwright_page.set_viewport_size({"width": width, "height": height})
        playwright_page.goto(html_path.as_uri(), wait_until="load")

        total_frames = int(round(duration * fps))
        frame_files: list[Path] = []
        poster_idx = min(total_frames - 1, max(0, int(round(poster_t * fps))))

        for i in range(total_frames):
            t = i / fps
            playwright_page.evaluate(f"window.__renderAt({t:.4f})")
            fp = tmp / f"frame_{i:04d}.png"
            playwright_page.screenshot(path=str(fp))
            frame_files.append(fp)

        out_gif = DEMOS_DIR / f"{name}.gif"
        out_poster = DEMOS_DIR / f"{name}-poster.png"
        encode_gif(tmp, out_gif, fps=fps, max_colors=max_colors, dither=dither, lossy=lossy)
        save_poster(frame_files[poster_idx], out_poster)

        pick_indices = [0, int(total_frames * 0.2), int(total_frames * 0.4), int(total_frames * 0.55), int(total_frames * 0.78), total_frames - 1]
        sheet_path = sheet_dir / f"{name}-sheet.png"
        make_contact_sheet([frame_files[k] for k in pick_indices], sheet_path, f"{name} ({width}x{height}, {fps}fps, {duration:.1f}s)")

        return {
            "name": name,
            "gif_kb": out_gif.stat().st_size / 1024,
            "poster_kb": out_poster.stat().st_size / 1024,
            "frames": total_frames,
            "sheet": str(sheet_path),
        }


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def render_workbench_live(playwright_browser, lang: str, sheet_dir: Path) -> dict:
    name = f"workbench-live-{lang}-v1"
    width, height, fps = 1140, 580, 12

    handler = functools.partial(QuietHandler, directory=str(SITE_DIR))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]
        th = threading.Thread(target=httpd.serve_forever, daemon=True)
        th.start()
        try:
            ctx = playwright_browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
            page = ctx.new_page()
            url = f"http://127.0.0.1:{port}/" + ("?lang=en" if lang == "en" else "?lang=zh")
            page.goto(url, wait_until="load")
            page.wait_for_selector("#proof-view .proof-line")
            page.evaluate("""() => {
                const topbar = document.querySelector('.topbar');
                if (topbar) topbar.style.display = 'none';
                const hero = document.getElementById('top');
                if (hero) hero.style.display = 'none';
                window.scrollTo(0, 0);
            }""")
            page.wait_for_timeout(150)

            with tempfile.TemporaryDirectory(prefix=f"dislop-wb-{lang}-") as td:
                tmp = Path(td)
                frame_files: list[Path] = []
                idx = 0

                def capture_hold(seconds: float) -> Path:
                    nonlocal idx
                    snap = tmp / f"_snap_{idx}.png"
                    page.screenshot(path=str(snap))
                    count = max(1, int(round(seconds * fps)))
                    for _ in range(count):
                        fp = tmp / f"frame_{idx:04d}.png"
                        shutil.copyfile(snap, fp)
                        frame_files.append(fp)
                        idx += 1
                    return snap

                def add_cursor_ring(selector: str, seconds: float = 0.25):
                    nonlocal idx
                    page.evaluate(f"""() => {{
                        const btn = document.querySelector({selector!r});
                        if (!btn) return;
                        btn.style.outline = '2px solid #F04438';
                        btn.style.outlineOffset = '2px';
                    }}""")
                    capture_hold(seconds)
                    page.evaluate(f"""() => {{
                        const btn = document.querySelector({selector!r});
                        if (!btn) return;
                        btn.style.outline = '';
                        btn.style.outlineOffset = '';
                    }}""")

                # Phase 1: default draft with red + blue marks
                poster_snap = capture_hold(1.8)
                add_cursor_ring("#btn-apply-trap", 0.35)

                # Phase 2: 2nd-order slop trap
                page.evaluate("""() => {
                    document.getElementById('btn-apply-trap')?.click();
                    window.scrollTo(0, 0);
                }""")
                page.wait_for_timeout(120)
                capture_hold(1.8)
                add_cursor_ring("#btn-apply-good", 0.35)

                # Phase 3: clean version (0 findings)
                page.evaluate("""() => {
                    document.getElementById('btn-apply-good')?.click();
                    window.scrollTo(0, 0);
                }""")
                page.wait_for_timeout(120)
                capture_hold(2.1)

                out_gif = DEMOS_DIR / f"{name}.gif"
                out_poster = DEMOS_DIR / f"{name}-poster.png"
                encode_gif(tmp, out_gif, fps=fps, max_colors=128, dither="bayer", lossy=15)
                save_poster(poster_snap, out_poster)

                total_frames = len(frame_files)
                pick_indices = [0, int(total_frames * 0.25), int(total_frames * 0.38), int(total_frames * 0.55), int(total_frames * 0.72), total_frames - 1]
                sheet_path = sheet_dir / f"{name}-sheet.png"
                make_contact_sheet([frame_files[k] for k in pick_indices], sheet_path, f"{name} ({width}x{height}, {fps}fps)")

                ctx.close()
                return {
                    "name": name,
                    "gif_kb": out_gif.stat().st_size / 1024,
                    "poster_kb": out_poster.stat().st_size / 1024,
                    "frames": total_frames,
                    "sheet": str(sheet_path),
                }
        finally:
            httpd.shutdown()


def main() -> int:
    parser = argparse.ArgumentParser(description="Render deterministic dislop demo GIFs and reduced-motion posters.")
    parser.add_argument("--sheets-dir", default=str(DEFAULT_SHEET_DIR), help="Directory for 6-frame QA contact sheets.")
    parser.add_argument("--only", default="", help="Optional comma-separated scene prefix filter.")
    args = parser.parse_args()

    DEMOS_DIR.mkdir(parents=True, exist_ok=True)
    sheet_dir = Path(args.sheets_dir)
    sheet_dir.mkdir(parents=True, exist_ok=True)
    only = {s.strip() for s in args.only.split(",") if s.strip()}

    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(device_scale_factor=1)

        for lang in ("zh", "en"):
            n1 = f"proof-cycle-{lang}-v1"
            if not only or n1 in only:
                results.append(render_virtual_clock_scene(
                    page, n1, proof_cycle_html(lang),
                    width=960, height=500, fps=16, duration=6.6, poster_t=1.2,
                    sheet_dir=sheet_dir, max_colors=96, dither="none", lossy=20,
                ))

            n2 = f"cli-check-{lang}-v1"
            if not only or n2 in only:
                results.append(render_virtual_clock_scene(
                    page, n2, cli_check_html(lang),
                    width=920, height=460, fps=15, duration=6.2, poster_t=2.2,
                    sheet_dir=sheet_dir, max_colors=64, dither="none", lossy=15,
                ))

            n3 = f"workbench-live-{lang}-v1"
            if not only or n3 in only:
                results.append(render_workbench_live(browser, lang, sheet_dir))

            n4 = f"ui-slop-{lang}-v1"
            if not only or n4 in only:
                results.append(render_virtual_clock_scene(
                    page, n4, ui_slop_html(lang),
                    width=960, height=500, fps=16, duration=6.6, poster_t=2.0,
                    sheet_dir=sheet_dir, max_colors=96, dither="none", lossy=25,
                ))

        browser.close()

    total_gif_kb = sum(r["gif_kb"] for r in results)
    for r in results:
        print(f"  [ok] {r['name']}: gif={r['gif_kb']:.1f} KB, poster={r['poster_kb']:.1f} KB, frames={r['frames']}, sheet={r['sheet']}")
    print(f"Total GIF payload across {len(results)} files: {total_gif_kb:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
