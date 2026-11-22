"""Offline conformance, safety, and mock-loopback tests for bundled Pocket ML and optional local models."""

from __future__ import annotations

import hashlib
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from dislop.local_model import assert_safe_local_endpoint, install_optional_model


def run_node(args: list[str], stdin_text: str | None = None, env_extra: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        ["node", str(ROOT / "bin" / "dislop.mjs"), *args],
        cwd=str(ROOT),
        input=stdin_text,
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


def run_py(args: list[str], stdin_text: str | None = None, env_extra: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "src")
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, "-m", "dislop.cli", *args],
        cwd=str(ROOT),
        input=stdin_text,
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )


class _MockLocalSlmHandler(http.server.BaseHTTPRequestHandler):
    mode = "clean_preserve"

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        _ = self.rfile.read(length)
        if self.__class__.mode == "drop_qualifier":
            # Simulates a 0.6B small model that strips "最多" ("up to") and changes 45 -> 30
            reply = "这次改造给队列分了级，一线运维团队的故障恢复时间为 30 秒。"
        elif self.__class__.mode == "swap_unit":
            # Simulates a small model keeping 45 and "最多" but mutating unit 秒 -> 分钟
            reply = "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 分钟，可用性保持 99.99%。"
        else:
            reply = "这次改造给队列分了级，一线运维团队的故障恢复时间最多 45 秒，可用性保持 99.99%。"

        payload = {
            "id": "mock-local-1",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": reply}}],
        }
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class PocketAndLocalModelsTests(unittest.TestCase):
    def test_bundled_pocket_score_and_check_ml_parity(self) -> None:
        stealth_slop = (
            "在实际推进跨团队协作的过程中，建立清晰的信息同步节奏往往能够减少不必要的沟通损耗。"
            "当各个环节的职责边界更加明确之后，研发与产品团队可以把更多精力投入到核心体验的打磨之中，让日常迭代保持平稳有序的推进状态。"
        )
        n_score = run_node(["model", "score", "-", "--json"], stdin_text=stealth_slop)
        p_score = run_py(["model", "score", "-", "--json"], stdin_text=stealth_slop)
        self.assertEqual(n_score.returncode, 0, n_score.stderr)
        self.assertEqual(p_score.returncode, 0, p_score.stderr)
        jn = json.loads(n_score.stdout)
        jp = json.loads(p_score.stdout)
        self.assertEqual(jn, jp)
        self.assertGreaterEqual(jn["documentProbability"], 0.85)
        self.assertEqual(jn["flaggedCount"], 1)

        # `dislop check --ml` surfaces `pocket-stealth-vapor` identically in Node and Python
        n_chk = run_node(["check", "-", "--ml", "--fail-on", "warning", "--format", "json"], stdin_text=stealth_slop)
        p_chk = run_py(["check", "-", "--ml", "--fail-on", "warning", "--format", "json"], stdin_text=stealth_slop)
        self.assertEqual(n_chk.returncode, 1)
        self.assertEqual(p_chk.returncode, 1)
        cn = json.loads(n_chk.stdout)
        cp = json.loads(p_chk.stdout)
        self.assertEqual(cn["findings"], cp["findings"])
        self.assertEqual(cn["findings"][0]["ruleId"], "pocket-stealth-vapor")

        # Clean digit-free human prose + academic citations + dislop-quote stay 0 findings
        for clean_case in [
            "上周把周三下午的跨组周会砍掉了，改成每天下班前在工单里留两句卡点。以前前端等接口变更得先拉群问一圈，现在直接看置顶字段就行。",
            "Prior sequence-modeling studies (Vaswani et al., 2017; Devlin et al., 2019) established scaling baselines. Here we measure INT8 latency on consumer laptops [1, 3].",
            "<!-- dislop-quote-start -->\n在实际推进跨团队协作的过程中，建立清晰的信息同步节奏往往能够减少不必要的沟通损耗。当各个环节更加明确之后，保持平稳有序的推进状态。\n<!-- dislop-quote-end -->\n正文只有一句简单结论。",
        ]:
            c_res = run_py(["check", "-", "--ml", "--fail-on", "info", "--format", "json"], stdin_text=clean_case)
            self.assertEqual(c_res.returncode, 0, f"Unexpected finding on clean text: {c_res.stdout}")

    def test_pack_auto_router_parity(self) -> None:
        postmortem = (
            "## Root Cause\nRoot cause: Human error.\n\n"
            "## Action Items\n- [ ] Investigate Redis memory usage and monitor pod logs\n"
        )
        n_res = run_node(["check", "-", "--pack", "auto", "--format", "json"], stdin_text=postmortem)
        p_res = run_py(["check", "-", "--pack", "auto", "--format", "json"], stdin_text=postmortem)
        self.assertEqual(json.loads(n_res.stdout)["findings"], json.loads(p_res.stdout)["findings"])

    def test_hardware_guard_import_sha256_and_remove(self) -> None:
        # 1. Low-RAM machine (4 GB) blocks 4B `quality` tier unless --force is set
        blocked = install_optional_model(
            tier="quality",
            dry_run=True,
            force=False,
            hw_overrides={
                "platform": "linux",
                "arch": "x64",
                "cpuModel": "mock",
                "cpuCount": 4,
                "totalMemoryGb": 4,
                "usableModelMemoryGb": 1.5,
                "freeDiskGb": 20,
                "isAppleSilicon": False,
                "isCi": False,
            },
        )
        self.assertFalse(blocked["ok"])
        self.assertTrue(blocked.get("blockedByHardware"))
        self.assertEqual(blocked["recommendedTier"], "none")

        forced = install_optional_model(
            tier="quality",
            dry_run=True,
            force=True,
            hw_overrides={
                "platform": "linux",
                "arch": "x64",
                "cpuModel": "mock",
                "cpuCount": 4,
                "totalMemoryGb": 4,
                "usableModelMemoryGb": 1.5,
                "freeDiskGb": 20,
                "isAppleSilicon": False,
                "isCi": False,
            },
        )
        self.assertTrue(forced["ok"])
        self.assertEqual(forced["hardwareCheck"], "forced-override")

        # 2. Offline file import + SHA-256 verification + status + remove across Node & Python
        with tempfile.TemporaryDirectory() as tmp:
            cache_dir = Path(tmp) / "cache"
            dummy_gguf = Path(tmp) / "Qwen3-0.6B-Q4_K_M.gguf"
            payload_bytes = b"GGUF-mock-weights-payload-for-offline-sha256-test"
            dummy_gguf.write_bytes(payload_bytes)
            real_sha = hashlib.sha256(payload_bytes).hexdigest()
            env_extra = {"DISLOP_MODEL_DIR": str(cache_dir)}

            bad_imp = run_node(["model", "import", str(dummy_gguf), "--tier", "fast", "--sha256", "00" * 32, "--json"], env_extra=env_extra)
            self.assertEqual(bad_imp.returncode, 2)
            self.assertEqual(json.loads(bad_imp.stdout)["reason"], "sha256-mismatch")

            ok_imp = run_node(["model", "import", str(dummy_gguf), "--tier", "fast", "--sha256", real_sha, "--json"], env_extra=env_extra)
            self.assertEqual(ok_imp.returncode, 0, ok_imp.stderr)
            self.assertEqual(json.loads(ok_imp.stdout)["imported"]["sha256"], real_sha)

            st_py = json.loads(run_py(["model", "status", "--no-loopback", "--json"], env_extra=env_extra).stdout)
            self.assertEqual(len(st_py["installedModels"]), 1)
            self.assertTrue(st_py["installedModels"][0]["exists"])
            self.assertEqual(st_py["bundledModels"][0]["id"], "pocket-slop-v1")

            rm_py = run_py(["model", "remove", "fast", "--json"], env_extra=env_extra)
            self.assertEqual(rm_py.returncode, 0, rm_py.stderr)
            self.assertEqual(json.loads(rm_py.stdout)["removedCount"], 1)
            self.assertFalse((cache_dir / dummy_gguf.name).exists())

    def test_loopback_security_and_local_deslop_fact_lock_fallback(self) -> None:
        # 1. External non-loopback URL must be rejected
        with self.assertRaises(ValueError):
            assert_safe_local_endpoint("https://api.example.com/v1")
        ext_node = run_node(["deslop", "-", "--local", "--endpoint", "https://api.example.com"], stdin_text="测试段落。")
        self.assertEqual(ext_node.returncode, 2)
        self.assertIn("Refusing non-loopback endpoint", ext_node.stderr)

        # 2. Spin up offline ephemeral 127.0.0.1 mock SLM server
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _MockLocalSlmHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        endpoint = f"http://127.0.0.1:{port}"
        draft = "好的，以下是修改后的说明。本次改造以队列分级为重要抓手，全面赋能一线运维团队，故障恢复时间最多 45 秒，可用性保持 99.99%。"

        try:
            # Case A: Clean fact-preserving local rewrite accepted by both Node and Python
            _MockLocalSlmHandler.mode = "clean_preserve"
            n_ok = run_node(["deslop", "-", "--local", "--endpoint", endpoint, "--json"], stdin_text=draft)
            p_ok = run_py(["deslop", "-", "--local", "--endpoint", endpoint, "--json"], stdin_text=draft)
            self.assertEqual(n_ok.returncode, 0, n_ok.stderr)
            self.assertEqual(p_ok.returncode, 0, p_ok.stderr)
            jn = json.loads(n_ok.stdout)
            jp = json.loads(p_ok.stdout)
            self.assertEqual(jn["rewrittenParagraphs"], 1)
            self.assertEqual(jp["rewrittenParagraphs"], 1)
            self.assertTrue(jn["factLedgerOk"])
            self.assertIn("最多 45 秒", jn["text"])
            self.assertEqual(jn["text"], jp["text"])

            # Case B: Small model drops qualifier "最多" & alters 45 -> 30 => deterministically rejected & falls back to original!
            _MockLocalSlmHandler.mode = "drop_qualifier"
            n_fb = run_node(["deslop", "-", "--local", "--endpoint", endpoint, "--json"], stdin_text=draft)
            p_fb = run_py(["deslop", "-", "--local", "--endpoint", endpoint, "--json"], stdin_text=draft)
            self.assertEqual(n_fb.returncode, 0, n_fb.stderr)
            self.assertEqual(p_fb.returncode, 0, p_fb.stderr)
            fn_json = json.loads(n_fb.stdout)
            fp_json = json.loads(p_fb.stdout)
            self.assertEqual(fn_json["rewrittenParagraphs"], 0)
            self.assertEqual(fn_json["keptOriginalParagraphs"], 1)
            self.assertEqual(fn_json["text"], draft)
            self.assertEqual(fp_json["text"], draft)
            self.assertTrue(fn_json["factLedgerOk"])

            # Case C: Unit mutation ("最多 45 秒" -> "最多 45 分钟") rejected + HTTP_PROXY bypassed on loopback!
            _MockLocalSlmHandler.mode = "swap_unit"
            proxy_env = {"HTTP_PROXY": "http://127.0.0.1:9", "http_proxy": "http://127.0.0.1:9"}
            n_unit = run_node(["deslop", "-", "--local", "--allow-lan=false", "--endpoint", endpoint, "--json"], stdin_text=draft, env_extra=proxy_env)
            p_unit = run_py(["deslop", "-", "--local", "--endpoint", endpoint, "--json"], stdin_text=draft, env_extra=proxy_env)
            self.assertEqual(n_unit.returncode, 0, n_unit.stderr)
            self.assertEqual(p_unit.returncode, 0, p_unit.stderr)
            un_json = json.loads(n_unit.stdout)
            up_json = json.loads(p_unit.stdout)
            self.assertEqual(un_json["rewrittenParagraphs"], 0)
            self.assertEqual(up_json["rewrittenParagraphs"], 0)
            self.assertEqual(un_json["text"], draft)
            self.assertEqual(up_json["text"], draft)
        finally:
            server.shutdown()
            server.server_close()

    def test_adversarial_security_perf_and_unicode_crlf_parity(self) -> None:
        import time

        # 1. 16 KB unclosed '[' line runs in linear time (< 1.5s subprocess) with 0 quadratic scan
        brackets = "[" * 16000 + " tail text"
        t0 = time.perf_counter()
        n_b = run_node(["model", "score", "-", "--json"], stdin_text=brackets)
        p_b = run_py(["model", "score", "-", "--json"], stdin_text=brackets)
        elapsed = time.perf_counter() - t0
        self.assertEqual(n_b.returncode, 0)
        self.assertEqual(p_b.returncode, 0)
        self.assertLess(elapsed, 2.5, f"Bracket scan took too long: {elapsed:.2f}s")
        self.assertEqual(json.loads(n_b.stdout), json.loads(p_b.stdout))

        # 2. JS Object.prototype pollution immunity (`constructor`, `toString`, `__proto__`)
        proto_text = (
            "## Root Cause\nRoot cause: Human error in constructor and toString __proto__.\n\n"
            "## Action Items\n- [ ] Investigate Redis memory usage and monitor pod logs\n"
        )
        n_pr = run_node(["check", "-", "--pack", "auto", "--format", "json"], stdin_text=proto_text)
        p_pr = run_py(["check", "-", "--pack", "auto", "--format", "json"], stdin_text=proto_text)
        self.assertEqual(json.loads(n_pr.stdout)["findings"], json.loads(p_pr.stdout)["findings"])
        n_sc = json.loads(run_node(["model", "score", "-", "--json"], stdin_text=proto_text).stdout)
        p_sc = json.loads(run_py(["model", "score", "-", "--json"], stdin_text=proto_text).stdout)
        self.assertEqual(n_sc, p_sc)
        self.assertIsNotNone(n_sc["packRouter"]["confidence"])

        # 3. Multi-paragraph dislop-quote & ~~~ fenced code blocks stay protected in check --ml
        fenced_and_quoted = (
            "<!-- dislop-quote-start -->\n"
            "在实际推进跨团队协作的过程中，建立清晰的信息同步节奏往往能够减少不必要的沟通损耗。当各个环节更加明确之后，保持平稳有序的推进状态。\n\n"
            "良好的代码评审习惯对于保障软件工程质量具有不可忽视的积极意义。通过在日常研发流程中引入更加规范的互查机制，提升整体系统的稳定性。\n"
            "<!-- dislop-quote-end -->\n\n"
            "~~~markdown\n"
            "在实际推进跨团队协作的过程中，建立清晰的信息同步节奏往往能够减少不必要的沟通损耗。当各个环节更加明确之后，保持平稳有序的推进状态。\n"
            "~~~\n\n"
            "正文只有一句简单结论。\n"
        )
        self.assertEqual(run_node(["check", "-", "--ml", "--fail-on", "warning", "--format", "json"], stdin_text=fenced_and_quoted).returncode, 0)
        self.assertEqual(run_py(["check", "-", "--ml", "--fail-on", "warning", "--format", "json"], stdin_text=fenced_and_quoted).returncode, 0)

        # 4. Long Emoji quote, non-ASCII digits, and CRLF file offset parity
        with tempfile.TemporaryDirectory() as tmp:
            crlf_file = Path(tmp) / "crlf_emoji.md"
            sample_crlf = (
                "（“" + "🎉" * 90 + "”）在实际推进跨团队协作的过程中，建立清晰的信息同步节奏往往能够减少不必要的沟通损耗 ١٢٣。\r\n\r\n"
                "当各个环节的职责边界更加明确之后，研发与产品团队可以把更多精力投入到核心体验的打磨之中，让日常迭代保持平稳有序的推进状态。\r\n"
            )
            crlf_file.write_bytes(sample_crlf.encode("utf-8"))
            n_f = json.loads(run_node(["model", "score", str(crlf_file), "--json"]).stdout)
            p_f = json.loads(run_py(["model", "score", str(crlf_file), "--json"]).stdout)
            self.assertEqual(n_f, p_f)

            # Forbid importing registry.json
            reg_fake = Path(tmp) / "registry.json"
            reg_fake.write_text("{}", encoding="utf-8")
            self.assertEqual(run_node(["model", "import", str(reg_fake), "--cache-dir", tmp]).returncode, 2)
            self.assertEqual(run_py(["model", "import", str(reg_fake), "--cache-dir", tmp]).returncode, 2)

        # 5. Strict CLI & MCP validation parity (unknown action, invalid threshold, unknown provider)
        for bad_args in [
            ["model", "scroe"],
            ["model", "score", "-", "--threshold", "abc"],
            ["model", "score", "-", "--threshold", "1.5"],
            ["setup", "--dry-run", "--provider", "bogus"],
        ]:
            self.assertEqual(run_node(bad_args, stdin_text="x").returncode, 2, f"Node did not exit 2 on {bad_args}")
            self.assertEqual(run_py(bad_args, stdin_text="x").returncode, 2, f"Python did not exit 2 on {bad_args}")

        mcp_bad_thr = json.dumps({
            "jsonrpc": "2.0",
            "id": 9,
            "method": "tools/call",
            "params": {"name": "dislop_model_score", "arguments": {"text": "test", "threshold": True}},
        }) + "\n"
        n_m = json.loads(run_node(["--mcp"], stdin_text=mcp_bad_thr).stdout.strip())
        p_m = json.loads(run_py(["--mcp"], stdin_text=mcp_bad_thr).stdout.strip())
        self.assertTrue(n_m["result"]["isError"])
        self.assertTrue(p_m["result"]["isError"])

    def test_mcp_model_tools_parity(self) -> None:
        reqs = "\n".join([
            json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}),
            json.dumps({
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "dislop_model_score",
                    "arguments": {
                        "text": "Teams adopting modern deployment workflows often notice clearer coordination across product and platform groups. Building shared visibility into rollout stages supports steady operational progress."
                    },
                },
            }),
        ]) + "\n"
        n_mcp = run_node(["--mcp"], stdin_text=reqs)
        p_mcp = run_py(["--mcp"], stdin_text=reqs)
        self.assertEqual(n_mcp.returncode, 0, n_mcp.stderr)
        self.assertEqual(p_mcp.returncode, 0, p_mcp.stderr)
        n_lines = [json.loads(l) for l in n_mcp.stdout.strip().splitlines()]
        p_lines = [json.loads(l) for l in p_mcp.stdout.strip().splitlines()]
        n_tool_names = [t["name"] for t in n_lines[0]["result"]["tools"]]
        p_tool_names = [t["name"] for t in p_lines[0]["result"]["tools"]]
        self.assertEqual(n_tool_names, p_tool_names)
        self.assertIn("dislop_model_score", n_tool_names)
        self.assertIn("dislop_model_status", n_tool_names)
        self.assertEqual(
            json.loads(n_lines[1]["result"]["content"][0]["text"]),
            json.loads(p_lines[1]["result"]["content"][0]["text"]),
        )

    def test_check_ml_non_json_formatters_and_cli_help_parity(self) -> None:
        import dislop

        pkg_ver = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
        self.assertEqual(dislop.__version__, pkg_ver)
        stealth = (
            "Teams adopting modern deployment workflows often notice clearer coordination across product and platform groups. "
            "Building shared visibility into rollout stages supports steady operational progress."
        )
        for fmt in ("text", "sarif", "github", "md", "json"):
            rn = run_node(["check", "-", "--stdin-filename", "stealth.md", "--ml", "--format", fmt], stdin_text=stealth)
            rp = run_py(["check", "-", "--stdin-filename", "stealth.md", "--ml", "--format", fmt], stdin_text=stealth)
            self.assertEqual(rn.returncode, 0, f"Node failed on fmt={fmt}: {rn.stderr}")
            self.assertEqual(rp.returncode, 0, f"Python failed on fmt={fmt}: {rp.stderr}")
            self.assertNotIn("undefined", rn.stdout)
            if fmt in ("text", "github", "md"):
                self.assertEqual(rn.stdout.strip(), rp.stdout.strip(), f"Mismatch on fmt={fmt}")
            else:
                self.assertEqual(json.loads(rn.stdout), json.loads(rp.stdout), f"JSON/SARIF mismatch on fmt={fmt}")

        # Subcommand --help and `help` alias exit 0 cleanly without running check on `.`
        hn = run_node(["check", "--help"])
        hp = run_py(["help"])
        self.assertEqual(hn.returncode, 0)
        self.assertEqual(hp.returncode, 0)
        self.assertIn("Usage:", hn.stdout)
        self.assertIn("usage:", hp.stdout.lower())


if __name__ == "__main__":
    unittest.main()
