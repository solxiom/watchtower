# Batch REL-02 — Concurrent and multi-repository recovery trials

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

Status: ❌ Pending
Phase: Release qualification
Depends on: REL-01 accepted
Work ID: `REL-02`
Governing spec: `docs/spec/v1.md` §§7, 9, 13, 14; `docs/spec/v1-contracts.md` §§10, 11

**Required implementor reasoning class:** `R5`
**Class rationale:** concurrent lane isolation, multi-repository commit verification, shared-write conflict detection, partial Git push recovery, and duplicate-cycle idempotency replay. The state space spans lock ordering, per-repository push/journal integrity, lane-state recovery after partial failure, and idempotency key replay across decision/effect boundaries. Multiple lanes operating on one repository require careful fixture sequencing and assert-after-effects reasoning. The class is a floor; the reviewer must not be on a lower reasoning tier.

## Objective

Prove that two isolated lanes can coexist on one repository without slug or state collision. Prove that a lane binding multiple repositories records per-repository acceptance commits correctly and recovers from a partial Git push. Prove shared-write worktree conflicts are detected and refused. Prove duplicate cycle idempotency keys return the recorded outcome without repeating the effect. Prove copied-template directories are ignored and never modified.

This batch does **not** build on security exploits, performance scaling, or documentation audits. It exercises the lane model's concurrency, recovery, and isolation boundaries.

## Required Work

### Phase 1: Read and understand the current lane model

Open and read the relevant accepted source:

1. `src/foundation/` — LaneDiscovery, LaneSelector, LaneConflictInspector, RepositoryBindingStore, FileLock.
2. `src/commands/InitCommand.ts` — init preflight including lane-existence check and gitignore guard.
3. `src/commands/StatusCommand.ts` — status reporting including conflicts and repository bindings.
4. `docs/spec/v1-contracts.md` §10 — reviewer acceptance commit verification rules.
5. `docs/spec/v1-contracts.md` §11 — locking, transactions, and recovery rules.
6. The coordinator journal format and push journal format from accepted Pack 5 source.

### Phase 2: Concurrent lane isolation trial

1. Prepare a fixture repository with a valid implementation pack (reuse or extend the REL-01 fixture).
2. Initialize two lanes with different slugs on the same control home:
   - Lane A: `wt init concurrent-a --tmux-prefix=ca --impl-pack=<path> --coordinator-routing=<path> --update-gitignore`
   - Lane B: `wt init concurrent-b --tmux-prefix=cb --impl-pack=<path> --coordinator-routing=<path> --update-gitignore`
3. Verify isolation:
   - Both lanes have distinct `.watchtower/lanes/<slug>/` directories.
   - Both lanes have distinct `laneId` UUIDs and slugs.
   - Both lanes have distinct `lane.json` with correct `controlHomeRepository`.
   - `wt list` from the control home shows both lanes.
   - `wt status --lane=concurrent-a` and `wt status --lane=concurrent-b` return correct lane-specific status.
   - Selecting by slug with `--lane=concurrent-a` resolves to Lane A, not Lane B.
   - Ambiguous selection (no `--lane` flag when both are relevant) fails with actionable candidates listing both lanes.
4. Verify no state collision:
   - Each lane has its own `state/`, `coordinator/`, `prompts/`, `reports/`, `budgets/`, `logs/` directories.
   - Lock files are per-lane (`.watchtower/lanes/<slug>/state/lane.lock`).
   - Config files are per-lane.

### Phase 3: Multi-repository commit set trial

1. Prepare a fixture with two Git repositories:
   - Repo A: the control home repository.
   - Repo B: a secondary participating repository.
2. Initialize a lane binding both repositories:
   ```bash
   wt init multi-repo \
     --tmux-prefix=mr \
     --impl-pack=<path> \
     --coordinator-routing=<path> \
     --scope=<bindings.json> \
     --update-gitignore
   ```
   Where `bindings.json` maps both repository IDs to their local worktree paths.
3. Verify `repositories.local.json` contains both bindings with correct roles and access.
4. Simulate (or execute) a reviewer acceptance of a batch that modified both repositories:
   - The `accept` event's `commits` map has entries for both repository IDs.
   - Each commit exists and is reachable from its respective worktree branch tip.
   - The commit was created after reviewer launch.
   - Per-repository push journals are created for both.

