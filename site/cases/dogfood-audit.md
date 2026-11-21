---
content-type: reference-data
version: 0.3.0
---

# Repository Self-Dogfooding Audit

Every Markdown document, SVG brand asset, and HTML/CSS file in `dislop` runs through `dislop check . --fail-on warning` in CI, and `site/` plus `docs/research/` pass `--fail-on info` across both Node.js and Python runtimes.

## English Contrast

```text
bad:  Certainly! In today's fast-paced AI landscape, dislop isn't just a linter — it's a game-changer for quality. Signals drop. Bugs ship. Trust dies. Studies show 80% of teams struggle with slop.
good: dislop de-slops Markdown, HTML/CSS/JSX/SVG, DOCX, PPTX, and PDF outputs across any model or dev environment. It flags stock phrasing, leaked paths, unfilled placeholders, and overloaded slides deterministically, then verifies edits kept numbers, links, and citations intact.
```

## Chinese Contrast

```text
bad:  好的，以下是为您撰写的介绍：值得注意的是，dislop 不仅仅是一款检查工具，更是高质量交付的底气。它以确定性规则为重要抓手，全面赋能内容团队实现精准高效、安全可靠、灵活易用的审校闭环。
good: dislop 覆盖写作、Markdown、HTML/CSS/JSX/SVG、DOCX、PPTX 与 PDF，适配任意模型与开发环境；确定性标出高频套话、本机路径泄露、未填占位符与超载幻灯片，改后复检确认数字、单位、链接与引用原样保留。
```
