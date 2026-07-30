# Agent Launch Prompt — Review Batch CA-14

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for CLI command audit, dry-run purity verification, human/JSON parity audit, and help registry completeness`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying every coordinator command, dry-run purity,
human/JSON parity, help completeness, and correct foundation delegation without
trusting the implementation report.

You are assigned **review batch CA-14** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance
authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-14-review-coordinator-event-and-ready-set-commands.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-14-coordinator-event-and-ready-set-commands.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-14-coordinator-event-and-ready-set-commands.md` (implementation report)
6. `docs/spec/coordinator-automation.md` §19 — CLI contract
7. `docs/spec/v1-contracts.md` §8 — JSON envelope contract
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - all new files in `src/commands/`
    - all new files in `help/commands/`
    - `help/help.json`
    - the `src/cli.ts` diff (to verify no product logic)

## Your Review Mission

Independently verify that every coordinator command is correct, safe, and
complete:

1. **Command-coverage audit:** Independently enumerate every command in
   `coordinator-automation.md §19`. Verify every one has a corresponding
   command class, help fragment, and `help/help.json` entry.
2. **Valid-argument audit:** Independently run every command with valid
   arguments. Verify correct output in both human and `--json` format.
3. **Invalid-argument audit:** Independently test every command with: missing
   required args, invalid class values, unknown event/batch IDs, missing
   indexes, stale indexes. Verify clear errors and correct exit codes.
4. **Dry-run purity audit:** For `index build`, `cycle`, and `escalate`,
   independently run with `--dry-run`. Use strace or equivalent to verify:
   zero file writes, zero process spawns (no tmux, no git, no model), zero
   network connections. Prove the preview output is deterministic.
5. **Human/JSON parity audit:** For every read-only command, independently
   capture human and `--json` output. Diff the semantic content. Prove
   identical information. Verify `--json` output conforms to RM-02 envelope
   schema.
6. **Help registry audit:** Independently run `wt help` and verify every
   command group is represented. Run `wt help <command>` for each command
   and verify correct syntax, options, and examples.
7. **Layer audit:** Diff `src/cli.ts` against the pre-CA-14 state. Verify
   no new product logic was added — only command registration. Verify no
   command file imports from another command file. Verify every command
   delegates to foundation modules, never reimplements.
8. **Index command audit:** Independently: build an index, verify `status`
   freshness/counts, verify `verify` detects corruption, verify `explain`
   shows references without prose.
9. **Cycle and escalate audit:** Independently: `cycle --dry-run` with valid
   trigger, verify full planned path; `escalate --dry-run`, verify plan with
   no session/hold creation.
10. **Events and ready audit:** Independently: `events tail` with pagination,
    `events latest` with batch filter, `batch ready` with correct candidates.
11. **Hard-reject checklist:** Verify every hard-reject condition. Reject
    immediately if any item flags.
12. **Build and test:** Run `nvb build` and `nvb test` independently. Record
    exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept without independently verifying dry-run purity with process
  monitoring.
- Do not accept without independently verifying human/JSON parity.
- Do not accept if any help fragment is missing or incorrect.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently run every command with valid and invalid arguments.
- Independently verify dry-run purity (strace/process monitor).
- Independently verify human/JSON semantic parity.
- Independently verify help registry completeness.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- Every command in the spec is implemented, working, and help-registered.
- `--dry-run` produces preview without any side effect.
- Human and `--json` output contain identical semantic information.
- All commands delegate to foundation modules.
- `src/cli.ts` contains no new product logic.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/CA-14-correction-01.md` with exact required fixes.
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
- `.local/agent-reports/coordinator-automation/reviews/CA-14-coordinator-event-and-ready-set-commands-review.md`

Include: documents studied, independent proof reruns and outcomes, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
CA-14: Coordinator, event, and ready-set commands accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, the complete command-coverage matrix, dry-run
purity evidence per command, human/JSON parity results, help registry
verification, and any limitations noted. Confirm that CA-15 through CA-18
may now add session commands on this foundation.
