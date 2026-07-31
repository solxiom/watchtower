# Batch RM-06 — Home-lane discovery and deterministic selection

## Synchronized batch execution matrix

- **Accepted-map title:** Home-lane discovery and deterministic selection
- **Dependencies:** `RM-03`, `RM-04`
- **Exclusive ownership/interface:** discovery/selection foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-06-home-lane-discovery-and-selection-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-06-home-lane-discovery-and-selection-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **discovery/selection foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-04`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **discovery/selection foundation** and **Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
