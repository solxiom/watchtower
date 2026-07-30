# Agent Launch Prompt — Review Batch CA-18

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5` — strongest required for verifying the pack-exit gate, independent scaling proof at four scale points, signal-safety audit at every interaction stage, slash-command determinism verification, streaming non-authoritativeness proof, and the complete M6 acceptance criteria
- agent suitability: `high for terminal/PTY audit, signal-safety verification, slash-command determinism audit, accessibility review, and independent scaling proof execution`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration — insufficient for PTY/signal safety audit and scaling proof verification
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. CA-18 is the pack-exit gate. Select a
currently available agent capable of independently verifying the complete
session CLI command surface, PTY attachment safety, slash-command determinism,
signal safety at every stage, accessibility compliance, the full four-point
scaling proof, and all M6 acceptance criteria without trusting the
implementation report.

You are assigned **review batch CA-18** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority for the complete Pack 5 (M6) exit.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-18-review-session-cli-pty-attachment-and-m6-acceptance.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-18-session-cli-pty-attachment-and-m6-acceptance.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-18-session-cli-pty-attachment-and-m6-acceptance.md` (implementation report)
6. `docs/spec/cli-session.md` (entire document)
7. `docs/spec/operator-session.md` §19 — CLI contract
8. `docs/spec/coordinator-automation.md` §19 — CLI contract
9. `docs/spec/coordinator-automation.md` §23.3–23.4 — cost/scaling proof
10. `docs/spec/coordinator-automation.md` §24 — M6 acceptance criteria
11. `docs/spec/v1-contracts.md` §8 — JSON envelope contract
12. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
13. the actual changed source files:
    - all new files in `src/commands/`
    - terminal renderer and PTY attachment source files
    - all new files in `help/commands/`
    - `help/help.json`
    - the `src/cli.ts` diff

## Your Review Mission

Independently verify that the session CLI commands, PTY attachment, terminal
renderer, and M6 scaling proof are correct, safe, and complete:

1. **Command-coverage audit:** Independently enumerate every session command
   in `operator-session.md §§19.1–19.2`. Verify every one has a command class,
   help fragment, and `help/help.json` entry.
2. **Command-behavior audit:** Independently run every command with valid and
   invalid arguments. Verify correct output. Verify `--dry-run` produces
   previews without side effects. Verify `--json` output semantic parity.
3. **Attachment audit:** Independently create a session, attach, submit a turn,
   receive a response. Detach. Verify the session remains open. Create an
   observer attachment — verify M0 slash commands work but natural-language
   turns are rejected with `OPERATOR_SESSION_OBSERVER_READ_ONLY`.
4. **Slash-command audit:** Independently run every slash command. For every
   M0 command (`/status`, `/ready`, `/batch`, `/events`, `/holds`, `/budget`,
   `/queue`, `/history`, `/context`, `/proposals`, `/sessions`, `/export`),
   independently verify zero model invocations using process monitoring.
   Independently run `/unknownword` — prove it errors without model invocation.
   Run `//text` — prove it routes as natural language.
5. **Streaming audit:** Independently submit a turn with streaming. Verify
   provisional chunks are marked `[provisional]` or equivalent. Simulate a
   validation failure — verify only the failed/interrupted state is recorded,
   not the provisional text as authoritative answer.
6. **Signal audit — editing:** Independently begin typing a message. Ctrl-C.
   Verify input is cleared, prompt resets, no turn journal entry is created.
7. **Signal audit — preflight:** Independently enable confirmation mode. Submit
   a turn. Ctrl-C at the preflight confirmation prompt. Verify
   `operator-session-turn-cancelled-before-invocation` journaled with zero model
   usage. Verify session remains open and resumable.
8. **Signal audit — after invocation:** Independently submit a turn with a
   slow endpoint. Ctrl-C mid-response. Verify the turn journal shows
   `interrupted` state. Verify no proposal was created and no effect was
   applied. Verify session remains open.
9. **Signal audit — effect confirmation:** Independently trigger `/apply` with
   a valid proposal. Ctrl-C at the confirmation prompt. Verify no effect was
   applied and the proposal remains `PROPOSED` (not consumed by cancellation).
