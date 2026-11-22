# 版本发布与多平台上线规范

[English](./releasing.md)

日常发新版本只维护一套脚本（`scripts/release.mjs`）和一条 GitHub Actions 流水线（`.github/workflows/release.yml`）。不引入额外发版框架，保持快速迭代上线。

---

## 1. 日常发版两条命令

先在 `[Unreleased]` 下写清 `CHANGELOG.md` 改动并提交业务代码，然后跑这两步：

```bash
# 1. 本地全量预检（校验 10 份清单、开源脱敏、官网构建、双端测试、自查与打包体积）
npm run release:check

# 2. 一键升版本号、重编官网与清单、复跑预检、提交并打 Tag 推送（触发云端全平台自动发布）
npm run release -- 0.6.1 --commit --tag --push
```

如果本机配置了 Git 忽略的 `.private/deploy.local.sh`（用于同步闭源云端内核并发布官网静态产物），在命令末尾加上 `--deploy`，脚本会在本地预检通过后自动完成部署并请求 `https://dislop.com/llms.txt` 与 `/api/health` 核验 `HTTP 200`。

---

## 2. 各个发布平台的规则、限制与更新机制

按平台怎么接收新版本，全部渠道分成三组管理，避免每次发版手工点十几个后台：

### 第一组：打 Git Tag 自动同步（日常 0 额外操作）

| 平台 | 首次入驻动作 | 平台硬规则与踩坑提醒 | 日常怎么更新 |
|---|---|---|---|
| **GitHub Releases & GitHub Marketplace（Action）** | 首次 Release 页面勾选发布至 Marketplace | 根仓须有 `action.yml`，`name` 全局唯一且含 `branding` 字段 | 推送 `v*.*.*` Tag 后，`release.yml` 自动提取 `CHANGELOG.md` 创建 Release 并上传 `.tgz`/`.whl` |
| **`skills.sh`（Vercel 技能榜）** | 无需申请，公开仓有首次 `npx skills add` 即自动入榜 | 读取默认分支 `skills/dislop/SKILL.md`；Frontmatter 须含 `name` 与 `description`，正文宜保持在 `2.5 KB` 内，子参考卡走相对路径 `./references/*.md` | 合并 `main` 即更新 |
| **Gemini CLI 扩展画廊** | 仓库添加 GitHub Topic `gemini-cli-extension`（已配好） | 仓库根目录须有合法 `gemini-extension.json`，且必须打正式 Git Tag / Release 才会被官方每日爬虫抓取 | 推送 `v*.*.*` Tag 后 24 小时内自动收录更新 |
| **Claude 官方插件目录** | 在 `claude.ai/directory/manage` 提交一次 GitHub 仓与一次远程 `https://dislop.com/mcp` | 本地 `.mcpb` 归档已淡出公开目录，统一走 GitHub 仓（`.claude-plugin/plugin.json`）与远程 URL；常驻上下文会被 `claude plugin details` 公开展示（当前约 `130` tokens），切勿往常驻规则塞大词表 | 仓库发布新 Release 后自动同步 |
| **OpenAI ChatGPT / Codex 插件目录** | 在官方目录提交一次仓库审核 | 根目录 `plugin.json` 执行严格封闭顶层字段校验（`agent-plugins.org/1.0.0`，多写未知顶层键直接报错）；`shortDescription` 不得超过 `30` 个字符；`.gitignore` 必须放行 `.agents/plugins/marketplace.json` | 仓库更新后客户端经 `codex plugin marketplace upgrade` 拉取 |
| **`pre-commit` 钩子生态** | 无需提审，外部直接引仓库 URL | 用户在 `.pre-commit-config.yaml` 里锁的是 Git Tag（`rev: vX.Y.Z`），不能删改已发布 Tag | 推送 `v*.*.*` Tag 后，用户跑 `pre-commit autoupdate` 自动升级 |

### 第二组：GitHub Actions OIDC 自动发包（首次绑一次，后续全自动）

