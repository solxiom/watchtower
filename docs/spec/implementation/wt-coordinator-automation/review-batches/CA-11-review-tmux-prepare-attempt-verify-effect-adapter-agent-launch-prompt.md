# Agent Launch Prompt — Review Batch CA-11

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for effect-adapter review, sanitization verification, and crash-recovery audit`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying tmux command sanitization, prepare/attempt/
verify journaling, idempotency-key duplicate suppression, crash-recovery
behavior, and the strict forbidden-command blocklist without trusting the
implementation report.

You are assigned **review batch CA-11** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-11-review-tmux-prepare-attempt-verify-effect-adapter.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-11-tmux-prepare-attempt-verify-effect-adapter.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-11-tmux-prepare-attempt-verify-effect-adapter.md` (implementation report)
6. `docs/spec/coordinator-automation.md` §12.2–12.3 — external effects
7. `docs/spec/v1-contracts.md` §5 — effect registry (tmux effects)
8. `docs/spec/v1-contracts.md` §12 — external-effect recovery
9. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
10. the actual changed source files:
    - `src/foundation/tmux-adapter.ts`
    - `src/foundation/tmux-effect.ts`
    - all new spec files under `spec/`

## Your Review Mission

Independently verify that the tmux effect adapter is safe, complete, and
correct:

1. **Command-set audit:** Enumerate every tmux command the adapter accepts.
   Verify it is exactly the closed set defined in `v1-contracts.md §5`:
   `new-session`, `new-window`, `send-keys`, `capture-pane`, `list-panes`,
   `list-windows`, `list-sessions`, `has-session`. Prove no other tmux command
   is reachable.
2. **Forbidden-command audit:** For every command in the forbidden set
   (`kill-session`, `kill-window`, `kill-pane`, `run-shell`, `shell`,
   `pipe-pane`, `source-file`, and raw `eval`/`if-shell` patterns), prove the
   adapter rejects before any runtime invocation. Verify zero process spawns or
   network calls for forbidden commands.
3. **Sanitization audit:** Test every shell metacharacter (`;`, `|`, `$`,
   `` ` ``, `\`, `(`, `)`, `{`, `}`, `<`, `>`, `&`, `*`, `?`, `~`, `!`) and
   path-like values (`/`, `..`) individually. Test Unicode, null bytes, ANSI
   escapes, and unusual whitespace. Prove every one is rejected in target
   identifiers.
4. **Prepare→attempt→verify chain:** Independently execute every allowed command
   through the full three-phase chain. Verify phase journaling is recorded
   correctly.
5. **Idempotency audit:** Execute a tmux effect, then execute the same effect
   with the same idempotency key. Prove the second call returns the prior
   outcome without re-executing the tmux command.
6. **Crash-recovery audit:** Simulate crashes at every phase boundary:
   - Before prepare (safe re-execute)
   - Between prepare and attempt (safe re-execute)
   - Between attempt and verify (recovery probe, no re-execute)
   - Between verify and journal fsync (idempotent replay)
   - After journal fsync (idempotent replay)
   Prove correct behavior at every point.
7. **Model-free verification:** grep the adapter source for any model or
   provider invocation. Prove none exist.
8. **Layer integrity:** Verify imports only from CA-10's typed interface,
   RT-05's runtime adapter, and standard contracts. Verify no imports from CLI,
   session, watcher, or routing modules.
9. **Hard-reject checklist:** Verify every hard-reject condition. Reject
   immediately if any item flags.
10. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without exhaustively testing every forbidden command.
- Do not accept without testing every shell metacharacter in sanitization.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently test every allowed tmux command.
- Independently test every forbidden command block.
- Independently verify crash recovery at every phase boundary.
- Independently verify idempotent duplicate suppression.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Every allowed tmux command succeeds through full prepare→attempt→verify.
- Every forbidden command is rejected before any runtime invocation.
- All shell metacharacters are rejected in target identifiers.
- Idempotent duplicate suppression returns the prior recorded outcome.
- Unknown-launch recovery probes without re-executing.
- Crash recovery is correct at every phase boundary.
- Build and tests pass independently.
- Zero model invocations exist in adapter code.
- Layer dependencies point only to CA-10 and RT-05.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-11-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/coordinator-automation/reviews/CA-11-tmux-prepare-attempt-verify-effect-adapter-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-11: Tmux prepare/attempt/verify effect adapter accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified allowed command set, forbidden commands
blocked, sanitization character classes proven, crash-recovery phase coverage,
and any limitations noted. Confirm that CA-10's typed external-effect interface
is correctly consumed and that CA-12 and CA-13 may now be reviewed.
