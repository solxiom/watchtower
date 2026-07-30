# Agent Launch Prompt — Review Batch CA-12

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for Git-adapter review, ownership-audit, publication/recovery audit, and acceptance-durability verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying reviewer-ownership enforcement, commit-set
validation, push/partial recovery, acceptance-durability-through-failure, and
force-push prevention without trusting the implementation report.

You are assigned **review batch CA-12** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-12-review-acceptance-and-git-publication-adapter.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-12-acceptance-and-git-publication-adapter.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-12-acceptance-and-git-publication-adapter.md` (implementation report)
6. `docs/spec/coordinator-automation.md` §12.2–12.3 — external effects and journals
7. `docs/spec/coordinator-automation.md` §13 — acceptance and publication separation
8. `docs/spec/v1-contracts.md` §5 — effect registry (Git effects)
9. `docs/spec/v1-contracts.md` §11 — locking and recovery rules
10. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
11. the actual changed source files:
    - `src/foundation/git-acceptance.ts`
    - all new spec files under `spec/`

## Your Review Mission

Independently verify that the Git acceptance adapter correctly enforces reviewer
ownership, validates commit sets, recovers from partial push, and maintains the
acceptance/publication separation:

1. **Ownership audit:** Independently create acceptance proposals from distinct
   sessions. Prove `validateReviewerOwnership` passes for the owning session and
   fails with `GIT_OWNERSHIP_MISMATCH` for non-owning sessions. Prove the
   adapter reads session identity from durable worker events, not from Git
   author or committer fields.
2. **Commit-set validation audit:** Independently test every validation rule:
   SHA existence, tree contents against the accepted file set, ancestry against
   the expected base, and repository binding. Prove correct pass and correct
   rejection for each rule.
3. **Publication audit:** Independently push verified commits to a test remote.
   Verify the remote ref is correct and the publication result reports success.
4. **Partial-push recovery audit:** Set up a multi-repository scenario where
   one remote fails. Independently verify that already-pushed repositories are
   not re-pushed during recovery and that only failed repositories are retried.
5. **Acceptance-durability audit:** Record an acceptance through the adapter.
   Independently trigger a publication failure. Verify the acceptance event
   remains in the journal and the batch state reflects accepted status.
6. **Force-push audit:** Search the adapter source code for any construction of
   `--force`, `-f`, `--force-with-lease`, or equivalent force-push flags.
   Independently verify that no code path constructs or passes these flags.
7. **Idempotency audit:** Execute a publication, then execute the same
   publication with the same idempotency key. Verify no duplicate push occurs.
8. **Model-free verification:** grep the adapter for any model invocation.
   Prove none exist.
9. **Layer integrity:** Verify imports only from CA-10's typed interface, RM-08
   bindings, RT-05 runtime adapter, and standard contracts. No imports from CLI,
   session, watcher, or routing.
10. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
11. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without exhaustively testing every commit-set validation rule.
- Do not accept if acceptance and publication are conflated.
- Do not accept if force push is permitted by any means.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently test reviewer ownership across session boundaries.
- Independently test every commit-set validation rule.
- Independently test partial push with three-repository setup.
- Independently verify acceptance survives publication failure.
- Independently verify idempotent replay does not re-push.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Acceptance and publication are distinct effect types and code paths.
- Reviewer ownership is enforced from durable worker events.
- Every commit-set validation rule correctly passes and rejects.
- Successful push updates the remote ref correctly.
- Partial push recovery retries only failed repositories.
- Acceptance survives publication failure.
- Force push is never permitted.
- Build and tests pass independently.
- Zero model invocations in adapter code.
- Layer dependencies point only to CA-10 and RM-08.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-12-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-12: Acceptance and Git publication adapter accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified commit-set validation rules, partial-push
recovery coverage, acceptance-durability evidence, and force-push audit result.
Confirm that CA-10's typed interface correctly supports both effect types and
that CA-13 may now be reviewed.
