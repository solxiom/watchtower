# Review Batch RM-08 — Repository bindings and writable conflict inspection

## Synchronized batch execution matrix

- **Accepted-map title:** Repository bindings and writable conflict inspection
- **Dependencies:** `RM-03`, `RM-07`
- **Exclusive ownership/interface:** repository/conflict foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Canonical bindings; branch/worktree/access checks; claim overlap matrix
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-08-repository-bindings-and-conflict-inspection-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-08-repository-bindings-and-conflict-inspection-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-08-repository-bindings-and-conflict-inspection.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`

## Scope Verification

- [ ] `src/foundation/repositoryBindings.ts` with canonical repository binding computation
- [ ] `src/foundation/writableConflicts.ts` with writable conflict inspection

## Required Independent Proof

1. **Canonical binding computation**: Create a `repositories.local.json` with valid bindings. Verify each binding computes branch, worktree mode, and access correctly from resolved canonical paths.
2. **Branch verification**: Verify bindings validate the current branch against git HEAD. Test with matching branch, mismatched branch, and detached HEAD.
3. **Worktree mode classification**: Verify dedicated and shared worktree modes are correctly classified. Confirm dedicated is the default when no explicit mode is declared.
4. **Access mode validation**: Verify read and write access modes are validated. Confirm write access requires explicit declaration.
5. **Claim overlap — shared-write**: Create two active lanes that claim write access on the same worktree without a shared-write override. Verify the conflict is detected and reported with conflicting lane identities.
6. **Claim overlap — path-conflict**: Create two lanes with exclusive-write claims on overlapping paths. Verify the conflict is detected with the overlapping path and conflicting lane identities.
7. **Claim overlap — branch-conflict**: Create two lanes on the same repository but different branches sharing a writable worktree. Verify the conflict is detected.
8. **Missing/unreadable repository**: Verify a repository path that does not exist or is unreadable produces a clear error diagnostic rather than a null binding.
9. **No false positives**: Verify that non-conflicting lanes (different worktrees, read-only access, non-overlapping paths) do not produce false conflict reports.
10. Run `nvb build` and `nvb test` independently.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every binding and conflict
source independently. Verify the claim-overlap matrix covers all three conflict
classes as specified in the product spec. Confirm dedicated worktree is the
default and shared-write is an explicit override.

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

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All three conflict classes detected and reported with correct diagnostics.
- Dedicated worktree is the default; shared-write requires explicit override.
- Missing repositories produce errors, not null bindings.
- No false positive conflicts.
- Build and tests pass independently.

## Reject Conditions

- Missing or misclassified conflict class.
- Shared-write silently accepted as default.
- Missing repository produces null binding instead of error.
- False conflict detections.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **repository/conflict foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-08-repository-bindings-and-conflict-inspection-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-07`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Canonical bindings; branch/worktree/access checks; claim overlap matrix**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **repository/conflict foundation** and **Canonical bindings; branch/worktree/access checks; claim overlap matrix**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-08-repository-bindings-and-conflict-inspection-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-08-repository-bindings-and-conflict-inspection-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