10. **Signal audit — Ctrl-D:** Independently press Ctrl-D at an empty prompt.
    Verify attachment detaches. Independently verify the session is still open
    (re-attach to confirm).
11. **Signal audit — SIGHUP:** Independently send SIGHUP during an active turn.
    Verify the process terminates but the session state is durable. Re-attach.
    Verify the turn is in `interrupted` state if still active, or completed if
    it finished before process termination.
12. **Accessibility audit:** Independently run with `--no-color` and `NO_COLOR`.
    Verify no ANSI escape sequences in output. Independently run with screen-
    reader mode (or verify rendering fixtures). Verify output is append-only
    (no cursor rewriting or overwrite sequences).
13. **Scaling proof audit — envelope:** Independently verify envelope bytes at
    30/300/3,000/10,000 batches remain within the configured bound. Verify the
    bound does not grow with pack size.
14. **Scaling proof audit — context:** Independently verify broker context
    records per trigger are bounded and unrelated batch growth does not add
    records.
15. **Scaling proof audit — ready set:** Independently verify acceptance
    triggers ready-set updates inspecting only affected edges.
16. **Scaling proof audit — lookups:** Independently verify latest-event lookup
    is O(1) or O(log n), not O(n) full journal scan.
17. **Scaling proof audit — model-free:** Independently verify zero model
    invocations for M0 operations, index builds, index queries, latest-event
    lookups, and ready-set updates at every scale point.
18. **Scaling proof audit — session:** Independently verify session attachment
    startup time and default working set size do not grow with lane history.
19. **M6 criteria audit:** Independently verify every criterion in
    `coordinator-automation.md §24` is satisfied. Record the evidence for each.
20. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
21. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently reproducing the scaling proof at every
  scale point.
- Do not accept without independently testing every signal scenario.
- Do not accept if any slash-command typo invokes a model.
- Do not accept if any M6 acceptance criterion is unmet.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently run every session command.
- Independently test the interactive attachment (full turn cycle, detach,
  re-attach).
- Independently verify every slash command (M0 model-free, unknown error,
  `//text` escape).
- Independently test every signal scenario (editing, preflight, invocation,
  confirmation, Ctrl-D, SIGHUP).
- Independently verify streaming provisional/validated separation.
- Independently reproduce the scaling proof at 30/300/3,000/10,000 batches.
- Independently verify every M6 acceptance criterion in
  `coordinator-automation.md §24`.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch (and Pack 5) is accepted only when:
- Every session command is implemented, working, and help-registered.
- The attachment is a safe presentation-only client.
- Slash commands are deterministic; M0 commands invoke zero models.
- Streaming is visibly provisional; only validated response is authoritative.
- Every signal scenario produces safe behavior with no partial effects.
- Accessibility modes produce readable output.
- Scaling proof demonstrates bounded model context at all scales.
- Long-lane replay does not grow the default working set.
- All M6 acceptance criteria are verified.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-18-correction-01.md` with exact required fixes.
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
- accept only when all criteria are satisfied — this is the pack-exit gate
- if rejecting, create a correction brief with exact required fixes
- scaling proof must cover all four scale points
- all M6 acceptance criteria in coordinator-automation.md §24 must be verified
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/coordinator-automation/reviews/CA-18-session-cli-pty-attachment-and-m6-acceptance-review.md`

Include: documents studied, independent proof reruns and outcomes, scaling proof
tables (reproduced independently), M6 acceptance criteria verification matrix,
structural verification, acceptance/rejection decision, final git status, and
if accepting, create the acceptance commit with a descriptive message noting
that Pack 5 (M6) is accepted.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-18: Session CLI/PTY attachment accepted — Pack 5 (M6) complete

[one-paragraph summary of what was verified, key scaling proof results, and
the M6 pack-exit declaration]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the complete session command coverage matrix,
signal-safety verification results, scaling proof tables (reproduced
independently at all four scale points), and the M6 acceptance criteria
verification matrix. Declare that Pack 5 (wt-coordinator-automation) is
accepted and that Pack 6 (wt-v1-release, starting with REL-01) may now
begin end-to-end qualification.
