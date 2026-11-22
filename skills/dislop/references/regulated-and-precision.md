# Regulated External Comms & Rewrite Precision

Local progressive-disclosure reference bundled with `skills/dislop/` (0 network calls required).

## Recommended Built-in Pack

- Customer announcements, security or SLA briefs, investor updates, and regulated external copy: `--pack regulated-comms`

```bash
dislop check <draft.md> --pack regulated-comms --fail-on warning
```

## Regulated & External Copy Traps

1. **No absolute compliance promises (`reg-unsubstantiated-superlative`)**: Replace `"100% secure"`, `"zero-risk migration"`, or `"industry-leading guarantee"` with specific encryption standards, audit scope, and contracted SLA percentages (`99.95% monthly uptime`).
2. **No unanchored multipliers (`reg-unanchored-multiplier`)**: Never write `"10x faster"` or `"orders of magnitude better"` without stating the exact before and after baseline in the same sentence (`"cuts 40M-row queries from 19s to 1.9s"`).

## Precision Discipline During Manual & Automated Rewrites

When trimming AI clichés from technical or regulated drafts, keep four token classes untouched:

1. **Bounding qualifiers attached to numbers**: Keep `"up to 12 minutes"`, `"at least 99.95%"`, `"no more than 5%"`, and `"as of Q4"` intact. Dropping `"up to"` turns an upper bound into a false point guarantee.
2. **Exact numbers, units, versions, and percentiles**: Never replace `1,200 -> 4,800 TPS` or `P99 42ms` with vague words like `"massive speedup"`, and never invent numbers absent from the source.
3. **Inline code identifiers and file paths**: Preserve config keys, CLI flags, issue numbers, and file paths verbatim.
4. **URLs and citations**: Keep real links and `[n]` or `(Author, Year)` citations attached to their claims (`unsourced-attribution`).

Automated rewrites via `dislop deslop --local` or hosted cloud `dislop_deslop` run an internal numeric and qualifier retention guard automatically and revert any paragraph that alters protected figures.
