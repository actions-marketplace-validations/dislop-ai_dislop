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

    def test_verify_dates_units_links_citations_and_cjk_lorem_parity(self) -> None:
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

        # 3. Verify rejects changed date, unit, citation, and relative link in both runtimes
        before = "It is worth noting that on 2026-11-21 payload was 12 kg [Smith2024] (see [spec](./one.md))."
        after_bad = "On 2026-12-31 payload was 12 lb [Brown2024] (see [spec](./two.md))."
        vn = run_node(["verify", "--before-text", before, "--after-text", after_bad, "--json"])
        vp = run_py(["verify", "--before-text", before, "--after-text", after_bad, "--json"])
        self.assertEqual(vn.returncode, 1)
        self.assertEqual(vp.returncode, 1)
        jn = json.loads(vn.stdout)
        jp = json.loads(vp.stdout)
        self.assertTrue(jn["invariants"]["dates"]["removed"])
        self.assertTrue(jp["invariants"]["dates"]["removed"])
        self.assertTrue(jn["invariants"]["numbers"]["removed"])
        self.assertTrue(jn["invariants"]["citations"]["removed"])
        self.assertTrue(jn["invariants"]["urls"]["removed"])

        # 4. Incomplete PPTX archive (missing slides) exits 2 in both runtimes
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
                    "<p:sp><p:spPr><a:xfrm><a:off x=\"8500000\" y=\"0\"/><a:ext cx=\"2000000\" cy=\"500000\"/></a:xfrm></p:spPr>"
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
            self.assertIn(("office-pdf-hygiene", "slide 1"), node_rules)

    def test_docx_tracked_changes_and_markdown_leak_parity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            docx_path = Path(tmp) / "draft.docx"
            with zipfile.ZipFile(docx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(
                    "word/document.xml",
                    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                    "<w:body>"
                    "<w:p><w:r><w:t>**Unrendered Bold**</w:t></w:r><w:ins><w:r><w:t> added</w:t></w:r></w:ins></w:p>"
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
            self.assertIn("office-pdf-hygiene", n_ids)

    def test_mcp_protocol_parity_and_input_validation(self) -> None:
        requests = "\n".join(
            [
                json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}),
                json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "dislop_check", "arguments": {}}}),
                json.dumps(
                    {
                        "jsonrpc": "2.0",
                        "id": 3,
                        "method": "tools/call",
                        "params": {
                            "name": "dislop_verify",
                            "arguments": {
                                "before": "It is worth noting that latency is up to 12 ms.",
                                "after": "Latency is up to 12 ms.",
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
        # Empty dislop_check must return isError=True instead of pretending 0 findings!
        self.assertTrue(node_msgs[1]["result"]["isError"])
        self.assertTrue(py_msgs[1]["result"]["isError"])
        # Valid dislop_verify must accept in both!
        n_ver = json.loads(node_msgs[2]["result"]["content"][0]["text"])
        p_ver = json.loads(py_msgs[2]["result"]["content"][0]["text"])
        self.assertTrue(n_ver["ok"])
        self.assertTrue(p_ver["ok"])


if __name__ == "__main__":
    unittest.main()
