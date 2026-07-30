# Agent Launch Prompt — Review Batch LC-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for lock-ordering verification, atomic file operations, conditional rollback, and idempotent registration`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying lock ordering, atomic file operations,
conditional rollback, and idempotent membership registration. The reviewer
must be capable of reasoning about concurrent access, deadlock prevention,
and read-only index access.

You are assigned **review batch LC-04** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-04-review-bindings-gitignore-and-membership-registration.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-04-bindings-gitignore-and-membership-registration.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md` (implementation report)
6. `docs/spec/v1.md` — §7.2 (bindings), §7.3 (repositories.local.json)
7. `docs/spec/v1-contracts.md` — relevant binding and membership contracts
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/binding-mutator.ts`
    - `src/foundation/membership-registrar.ts`
    - `spec/foundation/binding-mutator.spec.ts`
    - `spec/foundation/membership-registrar.spec.ts`

## Your Review Mission

Independently verify that binding mutation and membership registration are
safe, correct, and respect lock ordering:

1. **Lock order audit**: trace every code path in `binding-mutator.ts`. Verify locks are acquired in the exact order: data-root catalog/membership-index lock → lane lock → session lock → projection/index publication lock. Prove no code path inverts this order. Instrument or trace the calls to confirm the sequence.
2. **Binding schema validation**: validate valid and invalid binding fixtures. Verify: valid passes, missing required fields rejected, invalid paths rejected, duplicate repository IDs rejected.
3. **`.gitignore` atomic update**: verify the original `.gitignore` content is preserved. Verify the new watchdog entry is added without disturbing existing content. Verify the replace uses atomic rename (write to temp, rename over original). Verify no partial `.gitignore` state is observable.
4. **Original digest preservation**: verify SHA-256 of original `.gitignore` is computed and stored. Verify the stored digest matches independent computation.
5. **Conditional rollback — no interference**: after writing, compute digest. If it matches the expected digest, no rollback is needed. Verify this path works correctly.
6. **Conditional rollback — interference detected**: simulate an interleaving write (another process modifies `.gitignore` between read and write). Verify the digest mismatch is detected. Verify rollback restores original content exactly (byte-for-byte). Verify rollback does not remove legitimate user additions (only the watchdog entry is managed).
7. **Membership index creation**: verify the index is created under the membership-index lock. Verify index format matches the contract.
8. **Post-commit registration**: simulate registration failure (permission denied, disk full). Verify retry behavior. Verify after retry exhaustion, a warning is surfaced but the lane remains valid. Verify the warning is actionable (not silent).
9. **Idempotent registration**: register the same lane twice. Verify no duplicate entries. Verify the index remains valid JSON after repeated registrations.
10. **Stale entry handling**: create an index with a stale entry. Verify reads detect and report the stale entry but do NOT remove or repair it. Verify the index file is unchanged after reads (SHA-256 before/after identical).
11. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
12. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if lock inversion is possible in any code path.
- Do not accept if `.gitignore` rollback removes user content.
- Do not accept if membership reads mutate the index.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently trace lock acquisition order in all code paths.
- Independently test `.gitignore` rollback with simulated interference.
- Independently verify idempotent registration.
- Independently verify stale entries are not repaired.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Lock order enforced in all code paths.
- `.gitignore` atomic update preserves original content.
- Conditional rollback proven on digest mismatch.
- Membership index created under its lock.
- Post-commit registration retries with warning surface.
- Idempotent registration: no duplicates.
- Stale entries reported but never repaired.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-04-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`

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
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-04-bindings-gitignore-and-membership-registration-review.md`

Include: documents studied, independent proof reruns and outcomes, lock-order
verification details, `.gitignore` rollback scenario results, membership
registration idempotency proof, stale-entry read-only proof, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-04: Bindings, Git-ignore, and membership registration accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified lock ordering, rollback proof, and any
limitations noted. Confirm that LC-07 is partially unblocked (LC-04 accepted)
and awaits LC-05 and LC-06 acceptance.
