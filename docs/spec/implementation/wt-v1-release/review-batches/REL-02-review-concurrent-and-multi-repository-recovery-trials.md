# Review Batch REL-02 — Concurrent and multi-repository recovery trials

## Synchronized batch execution matrix

- **Accepted-map title:** Concurrent and multi-repository recovery trials
- **Dependencies:** `REL-01`
- **Exclusive ownership/interface:** system acceptance fixtures
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery
- **Implementation report:** `.local/agent-reports/watchtower-release/REL-02-concurrent-and-multi-repository-recovery-trials.md`
- **Review report:** `.local/agent-reports/watchtower-release/reviews/REL-02-concurrent-and-multi-repository-recovery-trials-review.md`
- **Correction report:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-02-concurrent-and-multi-repository-recovery-trials-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending | Reviews work batch: REL-02
Work ID: `REL-02`
Governing spec: `docs/spec/v1.md` §§7, 9, 13, 14, 17; `docs/spec/v1-contracts.md` §§10, 11

**Required reviewer reasoning class:** `R5`
**Class rationale:** independent reproduction of concurrent lane isolation, multi-repository commit verification, shared-write conflict detection, partial Git push recovery, duplicate-cycle idempotency replay, and copied-template ignorance. The reviewer must verify: two lanes coexist on one repository without slug/state/lock collision, ambiguous selection fails with actionable candidates, shared-write worktree binds are refused with clear diagnostics, a multi-repository acceptance maps commits per repository correctly, a partial push failure does not revoke semantic acceptance, the retry path recovers without creating a new commit, duplicate idempotency keys return the recorded outcome without repeating external effects, and copied-template directories are never discovered or modified. The reviewer must independently re-execute every fixture, not accept the implementation report's conclusions. The class is a floor.

## Scope Verification

Confirm that the implementation produced:

1. `spec/e2e/concurrent.spec.ts` — concurrent lane isolation and shared-write refusal fixtures.
2. `spec/e2e/multi-repo.spec.ts` — multi-repository commit set, partial push recovery, idempotency replay, and copied-template fixtures.
3. `.local/agent-reports/watchtower-release/REL-02-concurrent-recovery-trials.md` — the release evidence packet.
4. Updated trackers (`implementation-tracker.md`, `implementation-roadmap.md`, work/review indexes, `v1-implementation-map.md`).
5. No new product features, commands, or foundation modules.
6. No mock that replaces the real `wt` binary where the spec requires real CLI/filesystem/Git operations.

## Required Independent Proof

### Contract pass

1. **Prerequisite verification:** Confirm REL-01 is marked accepted. Run `nvb build` and `nvb test` independently. Record commit hash.
2. **Concurrent lane isolation:** Independently initialize two lanes on the same fixture repository with distinct slugs. Verify distinct lane IDs, slugs, `.watchtower/lanes/<slug>/` directories, state files, config files, lock files. Run `wt list` from the control home and verify both appear. Run `wt status --lane=<slug>` for each and verify lane-specific identity.
3. **Ambiguous selection:** Without `--lane`, run `wt status` from a directory where both lanes are relevant. Verify the command fails with an ambiguity error listing both lane IDs and slugs as actionable candidates.
4. **Slug-based selection:** Run `wt status --lane=<slug-a>` and verify it resolves to Lane A only, not Lane B.
5. **State collision check:** Verify each lane has its own `state/`, `coordinator/`, `prompts/`, `reports/`, `budgets/`, `logs/` directories with no shared files. Verify lock files are per-lane.
6. **Shared-write refusal:** On the same writable main worktree as an existing lane, attempt `wt init` for a second lane. Verify refusal with a diagnostic naming the conflicting lane and worktree.
7. **Dedicated worktree isolation:** Create a dedicated Git worktree. Initialize Lane C on it. Verify success. Verify `wt status` on Lane A reports a warning that its repository has other active lanes.
8. **Multi-repository commit set:** Initialize a lane binding two repositories via a scope bindings file. Verify `repositories.local.json` contains both bindings with correct paths, roles, and access modes. Simulate or execute a reviewer acceptance with commits on both repos. Verify the `accept` event's `commits` map has entries for both repository IDs. Verify each commit exists and is reachable from its respective worktree branch tip.
9. **Partial push recovery:** Set up a scenario where one repo's push fails. Verify: succeeded repo's push journal records success with commit hash, failed repo's push journal records failure with rejection reason, `wt status` reports the partial push as warning, the `accept` event remains authoritative. Fix the push block and retry. Verify the retry uses the existing acceptance commit (no new acceptance), and the failed repo's push journal updates to success.
10. **Idempotency replay:** Identify a completed coordinator cycle with a known idempotency key. Replay it. Verify the effect executor returns the recorded outcome without repeating the external effect. Verify no duplicate event, tmux launch, or Git operation occurs.
11. **Copied-template ignorance:** Create a `copied-template/.watchtower/lanes/old-lane/lane.json` with invalid content (not a valid Watchtower lane.json). Run `wt list` from various locations. Verify the copied-template directory is not discovered. Verify no command modifies or inspects it.

