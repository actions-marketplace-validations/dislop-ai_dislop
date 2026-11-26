# Essays, Columns & Narrative Non-Fiction

Scope: Long-form essays, newsletters, columns, op-eds, and reported sketches.
CLI check: `dislop check <essay.md> --format agent` (optional personal voice baseline: `dislop voice extract <past1.md> <past2.md>`).

## Rules & Fixes

1. **Avoid low-information abstract filler (`stealth-vapor`, `hollow-transition`)**: Anchor clauses in supplied times, places, and physical actions without chopping prose into artificial short fragments (`staccato-slogan-run`).
2. **Cut staged self-Q&A & macro preambles (`rhetorical-self-qa`, `hollow-transition`)**: Remove `"Why does this matter?"`, `"The result?"`, `"In today's fast-paced world..."`, and balanced semicolon padding.
3. **Break sprawling comma-spliced sentences**: Split tangled multi-clause run-on sentences into 2–3 clear sentences when the subject gets lost.
4. **End on the last concrete scene (`moralizing-closer`)**: Cut closing paragraphs that zoom out into life lessons (`"Ultimately, this reminds us..."`). Stop on the final observed action or quote.
5. **Restrain em-dashes & binary pivots (`excessive-em-dash`, `unprompted-negation`)**: Replace stacked em-dashes (`3+` in one sentence) with commas or periods, and replace `"Not just X — it's Y"` pivots with plain action.
6. **Zero invented scene detail**: Use only objects, weather, bystanders, and quotes in the notes; develop those supplied details clearly to fit the target length without adding outside scenery.

## Contrast

- **Original**: ``The lighthouse lens — salt-crusted — turned past midnight — before the squall. Ultimately, this reminds us that patience outlasts storms.``
- **Overcorrected**: ``The lens turned past midnight. It wasn't just brass — it was a quiet promise of endurance.``
- **Clean**: ``The salt-crusted lighthouse lens turned past midnight before the squall.``

## Keep These Intact

- The author's existing prose, cadence, and deliberate short sentences when no AI framing is present.
- Direct quotes, timestamps, place names, and observed actions from the source notes.
