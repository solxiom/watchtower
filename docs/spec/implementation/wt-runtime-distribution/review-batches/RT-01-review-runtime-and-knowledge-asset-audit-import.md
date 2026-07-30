# Review Batch RT-01 — Runtime and Knowledge Asset Audit/Import

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

Status: ❌ Pending
Reviews work batch: RT-01
Depends on: RT-01 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent protection of asset completeness and provenance accuracy despite bounded audit work. The class is a floor; escalate under the lane reasoning rules when source inspection exposes additional risk.

## Scope Verification

Confirm that this batch audited and classified every inherited shell runtime
script and coordinator knowledge doc with complete provenance, and that no
asset was modified, executed, or newly created during audit. Every script must
have one defensible TaskHandler/leaf/temporary-wrapper/removal disposition.

## Required Independent Proof

1. Independently enumerate every shell runtime script in the inherited
   `implementation-lane-coordinator` source. Compare the count with the audit
   records in `src/foundation/RuntimeAssets.ts`.
2. Independently enumerate every coordinator knowledge doc in the inherited
   source. Compare the count with the audit records.
3. For every recorded runtime asset, independently compute SHA-256 of the
   inherited source content and compare with the recorded digest.
4. Cross-reference the behavioral inventory against
   `docs/spec/coordinator-automation.md`. Verify every coordinator action has at
   least one script or doc entry.
5. Verify every script/doc in the inventory maps to at least one coordinator
   action (no orphan entries).
6. Verify the import provenance record contains source repository URI, commit
   hash, and import date.
7. Independently verify every script's inputs/outputs, mutation and authority
   assumptions, external tools, and migration class. Reject workflow,
   validation, copying, journaling, or projection shell retained as a leaf.
   Require every temporary wrapper to name its TaskHandler owner, removal batch,
   compatibility reason, and expiry.
8. Confirm this batch did NOT modify any inherited content, execute any script,
   or introduce shell execution/subprocess/catalog logic.
9. Run architecture checks. Confirm no runtime execution path was introduced.

## Required Reasoning Posture

The assigned agent must reason from the inherited source and governing
specifications, not from the batch title or predecessor report alone.

- Map every inherited script to one runtime role and one or more coordinator
  actions. Verify the audit agrees.
- Map every inherited knowledge doc to one behavioral role and one or more
  governed actions. Verify the audit agrees.
- Enumerate the complete set of v1 coordinator actions from
  `docs/spec/coordinator-automation.md` and cross-reference against the
  inventory.
- Identify any action that lacks a script or doc — this is a spec/import gap,
  not an audit error. Record it honestly in the review report.

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

## Acceptance Gate

Accept only if every inherited script and doc is accounted for, SHA-256 digests
match inherited source, the behavioral inventory is complete with no orphans,
provenance is recorded, and no shell execution or subprocess logic was introduced.

## Rejection Correction Brief Rule

If rejected, create a correction brief under:

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-01-correction-<N>.md`

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-01-runtime-and-knowledge-asset-audit-import-review.md`

If accepted, create the acceptance commit for all accepted non-`.local` changes.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists

When you work always plan and make task lists and todos!
