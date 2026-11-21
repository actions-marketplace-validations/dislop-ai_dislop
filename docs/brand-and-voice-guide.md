# Brand Identity, Voice & Design Style Guide

[简体中文](./brand-and-voice-guide.zh-CN.md)

> In one line: **the sheet is set by machine; the marks are made by hand.**
>
> `dislop` uses deterministic code for the grid, coordinates, contrast, and revision checks, then brings a steady human hand to loop out the fluff and keep what belongs on the page.

---

## 1. Why an Anti-Slop Tool Needs Its Own Voice

Removing clichés is only the floor. If a tool built to de-slop AI outputs speaks like a sterile compliance terminal, readers may trust the parser yet never remember the brand—nor see what distinct, human writing looks like.

Swinging to the opposite extreme—emojis, exclamation marks, or mascot jokes—breaks the engineering trust required to wire a linter into CI.

The balance is already drawn inside [assets/logo.svg](../assets/logo.svg).

### Reading the Character Directly Off the Logo

| Detail in `assets/logo.svg` | Brand & Design License |
|---|---|
| Rounded carbon tile (`#14171A`, `12/64` corner radius) | **Grounded engineering base**: numbers, line coordinates, exit codes, and `[SKIP]` honesty stay flat and literal. |
| Muted gray manuscript line visible beneath the red stroke | **Start with the author's words**: quote the span before speaking; never erase the writer or rewrite behind their back. |
| One generous vermilion loop (`#F04438`) | **One flourish per surface**: light wit is welcome only in neutral or resolved states, at most once per screen. |
| Round stroke caps (`stroke-linecap="round"`, `6/64` weight) | **Gentle, never vague**: confident strokes with no sharp barbs; describe the span, never scold the author. |
| Clean bottom-right flick leaving the rest of the line untouched | **Know when to lift the pen**: give the next concrete step and leave the rest of the draft alone. |

### Archetype: The Desk Editor Sitting Beside You

Step one desk over from a mechanical proofreader. `dislop` speaks like a calm, sharp **desk / copy editor** who pencils a clear note in the margin and hands the draft back:

- **Red pencil (`dele`, `error`)**: strikes objective defects that fail for any reader (leaked local paths, unfilled placeholders, dead links) and gives a direct fix.
- **Blue pencil (`query`, `warning` / `info`)**: asks one concrete question in the margin and leaves the judgment call to the author.
- **Green dots (`stet`)**: marks what the author got right—numbers, qualifiers, units, dates, links, code spans, citations—and checks the edit against the original.
- **No house-style flattening**: helps each writer keep their own register rather than rewriting everyone into one voice.

### Four Tension Boundaries

| Tension | Holds while | Breaks when |
|---|---|---|
| **Playful, never childish** | Wit comes from the trade itself (at most one dry beat per screen or release note, only in neutral or clean states) | Emojis, `!`, mascot faces, memes, jokes aimed at the writer or model, or any wink inside an error or rejection |
| **Gentle, never vague** | Softens posture toward the person: critiques the text span, asks questions on taste, accepts reasoned overrides | Softens facts: "might", "perhaps", apologies on errors, or empty praise such as `Great job!` |
| **Grounded, never stiff** | Every claim carries one concrete span, number, or command; boundaries are stated plainly | Repeating the same counts three times above the fold, or pushing spec jargon (`multiset`, `invariant`, `L0`) onto UI buttons |
| **Opinionated, never preachy** | Shows `bad -> trap -> good` contrasts and acknowledges more than one valid rewrite | Contempt for "slop" or moralizing manifesto endings |

> **Wit takes the Deletion Test too**: cut the wink, and the sentence must still carry a concrete fact. Example (workbench privacy note): `Your draft stays in this tab. The page's CSP sets connect-src 'none', so it couldn't phone home if it tried.`

---

## 2. Verbal Style Guide (Native EN & ZH Parity)

One rule anchors every surface: **two pencils, two registers**. Red states a fact and a fix; blue asks one question; green echoes the author's protected span verbatim.

Write English and Chinese independently from meaning rather than translating word for word. On a clean sheet, English says `Pass for press.` while Chinese says `可以付印。`—each using its own pressroom idiom.

### Voice Across Five Surfaces (Before → Brand Baseline)

| Surface | Before | Brand Baseline (EN) | Brand Baseline (ZH) |
|---|---|---|---|
| **Homepage hero** | 37-word H1 stacking format lists | **H1**: `De-slop AI outputs.`<br>**Sub**: `Paste a draft, a deck, or a page. dislop strikes what can't ship, asks about what sounds canned, and checks that your edit kept numbers, links, and citations.` | **H1**: `全面去 AI 味。`<br>**副句**：`把稿子、PPT 或页面贴进来。不能发的硬伤，dislop 直接划掉；听着像套话的地方，它问你一句；改完再替你和原稿对一遍，数字、链接和引用一个不少。` |
| **Workbench controls & privacy** | `Load Clean Revision`, `Try 2nd-Order Trap`, `100% in browser memory` | `Show a clean edit` · `Try an overcorrection` · `Your draft stays in this tab. The page's CSP sets connect-src 'none', so it couldn't phone home if it tried.` | `看一版改好的` · `试一版改过头的` · `稿子只留在这个标签页里。页面的 CSP 把 connect-src 设成了 'none'，想往外发也发不出去。` |
| **Clean & empty states** | `✓ Clean proof sheet (0 findings).` | `Pass for press. 0 findings; protected spans stayed as written.`<br>Empty: `Nothing on the sheet yet. Paste a draft, or pick a specimen on the left.` | `可以付印。0 处标记，原稿里的受保护事实完好保留。`<br>空稿：`校样单还是空的。贴一段稿子进来，或者从左边挑一份标本。` |
| **README & docs** | Multi-list inventory opening; Title Case heading `Why Two Tiers Exist` | `dislop checks the things models write for you... It never rewrites your text. The edit is yours.`<br>Heading: `Red pencil, blue pencil` | `dislop 是给模型代笔的东西做体检的工具……它不替你改稿。笔在你手里，它只管看。`<br>标题：`红笔和蓝笔` |
| **Release notes & sharing** | File-path changelog bullets | Three beats: what dislop catches now, how to run it, and what it still skips (the honesty line is never cut). | 同左，口语自然、保留诚实边界，附 `dislop.com` 入口。 |

