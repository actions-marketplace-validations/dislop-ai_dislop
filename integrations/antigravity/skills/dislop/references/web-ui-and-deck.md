# Web UI, Front-End Components & Executive Slide Decks

Local progressive-disclosure reference bundled with `skills/dislop/` (0 network calls required).

## Recommended Built-in Packs

- Web pages, CSS, JSX/TSX components, and general slides: `--pack deck-and-ui`
- Board readouts, consulting decks, and strategy `.pptx` files: `--pack executive-deck`

```bash
dislop check <deck.pptx-or-dir> --pack executive-deck --fail-on warning
```

## Web UI Anti-Slop Rules

1. **Zero dead controls (`ui-dead-control`, severity `error`)**: Never ship `<a href="#">`, empty `href=""`, or unexplained `<button disabled>`. Wire real routes, add `title` or `aria-describedby` explaining why a control is disabled, or remove unbuilt mockup buttons.
2. **Skip both generations of default AI templates**:
   - Generation 1: indigo-purple-pink neon gradients (`ui-ai-gradient`), `bg-clip-text text-transparent` hero titles, `> 6` `rounded-full` pill badges per view (`ui-pill-soup`), triple nested bordered boxes (`ui-box-in-box`), and `"AI-Powered"` or `"Zero Hallucination"` eyebrow badges (`ui-prompt-echo-badge`).
   - Generation 2: generic warm-beige `#F7F5F0` cards with identical 3-column icon boxes.
3. **Positive layout grammar**: Favor explicit structural `1px` rules or clear typographic hierarchy, `tabular-nums` on aligned metrics, monotonic dark-mode surface lightness (`stage < sheet < raised`), and system or deliberate editorial type stacks.

## Slide Deck & `.pptx` Rules

1. **Conclusion-first headlines (`slide-weak-topic-title`, `slide-process-not-finding-title`)**: Replace `"Overview"`, `"Analysis of Q3 Churn"`, or `"Review of Deployment Pipeline"` with the one-sentence takeaway and measured delta (`"Simplified KYC Cut Week-1 Drop-off from 34% to 19%"`).
2. **Readable slide density**: Keep each visible slide `<= 120` words, `<= 5–6` bullets, and `100%` text scale (`normAutofit >= 80%`).
3. **Break cross-slide layout monotony (`pptx-layout-monotony`)**: Do not repeat identical plain-bullet skeletons across 4+ consecutive slides; convert comparisons into tables and trends into charts.
