# Work Docs, Technical Specs & Regulated Comms

Scope: READMEs, PRDs, RFCs, PR descriptions, postmortems, release notes, CLI help and error copy, emails, and regulated notices.
CLI check: `dislop check <path> --format agent` (verify edits via `dislop verify --git HEAD <path>`).

## Rules & Fixes

1. **Strip chat wrappers, citations, placeholders & broken links (`chatbot-artifact`, `chatbot-citation-leak`, `unfilled-placeholder`, `broken-local-link`, `disguised-placeholder-prose`, `unchosen-draft-options`)**: Delete opening conversational scaffolding, `[oaicite:1]` leaks, `[TBD]` markers, author-facing reminders, and unchosen `Option A / Option B` branches; start directly on the ticket, release, or decision.
2. **Cut macro preambles, throat-clearing & future-gazing (`hollow-transition`, `throat-clearing`, `moralizing-closer`)**: Drop trend openings (`"In today's fast-paced world..."`), `"It is worth noting that..."`, and vague outlooks (`"Looking ahead..."`).
3. **Break low-fact buzzword clusters (`cooccurrence-hype-cluster`, `stealth-vapor`)**: Replace stacked filler verbs (`harnesses`, `elevate`, `streamline`, `unlock potential`) with the exact mechanism stated in the notes.
4. **Keep PRs, CLI copy & postmortems factual (`unprompted-negation`, `rhetorical-self-qa`)**: Copy owners, flags, thresholds, and due dates verbatim; list missing ones as open questions. State the missing check or recovery step directly instead of writing `"This isn't just X — it's Y"` or `"Why does this matter?"`.
5. **Cut absolute claims & unanchored multipliers**: Delete unproven absolutes (`"always guaranteed"`, `"never fails"`) and bare multipliers (`"5x speed gain"`); cite a standard or baseline only when present in the source, and keep hedging words like `projected` intact.
6. **No invented attribution or bold list walls (`bold-lead-list-wall`)**: Drop filler such as `"Studies show"`, keep source evidence labels (`benchmarked`, `measured`) without upgrading them, and turn stacked `- **Label**: text` lists (`4+` items) into plain prose.
7. **Honest edits only**: Remove real filler while keeping every distinct point and mechanism intact; never compress multi-paragraph prose into a stub or add fake typos.

## Contrast

- **Original**: ``Good afternoon! Attached is a summary of our harbor dredge pump ticket: the PR leverages robust filter-screen inspection to run 5x faster with fail-safe uptime every 72 hours.``
- **Overcorrected**: ``Not a filter tweak — a harbor reliability leap. Steadier. Cleaner. Ready for work.``
- **Clean**: ``The harbor dredge pump ticket uses filter-screen inspection every 72 hours.``

## Keep These Intact

- Standard `Keep a Changelog` headings (`Added`, `Changed`, `Fixed`), PR checklists, legal `shall`/`must` clauses, and domain terms (`leverage` in finance, `robust` in statistics).
- Quoted speech, code identifiers, URLs, bounds, relative dates (`yesterday`), and `from X to Y` direction.
