"""Unit tests for the Python dislop v0.2.0 engine and verifier."""

from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path

from dislop.engine import (
    audit_pdf_bytes,
    audit_text,
    inspect_file,
    load_all_packs,
    resolve_effective_pack,
    verify_revision,
)


class DislopEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.packs = load_all_packs()

    def test_core_invariants_apply_across_all_packs(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        ui = resolve_effective_pack("deck-and-ui", self.packs)

        r1 = audit_text("Contact [insert owner] today.", filename="a.md", pack=brief)
        self.assertTrue(any(f["ruleId"] == "unfilled-placeholder" for f in r1["findings"]))

        r2 = audit_text('<a href="file:///Users/alice/spec.pdf">Spec</a>', filename="b.html", pack=ui)
        self.assertTrue(any(f["ruleId"] == "local-path-leak" for f in r2["findings"]))

    def test_second_order_slop_caught_and_false_positives_spared(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        hit = audit_text(
            "Signals drop. Photos vanish. Trust dies.\n这不是工具，而是底气。\n系统实现了精准高效、安全可靠、灵活易用的目标。",
            filename="slop.md",
            pack=brief,
        )
        rule_ids = {f["ruleId"] for f in hit["findings"]}
        self.assertIn("staccato-slogan-run", rule_ids)
        self.assertIn("negation-pivot-frame", rule_ids)
        self.assertIn("zh-four-char-triad", rule_ids)

        clean = audit_text(
            "The museum lent a 16th-century wool tapestry.\n"
            "Run the Delve debugger to inspect stacks.\n"
            "默认超时不是 30 秒，而是 300 秒；测试员抓手机拍照。\n"
            "试点覆盖北京大学、清华大学、复旦大学。\n"
            "他推开木门——屋里炉火未灭。🚀",
            filename="clean.md",
            pack=brief,
        )
        self.assertEqual(clean["findings"], [])

    def test_masking_and_inline_suppression(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        doc = (
            "<!-- It is worth noting that comments are invisible -->\n"
            "```md\n"
            "It is worth noting that fenced code is exempt.\n"
            "```\n"
            "<!-- dislop-ignore-next-line en-throat-clearing-opener -- deliberate quote -->\n"
            "It is worth noting that backups run every 6 hours.\n"
            "<!-- dislop-ignore-next-line zh-bureaucratic-padding -- unused directive -->\n"
            "Plain clean sentence.\n"
        )
        res = audit_text(doc, filename="masked.md", pack=brief)
        self.assertEqual(res["findings"], [])
        self.assertEqual(len(res["unusedSuppressions"]), 1)
        self.assertEqual(res["unusedSuppressions"][0]["line"], 7)

    def test_ui_contrast_dark_inversion_and_controls(self) -> None:
        ui = resolve_effective_pack("deck-and-ui", self.packs)
        bad_css = """
        .low { color: #999999; background: #ffffff; font-size: 13px; }
        [data-theme="dark"] { --bg: #2a2a2a; --card: #121212; }
        """
        r_css = audit_text(bad_css, filename="bad.css", modality="css", pack=ui)
        self.assertGreaterEqual(len(r_css["findings"]), 2)

        good_css = """
        [data-theme="dark"] { --bg: #0E1012; --card: #15181C; --inset: #090A0C; }
        """
        r_good = audit_text(good_css, filename="good.css", modality="css", pack=ui)
        self.assertEqual(r_good["findings"], [])

    def test_verify_revision_guards_qualifiers_and_displacement(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        before = "It is worth noting that CSV exports take up to 12 minutes above 500,000 rows."
        good_after = "CSV exports take up to 12 minutes above 500,000 rows."
        dropped_qualifier = "CSV exports take 12 minutes above 500,000 rows."
        displaced_after = "This isn't a slow export — it's precision taking up to 12 minutes above 500,000 rows."

        ok_res = verify_revision(before, good_after, pack=brief)
        self.assertTrue(ok_res["ok"])

        drop_res = verify_revision(before, dropped_qualifier, pack=brief)
        self.assertFalse(drop_res["ok"])
        self.assertTrue(any("up to 12 minutes" in r for r in drop_res["reasons"]))

        disp_res = verify_revision(before, displaced_after, pack=brief)
        self.assertFalse(disp_res["ok"])
        self.assertTrue(any("displacement" in r.lower() for r in disp_res["reasons"]))

    def test_pdf_hygiene_and_encryption_skip(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        raw_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Title (Microsoft Word - draft.docx) >> endobj\n"
            b"2 0 obj << /Subtype /Link /A << /S /URI /URI (file:///Users/bob/secret.pdf) >> >> endobj\n"
            b"3 0 obj << /Type /FontDescriptor /FontName /SimSun >> endobj\n"
        )
        res = audit_pdf_bytes(raw_pdf, filename="sample.pdf", pack=brief)
        rule_ids = {f["ruleId"] for f in res["findings"]}
        self.assertIn("local-path-leak", rule_ids)
        self.assertIn("office-pdf-hygiene", rule_ids)

        enc_pdf = b"%PDF-1.7\n1 0 obj << /Encrypt 2 0 R >> endobj\n"
        enc_res = audit_pdf_bytes(enc_pdf, filename="enc.pdf", pack=brief)
        self.assertEqual(enc_res["findings"], [])
        self.assertTrue(any("Encrypted PDF" in s["reason"] for s in enc_res["skipped"]))


if __name__ == "__main__":
    unittest.main()
