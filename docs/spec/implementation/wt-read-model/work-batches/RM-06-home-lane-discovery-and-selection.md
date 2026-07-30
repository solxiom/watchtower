# Batch RM-06 — Home-Lane Discovery And Deterministic Selection

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
Phase: Discovery
Depends on: RM-03, RM-04 accepted

**Required implementor reasoning class:** `R5`
**Class rationale:** discovery with complete ambiguity matrix and symlink/case safety across descendant walks; any missing cell in the selection matrix produces silent wrong behavior.

## Objective

Walk up from cwd to find lane roots. Select by UUID, slug, or deduce single
lane. Complete ambiguity matrix: no lanes, single lane, multiple lanes, invalid
lane.json.

## Required Work

1. Create `src/foundation/laneDiscovery.ts`: home-lane discovery.
   Walk up from cwd through parent directories. At each level, inspect
   `.watchtower/lanes/*/lane.json`. Validate each `lane.json` (schemaVersion,
   laneId, kind, slug required). Return discovered lanes. Non-Watchtower
   directories without `lane.json` are silently skipped.
2. Create `src/foundation/LaneSelector.ts`: deterministic lane selection
   following v1.md §9.3 precedence. UUID exact match → slug match among
   relevant → cwd-descendant deduction → single deductible → ambiguity error
   with candidate listing. Combine with discovery to provide a single
   `resolveLane(context)` function.
3. Write focused specs: walk-up discovery from cwd, lane-dir discovery,
   descendant discovery; selection precedence for every matrix cell; zero
   lanes, single lane, multiple lanes, invalid lane.json, missing schemaVersion;
   symlink/case safety during walk.

## Expected Ownership

- `src/foundation/laneDiscovery.ts`, `src/foundation/LaneSelector.ts`
- Respective focused specs.

## Tests And Evidence

- Discovery: walk from cwd finds lanes; walk from lane dir finds itself;
  walk from descendant finds ancestor lane; non-Watchtower dirs ignored.
- Selection: UUID exact match (found and not-found); slug match among
  relevant lanes (found and not-found); cwd-descendant deduction; single-lane
  deduction; ambiguity with candidate listing.
- Complete matrix: 0 lanes → not-found error; 1 lane → selected; 2+ lanes
  with no deduction → ambiguity error with IDs and slugs; invalid lane.json
  → invalid error; missing schemaVersion → invalid error.
- Symlink/case safety: resolved paths used in comparison.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not implement an interactive picker.
- Do not scan non-Watchtower `.watchtower/` layouts.
- Do not silently select when ambiguous.
- Do not repair invalid lane.json.

## Review Procedure Highlights

1. Verify every cell in the ambiguity matrix has a focused test.
2. Trace walk-up discovery through symlinks and case variants.
3. Confirm ambiguity error includes lane IDs, slugs, initiatives, kinds,
   and control homes.
4. Verify non-Watchtower directories are ignored.

## Required Reasoning Posture

Per the quality rules. Draw the complete ambiguity matrix before coding.
Prove every cell. Test symlink resolution during walk.

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

Include: changed files, line counts, matrix coverage, proof commands.

## Completion And Handoff

Home-lane discovery and selection are accepted. RM-07, RM-08, and RM-10
consume these services. Every command requiring a lane delegates to
`resolveLane`. No command may reimplement lane selection.
