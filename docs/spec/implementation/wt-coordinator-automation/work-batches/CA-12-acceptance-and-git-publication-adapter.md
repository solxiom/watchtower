# Batch CA-12 — Acceptance and Git Publication Adapter

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Effect adapters
Depends on: RM-08, CA-10 accepted
Owned files: `src/foundation/GitAcceptance.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** reviewer-session ownership enforcement, commit-set validation, partial push recovery with retry from known state, and the critical acceptance/ publication separation. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the Git acceptance adapter that bridges reviewer acceptance to Git
publication as a prepared effect. Reviewer-session ownership enforcement ensures
only the reviewer session that generated the acceptance proposal can trigger
the Git effect. Commit-set validation proves all proposed commits exist and
contain no unexpected files. Partial push recovery retries from a known state
when push fails mid-way. Publication is separate from acceptance — reviewer
acceptance is semantic; Git publication is the effect.

## Required TaskHandler, Git API Audit, And Leaf Shape

Implement acceptance/publication mechanics as a focused packaged TaskHandler
selected through `LaneTaskRunner` with a valid CA-10 single-use invocation
envelope. Before choosing the integration, audit pinned Nirvana Git APIs and
comparable Nirvana/Nira usage for repository identity, object/ref inspection,
ancestry/tree validation, push, result typing, credential/environment control,
and cancellation. Record exact symbols and evidence.

Use a conforming Nirvana Git API where it preserves the contract. Otherwise
record `NIRVANA_API_GAP` and use one manifest-declared bounded Git leaf through
`LeafRuntimeInvoker`, with closed typed operations/argv and no arbitrary remote,
refspec, config, executable, shell, environment, or path selection. The
TaskHandler performs mechanics and returns structured evidence; reviewer
ownership, semantic acceptance, effect authority, and durable journals stay
with their existing owners.

## Required Work

1. **Read the normative acceptance and publication contracts.** Study
   `v1-contracts.md §5` for the Git acceptance/publication effect types.
   Study `v1-contracts.md §11` for locking and recovery rules. Study
   `coordinator-automation.md §13` for acceptance and publication separation.
   Study accepted RM-08 for the repository bindings and writable conflict
   inspection contract.

2. **Implement `src/foundation/GitAcceptance.ts`:**
   - `GitAcceptanceAdapter` class — the sole Git publication authority for
     coordinator effects.
   - **Reviewer-session ownership enforcement:**
     - `validateReviewerOwnership(proposal: DecisionProposal, effectPlan: EffectPlan):
       OwnershipResult` — verifies that the `reviewerSessionId` recorded in
       the acceptance proposal matches the `operatorSessionId` of the reviewer
       who authored the ACCEPT event. Compares against the durable event journal
       (not session memory or in-process state). Fails with
       `GIT_OWNERSHIP_MISMATCH` if the session does not match.
     - Reviewer identity is derived from the durable `reviewer-accept` worker
       event's session metadata, not from Git author strings or commit
       metadata. Git author fields are untrusted evidence only.
   - **Commit-set validation:**
     - `validateCommitSet(proposed: CommitSet, repositories: RepositoryBinding[]):
       CommitSetValidationResult` — for every repository in the proposed
       commit set: verifies the commit SHA exists in the local repository,
       verifies the commit's tree matches the accepted pack's expected file
       set (no unexpected files), verifies the commit ancestry reaches the
       expected base, and verifies the repository is one of the lane's
       declared bound repositories.
     - Fails with `GIT_COMMIT_NOT_FOUND` if a SHA is missing,
       `GIT_UNEXPECTED_FILES` if unknown paths appear,
       `GIT_ANCESTRY_INVALID` if the parent chain is wrong, or
       `GIT_REPOSITORY_NOT_BOUND` if the repository is not a declared binding.
   - **Publication (Git push):**
     - `publish(commitSet: ValidatedCommitSet, repositories: RepositoryBinding[]):
       PublicationResult` — pushes each repository's verified commits to the
       configured remote. Submits a closed publication operation through
       `LaneTaskRunner` to the focused packaged Git TaskHandler; only that
       handler may invoke the cataloged Git leaf through `LeafRuntimeInvoker`
       (RT-05). Never uses shell or raw command-string construction.
     - **Partial push recovery:** Pushes are attempted in declared repository
       binding order. If push succeeds for repositories 1 and 2 but fails for
       repository 3, the adapter records a `publication-partial` event with the
       succeeded and failed repositories. Recovery does NOT re-push already-
       succeeded repositories; it retries only the failed ones from their known
       last-attempted ref. If retry also fails, the adapter records
       `publication-partial` again and marks the effect as
       `COORDINATOR_EFFECT_UNCERTAIN` for escalation. Accepted semantic state
       is never invalidated by publication failure.
     - `PublicationResult` type: `{ok, repositoryResults:
       RepositoryPublicationResult[], partialRecovery, escalated?}`.
     - `RepositoryPublicationResult` type: `{repositoryId, ref, remote,
       success, pushedSha?, error?, retryCount?}`.
   - **Acceptance/publication separation:**
     - The acceptance effect (`record-acceptance`) is separate from the
       publication effect (`publish-commits`). Acceptance writes the
       `batch-accepted` journal event; publication performs the Git push.
     - Acceptance can succeed even if publication fails. The durable
       acceptance event is never rolled back because Git push failed.
     - The adapter distinguishes `acceptProposal` (pure recognition of
       reviewer authority) from `publishCommits` (external Git effect)
       as distinct call paths.

3. **Integration with CA-10:**
   - CA-10's executor detects effect types `record-acceptance` and
     `publish-commits` and delegates to `GitAcceptanceAdapter`.
   - The prepare/attempt/verify journal phases apply to publication:
     - Prepare: validate reviewer ownership, validate commit set.
     - Attempt: execute `git push` per repository.
     - Verify: check remote ref state matches expected post-push ref.
   - Idempotency keys are shared — the adapter and CA-10 executor use
     the same key.

4. **Error taxonomy:**
   - `GIT_OWNERSHIP_MISMATCH` — reviewer session does not match acceptance
     proposal's session.
   - `GIT_COMMIT_NOT_FOUND` — a proposed commit SHA does not exist locally.
   - `GIT_UNEXPECTED_FILES` — the commit tree contains paths not in the
     accepted file set.
   - `GIT_ANCESTRY_INVALID` — the commit's parent chain is not the expected
     base.
   - `GIT_REPOSITORY_NOT_BOUND` — a repository is not in the lane's declared
     bindings.
   - `GIT_PUSH_FAILED` — `git push` returned a non-zero exit code.
   - `GIT_PUSH_PARTIAL` — some repositories pushed, others failed.
   - `GIT_REMOTE_UNKNOWN` — the remote configured in bindings does not exist.
   - `GIT_MERGE_CONFLICT` — remote has diverged; force push is not permitted.

## Expected Ownership

- `src/foundation/GitAcceptance.ts` — owns all Git operations for coordinator
  effects: reviewer ownership validation, commit-set verification, publication
  with partial recovery, and the acceptance/publication separation boundary.
- No other module may execute `git push` or validate reviewer ownership for
  coordinator acceptance effects.

## Tests And Evidence

- **Reviewer ownership match:** Create an acceptance proposal from session A.
  Verify ownership validation passes for session A and fails for session B
  (`GIT_OWNERSHIP_MISMATCH`).
- **Commit set valid:** Propose commits that exist locally with correct
  ancestry and expected files. Prove validation passes.
- **Commit not found:** Propose a SHA that does not exist. Prove
  `GIT_COMMIT_NOT_FOUND`.
- **Unexpected files:** Propose a commit whose tree includes paths outside
  the accepted file set. Prove `GIT_UNEXPECTED_FILES`.
- **Invalid ancestry:** Propose a commit whose parent chain does not reach
  the expected base. Prove `GIT_ANCESTRY_INVALID`.
- **Repository not bound:** Propose commits in a repository not declared in
  lane bindings. Prove `GIT_REPOSITORY_NOT_BOUND`.
- **Successful push:** Push verified commits to a test remote. Prove the
  ref updates and the publication result reports success.
- **Partial push recovery:** Set up three repositories. Make the third remote
  unavailable. Push. Prove repositories 1 and 2 succeed, repository 3 fails,
  and the result is `GIT_PUSH_PARTIAL`. Retry only repository 3. Prove recovery
  works.
- **Acceptance survives publication failure:** Record an acceptance. Fail the
  publication phase. Prove the durable acceptance event remains — the batch
  is semantically accepted even though publication is partial.
- **Idempotent replay:** Execute the same publication effect twice. Prove
  the second call detects the prior push state and does not re-push.
- **Model-free proof:** No model invocation in the Git acceptance adapter.

## What Must Not Change

- Do not combine acceptance and publication into a single effect type.
- Do not use Git author strings as reviewer-session ownership.
- Do not permit force push.
- Do not modify RM-08 repository bindings or CA-10's effect executor.

## Review Procedure Highlights

1. Independently verify every commit-set validation rule.
2. Prove reviewer ownership enforcement across session boundaries.
3. Simulate partial push and prove recovery path.
4. Prove acceptance durability through publication failure.
5. Prove no force push is permitted.

---

## Required Reasoning Posture

The adapter is a critical integrity boundary: confusing Git author metadata
with reviewer identity, combining acceptance and publication, or incorrectly
recovering from partial push could result in lost acceptance state,
unauthorized publication, or semantic acceptance being silently discarded.
The implementor must reason about every `git push` failure mode, every way a
commit set could be malformed, and every recovery path that preserves or loses
state.

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

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Targeted test results for every required proof above.
4. Proof that reviewer ownership comes from durable events, not Git metadata.
5. Partial-push recovery and acceptance-durability evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-10's typed interface confirmed compatible for both acceptance and
  publication effect types.
- CA-13 will consume this adapter alongside CA-11 for the full effect-adapter
  suite.
- Leave the exact error taxonomy, commit-set validation rules, and recovery
  algorithm for the next agent.
