# Agent Launch Prompt — Work Batch REL-02

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.6 Sol` only with strong steering and explicit concurrent/recovery proof
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and concurrent/recovery fixture state in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and explicit concurrent/recovery proof
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and concurrent/recovery fixture state in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final implementation judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This batch is R5 because it exercises concurrent lane isolation (multiple lanes operating on one repository with per-lane locks and state), multi-repository commit verification (acceptance commits mapped to two independent Git repositories), shared-write conflict detection (worktree-level conflict identification with dedicated-vs-shared mode), partial-push recovery (one push succeeds, one fails, the lane remains recoverable), and idempotency replay across the decision/effect journal boundary.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **implementation work batch REL-02** — the concurrent and multi-repository recovery trials. This batch proves two isolated lanes can coexist without collision, multi-repository commits are verified per repository, shared-write conflicts are refused, partial push recovery preserves acceptance, idempotency replay returns the recorded outcome, and copied-template directories are ignored.

This batch does **not** exercise security exploits, performance scaling, or documentation audits. It tests the lane model's concurrency, isolation, and recovery boundaries.

## Read In This Order

Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.

1. `docs/spec/v1.md` — especially §7 (filesystem contract), §9 (discovery and lane selection), §13 (state and event compatibility), §14 (safety and concurrency).
2. `docs/spec/v1-contracts.md` — especially §10 (reviewer acceptance commit verification), §11 (locking, transactions, and recovery).
3. `docs/spec/architecture.md` — especially §5.3 (control home and participating repositories), §6 (read and write flows).
4. `docs/spec/coordinator-automation.md` — the coordinator execution contract, especially event/journal/replay mechanics.
5. `docs/spec/implementation/wt-v1-release/work-batches/REL-02-concurrent-and-multi-repository-recovery-trials.md` — this batch's work brief.
6. The REL-01 implementation report at `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md` — the predecessor handoff and any environmental limitations.
7. `docs/spec/implementation/wt-v1-release/README.md` and `implementation-quality-and-agent-rules.md`.
8. `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` and `implementation-tracker.md`.
9. The current source:
   - `src/foundation/LaneDiscovery.ts` (or equivalent) — lane discovery logic.
   - `src/foundation/LaneSelector.ts` (or equivalent) — selection precedence.
   - `src/foundation/LaneConflictInspector.ts` (or equivalent) — worktree conflict detection.
   - `src/foundation/RepositoryBindingStore.ts` (or equivalent) — repository binding resolution.
   - `src/foundation/FileLock.ts` (or equivalent) — per-lane lock acquisition.
   - `src/commands/InitCommand.ts` — init preflight.
   - `src/commands/StatusCommand.ts` — status reporting.
   - Coordinator journal, push journal, and idempotency key modules from accepted Pack 5 source.

## Reasoning / Agent Class

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and explicit concurrent/recovery proof
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and concurrent/recovery fixture state in context
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final implementation judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact lanes, repositories, bindings, locks, events, and journals exercised by these trials.
2. Verify REL-01 is accepted. Open the tracker and confirm REL-01 status is ✅. Read the REL-01 implementation report for environmental limitations.
3. Inspect the current source. Open the foundation modules that handle lane discovery, conflict inspection, repository binding, and locking. Understand the current behavior before writing fixtures that test it.
4. Enumerate public invariants, invalid states, failure precedence, compatibility constraints, and deliberately unsupported behavior:
   - Lock ordering: data-root → lane → session → projection. Verify no inversion.
   - Commit verification rules from `v1-contracts.md` §10.
   - Recovery rules from `v1-contracts.md` §11: partial push is recoverable, acceptance is never revoked.
   - Copied-template exclusion: `.watchtower/` without valid `lane.json` is invisible.
5. Use counterexamples: identify at least one plausible defect — such as two lanes sharing a lock file because of a path construction bug, a partial push silently revoking acceptance, a shared-write worktree being accepted without explicit override, an idempotency key collision producing a duplicate effect, or a copied-template directory being mistakenly discovered. Ensure focused proof rejects each.

## Structural Design And Module-Size Gate

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

## Your Mission

Prove concurrent lane isolation, multi-repository commit verification, shared-write refusal, partial push recovery, idempotency replay, and copied-template ignorance through e2e fixture-based evidence.

### Phase 0 — Pre-implementation Baseline

1. Start from a clean checkout. Verify REL-01 is accepted.
2. Record current git status and commit hash.
3. Run `nvb build` and `nvb test`. Record results.
4. Confirm the globally installed `wt` binary is available (from REL-01).

### Phase 1 — Concurrent Lane Isolation Trial

1. Create a fixture repository initialized as a Git repo with a committed valid implementation pack.
2. Initialize Lane A:
   ```bash
   wt init concurrent-a --tmux-prefix=ca --impl-pack=<fixture/path> --coordinator-routing=<routing.json> --update-gitignore --workspace=<fixture/repo>
   ```
3. Initialize Lane B:
   ```bash
   wt init concurrent-b --tmux-prefix=cb --impl-pack=<fixture/path> --coordinator-routing=<routing.json> --workspace=<fixture/repo>
   ```
   Note: Lane B shares the fixture repo but its lane directory is `.watchtower/lanes/concurrent-b/`, distinct from Lane A.

4. Verify isolation:
   ```bash
   wt list --workspace=<fixture/repo>
   ```
   Both lanes must appear with distinct lane IDs and slugs.

   ```bash
   wt status --lane=concurrent-a --workspace=<fixture/repo>
   wt status --lane=concurrent-b --workspace=<fixture/repo>
   ```
   Each status must reflect the correct lane identity. State files, config, and locks must be per-lane.

5. Test ambiguous selection:
   ```bash
   wt status --workspace=<fixture/repo>
   ```
   Without `--lane`, this must fail with an ambiguity error listing both lane IDs and slugs.

6. Test slug-based selection:
   ```bash
   wt status --lane=concurrent-a --workspace=<fixture/repo>
   ```
   Must resolve to Lane A only.

### Phase 2 — Shared-Write Refusal Trial

1. In the same fixture repository, create a dedicated Git worktree:
   ```bash
   git worktree add ../fixture-wt2 HEAD
   ```
2. Initialize Lane C on the dedicated worktree. Verify success.
3. Attempt to initialize Lane D on the same writable main worktree as Lane A without `dedicated` mode. Verify:
   - If the lane model requires dedicated worktrees by default: refusal with a clear diagnostic naming the conflicting lane.
   - If an explicit `shared` mode override exists: init with the override must be warned on every `wt status` and `wt doctor` run.
4. Run `wt status` on Lane C and verify a warning that its repository has other active lanes.

### Phase 3 — Multi-Repository Commit Set Trial

1. Prepare a second fixture repository (Repo B) with a different directory, initialized as a Git repo.
2. Create a `bindings.json` scope file mapping both repo IDs to their worktree paths.
3. Initialize a multi-repo lane:
   ```bash
   wt init multi-repo --tmux-prefix=mr --impl-pack=<fixture/path> --coordinator-routing=<routing.json> --scope=<bindings.json> --update-gitignore --workspace=<fixture/repo-a>
   ```
4. Verify `repositories.local.json` contains both bindings with correct paths, roles, and access modes.

5. Simulate a reviewer acceptance with a commit on both repositories:
   - Create commits on both repos.
   - Produce or simulate an `accept` event with `commits` mapping both repo IDs.
   - If the coordinator/effect executor accepts the event: verify both push journals are created.

### Phase 4 — Partial Push Recovery Trial

1. Using the multi-repo lane, set up a scenario where Repo A's push succeeds and Repo B's push fails:
   - Configure Repo B's remote to reject (e.g., point it at a non-existent remote or use a pre-receive hook that rejects).
   - Trigger publication through the effect executor.
2. Verify:
   - Repo A's push journal records success with the pushed commit hash.
   - Repo B's push journal records failure with the rejection reason.
   - `wt status` reports a warning about the partial push state.
   - The `accept` event remains authoritative — acceptance is not revoked.
3. Fix Repo B's remote and retry:
   - The retry must use the existing acceptance commit, not create a new one.
   - Repo B's push journal updates to success.

### Phase 5 — Idempotency Replay Trial

1. Using the coordinator journal, identify or create a completed cycle with a known idempotency key.
2. Attempt to replay the cycle. Verify the effect executor recognizes the key and returns the recorded outcome without repeating the external effect.
3. Document the idempotency key, original outcome, and replay outcome.

### Phase 6 — Copied-Template Fixture Trial

1. Create a copied-template directory structure:
   ```bash
   mkdir -p copied-repo/.watchtower/lanes/legacy-lane/
   echo '{"old_format": true}' > copied-repo/.watchtower/lanes/legacy-lane/lane.json
   ```
2. Run `wt list` from various locations relative to `copied-repo/`. Verify the legacy directory is not listed.
3. Run `wt doctor` from the copied-repo directory (if `--workspace` allows it). Verify the directory is not inspected and the command exits 3 (workspace/lane not found) or 0 (no lanes found).
4. Create a valid Watchtower lane in a separate directory. Verify `wt list` discovers only the valid lane.

### Phase 7 — Create E2E Specs

Create `spec/e2e/concurrent.spec.ts` and `spec/e2e/multi-repo.spec.ts`. Each spec must:

- Use real temporary directories created with `fs.mkdtemp` or equivalent.
- Initialize Git repositories in the temporary directories.
- Invoke the globally installed `wt` binary through the established Nirvana
  command/test-process harness with explicit argv, cwd, environment allowlist,
  stdio, timeout, and cancellation. If an acceptance-critical signal/process
  fixture exposes a pinned Nirvana API gap, record it and isolate direct
  `node:child_process` use behind one narrow test-only adapter.
- Clean up all temporary state in `afterAll` blocks.
- Assert exit codes, stdout content, and filesystem state using Jasmine matchers.
- Not import internal foundation modules directly (exercise the public CLI only).

### Phase 8 — Release Evidence

Write the release evidence to `.local/agent-reports/watchtower-release/REL-02-concurrent-recovery-trials.md` containing:

- Concurrent isolation evidence: commands, exit codes, status outputs for both lanes.
- Shared-write refusal evidence: refusal diagnostic, dedicated worktree success.
- Multi-repo commit set evidence: `accept` event content, push journal contents.
- Partial push recovery evidence: failure scenario, recovery scenario, journal contents.
- Idempotency replay evidence: original key, original outcome, replay outcome.
- Copied-template evidence: attempted discovery and non-modification proof.
- Final git status confirming no build artifacts staged.

## What You Must Not Do

- Do not add new product features, commands, or foundation modules.
- Do not mock the `wt` binary in e2e specs. Exercise the real installed binary.
- Do not silently accept a shared-write worktree without explicit override.
- Do not revoke semantic acceptance on partial push failure.
- Do not modify or import a copied-template directory.
- Do not commit `.local/`, `dist/`, `build/`, `node_modules/`, `.nira/local/`, or `.watchtower/` artifacts.
- Do not add npm convenience scripts or new package dependencies.

## Required Proof

- Concurrent lane isolation: two lanes, distinct IDs/slugs/state/locks, independent status.
- Shared-write refusal: detected, refused, diagnostic naming conflicting lane.
- Ambiguous selection failure: actionable candidates shown.
- Multi-repo commit verification: per-repository commits in accept event.
- Partial push recovery: one success, one failure, acceptance preserved, retry succeeds.
- Idempotency replay: duplicate key returns recorded outcome, no duplicate effect.
- Copied-template ignored: not discovered, not inspected, not modified.
- Architecture check: `nvb check:architecture` exits 0.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update after implementation: `implementation-tracker.md`, `implementation-roadmap.md`, `work-batches/00-work-batch-index.md`, `review-batches/00-review-batch-index.md`, and `v1-implementation-map.md`.

## Local Artifact Git Rule

- do not add `.local` artifacts to git

## Non-Negotiable Rules

- No product features are added.
- E2E spec exercises the real installed `wt` binary.
- Every claim has independently reproducible evidence.
- The implementer does not commit.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/watchtower-release/REL-02-concurrent-recovery-trials.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the second of four release qualification batches. After acceptance, the next batch is REL-03 (security, ownership, performance, and package qualification). Record the concurrent lane fixture layout, the multi-repo push recovery scenario, the idempotency key tested, and the copied-template fixture. The reviewer must independently reproduce the shared-write refusal, partial push recovery, and idempotency replay. REL-03 depends on REL-02 being accepted.