| 平台 | 首次一次性配置（免长期密钥） | 平台硬规则与踩坑提醒 | 日常怎么更新 |
|---|---|---|---|
| **npm（`dislop`）** | **注意先后顺序**：npm 不支持给尚未存在的包预先绑 OIDC，**第一次（`v0.6.0`）必须在终端手动执行一次 `npm login && npm publish --access=public`**；包建好后立即去 `npmjs.com` 包设置绑定 GitHub Actions Trusted Publisher（Owner `dislop-ai`、Repo `dislop`、Workflow `release.yml`），随后执行一次 `node scripts/sync_manifests.mjs --channel registry` 将 MCP 默认坐标切至正式包名 | Node 22 需配 `npm >= 11.5.1` 才支持原生 OIDC；启用 OIDC 时严禁注入空的 `NODE_AUTH_TOKEN` 环境变量（会覆盖 OIDC 导致 401，`release.yml` 已做清理）；若同版本已由首次手动命令发布，`publish-npm` 会自动跳过并以退出码 `0` 放行下游 `publish-mcp-registry`；包内须保留 `"mcpName": "io.github.dislop-ai/dislop"` | 推送 `v*.*.*` Tag 后 `publish-npm` 自动签名（Provenance）发布 |
| **PyPI（`dislop`）** | 支持提前登记 Pending Publisher：在 `pypi.org/manage/account/publishing/` 绑定 Owner `dislop-ai`、Repo `dislop`、Workflow `release.yml`、Environment `pypi`，在 GitHub 仓库创建同名 `pypi` Environment，并设置仓库变量 **`PYPI_OIDC_ENABLED=true`**（`gh variable set PYPI_OIDC_ENABLED --body true`，使首次发版在 PyPI 尚返回 `404` 时即可触发 `publish-pypi`；或在完成 npm 首次发布与 PyPI 绑定后执行 `gh workflow run release.yml -f publish_registries=true` 一键补发 PyPI 与 MCP Registry） | `README.md` 末尾必须保留 `<!-- mcp-name: io.github.dislop-ai/dislop -->`（删掉会导致下游 MCP Registry 校验 PyPI 归属失败）；Wheel 包须包含 `packs/`、`patterns/` 与 `models/`；已开启 `skip-existing: true` 支持幂等重跑 | 推送 `v*.*.*` Tag 后 `publish-pypi` 自动构建并发布 |
| **Official MCP Registry（及 Smithery / Glama）** | 首次发布成功后去 Smithery 与 Glama 认领一次页面 | **必须在 npm 和 PyPI 都发布成功后再跑**（`release.yml` 已设 `needs: [publish-npm, publish-pypi]`）；使用 `mcp-publisher login github-oidc` 免密钥登录；`server.json` 的 `description` 硬上限为 **`100` 个字符**，且每次发布版本号必须递增 | 推送 `v*.*.*` Tag 后 `publish-mcp-registry` 自动推送本地与远程双入口 |
| **VS Code Marketplace & Open VSX（二期启用）** | 注册微软 Marketplace Publisher（配 `VSCE_PAT`）与 Eclipse Open VSX 命名空间（配 `OVSX_PAT`） | `vsce` 严禁扩展 `README.md` 引用相对路径 SVG 或非 HTTPS 图片，图标须为 `128x128` PNG；Azure PAT 过期需轮换 | `integrations/vscode/package.json` 落地后，`publish-editor-extensions` 自动生效双发 |

### 第三组：官网 `dislop.com` 与托管云端同步

- **静态产物（`site/`）**：每次跑 `npm run release` 自动重编 `site/` 并更新全部 76 项资源的字节数与 SHA-256。严禁引入外域字体、统计脚本或破坏 `connect-src 'self'`，`llms.txt` 硬上限 `2,600 B`。
- **云端规则同步**：只要 `src/core.mjs` 或 `packs/` 有变更，上线前须同步刷新闭源云端的规则副本并跑通云端单测（可放进本机 Git 忽略的 `.private/deploy.local.sh` 由 `--deploy` 一键串起，服务器主机名、路径与密钥一律不进公开仓）。

---

## 3. `npm run release:check` 自动守住的 11 道检查

脚本按耗时从快到慢串行执行，任何一步报错立刻中止发版：

1. **清单同源校验**（`sync_manifests.mjs --check`）：核对双端内核、`package.json`、`pyproject.toml`、`SKILL.md` 与 10 份插件/MCP 清单版本号完全一致，且符合 100 字 / 30 字 / 封闭字段限制。
2. **开源脱敏与凭据扫描**：扫描全部已跟踪和未忽略文件，拦截真实 API Key、本机用户路径、内部协议链接、私密文件（`.env`、`.private/`、`.dislop.local.json`）以及遗漏 `README.md` `mcp-name` 标记的情况。
3. **官网与工具清单编译**（`build_site.mjs`）：同步浏览器内核、规则表、87 条工具清单与 `/llms.txt`。
4. **官网静态断言**（`test_site.mjs`）：校验全部代码示例 `JSON.parse()`、中英严格零混排、CSS 括号闭合与 WCAG AA 对比度。
5. **Node 与 Python 规则夹具核验**（双端 `pack-test` 160 项断言：83 命中 + 77 干净 + `pattern_lab.mjs verify` 与 `assert`）。
6. **跨运行时一致性单测**（4 个测试模块共 27 项 Python `unittest`，覆盖 `.docx`/`.pptx`、反模式库、轻量集成模型、本地模型向导与 7 工具紧凑 MCP）。
7. **全仓自查去 AI 味**（全仓 `--fail-on warning`，`site/`、`docs/research/`、`skills/` 与 `ROADMAP*` 严格跑 `--fail-on info`）。
8. **真实打包冒烟**：实打 `npm pack`（目标 `< 250 KB`，硬门禁 `<= 300 KB`）、`uv build` 构建 Python Wheel，并调用本机 `claude plugin validate` 校验插件包结构。

---

## 4. 发版异常怎么快速处理

- **CI 某一个发布步骤偶发网络超时**（例如 npm 已发成功，PyPI 或 `mcp-publisher` 网络抖动失败）：直接在 GitHub Actions 页面点 **Re-run failed jobs**，或手动触发 `Release All Platforms` 的 `workflow_dispatch`。
- **刚发出去发现代码有小问题**：因为 npm、PyPI 和官方 MCP Registry 都不允许覆盖同版本号，**不要删线上已发布的 Git Tag**，修好后直接跑 `npm run release -- 0.6.2 --commit --tag --push` 发下一个补丁号即可。
