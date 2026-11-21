# Brand, Visual & UI Design System

[简体中文](./design-system.zh-CN.md)

`dislop` audits interfaces, slides, and prose for template noise. Its own visual identity, documentation banners, and web workbench (`site/`) follow one verifiable system: **an architectural galley proof sheet**. Every rule in this document is enforced on `site/` and `assets/` in CI via `dislop check . --fail-on warning`.

## 1. Visual Direction & Why Two Defaults Were Rejected

Current AI-generated developer pages cluster around two recognizable defaults:

1. **Generator Default #1 (2023–2025)**: Dark slate backgrounds with indigo-to-pink neon gradients, glowing `rounded-full` pill badges, and gradient-clipped headlines.
2. **Generator Default #2 (2025–2026)**: Warm cream backgrounds (`#F7F5F0`), Tailwind `stone-900` (`#1C1917`), and terracotta accents—what models produce immediately after being told "do not use purple gradients."

`dislop` avoids both. Instead, it borrows from two human trades:

- **Print Proofreading (Western Galley Proofs & Chinese GB/T 14706)**: Neutral cotton press paper, high-contrast carbon ink, serif manuscript columns for text under review, and margin notes linked to exact spans.
- **Architectural Software Grids**: Continuous `1px` structural hairlines, crisp `0–4px` radii on content cells, zero drop-shadow fog, and working tools in the first viewport rather than marketing illustrations.

## 2. Brand Mark & Wordmark

- **The Mark (`assets/logo.svg`)**: A single continuous proofreader's delete stroke (*dele* / GB/T 14706 删除号) cutting horizontally across a muted manuscript rule and looping cleanly upward and down-right. Tested at `16×16` (favicon), `64×64` (organization avatar), and `512×512` so the inner counter of the loop stays open at tab-icon scale.
- **Wordmark**: Lowercase `dislop` set in tight geometric sans (`font-weight: 700`, `letter-spacing: -0.025em`) without version pills, sparkles, or nested badge rings.
- **Repository Banners (`assets/banner-light.svg`, `assets/banner-dark.svg`)**: Paired via HTML `<picture>` (`prefers-color-scheme`) so GitHub renders native light and dark galley proofs rather than a bright white rectangle on dark mode.

## 3. Color Tokens & Monotonic Dark Elevation

All foreground/background combinations meet or exceed **WCAG 2.2 AA (`4.5:1` normal text, `3.0:1` large text)**. In dark mode, surface lightness (`L*`) increases strictly from outer stage to raised sheet—never inverting elevation (`inset` code/input wells are the sole recessed exception).

| Token | Role | Light Hex | Contrast on Sheet | Dark Hex | Dark `L*` / Contrast |
|---|---|---|---|---|---|
| `--stage` | Outer margin / viewport ground | `#F6F7F5` | — | `#0E1012` | `L* = 4.6` |
| `--sheet` | Primary galley column / card | `#FFFFFF` | — | `#15181C` | `L* = 8.1` (`> stage`) |
| `--raised` | Active control / hover / header | `#ECEEE9` | — | `#1D2127` | `L* = 12.6` (`> sheet`) |
| `--inset` | Recessed code / raw input well | `#F1F3F0` | — | `#0A0C0E` | `L* = 3.1` (recessed) |
| `--rule` | `1px` architectural hairlines | `#D5D7D2` | Decorative rule | `#2A2F37` | Decorative rule |
| `--ink` | Primary copy & headlines | `#14171A` | `17.8 : 1` | `#ECEEF0` | `15.6 : 1` |
| `--ink-2` | Secondary labels & descriptions | `#474C55` | `8.5 : 1` | `#A6ACB5` | `7.9 : 1` |
| `--ink-3` | Line numbers & coordinates | `#5E646E` | `5.9 : 1` | `#8C939E` | `5.6 : 1` |
| `--mark-error` | Invariant error (`dele` pencil) | `#B42318` | `6.8 : 1` | `#FF7A6B` | `7.0 : 1` |
| `--mark-warn` | Taste query (`query` pencil) | `#1B52B0` | `7.2 : 1` | `#85B4FF` | `8.5 : 1` |
| `--mark-stet` | Protected fact (`stet` lock) | `#1E6B47` | `6.6 : 1` | `#6CD49B` | `9.4 : 1` |

## 4. Two-Pencil + Stet Proofreading Semantics

Color is never the sole indicator of meaning. Every inline mark pairs hue with distinct stroke geometry and a monospace label:

1. **Carmin Red (`--mark-error` + `2px solid` underline + `error`)**: Objective `core` defects—leaked workstation paths, unfilled `[insert ...]` placeholders, chatbot wrappers, broken contrast, or off-slide shapes. Nothing decorative on the page uses red.
2. **Cobalt Blue (`--mark-warn` + `1.5px dashed` underline + `warn` / `info`)**: Contextual genre Taste Pack queries—throat-clearing openers, `"Not X, but Y"` negation pivots, staccato slogan runs, or slide word-walls.
3. **Press Green (`--mark-stet` + `1.5px dotted/dashed` underline + `stet`)**: Numbers, units, qualifiers (`up to 12 minutes`), URLs, code spans, and citations locked by `dislop verify`.

## 5. Typography & Bilingual Typesetting

Zero third-party font CDNs (`fonts.googleapis.com`, `unpkg`, `jsdelivr`) are loaded—preserving instant rendering in both mainland China and overseas networks and upholding the workbench's zero-outbound-request guarantee.

- **Manuscript Text (Specimens & Prose Under Review)**:
  `Georgia, "Source Serif 4", "Noto Serif CJK SC", "Songti SC", "STSong", "Microsoft YaHei", serif`
  - Measure capped at `65ch` (Latin) / `36` characters (Chinese).
  - Line height `1.6` for English, `1.8` for Chinese (`:lang(zh)`).
- **Interface Chrome & Headings**:
  `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- **Coordinates, Rule IDs, CLI Commands & Counts**:
  `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` with `font-variant-numeric: tabular-nums`.

## 6. Layout Grid, Controls & Graphic Discipline

- **Architectural Rails**: Maximum container width `1200px` bounded by continuous `1px solid var(--rule)` vertical rails. Sections divide via full-bleed `1px` horizontal rules rather than floating drop-shadow cards.
- **Galley Split (Desktop, `< 1040px` Tablet, `< 820px` Stacked Mobile)**: In the interactive workbench, the manuscript column sits beside a left specimen rail and a right proofreader margin column; margin notes drop below the manuscript below `1040px`, and the specimen rail collapses into a horizontal strip below `820px`.
- **Corner Radius & Nesting**: Content cells use `0px` radius along shared rails; standalone interactive buttons and inputs use `4px` radius (`--radius-sm: 4px`). Pill radii (`999px`) and 3-level nested bordered boxes (`box-in-box-in-box`) are banned.
- **Zero Dead Controls**: Every `<button>` and `<a>` performs an immediate action or navigates to a live anchor/URL. Motion is limited to `<= 120ms` color/border transitions and respects `prefers-reduced-motion: reduce`.
