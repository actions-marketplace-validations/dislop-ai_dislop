# dislop-bench v3

`dislop-bench v3` evaluates the `dislop` v1.0.0 Micro-Kernel and its 11 built-in Packs across three offline suites (`CC0-1.0`):

1. `datasets/active-multimodal-v3.json` (86 samples, EN & ZH)
   - Track A1 (`Defect` gate): hard delivery failures across Markdown, HTML/JSX, DOCX, PPTX, PDF, and PNG metadata (`Precision >= 98%`, `Recall >= 96%`, `Clean FPR = 0.0%`).
   - Track A2 (`Suggestion` gate): editorial & template cues across prose, web UI, slide decks, and compressed CJK PDFs (`Recall >= 95%`, `Clean FPR = 0.0%`).
2. `datasets/semantic-and-security-v3.json` (18 cases)
   - Tests Stage 4 prompt assembly, XML boundary escaping (`</untrusted_document>`), trust clamping (`fixSafety -> manual` when `safe` is claimed on suggestions), unknown-rule rejection, and Stage 5 anti-fabrication checks (`100%` pass).
3. `datasets/revision-and-factgate-v3.json` (18 revision tasks + 8 adversarial Fact Gate pairs + 4 `fix --auto` round-trips)
   - Measures end-to-end fact retention across `raw_ai`, `naive_humanizer`, and `dislop_clean` (`100%` Fact Gate pass, `100%` slop clearance), catches direction reversals and polarity flips, and verifies lossless `fix --auto` edits on `.md`, `.docx`, and `.pptx`.

## Commands

```bash
npm run bench          # Run all suites and print summary gates
npm run bench:assert   # Enforce CI thresholds
node ./scripts/run-benchmark.mjs --write-report
```
