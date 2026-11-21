"""Unit tests for the Python dislop engine."""

from __future__ import annotations

import unittest

from dislop.engine import (
    audit_text,
    load_all_packs,
    resolve_effective_pack,
)


class DislopEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.packs = load_all_packs()

    def test_core_artifacts_apply_across_all_packs(self) -> None:
        brief = resolve_effective_pack("business-brief", self.packs)
        ui = resolve_effective_pack("deck-and-ui", self.packs)

        r1 = audit_text("Contact [insert owner] today.", filename="a.md", pack=brief)
        self.assertTrue(any(f["ruleId"] == "unfilled-placeholder" for f in r1["findings"]))

        r2 = audit_text('<a href="#">Download report</a>', filename="b.html", pack=ui)
        self.assertTrue(any(f["ruleId"] == "ui-dead-control" for f in r2["findings"]))

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

    def test_ui_slop_chrome_and_clean_html(self) -> None:
        ui = resolve_effective_pack("deck-and-ui", self.packs)
        bad_html = """
        <div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <span class="badge">AI-Powered</span>
          <a href="#">Download</a>
        </div>
        """
        r_bad = audit_text(bad_html, filename="bad.html", modality="html", pack=ui)
        rule_ids = {f["ruleId"] for f in r_bad["findings"]}
        self.assertIn("ui-ai-gradient", rule_ids)
        self.assertIn("ui-prompt-echo-badge", rule_ids)
        self.assertIn("ui-dead-control", rule_ids)

        good_html = """
        <div class="surface-card">
          <a href="./report.html">Download report</a>
        </div>
        """
        r_good = audit_text(good_html, filename="good.html", modality="html", pack=ui)
        self.assertEqual(r_good["findings"], [])


if __name__ == "__main__":
    unittest.main()