### Flow pass

Trace the full concurrent and recovery pipeline end to end, executing every fixture in order. Record exact commands, exit codes, stdout (truncated if large), and execution time. Record any deviation from the implementation report's claimed outcome.

### Validation pass

1. **Fixture reproducibility:** Re-run each fixture from a clean checkout. Verify every step produces the same outcome as the implementation report.
2. **Negative case correctness:** For the shared-write refusal, verify the diagnostic names the conflicting lane explicitly. For ambiguous selection, verify candidates are actionable (lane ID and slug both shown).
3. **Journal integrity:** Inspect the coordinator journal, push journals, and decision journal. Verify events are valid JSONL with correct `schemaVersion`, `eventId`, `sequence`, `at`, `laneId`, `producer`, and type-specific payload.

### Architecture pass

1. **Source change scope:** Verify the diff touches only spec files (`spec/e2e/concurrent.spec.ts`, `spec/e2e/multi-repo.spec.ts`), trackers, and the release evidence report (`.local/`). No `src/` files changed.
2. **No feature additions:** Verify no new command class, foundation module, or contract type was created.
3. **Line counts:** Verify e2e spec files do not exceed the 400-line ceiling.
4. **Architecture check:** Independently run `nvb check:architecture`. Must exit 0.

### Test-quality pass

1. **E2E spec execution:** Independently run `spec/e2e/concurrent.spec.ts` and `spec/e2e/multi-repo.spec.ts`. Verify they pass with the globally installed `wt` binary. Record Jasmine pass/fail counts.
2. **Full test suite:** Run `nvb test` independently. Compare pass/fail counts to the REL-01 baseline. Any new failure not already documented is a defect.

### Security and compatibility pass

1. **No secrets in evidence:** Review the release evidence packet. Verify no password, token, connection URL, or credential appears.
2. **No lock collision:** Verify concurrent lanes do not share lock files. Each lane's lock file must be within its own `.watchtower/lanes/<slug>/state/` directory.
3. **No copied-template modification:** Verify no Watchtower command writes to, opens, or inspects the copied-template directory's `.watchtower/` contents beyond discovery exclusion.

## Nira/Watchtower-Specific Guardrails For Review

1. Verify `wt init` creates distinct directories per slug under `.watchtower/lanes/`.
2. Verify no `.watchtower/` directory is committed.
3. Verify no build, dist, node_modules, or `.nira/local/` artifacts are in git.
4. Verify push journals are per-repository and per-attempt.
5. Verify idempotency keys are deterministic and do not collide across different cycles.
6. Verify the coordinator journal format matches the accepted Pack 5 contract.

## Structural And Module-Size Acceptance

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

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

The review report must include:
- Changed-file list with ownership role.
- Independent execution: every command run, exit code, and key output.
- Pass/fail counts from independent spec execution.
- Line counts for new spec files.
- Any finding with severity, requirement reference, and recommended correction.
- Confirmation that two lanes coexist without collision.
- Confirmation that shared-write refusal names the conflicting lane.
- Confirmation that partial push preserves acceptance.
- Confirmation that idempotency replay returns the recorded outcome.
- Confirmation that no build artifacts are staged.
- Final verdict: ACCEPT or REJECT.

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

## Reject Conditions

Reject if any of the following is true:
- Two lanes on the same repository share the same slug, lock file, or state directory.
- Ambiguous selection silently succeeds (picks one lane arbitrarily).
- Shared-write worktree binding is silently accepted.
- Multi-repository acceptance commits are not per-repository or not reachable.
- Partial push failure causes semantic acceptance to be revoked.
- Duplicate idempotency key produces a new external effect.
- A copied-template directory is discovered, listed, or modified by any Watchtower command.
- An e2e spec mocks the `wt` binary or bypasses the real CLI/filesystem/Git.
- Any product feature was added.
- A prohibited artifact is committed.

## Verdict, Correction, And Commit Ownership

- On rejection, create `corrections/REL-02-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun.
- On acceptance, synchronize trackers, create the reviewer-owned acceptance commit, write the durable review report to `.local/agent-reports/watchtower-release/reviews/REL-02-concurrent-recovery-trials-review.md`, and settle the ACCEPT verdict.
- REL-03 is blocked until REL-02 is accepted.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **system acceptance fixtures**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/watchtower-release/reviews/REL-02-concurrent-and-multi-repository-recovery-trials-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`REL-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **system acceptance fixtures** and **Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/watchtower-release/reviews/corrections/REL-02-concurrent-and-multi-repository-recovery-trials-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/watchtower-release/reviews/REL-02-concurrent-and-multi-repository-recovery-trials-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
