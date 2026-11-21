# Contributing to `dislop` / 参与贡献

## Adding or Refining a Taste Pack / 新增与打磨审美包

1. **Keep rules concrete and falsifiable / 规则必须具体可证伪**: Every rule added to `packs/<pack-id>/pack.json` must target a verifiable lexical, structural, or visual pattern.
2. **Pair rules with positive & negative fixtures / 正反测试样本成对提供**: Add at least one slop sample that triggers the rule and one high-craft human sample that passes with zero false positives in `tests/test_engine.py`.
3. **Include an editorial exemplar / 附带改稿对照**: Provide a `bad -> good` rewrite pair and a concise `rationale` explaining *why* the revision reads better.

## Privacy & Clean-Room Rules / 隐私与样本合规红线

- **No private or proprietary text**: All test fixtures and exemplars must be original synthetic examples or permissively licensed public materials. Never paste private client documents, internal URLs, credentials, or personal file paths.
- **Zero external runtime bloat**: Core CLI and OOXML/Markdown probes must run cleanly on Python 3.10+ standard library and Node.js 20+ built-in modules unless an optional extra is explicitly isolated.

## Local Verification / 本地验收命令

```bash
# 1. Run Python unit & OOXML tests
python3 tests/test_engine.py

# 2. Dogfood check on repository docs (both Python & Node CLIs)
PYTHONPATH=src python3 -m dislop.cli check .
node ./bin/dislop.mjs check .
```
