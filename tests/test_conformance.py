"""Cross-runtime conformance tests verifying 100% parity between Node.js and Python CLIs & MCP servers."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def run_node(args: list[str], cwd: Path = REPO_ROOT, stdin_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(REPO_ROOT / "bin" / "dislop.mjs"), *args],
        cwd=cwd,
        input=stdin_text,
        capture_output=True,
        text=True,
    )


def run_py(args: list[str], cwd: Path = REPO_ROOT, stdin_text: str | None = None) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "PYTHONPATH": str(REPO_ROOT / "src")}
    return subprocess.run(
        ["python3", "-m", "dislop.cli", *args],
        cwd=cwd,
        env=env,
        input=stdin_text,
        capture_output=True,
        text=True,
    )


class ConformanceParityTests(unittest.TestCase):
    def test_pack_test_passes_in_both_runtimes(self) -> None:
        r_node = run_node(["pack-test"])
        r_py = run_py(["pack-test"])
        self.assertEqual(r_node.returncode, 0, r_node.stderr)
        self.assertEqual(r_py.returncode, 0, r_py.stderr)
        self.assertEqual(r_node.stdout.strip(), r_py.stdout.strip())

    def test_cjk_lorem_prefix_safety_and_empty_pptx_parity(self) -> None:
        # 1. CJK-adjacent lorem ipsum must fail identically in Node and Python
        cjk_lorem = "这是中文lorem ipsum示例\n"
        rn = run_node(["check", "-", "--stdin-filename", "x.md"], stdin_text=cjk_lorem)
        rp = run_py(["check", "-", "--stdin-filename", "x.md"], stdin_text=cjk_lorem)
        self.assertEqual(rn.returncode, 1)
        self.assertEqual(rp.returncode, 1)

        # 2. Production text starting with PPTX_ must NOT skip real checks
        sneaky = "PPTX_NOTES: Certainly! Here is [insert name]\n"
        rn2 = run_node(["check", "-", "--stdin-filename", "x.md"], stdin_text=sneaky)
        rp2 = run_py(["check", "-", "--stdin-filename", "x.md"], stdin_text=sneaky)
        self.assertEqual(rn2.returncode, 1)
        self.assertEqual(rp2.returncode, 1)

        # 3. Incomplete PPTX archive (missing slides) exits 2 in both runtimes
        with tempfile.TemporaryDirectory() as tmp:
            bad_pptx = Path(tmp) / "empty.pptx"
            with zipfile.ZipFile(bad_pptx, "w") as zf:
                zf.writestr("[Content_Types].xml", "<Types/>")
            bn = run_node(["check", str(bad_pptx)], cwd=Path(tmp))
            bp = run_py(["check", str(bad_pptx)], cwd=Path(tmp))
            self.assertEqual(bn.returncode, 2)
            self.assertEqual(bp.returncode, 2)

    def test_unicode_emoji_column_and_fingerprint_parity(self) -> None:
        sample = "😀 Section 2 delves into retry budgets.\n"
        r_node = run_node(["check", "-", "--stdin-filename", "emoji.md", "--json"], stdin_text=sample)
        r_py = run_py(["check", "-", "--stdin-filename", "emoji.md", "--json"], stdin_text=sample)
        j_node = json.loads(r_node.stdout)
        j_py = json.loads(r_py.stdout)
        self.assertEqual(len(j_node["findings"]), 1)
        self.assertEqual(len(j_py["findings"]), 1)
        self.assertEqual(j_node["findings"][0]["location"], j_py["findings"][0]["location"])
        self.assertEqual(j_node["findings"][0]["fingerprint"], j_py["findings"][0]["fingerprint"])

    def test_reordered_pptx_and_split_runs_parity_across_node_and_python(self) -> None:
        """Slide 1 in presentation order is stored in slide2.xml and contains split runs + autofit + word wall."""
        with tempfile.TemporaryDirectory() as tmp:
            pptx_path = Path(tmp) / "reordered.pptx"
            many_words = " ".join(["metric"] * 135)
            with zipfile.ZipFile(pptx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(
                    "ppt/presentation.xml",
                    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                    '<p:sldSz cx="9144000" cy="6858000"/>'
                    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst>'
                    "</p:presentation>",
                )
                zf.writestr(
                    "ppt/_rels/presentation.xml.rels",
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    '<Relationship Id="rId1" Target="slides/slide1.xml"/>'
                    '<Relationship Id="rId2" Target="slides/slide2.xml"/>'
                    "</Relationships>",
                )
                # slide2.xml is Slide 1 in presentation order!
                zf.writestr(
                    "ppt/slides/slide2.xml",
                    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                    "<p:sp><p:nvSpPr><p:nvPr><p:ph type=\"title\"/></p:nvPr></p:nvSpPr>"
                    "<p:txBody><a:bodyPr><a:normAutofit fontScale=\"62000\"/></a:bodyPr>"
                    "<a:p><a:r><a:t>Overview</a:t></a:r></a:p></p:txBody></p:sp>"
                    "<p:sp>"
                    f"<p:txBody><a:p><a:r><a:t>[insert</a:t></a:r><a:r><a:t> owner] {many_words}</a:t></a:r></a:p></p:txBody></p:sp>"
                    "</p:sld>",
                )
                zf.writestr(
                    "ppt/slides/slide1.xml",
                    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                    "<p:sp><p:txBody><a:p><a:r><a:t>Concise second slide.</a:t></a:r></a:p></p:txBody></p:sp>"
                    "</p:sld>",
                )

            r_node = run_node(["check", str(pptx_path), "--json"], cwd=Path(tmp))
            r_py = run_py(["check", str(pptx_path), "--json"], cwd=Path(tmp))
            self.assertEqual(r_node.returncode, 1)
            self.assertEqual(r_py.returncode, 1)

            j_node = json.loads(r_node.stdout)
            j_py = json.loads(r_py.stdout)
            node_rules = {(f["ruleId"], f["location"]) for f in j_node["findings"]}
            py_rules = {(f["ruleId"], f["location"]) for f in j_py["findings"]}
            self.assertEqual(node_rules, py_rules)
            self.assertIn(("unfilled-placeholder", "slide 1"), node_rules)
            self.assertIn(("slide-word-wall", "slide 1"), node_rules)
            self.assertIn(("slide-autofit-shrink", "slide 1"), node_rules)
            self.assertIn(("slide-weak-topic-title", "slide 1"), node_rules)

    def test_docx_markdown_leak_and_prose_slop_parity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            docx_path = Path(tmp) / "draft.docx"
            with zipfile.ZipFile(docx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(
                    "word/document.xml",
                    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                    "<w:body>"
                    "<w:p><w:r><w:t>Certainly! </w:t></w:r><w:r><w:t>Here is the update.</w:t></w:r></w:p>"
                    "<w:p><w:r><w:t>**Unrendered Bold**: </w:t></w:r><w:r><w:t>Ship on Friday.</w:t></w:r></w:p>"
                    "</w:body></w:document>",
                )
            r_node = run_node(["check", str(docx_path), "--json"], cwd=Path(tmp))
            r_py = run_py(["check", str(docx_path), "--json"], cwd=Path(tmp))
            self.assertEqual(r_node.returncode, 1)
            self.assertEqual(r_py.returncode, 1)
            n_ids = {f["ruleId"] for f in json.loads(r_node.stdout)["findings"]}
            p_ids = {f["ruleId"] for f in json.loads(r_py.stdout)["findings"]}
            self.assertEqual(n_ids, p_ids)
            self.assertIn("markdown-leak", n_ids)
            self.assertIn("chatbot-artifact", n_ids)

    def test_mcp_protocol_parity_and_input_validation(self) -> None:
        requests = "\n".join(
            [
                json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}),
                json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}),
                json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "dislop_check", "arguments": {}}}),
                json.dumps(
                    {
                        "jsonrpc": "2.0",
                        "id": 4,
                        "method": "tools/call",
                        "params": {
                            "name": "dislop_check",
                            "arguments": {
                                "text": "Certainly! Here is the update. It is worth noting that latency dropped.",
                                "filename": "note.md",
                                "lang": "en",
                            },
                        },
                    }
                ),
                json.dumps(
                    {
                        "jsonrpc": "2.0",
                        "id": 5,
                        "method": "tools/call",
                        "params": {
                            "name": "dislop_explain",
                            "arguments": {
                                "ruleId": "chatbot-artifact",
                                "lang": "zh",
                            },
                        },
                    }
                ),
            ]
        ) + "\n"

        r_node = run_node(["--mcp"], stdin_text=requests)
        r_py = run_py(["--mcp"], stdin_text=requests)
        node_msgs = [json.loads(line) for line in r_node.stdout.strip().splitlines()]
        py_msgs = [json.loads(line) for line in r_py.stdout.strip().splitlines()]

        self.assertEqual(node_msgs[0]["result"]["protocolVersion"], "2025-06-18")
        self.assertEqual(py_msgs[0]["result"]["protocolVersion"], "2025-06-18")
        node_tool_names = [t["name"] for t in node_msgs[1]["result"]["tools"]]
        py_tool_names = [t["name"] for t in py_msgs[1]["result"]["tools"]]
        self.assertEqual(
            node_tool_names,
            [
                "dislop_check",
                "dislop_explain",
                "dislop_packs",
                "dislop_catalog",
                "dislop_voice_extract_offline",
                "dislop_model_score",
                "dislop_model_status",
            ],
        )
        self.assertEqual(py_tool_names, node_tool_names)
        # Empty dislop_check must return isError=True
        self.assertTrue(node_msgs[2]["result"]["isError"])
        self.assertTrue(py_msgs[2]["result"]["isError"])
        # Valid dislop_check defaults to compact mode (no inline exemplar) with single-locale message filter
        n_chk = json.loads(node_msgs[3]["result"]["content"][0]["text"])
        p_chk = json.loads(node_msgs[3]["result"]["content"][0]["text"])
        self.assertEqual(n_chk, p_chk)
        self.assertNotIn("exemplar", n_chk["findings"][0])
        self.assertEqual(list(n_chk["findings"][0]["message"].keys()), ["en"])
        self.assertIn("explainHint", n_chk)
        # dislop_explain strips negative fixtures/regex internals and honors lang
        n_exp = json.loads(node_msgs[4]["result"]["content"][0]["text"])
        p_exp = json.loads(node_msgs[4]["result"]["content"][0]["text"])
        self.assertEqual(n_exp, p_exp)
        self.assertNotIn("fixtures", n_exp)
        self.assertNotIn("pattern", n_exp)
        self.assertEqual(list(n_exp["message"].keys()), ["zh"])

    def test_resources_and_stdin_parity(self):
        n_res = run_node(["resources", "--json"])
        p_res = run_py(["resources", "--json"])
        self.assertEqual(n_res.returncode, 0)
        self.assertEqual(p_res.returncode, 0)
        self.assertEqual(json.loads(n_res.stdout), json.loads(p_res.stdout))

        sample = "好的，以下是本周进展：延迟降到 120ms。"
        n_in = run_node(["check", "-", "--stdin-filename", "draft.md", "--format", "json"], stdin_text=sample)
        p_in = run_py(["check", "-", "--stdin-filename", "draft.md", "--format", "json"], stdin_text=sample)
        self.assertEqual(n_in.returncode, 1)
        self.assertEqual(p_in.returncode, 1)
        self.assertEqual(
            [f["ruleId"] for f in json.loads(n_in.stdout)["findings"]],
            [f["ruleId"] for f in json.loads(p_in.stdout)["findings"]],
        )

    def test_profile_flag_and_text_v2_rules_parity(self):
        sample = (
            "随着远程协作的不断深入，团队对文档同步提出了更高要求。"
            "为什么许多团队沟通依然缓慢？因为信息分散在不同渠道。\n\n"
            "在传输效率方面，新版本有效推动协同效率，持续优化交互体验，显著提升服务质量。\n\n"
            "在离线编辑方面，客户端完善本地冲突合并机制。\n\n"
            "在权限管控方面，系统细化多级只读策略。\n\n"
            "展望未来，我们将继续围绕办公场景携手开启协作新篇章。"
        )
        n_res = run_node(["check", "-", "--stdin-filename", "v2.md", "--profile", "--format", "json"], stdin_text=sample)
        p_res = run_py(["check", "-", "--stdin-filename", "v2.md", "--profile", "--format", "json"], stdin_text=sample)
        self.assertEqual(n_res.returncode, 0)
        self.assertEqual(p_res.returncode, 0)
        jn = json.loads(n_res.stdout)
        jp = json.loads(p_res.stdout)
        n_rules = sorted(f["ruleId"] for f in jn["findings"])
        p_rules = sorted(f["ruleId"] for f in jp["findings"])
        self.assertEqual(n_rules, p_rules)
        for expected_rule in ("cooccurrence-slop-cluster", "rhetorical-qa-cadence", "narrative-sandwich-frame", "template-skeleton-echo"):
            self.assertIn(expected_rule, n_rules)
        self.assertEqual(jn["profiles"], jp["profiles"])
        self.assertGreaterEqual(jn["profiles"][0]["profile"]["telemetryRisk"]["score"], 70)

    def test_adversarial_edge_cases_parity_and_linear_perf(self):
        # 1. CJK-adjacent ASCII word boundaries & multiword transition cluster parity
        for sample in [
            "试验robust方法可改善统计transformative指标。",
            "Furthermore, tests pass. Moreover, logs work. At the same time, latency holds.",
            "甲乙。甲甲乙。甲乙。甲乙。",
            "第一句。第二句。\r\n\r\n第三句。第四句。\r\n",
            "# Protocol\nThe service handles 400 requests per second.\n<!-- 100 200 300 -->",
            "<!-- dislop-quote-start -->\n为什么这样？因为模板。\n<!-- dislop-quote-end -->\n正文正常。",
        ]:
            n_res = run_node(["check", "-", "--stdin-filename", "edge.md", "--profile", "--format", "json"], stdin_text=sample)
            p_res = run_py(["check", "-", "--stdin-filename", "edge.md", "--profile", "--format", "json"], stdin_text=sample)
            jn = json.loads(n_res.stdout)
            jp = json.loads(p_res.stdout)
            self.assertEqual(jn["findings"], jp["findings"], f"Findings mismatch on: {sample!r}")
            self.assertEqual(jn["profiles"], jp["profiles"], f"Profile mismatch on: {sample!r}")

        # 2. Verify # Protocol + prose extracts 1 sentence & HTML comment adds 0 anchors
        md_res = json.loads(
            run_py(
                ["check", "-", "--stdin-filename", "proto.md", "--profile", "--format", "json"],
                stdin_text="# Protocol\nThe service handles 400 requests.\n<!-- 100 200 300 -->",
            ).stdout
        )
        prof = md_res["profiles"][0]["profile"]
        self.assertEqual(prof["sentenceCount"], 1)
        self.assertEqual(prof["concreteness"]["anchorCount"], 1)

        # 3. Linear-time guarantee on 8 KB unpunctuated soft line break (no quadratic regex stall)
        import time
        big_line = ("word " * 1650).strip() + "\n"
        t0 = time.perf_counter()
        r_big = run_py(["check", "-", "--stdin-filename", "big.md", "--profile", "--format", "json"], stdin_text=big_line)
        elapsed = time.perf_counter() - t0
        self.assertEqual(r_big.returncode, 0)
        self.assertLess(elapsed, 2.0, f"Quadratic stall detected: {elapsed:.2f}s")

    def test_voice_model_and_vertical_packs_parity(self) -> None:
        from dislop.engine import verify_revision

        with tempfile.TemporaryDirectory() as tmp:
            tdir = Path(tmp)
            # 1. Standalone CLI `verify` must not be exposed on the public surface (exit 2), while internal `verifyRevision` guards rewrites
            vn_removed = run_node(["verify", "a.md", "b.md"], cwd=tdir)
            vp_removed = run_py(["verify", "a.md", "b.md"], cwd=tdir)
            self.assertEqual(vn_removed.returncode, 2)
            self.assertEqual(vp_removed.returncode, 2)

            before_txt = "好的，以下是上线说明。值得注意的是，故障恢复时间最多 45 秒，错误率不超过 0.05%，详见 https://dislop.com/docs 与 `--fail-on`。\n"
            after_ok_txt = "上线后故障恢复时间最多 45 秒，错误率不超过 0.05%，详见 https://dislop.com/docs 与 `--fail-on`。\n"
            after_drift_txt = "上线后故障恢复时间 45 秒，错误率 0.05%，详见 https://dislop.com/docs 与 `--fail-on`。\n"
            py_ok = verify_revision(before_txt, after_ok_txt, modality="markdown")
            py_bad = verify_revision(before_txt, after_drift_txt, modality="markdown")
            self.assertEqual(py_ok["status"], "preserved")
            self.assertEqual(py_bad["status"], "drifted")
            self.assertEqual(len(py_bad["qualifierDropped"]), 2)

            # 2. `dislop voice` offline deterministic profile parity (ZH & EN, including `-o` short flag)
            out_n = tdir / "voice_n.json"
            out_p = tdir / "voice_p.json"
            sample_voice = "上周五 21:30 切换灰度队列后，结算接口 P99 从 210ms 降到 42ms。周一把全量配置合入主干。\n\n灰度期间只出现过 1 次重试告警，原因是旧连接池没关干净。"
            voc_n = run_node(["voice", "-", "-o", str(out_n), "--lang", "zh", "--json"], stdin_text=sample_voice)
            voc_p = run_py(["voice", "-", "-o", str(out_p), "--lang", "zh", "--json"], stdin_text=sample_voice)
            self.assertEqual(voc_n.returncode, 0, voc_n.stderr)
            self.assertEqual(voc_p.returncode, 0, voc_p.stderr)
            self.assertEqual(json.loads(voc_n.stdout), json.loads(voc_p.stdout))
            self.assertEqual(json.loads(out_n.read_text("utf-8")), json.loads(out_p.read_text("utf-8")))

            # 3. `dislop model --no-loopback --json` hardware advisor schema & recommendation parity
            mod_n = run_node(["model", "--no-loopback", "--lang", "zh", "--json"])
            mod_p = run_py(["model", "--no-loopback", "--lang", "zh", "--json"])
            self.assertEqual(mod_n.returncode, 0, mod_n.stderr)
            self.assertEqual(mod_p.returncode, 0, mod_p.stderr)
            jn_mod = json.loads(mod_n.stdout)
            jp_mod = json.loads(mod_p.stdout)
            self.assertEqual(jn_mod["schema"], "dislop.local-model/1")
            self.assertEqual(jn_mod["builtinDeterministic"], jp_mod["builtinDeterministic"])
            self.assertEqual(jn_mod["recommendation"]["tier"], jp_mod["recommendation"]["tier"])
            self.assertEqual(jn_mod["recommendation"]["modelId"], jp_mod["recommendation"]["modelId"])

            # 4. MCP `dislop_voice_extract_offline`, `dislop_check` (`pack="auto"` + `patterns=True` + out-of-workspace containment), and `dislop_explain` on bank pattern
            mcp_reqs = "\n".join(
                [
                    json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}),
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 2,
                            "method": "tools/call",
                            "params": {
                                "name": "dislop_voice_extract_offline",
                                "arguments": {
                                    "samples": ["Cut queue timeout from 30s to 5s on Tuesday. Zero retries fired overnight."],
                                    "lang": "en",
                                },
                            },
                        }
                    ),
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 3,
                            "method": "tools/call",
                            "params": {
                                "name": "dislop_check",
                                "arguments": {
                                    "text": "首先，统一数据口径。\n\n其次，补齐回归脚本。\n\n最后，更新发布清单。",
                                    "pack": "auto",
                                    "patterns": True,
                                    "lang": "zh",
                                },
                            },
                        }
                    ),
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 4,
                            "method": "tools/call",
                            "params": {
                                "name": "dislop_explain",
                                "arguments": {"ruleId": "discourse-marker-cluster", "lang": "zh"},
                            },
                        }
                    ),
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 5,
                            "method": "tools/call",
                            "params": {
                                "name": "dislop_check",
                                "arguments": {"path": "../outside-nonexistent.md"},
                            },
                        }
                    ),
                ]
            ) + "\n"
            mn = [json.loads(line) for line in run_node(["--mcp"], stdin_text=mcp_reqs).stdout.strip().splitlines()]
            mp = [json.loads(line) for line in run_py(["--mcp"], stdin_text=mcp_reqs).stdout.strip().splitlines()]
            for idx in (1, 2, 3, 4):
                self.assertEqual(
                    json.loads(mn[idx]["result"]["content"][0]["text"]),
                    json.loads(mp[idx]["result"]["content"][0]["text"]),
                )
            self.assertTrue(mn[4]["result"]["isError"])
            self.assertIn("within the current workspace", json.loads(mn[4]["result"]["content"][0]["text"])["error"])

            # 5. Real OOXML `.pptx` `executive-deck` layout monotony + process title parity
            exec_pptx = tdir / "board.pptx"
            with zipfile.ZipFile(exec_pptx, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(
                    "ppt/presentation.xml",
                    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                    "<p:sldIdLst>"
                    '<p:sldId id="256" r:id="rId1"/>'
                    '<p:sldId id="257" r:id="rId2"/>'
                    '<p:sldId id="258" r:id="rId3"/>'
                    '<p:sldId id="259" r:id="rId4"/>'
                    "</p:sldIdLst></p:presentation>",
                )
                zf.writestr(
                    "ppt/_rels/presentation.xml.rels",
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    '<Relationship Id="rId1" Target="slides/slide1.xml"/>'
                    '<Relationship Id="rId2" Target="slides/slide2.xml"/>'
                    '<Relationship Id="rId3" Target="slides/slide3.xml"/>'
                    '<Relationship Id="rId4" Target="slides/slide4.xml"/>'
                    "</Relationships>",
                )
                for idx in range(1, 5):
                    title = "Analysis of Q3 Regional Churn" if idx == 1 else f"Q3 Region {idx} dropped churn by {idx}%"
                    zf.writestr(
                        f"ppt/slides/slide{idx}.xml",
                        '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                        f'<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>{title}</a:t></a:r></a:p></p:txBody></p:sp>'
                        '<p:sp><p:txBody>'
                        '<a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>Point one</a:t></a:r></a:p>'
                        '<a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>Point two</a:t></a:r></a:p>'
                        '<a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>Point three</a:t></a:r></a:p>'
                        "</p:txBody></p:sp></p:sld>",
                    )
            en_exec = run_node(["check", str(exec_pptx), "--pack", "executive-deck", "--json"], cwd=tdir)
            ep_exec = run_py(["check", str(exec_pptx), "--pack", "executive-deck", "--json"], cwd=tdir)
            jn_exec = json.loads(en_exec.stdout)
            jp_exec = json.loads(ep_exec.stdout)
            n_hits = {(f["ruleId"], f["location"]) for f in jn_exec["findings"]}
            p_hits = {(f["ruleId"], f["location"]) for f in jp_exec["findings"]}
            self.assertEqual(n_hits, p_hits)
            self.assertIn(("slide-process-not-finding-title", "slide 1"), n_hits)
            self.assertIn(("pptx-layout-monotony", "slide 4"), n_hits)

    def test_sol_adversarial_audit_regressions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tdir = Path(tmp)

            # 1. Internal `verifyRevision` / `verify_revision` adversarial drift cases (unit swap, sign flip, 3-part semver, strict vs inclusive bound, sentence-end integer, CJK-attached numbers)
            from dislop.engine import verify_revision

            drift_pairs = [
                ("Latency is 10 ms.", "Latency is 10 seconds."),
                ("Margin moved -8%.", "Margin moved +8%."),
                ("Shipped v1.2.3 today.", "Shipped v1.2.4 today."),
                ("Supports at least 10 rows.", "Supports more than 10 rows."),
                ("We hired 25.", "We hired a new cohort."),
                ("时延从34%降至19%。", "时延从30%降至15%。"),
            ]
            js_verify_script = (
                "import { verifyRevision } from './src/core.mjs';\n"
                "const pairs = JSON.parse(process.argv[1]);\n"
                "console.log(JSON.stringify(pairs.map(([b, a]) => verifyRevision(b + '\\n', a + '\\n', { modality: 'markdown' }))));"
            )
            r_js_ver = subprocess.run(
                ["node", "--input-type=module", "-e", js_verify_script, json.dumps(drift_pairs)],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
            )
            self.assertEqual(r_js_ver.returncode, 0, r_js_ver.stderr)
            js_ledgers = json.loads(r_js_ver.stdout)
            for i, (b_txt, a_txt) in enumerate(drift_pairs):
                py_ledger = verify_revision(b_txt + "\n", a_txt + "\n", modality="markdown")
                self.assertEqual(js_ledgers[i]["status"], "drifted", f"Node missed drift on pair #{i}")
                self.assertEqual(py_ledger["status"], "drifted", f"Python missed drift on pair #{i}")
                self.assertEqual(js_ledgers[i], py_ledger, f"Ledger mismatch on pair #{i}")

            # 2. Multiplier probe: decimal baseline exempted, store/shop nouns not treated as `s` unit, fullwidth digit parity
            mult_cases = [
                ("Run is 3x faster, from 1.5 seconds to 0.5 seconds.", "regulated-comms", False),
                ("Run is 3x faster and serves 10 stores and 20 shops.", "regulated-comms", True),
                ("本轮改造后系统性能提升３倍。", "regulated-comms", True),
                ("## Analysis of Q3", "executive-deck", True),
                ("## Analysis of İstanbul Returns", "executive-deck", True),
                ("## 关于退款的分析 ##", "executive-deck", True),
            ]
            for sample, pack_id, should_hit in mult_cases:
                rn = run_node(["check", "-", "--stdin-filename", "x.md", "--pack", pack_id, "--json"], stdin_text=sample)
                rp = run_py(["check", "-", "--stdin-filename", "x.md", "--pack", pack_id, "--json"], stdin_text=sample)
                jn = json.loads(rn.stdout)
                jp = json.loads(rp.stdout)
                self.assertEqual(
                    [f["ruleId"] for f in jn["findings"]],
                    [f["ruleId"] for f in jp["findings"]],
                    f"Rule mismatch on {sample!r}",
                )
                self.assertEqual(len(jn["findings"]) > 0, should_hit, f"Unexpected hit={len(jn['findings'])>0} on {sample!r}")

            # 3. 25-word sentence half-up voice band rounding parity (`[16.3, 36.3]` in both JS and Python)
            twenty_five = " ".join(["word"] * 25) + "."
            vn = json.loads(run_node(["voice", "-", "--lang", "en", "--json"], stdin_text=twenty_five).stdout)
            vp = json.loads(run_py(["voice", "-", "--lang", "en", "--json"], stdin_text=twenty_five).stdout)
            self.assertEqual(vn, vp)
            self.assertEqual(vn["stylometrics"]["targetLengthBand"], [16.3, 36.3])

    def test_bom_emoji_crlf_and_error_contracts_parity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tdir = Path(tmp)

            # 1. UTF-8 BOM parity across stdin and file with --pack auto --ml --patterns --profile
            bom_txt = "\ufeffCertainly! Here is a draft.\n"
            rn_bom = run_node(["check", "--pack", "auto", "--ml", "--patterns", "--profile", "--json", "-"], stdin_text=bom_txt)
            rp_bom = run_py(["check", "--pack", "auto", "--ml", "--patterns", "--profile", "--json", "-"], stdin_text=bom_txt)
            self.assertEqual(rn_bom.returncode, 1)
            self.assertEqual(rp_bom.returncode, 1)
            self.assertEqual(json.loads(rn_bom.stdout)["findings"], json.loads(rp_bom.stdout)["findings"])

            bom_file = tdir / "bom.md"
            bom_file.write_bytes(bom_txt.encode("utf-8"))
            rn_bf = run_node(["check", str(bom_file), "--json"], cwd=tdir)
            rp_bf = run_py(["check", str(bom_file), "--json"], cwd=tdir)
            self.assertEqual(rn_bf.returncode, 1)
            self.assertEqual(rp_bf.returncode, 1)
            self.assertEqual(json.loads(rn_bf.stdout)["findings"], json.loads(rp_bf.stdout)["findings"])

            # 2. Emoji codepoint span + CRLF file span parity
            emoji_lf = "🚀\n\nCertainly! Here is the draft."
            rn_em = json.loads(run_node(["check", "--json", "-"], stdin_text=emoji_lf).stdout)
            rp_em = json.loads(run_py(["check", "--json", "-"], stdin_text=emoji_lf).stdout)
            self.assertEqual(rn_em["findings"][0]["span"], {"start": 3, "end": 21})
            self.assertEqual(rn_em["findings"], rp_em["findings"])

            crlf_file = tdir / "crlf.md"
            crlf_file.write_bytes("🚀\r\n\r\nCertainly! Here is the draft.\r\n".encode("utf-8"))
            rn_crlf = json.loads(run_node(["check", "crlf.md", "--json"], cwd=tdir).stdout)
            rp_crlf = json.loads(run_py(["check", "crlf.md", "--json"], cwd=tdir).stdout)
            self.assertEqual(rn_crlf["findings"][0]["span"], {"start": 5, "end": 23})
            self.assertEqual(rn_crlf["findings"], rp_crlf["findings"])

            # 3. Malformed CLI error exits (exit 2, no stack trace)
            rn_bogus = run_node(["check", "--pack", "bogus", "-"], stdin_text="Draft\n")
            rp_bogus = run_py(["check", "--pack", "bogus", "-"], stdin_text="Draft\n")
            self.assertEqual(rn_bogus.returncode, 2)
            self.assertEqual(rp_bogus.returncode, 2)
            self.assertNotIn("Traceback", rp_bogus.stderr)
            self.assertNotIn("    at ", rn_bogus.stderr)

            bad_docx = tdir / "bad.docx"
            bad_docx.write_bytes(b"not a ZIP archive")
            self.assertEqual(run_node(["patterns", str(bad_docx), "--json"], cwd=tdir).returncode, 2)
            self.assertEqual(run_py(["patterns", str(bad_docx), "--json"], cwd=tdir).returncode, 2)

            fake_pdf = tdir / "draft.pdf"
            fake_pdf.write_bytes(b"%PDF-1.4\nPlain ASCII text\n")
            self.assertEqual(run_node(["patterns", str(fake_pdf), "--json"], cwd=tdir).returncode, 2)
            self.assertEqual(run_py(["patterns", str(fake_pdf), "--json"], cwd=tdir).returncode, 2)

            # 4. GitHub annotation property escaping for commas/colons/percents
            gh_fn = "Release,Notes:v1%draft.md"
            rn_gh = run_node(["check", "--format", "github", "--stdin-filename", gh_fn, "-"], stdin_text="Certainly! Here is a draft.\n")
            rp_gh = run_py(["check", "--format", "github", "--stdin-filename", gh_fn, "-"], stdin_text="Certainly! Here is a draft.\n")
            self.assertEqual(rn_gh.stdout, rp_gh.stdout)
            self.assertIn("file=Release%2CNotes%3Av1%25draft.md,line=1,col=1,title=chatbot-artifact::", rn_gh.stdout)

            # 5. `explain pocket-stealth-vapor` parity & `README.md --pack auto --ml` 0 findings
            ex_n = json.loads(run_node(["explain", "pocket-stealth-vapor", "--json"]).stdout)
            ex_p = json.loads(run_py(["explain", "pocket-stealth-vapor", "--json"]).stdout)
            self.assertEqual(ex_n, ex_p)
            rm_n = json.loads(run_node(["check", str(REPO_ROOT / "README.md"), "--pack", "auto", "--ml", "--json"]).stdout)
            rm_p = json.loads(run_py(["check", str(REPO_ROOT / "README.md"), "--pack", "auto", "--ml", "--json"]).stdout)
            self.assertEqual(rm_n["findings"], [])
            self.assertEqual(rm_p["findings"], [])

            # 6. MCP `dislop_explain(pocket-stealth-vapor)`, `verbosity: full` emoji span, and >15 voice sample limit
            mcp_batch = "\n".join(
                [
                    json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}),
                    json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "dislop_explain", "arguments": {"ruleId": "pocket-stealth-vapor"}}}),
                    json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "dislop_check", "arguments": {"text": emoji_lf, "verbosity": "full"}}}),
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "id": 4,
                            "method": "tools/call",
                            "params": {
                                "name": "dislop_voice_extract_offline",
                                "arguments": {"samples": [f"Sample {i} shipped on Tuesday." for i in range(16)]},
                            },
                        }
                    ),
                ]
            ) + "\n"
            mn2 = [json.loads(line) for line in run_node(["--mcp"], stdin_text=mcp_batch).stdout.strip().splitlines()]
            mp2 = [json.loads(line) for line in run_py(["--mcp"], stdin_text=mcp_batch).stdout.strip().splitlines()]
            for idx in (1, 2, 3):
                self.assertEqual(
                    json.loads(mn2[idx]["result"]["content"][0]["text"]),
                    json.loads(mp2[idx]["result"]["content"][0]["text"]),
                )
            self.assertTrue(mn2[3]["result"]["isError"])
            self.assertTrue(mp2[3]["result"]["isError"])

            # 7. MCP voice whitespace-only and non-string element rejection parity
            mcp_bad_voice = "\n".join(
                [
                    json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "dislop_voice_extract_offline", "arguments": {"samples": ["   \n\t "]}}}),
                    json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "dislop_voice_extract_offline", "arguments": {"samples": ["Valid line.", 123]}}}),
                ]
            ) + "\n"
            mn_bv = [json.loads(line) for line in run_node(["--mcp"], stdin_text=mcp_bad_voice).stdout.strip().splitlines()]
            mp_bv = [json.loads(line) for line in run_py(["--mcp"], stdin_text=mcp_bad_voice).stdout.strip().splitlines()]
            self.assertEqual(mn_bv, mp_bv)
            self.assertTrue(mn_bv[0]["result"]["isError"])
            self.assertTrue(mn_bv[1]["result"]["isError"])

            # 8. Large (> 64 KB) piped JSON output with leading emoji + 400 findings: zero truncation & O(N) span speed
            import time

            many_hits = "🚀\n\n" + "\n\n".join(["It's worth noting that exports are a game-changer for teams." for _ in range(200)]) + "\n"
            t0 = time.perf_counter()
            rn_many = run_node(["check", "--pack", "business-brief", "--json", "-"], stdin_text=many_hits)
            node_elapsed = time.perf_counter() - t0
            rp_many = run_py(["check", "--pack", "business-brief", "--json", "-"], stdin_text=many_hits)
            self.assertGreater(len(rn_many.stdout), 120_000)
            self.assertLess(node_elapsed, 2.0, f"Emoji span regression: {node_elapsed:.2f}s")
            jn_many = json.loads(rn_many.stdout)
            jp_many = json.loads(rp_many.stdout)
            self.assertEqual(len(jn_many["findings"]), 401)
            self.assertEqual(jn_many["findings"], jp_many["findings"])


if __name__ == "__main__":
    unittest.main()
