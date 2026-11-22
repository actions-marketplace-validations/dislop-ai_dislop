# Long-Form Essays, Columns & Narrative Non-Fiction

Local progressive-disclosure reference bundled with `skills/dislop/` (0 network calls required).

## Recommended Built-in Pack

- Essays, narrative reporting, interviews, and opinion columns: `--pack literary-essay`

```bash
dislop check <essay.md> --pack literary-essay --profile
dislop voice <past-essay-1.md> <past-essay-2.md> -o .dislop.local/voice.json
```

## Cadence & Structural Guardrails

1. **Break metronome sentence lengths (`low-burstiness-vapor`)**: Autoregressive smoothing produces 5+ consecutive medium-length sentences (`CV < 0.24`) with zero concrete nouns. Mix short declarative turns (5–8 words) with fuller explanatory clauses grounded in time, place, and physical objects.
2. **Cut staged self-Q&A and semicolon tricolons**: Skip `"Why does this matter? Because..."`, `"The result?"`, and 3-part balanced semicolon sentences (`clause A; clause B; clause C`).
3. **Avoid 5-comma run-on chains (`comma-chain-runon`)**: Split sprawling comma-spliced sentences into 2–3 distinct thoughts with clear causal verbs.
4. **End on the last concrete scene (`en-essay-moralizing-ending`)**: Delete closing paragraphs that zoom out into universal life lessons (`"Ultimately, this reminds us..."`, `"In the end, what truly matters..."`). Stop on the final observation, quote, or action.
5. **Preserve the author's statistical voice (`dislop.voice/1`)**: Run `dislop voice` on 3–5 clean past pieces to measure natural sentence-length range and em-dash frequency instead of prompting with vague adjectives like `"write punchily"`.
