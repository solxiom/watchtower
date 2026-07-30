# Agent Launch Prompt — Review Batch CA-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for SQLite-based pack-index compilation review and semantic-root verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying SQLite-based compilation, FK integrity,
semantic-root correctness, staged publication crash safety, and seal-drift
detection without trusting the implementation report.

You are assigned **review batch CA-01** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority for the deterministic sealed-pack SQLite compiler.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-01-review-deterministic-sealed-pack-sqlite-compiler.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-01-deterministic-sealed-pack-sqlite-compiler.md` (implementation report)
6. `docs/spec/v1.md`
7. `docs/spec/v1-contracts.md` — especially §3 (pack consumer), §8A (derived SQLite storage contract)
8. `docs/spec/architecture.md` — especially A-033 (SQLite for disposable derived indexes)
9. `docs/spec/coordinator-automation.md` — especially §9 (pack index)
10. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
11. the actual changed source files:
    - `src/foundation/pack-index.ts`
    - `src/foundation/pack-index-compiler.ts`
    - `spec/basic/pack-index-spec.ts`

## Your Review Mission

Independently verify that the implementation establishes a correct, complete,
and safe deterministic sealed-pack SQLite compiler:

1. **Semantic-root audit**: Compile the same sealed pack twice into two independent
   SQLite databases. Export all logical rows from both. Prove row-level identity.
   Compute the semantic root of each — verify they match. Verify the semantic
   root is computed from canonical logical rows (RFC 8785 canonicalized export),
   NOT from raw SQLite file bytes.
2. **FK integrity audit**: Enumerate every FK constraint across all tables
   (artifact→batch, batch→repository, dependency edges, requirement mappings,
   proof→batch). For each, verify an invalid reference is detected and rejected.
3. **Staged publication crash safety**: Simulate crash at every stage of
   publication — after temp-file write, during integrity verification, during
   `current.json` write, during rename. Verify the active pointer is never left
   pointing to a corrupt or partial index.
4. **Corrupt index detection**: Manually create a corrupt SQLite database with
   FK violations. Verify the compiler detects and refuses it.
5. **Seal-drift detection**: Change the pack seal between compilations. Verify
   `SEAL_DRIFT_DETECTED` before recompilation.
6. **No raw SQL outside storage capsule**: Grep for `better-sqlite3`, `.exec(`,
   `.run(`, `.prepare(`, `.all(`, `.get(` in compiler code. Verify only the
   DB-01 adapter is used.
7. **Hard-reject checklist**: Run the 16-item checklist. Reject immediately if
   any item flags.
8. **Build and test**: Run `nvb build` and `nvb test` independently. Record
   exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if the semantic root is computed from raw SQLite bytes instead
  of logical rows.
- Do not accept if FK constraints are not enforced.
- Do not accept if staged publication can leave a corrupt active index.
- Do not accept if the implementation agent committed.
- Do not accept if raw SQLite primitives appear outside the DB-01 adapter.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently rebuild the index and verify semantic-root identity.
- Independently verify FK integrity across all tables.
- Independently simulate crash at every staged-publication stage.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Semantic root is provably rebuildable (identical logical rows).
- FK integrity across all tables verified.
- Staged write-then-rename crash-safe at every stage.
- SQLite bytes never treated as semantic authority.
- No raw SQL exposed outside storage capsule.
- No full-pack/JSON-shard fallback exists.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-01-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/coordinator-automation/reviews/CA-01-deterministic-sealed-pack-sqlite-compiler-review.md`

Include: documents studied, independent proof reruns and outcomes, SQLite-specific
verification (semantic-root algorithm audit, FK integrity proof, staged
publication crash safety, raw-SQL grep), structural verification, acceptance/
rejection decision, final git status, and if accepting, create the acceptance
commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-01: Deterministic sealed-pack SQLite compiler accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified semantic-root algorithm, FK constraint
count, staged-publication crash-safety proof, and any limitations noted. Confirm
that CA-02 (SQLite index stores and bounded typed queries) may now be reviewed
against the accepted CA-01 compiler contract.