### Phase 4: Shared-write refusal trial

1. Prepare a fixture repository with a dedicated worktree (Lane A already initialized there).
2. Attempt to initialize a second lane binding the same writable worktree in `shared` mode without explicit override:
   ```bash
   wt init shared-test --tmux-prefix=st --impl-pack=<path> --coordinator-routing=<path> --scope=<same-write-path>
   ```
   Verify refusal. The diagnostic must identify the conflicting lane and worktree.
3. Create a second dedicated worktree from the same repository.

#### Phase 4a — Dedicated worktree coexistence (implementer-owned)

4. Initialize Lane B on the dedicated worktree. Verify success — dedicated worktrees are isolated.
5. Run `wt status` and `wt doctor` on Lane A immediately after Lane B's init. Verify both succeed and Lane A's status `conflicts` does not falsely report a writable-path collision against Lane B (distinct worktree paths are isolated).

#### Phase 4b — Same-repository cross-worktree warning (deferred product corroboration)

A `wt status`/`wt doctor` warning that another active lane binds the same underlying repository on a different dedicated worktree is **not** a REL-02 deliverable after this amendment. The shipped product compares writable bindings by literal path only; no status warning code or doctor check emits this today. REL-02 records the gap (`SAME_REPOSITORY_DIFFERENT_WORKTREE_WARNING_GAP`) with source-backed negative proof in the e2e fixture. Full cross-worktree related-lane surfacing remains corroboration for a separately-owned product batch.

### Phase 5: Partial push recovery trial

1. Using the multi-repository lane from Phase 3:
   - Accept a batch that modified both repositories.
   - Simulate a push failure on Repo B (e.g., by setting a protected branch or using a mock Git remote that rejects).
   - Attempt publication.
2. Verify the outcome (implementer-owned journal and API proof):
   - Repo A's push succeeds. Its push journal records success (`verified` phase).
   - Repo B's push fails. Its push journal records failure with the rejection reason (`uncertain` or `failed` phase and typed outcome).
   - The lane does **not** revoke semantic acceptance. The `accept` event remains authoritative.
   - `GitAcceptanceAdapter.publishCommits` reports `partialRecovery: true` with per-repository results.
3. Retry the failed push after the simulated block is removed. Verify Repo B's push succeeds, its push journal updates to `verified` at a later sequence, and primary's original journal record is unchanged.

#### Phase 5b — Status partial-push warning (deferred product corroboration)

`wt status` reporting partial-push state via a stable warning is **not** a REL-02 deliverable after this amendment. Status projection does not read the push/effect journal today (`WT_STATUS_PUSH_JOURNAL_WARNING_GAP`). REL-02 records the gap with source-backed negative proof. Surfacing partial push on `wt status` remains corroboration for a separately-owned product batch.

### Phase 6: Idempotency replay trial

1. Trigger a coordinator cycle that produces a deterministic M0 effect (e.g., ready-unique dispatch or recording acceptance).
2. Record the cycle's idempotency key and outcome from the decision/effect journal.
3. Replay the same cycle with the same idempotency key. Verify:
   - The effect executor recognizes the key as already completed.
   - The recorded outcome is returned without repeating the external effect.
   - No duplicate event, tmux launch, or Git operation occurs.
4. Trigger an uncertain cycle (simulate a crash by interrupting the effect after the external operation but before the journal write, if the runtime supports this fixture).
5. Replay the uncertain cycle. Verify the outcome is recovered from the external effect state (e.g., tmux session exists, commit is pushed) rather than repeated.

### Phase 7: Copied-template fixture trial

1. Create a directory that mimics a pre-Watchtower copied-template lane:
   ```bash
   mkdir -p copied-template/.watchtower/lanes/old-lane/
   echo '{"not": "a valid lane.json"}' > copied-template/.watchtower/lanes/old-lane/lane.json
   ```
   (Note: `lane.json` exists but lacks the Watchtower schema fields.)
