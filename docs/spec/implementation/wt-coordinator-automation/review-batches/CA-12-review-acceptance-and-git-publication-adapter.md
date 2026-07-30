# Review Batch CA-12 — Acceptance and Git Publication Adapter

Status: ❌ Not started
Paired work batch: CA-12
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/git-acceptance.ts` is the only new
   file introduced by this batch. No other module gained Git push, acceptance, or
   publication capability.
2. **Dependency direction:** Verify the adapter depends on CA-10's typed
   external-effect interface and RM-08's repository binding contract, not the
   reverse. No CA-10 or RM-08 internals were modified.
3. **Spec compliance:** The `record-acceptance` and `publish-commits` effect
   types are distinct. Acceptance survives publication failure — the durable
   acceptance event is never rolled back due to `git push` failure.
   Reviewer-session ownership is validated from durable worker events, not Git
   metadata. Commit-set validation checks SHA existence, tree contents, ancestry,
   and repository binding as defined in `v1-contracts.md §5`.
4. **Layer integrity:** No coordinator policy, routing, semantic judgment,
   or model invocation in the adapter. No direct shell execution — all Git
   commands route through RT-05.
5. **Acceptance/publication separation audit:** Verify `recordAcceptance` and
   `publishCommits` are distinct call paths. Prove that acceptance does not call
   `git push` and publication does not alter the acceptance journal.
6. **Force-push audit:** Verify that no code path permits `--force`, `-f`,
   `--force-with-lease`, or any equivalent to reach the `git push` argv.

## Required Independent Proof

- **Reviewer ownership:** Create acceptance proposals from two different
  sessions. Prove only the owning session passes validation; the other fails
  with `GIT_OWNERSHIP_MISMATCH`.
- **Commit-set validation — found:** Propose valid commits. Prove validation
  passes.
- **Commit-set validation — not found:** Propose a non-existent SHA. Prove
  `GIT_COMMIT_NOT_FOUND`.
- **Commit-set validation — unexpected files:** Propose a commit whose tree
  includes paths outside the accepted file set. Prove `GIT_UNEXPECTED_FILES`.
- **Commit-set validation — ancestry:** Propose a commit whose parent chain
  diverges. Prove `GIT_ANCESTRY_INVALID`.
- **Commit-set validation — binding:** Propose commits in an unbound repo.
  Prove `GIT_REPOSITORY_NOT_BOUND`.
- **Successful push:** Push verified commits. Verify remote ref is correct.
- **Partial push recovery:** Configure three repos. Make the third unreachable.
  Push. Verify repos 1 and 2 succeed. Retry only repo 3. Prove recovery.
- **Acceptance resilience:** Record acceptance. Simulate push failure. Verify
  the acceptance event is still present and marked accepted in the journal.
- **Idempotent replay:** Push, then push again with the same key. Verify no
  duplicate push occurs and the recorded outcome is returned.
- **No force push:** Search the adapter source for any force-push flag
  construction. Prove none exists.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Model-free audit:** grep the adapter for any model invocation. Prove none.
- **Layer audit:** Verify no imports from CLI, session, watcher, or routing.

## Required Reasoning Posture

The reviewer must independently reason through every failure mode in the
`git push` pipeline: no remote, auth failure, network loss during push,
merge conflict, and partial multi-repo push. The reviewer must prove that
acceptance durability is never coupled to publication success. The reviewer
must prove reviewer identity never derives from Git author metadata.

## Structural And Module-Size Acceptance

- `src/foundation/git-acceptance.ts` ≤350 lines. Verify physical line count.
  At 221+, require a responsibility inventory. At 301+, require a source-backed
  justification for not splitting into `git-ownership.ts`,
  `git-commit-validation.ts`, and `git-publication.ts`.
- Test modules ≤300 lines. Verify split by ownership, commit validation,
  publication, recovery, and idempotency families.

## Required Review Packet

1. Independent re-execution of every commit-set validation rule.
2. Independent reviewer-ownership mismatch proof.
3. Partial-push recovery re-execution.
4. Acceptance-durability proof through publication failure.
5. Force-push audit evidence.
6. `nvb build` and `nvb test` output.
7. Model-free and layer-integrity audit results.

## Acceptance Gate

The batch is accepted only when:
- Acceptance and publication are distinct call paths and effect types.
- Reviewer ownership is validated from durable worker events, not Git metadata.
- Every commit-set validation rule correctly passes valid and rejects invalid.
- Successful push updates the remote ref correctly.
- Partial push recovery retries only failed repositories.
- Acceptance survives publication failure — the durable acceptance event remains.
- Idempotent replay does not re-push.
- Force push is never permitted.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations in adapter code.
- Layer dependencies point only to CA-10 and RM-08.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Acceptance and publication are conflated into a single effect or code path.
- Git author strings are used as reviewer-session ownership.
- Force push is permitted by any means.
- The adapter invokes a model.
- The adapter bypasses CA-10's typed interface.
- The adapter modifies RM-08 or CA-10 internals.
- Idempotency key is not checked before publication.
- Publication failure rolls back or discards the acceptance event.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer acceptance.
