# Agent Launch Prompt — Review Batch REL-02

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.6 Sol` only with strong steering and full concurrent/recovery reproduction
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, implementation report, concurrent lane state, multi-repository binding state, and recovery/journal context simultaneously; if it cannot handle this breadth, escalate the agent rather than shortening safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and full concurrent/recovery reproduction
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, implementation report, and concurrent/recovery state in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This review batch is R5 because the reviewer must independently reproduce concurrent lane isolation (multiple lanes operating on one repository with per-lane locks and state), multi-repository commit verification (acceptance commits mapped to two independent Git repositories), shared-write conflict detection, partial-push recovery (one succeeds, one fails, the lane remains recoverable), and idempotency replay across the decision/effect journal boundary.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **review batch REL-02** — the independent review of the concurrent and multi-repository recovery trials. You must independently reproduce every fixture, verify every claim in the implementation report, and either accept with an acceptance commit or reject with a correction brief.

This review batch exercises concurrent lane isolation (two lanes on one repository), multi-repository commit verification (acceptance commits across two independent Git repos), shared-write conflict refusal, partial push recovery (one push succeeds, one fails, the lane recovers), idempotency replay, and copied-template ignorance. The reviewer must independently set up and tear down all fixture state, and must not accept the implementation report's assertions as proven facts.

## Read In This Order

Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.

1. The durable review brief: `REL-02-review-concurrent-and-multi-repository-recovery-trials.md`.
2. The paired work brief: `REL-02-concurrent-and-multi-repository-recovery-trials.md`.
3. The governing specs: `docs/spec/v1.md` (entire, especially §§7, 9, 13, 14, 17), `docs/spec/v1-contracts.md` (entire, especially §§10, 11), `docs/spec/architecture.md`, `docs/spec/coordinator-automation.md`.
4. The REL-01 implementation and review reports for environmental context and predecessor handoffs.
5. The implementation report at `.local/agent-reports/watchtower-release/REL-02-concurrent-recovery-trials.md`.
6. The actual `git diff` from the baseline commit. Verify only spec files and trackers changed.
7. The current source: every foundation module that handles lane discovery, conflict inspection, repository binding, locking, and coordinator journal management.
8. The pack 1–5 trackers and REL-01 tracker to verify prerequisite acceptance status.
9. `nvb.json` — available NVB task surfaces.
10. Final git status and file ownership.

## Reasoning / Agent Class

You are operating at reasoning class `R5`. This reflects the concurrent state-machine and multi-repository recovery nature of the batch: the reviewer must reason about lock ordering, per-repository push/journal integrity, lane-state recovery after partial failure, and idempotency key replay across decision/effect boundaries.

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and full concurrent/recovery reproduction
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, implementation report, and concurrent/recovery state in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency map from the concurrent and recovery fixtures to the underlying lane foundation modules (discovery, conflict inspection, binding, locking, coordinator journal, push journals).
2. Verify REL-01 is accepted. Run `nvb build` and `nvb test` independently.
3. Execute every fixture independently. Do not trust the implementation report — set up fresh temporary directories, initialize lanes, run commands, and inspect state yourself.
4. Enumerate public invariants, invalid states, failure precedence, compatibility constraints, and deliberately unsupported behavior: lock ordering, per-repository commit verification rules, partial push recovery rules, idempotency key determinism, copied-template exclusion.
5. Use counterexamples: identify at least one plausible defect the implementation report might have missed — such as two lanes sharing a lock file due to a path construction bug, a partial push silently revoking acceptance, an idempotency key collision producing a duplicate effect, a shared-write worktree being silently accepted, or a copied-template directory being discovered and listed.
6. Treat the implementation report as a lead, not proof.

## Structural Design And Module-Size Gate

- E2E spec files must not exceed 400 physical lines each.
- No new product source modules in the diff.
- No generic helper bags.
- No npm convenience scripts.

## Your Review Mission

Perform an independent review of REL-02's implementation. You are the reviewer, not a second implementer.

### Review Pass 1 — Prerequisites

1. Verify REL-01 is independently accepted. Read its tracker and review report.
2. Run `nvb build` and `nvb test`. Record results and baseline commit hash.
3. Confirm the globally installed `wt` binary is available.

### Review Pass 2 — Concurrent Lane Isolation

1. Independently create a fixture Git repository with a committed valid implementation pack.
2. Initialize Lane A and Lane B with distinct slugs on the same repository.
3. Verify each lane has its own `.watchtower/lanes/<slug>/` directory, `lane.json` (distinct `laneId` UUID), `install.json`, `state/`, `coordinator/`, `prompts/`, `reports/`, `budgets/`, `logs/`.
4. Verify lock files are per-lane (within each lane's `state/` directory).
5. Run `wt list` from the control home. Verify both lanes appear with distinct lane IDs and slugs.
6. Run `wt status --lane=<slug-a>` and `wt status --lane=<slug-b>`. Verify each returns the correct lane-specific status.
7. Run `wt status` without `--lane` from a directory where both are relevant. Verify ambiguity failure with actionable candidates.
8. Run `wt status --lane=<slug-a>` and verify it resolves to Lane A only.

### Review Pass 3 — Shared-Write Refusal

1. On the same repository's main worktree (where Lane A is initialized), attempt `wt init` for a second lane without a dedicated worktree. Verify refusal with a diagnostic naming the conflicting lane and worktree.
2. Create a dedicated Git worktree with `git worktree add`. Initialize Lane C on it. Verify success.
3. Run `wt status` on Lane A. Verify a warning that the repository has other active lanes.

### Review Pass 4 — Multi-Repository Commit Set

1. Independently create a second fixture Git repository.
2. Create a scope bindings file mapping both repo IDs to worktree paths.
3. Initialize a multi-repo lane with the bindings file.
4. Verify `repositories.local.json` contains both bindings with correct paths, roles, and access modes.
5. Trace the `accept` event in the coordinator journal. Verify `commits` maps both repository IDs. Verify each commit exists and is reachable from its respective worktree branch tip.

### Review Pass 5 — Partial Push Recovery

1. Using the multi-repo lane, configure one repo's remote to reject pushes. Trigger publication.
2. Verify the blocking repo's push journal records failure with the rejection reason. Verify the other repo's push journal records success.
3. Verify `wt status` reports a partial push warning.
4. Verify the `accept` event remains authoritative — semantic acceptance is not revoked.
5. Fix the push block and retry. Verify the retry uses the existing acceptance commit (no new `accept` event). Verify the failed repo's push journal updates to success.

### Review Pass 6 — Idempotency Replay

1. Identify a completed coordinator cycle with a known idempotency key from the decision/effect journal.
2. Replay the cycle. Verify the effect executor returns the recorded outcome without repeating the external effect. Verify no duplicate tmux session launch or Git operation occurs.
3. Document the idempotency key, original outcome, and replay outcome.

### Review Pass 7 — Copied-Template Ignorance

1. Create a directory with `.watchtower/lanes/old-lane/lane.json` containing invalid content (not a valid Watchtower schema).
2. Run `wt list` from the control home and from within the copied-template directory. Verify the copied-template lane is never listed.
3. Run `wt status --workspace=<copied-template-dir>`. Verify exit code 3 (workspace/lane not found) or 0 (no lanes found).
4. Verify no `wt` command modifies or inspects the copied-template directory's contents.

### Review Pass 8 — Architecture

1. Verify diff touches only spec files, trackers, and `.local/` reports.
2. Run `nvb check:architecture`. Must exit 0.
3. Verify no prohibited artifacts in git.

## What You Must Not Do

- Do not fix the batch while reviewing unless reassigned as an implementation correction.
- Do not accept a batch where the concurrent lane fixtures cannot be independently reproduced.
- Do not accept a batch where shared-write worktree binding is silently accepted.
- Do not accept a batch where partial push failure revokes semantic acceptance.
- Do not accept a batch where idempotency replay produces a duplicate effect.
- Do not accept a batch where a copied-template directory is discovered or modified.
- Do not trust the implementation report without independent verification.
- Do not commit unless delivering an ACCEPT verdict.

## Acceptance Gate

Accept only if all of the following are true:
- Two lanes on the same repository have distinct IDs, slugs, directories, state, config, and locks.
- Ambiguous selection fails with actionable candidates naming both lanes.
- Slug-based selection resolves to the correct lane.
- Shared-write worktree binding is refused with a clear diagnostic.
- Dedicated worktree lanes coexist without collision.
- Multi-repository acceptance maps commits correctly per repository.
- Partial push failure does not revoke semantic acceptance.
- Retry of a failed push uses the existing acceptance commit.
- Idempotency replay returns the recorded outcome without repeating the effect.
- Copied-template directories are not discovered or modified.
- No product features were added. No mock replaced the real binary.
- `nvb check:architecture` exits 0.
- No build, dist, node_modules, `.nira/local`, or `.watchtower/` artifact is committed.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update the following after completing review:
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — mark REL-02 as ✅ accepted or 🟠 correction required.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — update REL-02 status.
- `docs/spec/implementation/wt-v1-release/review-batches/00-review-batch-index.md` — update REL-02 status.
- `docs/spec/v1-implementation-map.md` — update REL-02 status in the pack 6 table.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- The reviewer must independently reproduce every fixture. Implementation report conclusions are not proof.
- No product features are added by the reviewer. This is a review, not a correction.
- Acceptance commits must include all accepted non-`.local` changes with a descriptive commit message.
- Rejections must produce a numbered correction brief under `corrections/`.

## Rejection Correction Brief Rule

- On rejection, create `corrections/REL-02-correction-NN.md` with exact defects, evidence, required correction, and the specific proof to rerun before re-review.
- Do not implement corrections while reviewing. Record the defect and return the batch.

## Required Independent Proof

- Concurrent lane isolation: independently initialize two lanes, verify distinct IDs/slugs/state/locks, verify independent status.
- Ambiguous selection: independently trigger and verify actionable candidates.
- Shared-write refusal: independently trigger and verify diagnostic naming the conflicting lane.
- Multi-repo commit set: independently verify per-repository commits in the accept event.
- Partial push recovery: independently trigger one push failure, verify acceptance preserved, retry and verify recovery.
- Idempotency replay: independently replay a completed cycle and verify no duplicate effect.
- Copied-template ignored: independently verify not discovered, not inspected, not modified.

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/watchtower-release/reviews/REL-02-concurrent-recovery-trials-review.md`

Include: changed-file list, independent command executions with exit codes and key output, spec pass/fail counts, line counts, findings with severity and requirement references, confirmation that no state collision exists, that shared-write refusal works, that partial push preserves acceptance, that idempotency replay is correct, and the final verdict.

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the second of four release review batches. After acceptance, the next review batch is REL-03 (security, ownership, performance, and package qualification). Record the independent proof results, the exact acceptance commit hash, the fixture layout for concurrent lanes and multi-repo recovery, and the synchronized tracker state. The handoff must note that REL-03 review depends on REL-02 acceptance.
