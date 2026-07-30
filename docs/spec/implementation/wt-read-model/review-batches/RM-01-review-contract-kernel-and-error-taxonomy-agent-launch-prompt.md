# Agent Launch Prompt — Review Batch RM-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for type-system review and error taxonomy verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying type systems, error taxonomies, and exit-code
mappings without trusting the implementation report.

You are assigned **review batch RM-01** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-01-review-contract-kernel-and-error-taxonomy.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-01-contract-kernel-and-error-taxonomy.md` (paired work brief)
5. `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md` (implementation report)
6. `docs/spec/v1.md`
7. `docs/spec/v1-contracts.md`
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
    - `src/contracts/types.ts`
    - `src/contracts/errors.ts`
    - `src/contracts/exit-codes.ts`
    - `src/contracts/index.ts`

## Your Review Mission

Independently verify that the implementation establishes a correct, complete,
and stable contract kernel:

1. **Error code audit**: Enumerate every error code. For each, verify the exit
   code is correct (1-5 according to v1-contracts.md §8). Prove zero unmapped
   codes and zero codes with conflicting maps.
2. **Domain type audit**: Compare every exported type against `v1.schema.json`.
   Verify required fields, types, and additionalProperties rules match.
3. **Exit-code verification**: Confirm the `ExitCode` type is a numeric literal
   union of 1-5. Test the mapping function for every error code.
4. **Fixture verification**: Rerun all error-code fixtures. Verify valid
   construction, boundary values, and malformed input rejection.
5. **Barrel audit**: Confirm `src/contracts/index.ts` re-exports every public
   symbol needed by downstream batches.
6. **Layer integrity**: Verify no foundation, runtime, or CLI dependencies exist
   in `src/contracts/`.
7. **Hard-reject checklist**: Run the 16-item checklist. Reject immediately if
   any item flags.
8. **Build and test**: Run `nvb build` and `nvb test` independently. Record
   exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without exhaustively verifying every error code mapping.
- Do not accept if any `any` type appears in a public interface.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently enumerate error codes and mappings.
- Verify each error code fixture test exists and passes.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All 16 hard-reject checklist items are clear.
- Every error code maps to exactly one exit code.
- All domain types match v1.schema.json.
- Build and tests pass independently.
- No foundation or CLI dependencies in contracts.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/RM-01-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

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
- `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
RM-01: Contract kernel and error taxonomy accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified error-code count, domain types audited,
and any limitations noted. Confirm that RM-02 through RM-05 may now be reviewed
in parallel.
