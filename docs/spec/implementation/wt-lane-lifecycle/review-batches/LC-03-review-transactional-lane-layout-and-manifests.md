# Review Batch LC-03 — Transactional Lane Layout and Manifests

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
Paired work brief: `work-batches/LC-03-transactional-lane-layout-and-manifests.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md`

## Scope Verification

- [ ] `src/foundation/LaneStore.ts` created with lane directory layout, manifest generation, and final commit logic
- [ ] `src/foundation/TransactionalWriter.ts` created with adjacent staging, atomic rename, fsync, and rollback on failure
- [ ] Transactional layout: adjacent staging directory on same filesystem; atomic rename commit point; fsync before rename
- [ ] Rollback on every failure stage: write failure, fsync failure, rename failure, partial manifest generation
- [ ] `lane.json` schema validation: every required field, slug/ID patterns, repository uniqueness, control-home match
- [ ] `install.json` schema validation
- [ ] Duplicate lane rejection
- [ ] Pre-existing directory rejection
- [ ] Complete lane-directory layout: every subdirectory from v1.md §7.2
- [ ] Manifest written last (commit-point pattern)
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Adjacent staging**: verify the staging directory is created adjacent to the final lane directory on the same filesystem (not in /tmp or OS temp). Verify staging path format.
2. **Atomic commit**: verify that the lane directory either exists with all files intact or does not exist at all — no partial state visible to readers. Test by inspecting filesystem between staging write and rename.
3. **Failure injection — write failure**: simulate a write failure (e.g., disk full, permission denied on a staging file). Verify the entire transaction rolls back. Verify staging directory is cleaned up. Verify no partial lane directory exists.
4. **Failure injection — fsync failure**: simulate fsync failure. Verify rollback. Verify cleanup.
5. **Failure injection — rename failure**: simulate rename failure. Verify rollback. Verify cleanup.
6. **Failure injection — partial manifest generation**: simulate failure partway through manifest generation. Verify rollback.
7. **Manifest written last**: verify that in a successful transaction, `lane.json` and `install.json` are the last files written (after all subdirectories and other files). If manifests are written first and the transaction fails after, the lane could appear valid with missing internals — prove this cannot happen.
8. **`lane.json` schema validation**: test every required field present, correct slug pattern, correct ID format (UUID), unique repository entries, control-home matches workspace. Test invalid: missing slug, missing UUID, duplicate repository IDs, mismatched control home.
9. **`install.json` schema validation**: test valid and invalid fixtures.
10. **Duplicate lane**: attempt to init a lane with the same slug as an existing lane. Verify rejection with clear error.
11. **Pre-existing directory**: attempt to init into an existing `.watchtower/lanes/{slug}/` directory. Verify rejection.
12. **Complete layout**: verify every subdirectory from v1.md §7.2 exists after successful init. Verify permissions are correct (operator-owned, no world-writable).
13. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
14. Verify no model invocation in transactional writer or lane store.

## Required Reasoning Posture

The reviewer must independently verify transactional integrity. Treat the
implementation report's claims about atomicity as unverified until independently
reproduced. Re-run failure-injection tests. Verify that the staging-to-commit
sequence has no observable gap between staging write and rename where a reader
could see partial state. Verify that the manifest-last pattern is strictly
enforced — the manifest must not exist until every other file and directory
is committed.

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
failure-injection test matrix (every failure stage with result), staging/commit
verification details, structural verification results, line-count verification,
tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Adjacent staging on same filesystem proven.
- Atomic commit: no partial state observable.
- Every failure stage rolls back correctly with cleanup.
- Manifest written last — proven.
- `lane.json` and `install.json` schema validation correct.
- Duplicate lane rejected.
- Pre-existing directory rejected.
- Complete layout: all v1.md §7.2 subdirectories exist.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Partial state observable between staging and commit.
- Rollback on any failure stage does not clean up completely.
- Manifest written before other files are committed.
- Schema validation bypass.
- Duplicate lane allowed.
- Pre-existing directory overwritten.
- World-writable lane files.
- `any`-typed public interfaces.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
