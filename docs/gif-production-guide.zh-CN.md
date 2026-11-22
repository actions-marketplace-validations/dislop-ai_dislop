# `dislop` 动画 GIF 制作与托管指引

这份指引用于制作符合 `dislop` 视觉基调的演示 GIF，服务 GitHub README、官方网站、接入手册、教程文章和社交媒体配图。品牌配色、字体与对比度基准见 [design-system.zh-CN.md](./design-system.zh-CN.md)，表达口径见 [brand-and-voice-guide.zh-CN.md](./brand-and-voice-guide.zh-CN.md)，工具选型依据见 [X 平台热门动画库与 GIF 方案调研](./research/x-animation-and-gif-tooling-2026.zh-CN.md)。

---

## 1. 品牌动效原则与禁用清单

`dislop` 的视觉核心是**印刷校样单配朱红手批记号**，动画本身也是在帮读者看清问题和改法，不靠炫技撑场面。

### 颜色与字体直接复用全站令牌

| 类别 | 具体令牌与要求 |
|---|---|
| 浅色纸面画布 | 外框 `--stage` `#F6F7F5`，主校样栏 `--sheet` `#FFFFFF`，`1px` 分界线 `--rule` `#D5D7D2`，主墨字 `--ink` `#14171A`，辅助说明 `--ink-2` `#474C55`，行号 `--ink-3` `#5E646E` |
| 深色终端画布 | 主面板 `#15181C`，内槽 `#0A0C0E`，边线 `#2A2F37`，正文 `#ECEEF0`，次级文字 `#A6ACB5` |
| 语义标线与状态色 | 朱红粗笔画 `--pen` `#F04438`（浅色字 `#B42318` / 深色字 `#FF7A6B`）配 `2px solid` 实线专标 `error` 硬伤；群青 `#1B52B0`（深色 `#85B4FF`）配 `1.5px dashed` 虚线专标 `warning` / `info` 套话提醒；绿色 `#1E6B47`（深色 `#6CD49B`）只用于 `0 findings` 改好通过态 |
| 零外域字体 | HTML 渲染模板使用系统字体栈（无衬线 `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif`，校样衬线 `Georgia, "Noto Serif CJK SC", "Songti SC", serif`，等宽 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`），严禁请求外部字体 CDN |

### 动效里不能出现的东西

| 禁止项 | 为什么不行 | 正确替代写法 |
|---|---|---|
| 紫粉霓虹渐变、弥散发光阴影、玻璃拟态 | 属于第一代生成式 AI 默认模板，违背 `dislop` 自身去模板规范 | 纯色纸面 `#FFFFFF` / `#F6F7F5` 配 `1px solid #D5D7D2` 标尺线 |
| 角落小标、`01 / INTRO` 章节号、macOS 红黄绿三点装饰 | 属于 AI 幻灯片常见页面边角料，挤占正文读数空间 | 顶部只留一条 `1px` 细栏放文件名、规则计数或退出码 |
| 逐字打字机 + 闪烁光标大段敲字 | 拖慢读稿节奏，强迫观众等模型假装打字 | 原文整段 180ms 利落入画，把动画时间留给红蓝标线和改写对比 |
| `scale(0)` 弹跳、夸张弹簧过冲、全程晃动元素 | 显得轻浮，还会导致 GIF 帧差变大、体积飙升 | 位移与透明度只用 `180–280ms` `ease-out`，其余时间画面保持完全静止 |
| 伪造规则 ID、虚构终端输出或编造数字 | 违背实测与诚实边界 | 每次改词先跑真实 `node bin/dislop.mjs check` 核对规则名、行列号与指标 |

---

## 2. 五类对外场景规格表

所有面向中英文两套读者的核心演示图，一律**中英文严格分开出图**（`-zh-v1.gif` 与 `-en-v1.gif`），中文图里不夹英文例句，英文图里不出现汉字。

| 使用场景 | 推荐尺寸（1:1 像素） | 帧率 | 单轮总时长与尾帧停留 | 体积目标（硬上限） | 命名与放置位置 |
|---|---|---|---|---|---|
| **GitHub README / 文档头图** | `960×500` | `15–16 fps` | `6.0–6.8s`（终态停留 `>= 1.8s`） | `<= 300 KB`（上限 `500 KB`） | `assets/demos/<slug>-{zh,en}-v1.gif` |
| **官网 `dislop.com` 演示区** | `960×500` 或 `960×540` | `12–16 fps` | `6.0–6.8s`（首帧即有完整信息） | `<= 350 KB`（上限 `550 KB`） | 由 `build_site.mjs` 同步至 `site/assets/demos/` |
| **CLI 命令行实操图** | `920×460` | `15 fps` | `6.0–6.5s`（`exit 0` 停 `>= 1.8s`） | `<= 250 KB`（上限 `450 KB`） | `assets/demos/cli-check-{zh,en}-v1.gif` |
| **教程 / 博客 / 公众号配图** | `960×500`（正文直插） | `12–16 fps` | `5.0–7.0s`（少切镜，一图只讲一件事） | `<= 400 KB`（公众号友好） | 优先复用上述版本化 URL |
| **X（Twitter）社媒发帖** | `960×540` 或 `1080×600` | `15–20 fps` | `6.0–8.0s` | `<= 1.5 MB`（X 平台上传上限 `15 MB`） | 基于同一 HTML 源按需导出高分版 |