2. Run `wt list` and `wt status` from various locations near the copied-template directory. Verify:
   - The directory is not discovered as a Watchtower lane.
   - No inspection or modification of the directory occurs.
3. Create a valid Watchtower lane nearby. Verify `wt list` discovers only the valid lane, not the copied-template directory.

### Phase 8: Create e2e specs

Create `spec/e2e/concurrent.spec.ts` and `spec/e2e/multi-repo.spec.ts` as TypeScript Jasmine specs.

#### `concurrent.spec.ts`

- Two lanes initialized on one repository: verify distinct lane IDs, slugs, directories, state files.
- Ambiguous selection failure: verify two closely named lanes produce actionable candidates.
- Shared-write refusal: verify a second lane cannot bind an existing writable worktree.
- Dedicated worktree isolation: verify two lanes on separate dedicated worktrees coexist.
- Status reporting: verify each lane's status is correct and independent.
- Lock files: verify per-lane locks do not block the other lane's operations.

#### `multi-repo.spec.ts`

- Multi-repo init: verify `repositories.local.json` contains all bindings.
- Per-repository acceptance commits: verify the `accept` event maps each repository correctly.
- Partial push recovery: verify push failure on one repo does not revoke acceptance.
- Push journal integrity: verify success/failure records are correct.
- Idempotency replay: verify duplicate key returns recorded outcome.
- Copied-template ignore: verify pre-Watchtower directories are not discovered or modified.

#### Test architecture

- E2E specs use temporary directories created via `fs.mkdtemp` or equivalent.
- Git repositories are initialized with `git init` in the temporary directories.
- Invoke the globally installed `wt` binary through the established Nirvana
  command/test-process harness with explicit argv, cwd, environment allowlist,
  stdio, timeout, and cancellation. Direct `node:child_process` is permitted
  only behind one narrow test-only adapter when recorded API-gap evidence shows
  the Nirvana facade cannot reproduce an acceptance-critical process behavior.
- All fixture state is cleaned up in `afterAll` blocks.
- Spec files follow existing naming and import conventions.

### Batch REL-02 required proof

REL-02 owns these verification areas:
- Concurrent lane isolation with no state collision.
- Multi-repository commit set verification and per-repository acceptance.
- Shared-write worktree conflict detection and refusal.
- Ambiguous multi-lane selection with actionable candidates.
- Partial Git push recovery with per-repository push journals.
- Duplicate cycle idempotency replay.
- Copied-template lane ignored and never modified.
- Reviewer acceptance durable and distinct from partial publication.

## Structural Constraints

- E2E spec files follow existing Jasmine conventions: TypeScript, `describe`/`it` blocks, async subprocess orchestration.
- No new product source modules are created.
- Temporary fixture directories are created within `/tmp` or a `.local/` test area, never committed.
- Spec files must not exceed the 400-line ceiling; split by concern (concurrent, multi-repo, recovery) if needed.

## Reject Conditions

- A shared-write worktree is silently accepted by init.
- Two lanes on the same repository collide on slug, state, lock, or tmux prefix.
- Partial push failure causes semantic acceptance to be revoked.
- Duplicate idempotency key produces a new effect rather than the recorded outcome.
- A copied-template directory is discovered, inspected, or modified by any Watchtower command.
- An e2e spec mocks the `wt` binary or bypasses the real CLI/filesystem/Git.
- The `hello` scaffold reappears in any form.

## Expected Ownership

- `spec/e2e/concurrent.spec.ts` — concurrent lane isolation and shared-write refusal fixtures.
- `spec/e2e/multi-repo.spec.ts` — multi-repository commit set, partial push recovery, idempotency replay, and copied-template fixtures.
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md` — updated with REL-02 status.
- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md` — updated with REL-02 status.
- `.local/agent-reports/watchtower-release/REL-02-concurrent-recovery-trials.md` — release evidence packet.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **system acceptance fixtures**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/watchtower-release/REL-02-concurrent-and-multi-repository-recovery-trials.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`REL-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **system acceptance fixtures** and **Two isolated lanes; multi-repo commit set; shared-write refusal; partial push recovery**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/watchtower-release/REL-02-concurrent-and-multi-repository-recovery-trials.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