### Honesty & Diction Rules

- **Retire "verify every fact"**: `dislop verify` compares recognized numbers with qualifiers, units, dates, links, code spans, and citation markers against the original text; it does not judge external world truth. Promise **comparing your edit against the original** and name those exact protected spans.
- **Separate clean from skipped or empty**: blank input, encrypted PDFs, and skipped compressed streams each get explicit wording.
- **Cut house filler**: avoid repeating `zero` / `零` as an intensifier across the same screen; use real plurals instead of `finding(s)`; keep English out of Chinese UI prose except for literal identifiers.

---

## 3. Visual, Graphic & UI Style Grammar

Full color contrast tables live in [design-system.md](./design-system.md). This section defines the **two-layer visual grammar** bridging the logo and the interface:

### 3.1 Two Layers: Machine-Set Sheet + Hand-Made Marks

1. **Base layer (Machine-set galley)**: continuous `1px` architectural rails, square (`0px`) joined cells, cool cotton paper (`#F6F7F5` / `#FFFFFF`), monotonic dark elevation (`#0E1012 → #15181C → #1D2127`), zero external font CDNs, and `CSP: connect-src 'none'`. Reject both Generator Default #1 (purple-pink neon + pill soup) and Generator Default #2 (warm cream `#F7F5F0` + terracotta; guard: no surface token between hue `20°–70°` with saturation `> 8%`).
2. **Mark layer (Hand-made pen)**: round-capped strokes and lively curves borrowed from the logo—attached strictly to real findings, locked facts, or editorial specimens, never used as empty decoration.

### 3.2 One Vermilion at Three Pressures

All red tokens share HSL hue `4°–6°`, separated by stroke weight and theme contrast:

- **`--pen` (`#F04438`, `L* = 55.0`)**: drawn strokes `>= 2.5px` and the master logo loop in **both** light and dark themes (`3.76:1` on white, `4.74:1` on dark sheet, `4.79:1` on carbon tile). Never used for small body text on light backgrounds.
- **`--mark-error` light (`#B42318`, `6.6:1` on white)**: body text and thin underlines in light theme.
- **`--mark-error` dark (`#FF7A6B`, `7.0:1` on `#15181C`)**: body text and thin underlines in dark theme.
- **Dark-mode tile border**: frame the logo tile with `1px solid var(--rule-strong)` in dark mode so `#14171A` stays distinct from `#15181C`.

### 3.3 Three Distinct Proofing Marks (Color-Independent Geometry)

| Mark | Meaning | Stroke Geometry | Token |
|---|---|---|---|
| **Dele (`error`)** | Objective defect (`packs/core`) | `2px` solid underline (round-capped dele loop on graphic specimens) | `--mark-error` / `--pen` |
| **Query (`warning` / `info`)** | Contextual taste question | `1.5px` dashed underline | `--mark-warn` |
| **Stet (`protected span`)** | Fact span locked for `verify` | `2px` **dotted** underline (distinct from dashed query in monochrome) | `--mark-stet` |

### 3.4 Shape, Typography & Motion

- **Three-tier radii**: `0px` on cells joined to a rail; `--radius-ctrl: 6px` (`5px` compact) on pressable buttons echoing the logo tile's `12/64` warmth; `--radius-input: 4px` on recessed inputs and code wells; zero `999px` pill soup.
- **Type discipline**: reserve `--font-mono` for code, coordinates, rule IDs, and counts. Use system sans/serif for prose notes, legends, and controls so the UI feels like a stationery tool rather than a raw terminal. Set `letter-spacing: 0` on Chinese headings (`html[lang^="zh"]`).
- **Restrained motion**: `<= 120ms` for standard UI transitions; reserve one optional `240–300ms` ease-out pen-stroke transition for resolve/verify feedback, always disabled under `prefers-reduced-motion: reduce`.

---

## 4. Contributor & Agent Self-Check (8 Yes/No Questions)

Before shipping any public doc, UI string, release post, or brand graphic for `dislop`:

1. Does the first sentence point to a concrete thing—a text span, a file, a number, or a command?
2. Are numbers, severity names, and exit codes stated flat and quoted as written, without stacking proof counts above the fold?
3. Does an objective defect get a direct remedy while a taste finding leaves the decision to the author?
4. Is there at most one playful beat per surface, and none inside an error or rejection?
5. If you cut the playful beat, does the sentence still carry a concrete fact?
6. Was each language written natively from meaning, without untranslated English status words inside Chinese prose?
7. Is the sheet square and ruled, with round-capped marks attached only to real findings/facts, vermilion reserved for `dele`, and dots reserved for `stet`?
8. Does `dislop check <file> --fail-on info` pass with 0 findings in both Node and Python, with zero `!`, emojis, or `(s)` plurals?

The machine-readable draft voice config lives at [docs/brand/voice.json](./brand/voice.json) (`dislop.voice/1`).
