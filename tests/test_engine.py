import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dislop.engine import audit_path, audit_pptx, audit_text, explain_rule, load_packs


class EngineTests(unittest.TestCase):
    def test_packs_and_self_dogfood_repository_clean(self):
        packs = load_packs()
        self.assertEqual(set(packs), {"business-brief", "deck-and-ui", "literary-essay"})
        report = audit_path(ROOT)
        self.assertGreaterEqual(report["filesScanned"], 6)
        self.assertEqual(report["count"], 0, f"Repository docs failed self-dogfood check: {report}")

    def test_markdown_code_fences_do_not_false_positive(self):
        clean_tech_doc = (
            "This guide explains how our parser flags `delve` and `赋能` in prose.\n\n"
            "```markdown\n"
            "In conclusion, we delve into a seamless paradigm shift.\n"
            "```\n"
        )
        self.assertEqual(audit_text(clean_tech_doc, "business-brief")["count"], 0)

    def test_detects_bilingual_cliches_and_path_leaks(self):
        slop = "值得注意的是，我们将赋能业务闭环生态，详见 file:///Users/demo/draft.pdf。\nWe delve into a seamless paradigm shift."
        report = audit_text(slop, "business-brief")
        rule_ids = {f["ruleId"] for f in report["findings"]}
        self.assertIn("zh-cliche-connector", rule_ids)
        self.assertIn("en-cliche-lexicon", rule_ids)
        self.assertIn("local-path-leak", rule_ids)
        explained = explain_rule("zh-cliche-connector")
        self.assertIsNotNone(explained)
        self.assertTrue(explained["exemplars"])

    def test_literary_essay_and_ui_packs(self):
        essay = "在这个快节奏的时代，这不仅是一次搬迁，更是一场关于告别的修行。"
        self.assertGreaterEqual(audit_text(essay, "literary-essay")["count"], 2)
        ui_html = '<div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">✨🚀 Supercharge your workflow</div>'
        ui_report = audit_text(ui_html, "deck-and-ui", is_markdown=False)
        ui_rules = {f["ruleId"] for f in ui_report["findings"]}
        self.assertIn("ui-purple-gradient-cliche", ui_rules)
        self.assertIn("ui-hero-buzzword", ui_rules)
        self.assertIn("emoji-confetti", ui_rules)

    def test_docx_and_pptx_ooxml_inspection(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            docx_path = tmp_dir / "sample.docx"
            with zipfile.ZipFile(docx_path, "w") as zf:
                zf.writestr(
                    "word/document.xml",
                    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                    "<w:body><w:p><w:r><w:t>综上所述，我们将构建无缝衔接的闭环生态。</w:t></w:r></w:p></w:body></w:document>",
                )
                zf.writestr("word/media/image1.png", b"fakepng")
            docx_res = audit_path(docx_path)
            self.assertEqual(docx_res["embeddedImages"], 1)
            self.assertGreaterEqual(docx_res["count"], 2)

            pptx_path = tmp_dir / "sample.pptx"
            wall = " ".join(["word"] * 135)
            with zipfile.ZipFile(pptx_path, "w") as zf:
                zf.writestr(
                    "ppt/slides/slide1.xml",
                    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Concise Slide</a:t></p:sld>',
                )
                zf.writestr(
                    "ppt/slides/slide2.xml",
                    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                    f'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>{wall}</a:t></p:sld>',
                )
            pptx_res = audit_pptx(pptx_path)
            self.assertEqual(pptx_res["slides"], 2)
            self.assertEqual(pptx_res["findings"][0]["ruleId"], "pptx-slide-word-wall")
            self.assertEqual(pptx_res["findings"][0]["line"], 2)


if __name__ == "__main__":
    unittest.main()