每张嵌入网页的 GIF 必须配套一张同名静态减动效海报帧 `<name>-poster.png`（常规 960×500 海报 `<= 30 KB`，三栏工作台大尺寸截图 `<= 60 KB`），供系统开启 `prefers-reduced-motion: reduce` 的访问者通过 `<picture>` 标签直接显示静止高清帧。

---

## 3. 确定性制作与压制命令

仓库内置零额外 npm 依赖的渲染脚本 [scripts/media/render_gifs.py](../scripts/media/render_gifs.py)，通过本机 Playwright Chromium 按虚拟时钟 `window.__renderAt(t)` 逐帧导出 PNG（或者托管本地 `site/` 实录交互），再交 FFmpeg 与 `gifsicle` 压制。

### 一键重渲染全套成品与质检拼图

```bash
python3 scripts/media/render_gifs.py
```

### FFmpeg 两套压制参数（为什么不能全用默认抖动）

纯白与浅灰纸面如果开启强抖动（例如 Floyd-Steinberg 或默认 `gifski` 时间抖动），会在静止白底上产生细密颗粒噪点，同时让文件膨胀一倍。按画面材质分两套参数：

```bash
# 1) 平面印刷校样 / 命令行输出（纯色底 + 锐利文字：禁用抖动，控在 96 色）
ffmpeg -y -framerate 16 -i frame_%04d.png \
  -vf "palettegen=max_colors=96:stats_mode=diff" palette.png
ffmpeg -y -framerate 16 -i frame_%04d.png -i palette.png \
  -lavfi "[0:v][1:v]paletteuse=dither=none:diff_mode=rectangle" \
  -loop 0 out.raw.gif

# 2) 真机网页工作台长录屏（含阴影与按钮微灰度：128 色 + 轻度有序抖动）
ffmpeg -y -framerate 12 -i frame_%04d.png \
  -vf "palettegen=max_colors=128:stats_mode=diff" palette.png
ffmpeg -y -framerate 12 -i frame_%04d.png -i palette.png \
  -lavfi "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 out.raw.gif

# 3) 帧差无损裁剪与轻度瘦身
gifsicle -O3 --lossy=20 out.raw.gif -o out.gif
```

---

## 4. 发图前必须通过的 6 条硬门禁

每次新增或更新 GIF，先看 `render_gifs.py` 生成的 6 帧 Contact Sheet 拼图再合并，核对下面六项：

| 门禁 | 核对项 | 合格线 |
|---|---|---|
| G0 | 首帧可用与无限循环 | GIF 头部为 `loop=0` 无限循环；第 0 秒首帧不能是全白或空背景，必须已经摆出主标题或待查原稿 |
| G1 | 小屏字号可读性 | 正文行字号至少 `18px–22px`（占画高 `>= 3.8%`），在 GitHub README 手机端与官网半栏卡片缩略后依然不用放大就能看清句子和规则名 |
| G2 | 真实引擎零编造 | 图中展示的规则 ID（如 `chatbot-artifact`、`zh-bureaucratic-padding`、`negation-pivot-frame`）、行列号和退出码必须来自当前版本 `dislop check` 的实际运行结果 |
| G3 | 体积与纸面纯净度 | 白底 `#FFFFFF` 和 `#F6F7F5` 抽帧目检不能有杂色麻点；单张 GIF 体积严格控制在 `550 KB` 以内，配套 `-poster.png` 控制在 `60 KB` 以内 |
| G4 | 无 AI 动效病 | 一帧只讲一个状态，不堆四栏对比；终态留白停稳 `>= 1.8s` 让读者看完结果；无紫粉渐变、无装饰角标 |
| G5 | 中英严格隔离与降级 | 中文页与 `README.zh-CN.md` 只引 `-zh-v1.gif`，英文页、VS Code 市场与 `README.md` 只引 `-en-v1.gif`；网页端全部包裹 `<picture>` 减动效静态回退 |

---

## 5. 图床与托管架构约定

公开物料里的 GIF 同时服务 `dislop.com` 官网、GitHub README 与外部插件市场（如 VS Code Marketplace 要求绝对 HTTPS 图片地址，不支持相对路径与 SVG），按四条规矩管理：

1. **源码入仓，成品按规模分治**。体积控制良好的核心 8 张演示图（`assets/demos/*-v1.gif` 与 `*-poster.png`）随仓库保留以便 CI 校验与本地构建零外网依赖；由于 `package.json` 的 `files` 与 `pyproject.toml` 均只收录 `assets/logo.svg`，演示 GIF 对 npm tarball（`< 250 KB`）和 PyPI Wheel 体积增量为 **0 字节**。
2. **官网同源直出**。构建时 `scripts/build_site.mjs` 将演示图同步至 `site/assets/demos/`，保持 `CSP: img-src 'self' data:` 零放宽，不引入第三方图床追踪或跨域故障。
3. **版本化文件名配长期不可变缓存**。所有上线图片采用 `-v1`、`-v2` 不可变命名，覆盖更新时递增版本号。静态站点服务器对 `/assets/demos/*.gif` 与 `*.png` 下发长期强缓存：
   ```nginx
   location ^~ /assets/demos/ {
       expires 365d;
       add_header Cache-Control "public, max-age=31536000, immutable";
       add_header X-Content-Type-Options "nosniff";
   }
   ```
4. **未来高并发放量平滑迁移路径**。保持所有对外绝对链接固定指向 `https://dislop.com/assets/demos/<name>`；当月下行流量明显放大时，仅需在边缘将 `/assets/demos/` 前置反代或 CNAME 指向独立静态 CDN 桶，无需改动任何已发布的 README、博客、文档或插件市场外链。
