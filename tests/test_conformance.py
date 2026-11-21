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
        self.assertEqual(node_tool_names, ["dislop_check", "dislop_explain", "dislop_packs"])
        self.assertEqual(py_tool_names, node_tool_names)
        # Empty dislop_check must return isError=True
        self.assertTrue(node_msgs[2]["result"]["isError"])
        self.assertTrue(py_msgs[2]["result"]["isError"])
        # Valid dislop_check returns identical rule hits
        n_chk = json.loads(node_msgs[3]["result"]["content"][0]["text"])
        p_chk = json.loads(py_msgs[3]["result"]["content"][0]["text"])
        self.assertEqual(n_chk["count"], p_chk["count"])
        self.assertEqual([f["ruleId"] for f in n_chk["findings"]], [f["ruleId"] for f in p_chk["findings"]])

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


if __name__ == "__main__":
    unittest.main()
