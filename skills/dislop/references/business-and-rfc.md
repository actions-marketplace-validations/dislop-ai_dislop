# Business Briefs, Technical Specs, RFCs & Postmortems

Local progressive-disclosure reference bundled with `skills/dislop/` (0 network calls required).

## Recommended Built-in Packs

- General proposals, memos, PRDs, and release notes: `--pack business-brief`
- Engineering RFCs, pull-request descriptions, and incident postmortems: `--pack engineering-spec`

```bash
dislop check <path> --pack engineering-spec --profile --format json
```

## Five High-Frequency Failure Modes to Eliminate

1. **Macro-trend preamble and future-gazing closer**: Cut openers like `"In an era defined by..."` and closers like `"Looking ahead..."`. Open on the ticket, metric, component, or customer decision.
2. **Subtle corporate verb clusters in low-fact paragraphs**: Words like `streamline`, `leverage`, or `robust` pass once in concrete prose, yet piling two or more into a paragraph with zero numbers or file paths signals padding (`cooccurrence-slop-cluster`).
3. **PR diff-parroting (`eng-pr-diff-parrot`)**: Never open a PR or changelog entry with `"This PR updates X to ensure a more seamless and maintainable experience"`. State what failed, which invariant changed, and how it was tested.
4. **Stop-thinking root causes (`eng-shallow-root-cause`)**: Never end an incident analysis at `"Root cause: human error"`. Name the missing automated check, schema validator, or canary rollback threshold that let a manual step cause impact.
5. **Wishful action items (`eng-vague-action-item`)**: Replace `"Add more monitoring"` with a binary-verifiable item naming the service, alert threshold, owner, and due date.

## Before / Trap / Clean Pattern

- **Raw AI**: ``Certainly! This PR refactors connection pooling to ensure a seamless, robust experience.``
- **2nd-order trap**: ``This isn't a routine refactor — it's a resilience milestone for connection management.``
- **Clean**: ``Fixes #412: release stale Redis sockets on timeout so idle pool count stays <= 64 under 2h load test.``
