# Review Batch CA-12 — Acceptance and Git publication handler

## Synchronized batch execution matrix

- **Accepted-map title:** Acceptance and Git publication handler
- **Dependencies:** `RM-08`, `CA-10`
- **Exclusive ownership/interface:** focused TaskHandler and Git leaf/verification
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-12-acceptance-and-git-publication-adapter.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-12-acceptance-and-git-publication-adapter-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Paired work batch: CA-12
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/GitAcceptance.ts` is the only new
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

## Mandatory Nirvana/TaskHandler Proof

Reproduce the pinned Nirvana Git API audit and comparable ecosystem usage.
Trace publication through the valid CA-10 envelope and focused packaged
TaskHandler. If a Git leaf exists, require a named `NIRVANA_API_GAP`, a
manifest-declared `LeafRuntimeInvoker` boundary, closed typed operations/argv,
and rejection of caller-controlled remote/refspec/config/path/executable/
environment. Verify the handler owns mechanics only and cannot confer reviewer
acceptance or effect authority.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **focused TaskHandler and Git leaf/verification**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-08`, `CA-10`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **focused TaskHandler and Git leaf/verification** and **Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-12-acceptance-and-git-publication-adapter-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-12-acceptance-and-git-publication-adapter-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
