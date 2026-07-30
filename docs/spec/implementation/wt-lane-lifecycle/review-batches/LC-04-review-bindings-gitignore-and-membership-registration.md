# Review Batch LC-04 — Bindings, Git-ignore, and Membership Registration

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

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-04-bindings-gitignore-and-membership-registration.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`

## Scope Verification

- [ ] `src/foundation/BindingMutator.ts` created with lock-ordered binding writes, conditional Git-ignore rollback, and digest tracking
- [ ] `src/foundation/MembershipRegistrar.ts` created with post-commit idempotent index registration and retry logic
- [ ] Lock acquisition order enforced: data-root catalog/membership-index lock, then lane lock, then session lock, then projection/index publication lock
- [ ] `.gitignore` update with atomic replace and original digest preservation
- [ ] Conditional rollback: current digest matches written value
- [ ] Membership index creation under its lock
- [ ] Post-commit registration with retry on failure
- [ ] Stale entries ignored on read (never repaired)
- [ ] Registration-warning surface on index-write failure
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Lock order verification**: instrument or trace lock acquisition calls. Verify that locks are acquired in the exact order: data-root → lane → session → projection/index. Prove that no inversion occurs in any code path (success, failure, rollback). Test with concurrent access simulation where lock inversion would cause deadlock.
2. **Binding schema validation**: valid binding fixture passes; invalid (missing required field, invalid path, duplicate repository ID) rejected.
3. **`.gitignore` presence check**: verify the file is checked before any write.
4. **`.gitignore` atomic update**: verify the original `.gitignore` is read, the new content is written to a temp file, and the temp file is renamed over the original atomically. Verify original content is preserved (not replaced). Verify new watcher entry is added.
5. **Original digest preservation**: compute SHA-256 of original `.gitignore` before modification. Verify the digest is stored (for rollback validation).
6. **Conditional rollback**: after writing, compute digest of current `.gitignore`. If it matches the expected post-write digest, the write was clean. If it does NOT match (interleaving write), the rollback condition triggers. Verify rollback restores original content. Verify rollback does not remove legitimate user additions.
7. **Membership index creation**: verify the index is created under the membership-index lock. Verify index format matches contract.
8. **Post-commit registration**: simulate a registration failure (e.g., permission denied on index file). Verify retry behavior. Verify that after retry exhaustion, the lane remains valid but a warning is surfaced.
9. **Idempotent registration**: register the same lane twice. Verify the second call does not duplicate entries. Verify the index remains valid.
10. **Stale entry handling**: create an index with a stale entry (pointing to a removed path). Verify reads report the entry as stale but do NOT remove or repair it. Verify no index mutation during read.
11. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.

## Required Reasoning Posture

The reviewer must independently verify lock ordering, atomic Git-ignore
operations, and idempotent registration. The lock order is a safety guarantee —
prove it is enforced in every code path. Do not accept implementation report
narrative about rollback correctness; rerun the rollback scenarios independently.
Verify that membership index reads never mutate the index file.

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
lock-order verification details, rollback scenario results, structural
verification results, line-count verification, tracker/roadmap sync status,
and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Lock order enforced in all code paths.
- `.gitignore` atomic update preserves original content.
- Conditional rollback proven on digest mismatch.
- Membership index created under its lock.
- Post-commit registration retries on failure.
- Idempotent registration: no duplicates.
- Stale entries reported but never repaired.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Lock inversion in any code path.
- `.gitignore` rollback removes user content.
- Non-atomic `.gitignore` replacement (partial writes visible).
- Membership index mutation during read.
- Duplicate entries from repeated registration.
- Auto-repair of stale entries.
- Silent registration failure without warning surface.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
