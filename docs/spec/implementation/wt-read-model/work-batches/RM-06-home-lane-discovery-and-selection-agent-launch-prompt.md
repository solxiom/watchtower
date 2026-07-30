# Agent Launch Prompt — Work Batch RM-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `highest available`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `highest available for complete-ambiguity-matrix reasoning`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. For `R5`, use the strongest available
reasoning configuration with sufficient context for exhaustive matrix reasoning.

You are assigned **implementation work batch RM-06** for the Watchtower v1
wt-read-model delivery lane.

This batch implements home-lane discovery and deterministic lane selection with
a complete ambiguity matrix. Any missing cell in the matrix produces silent
wrong behavior.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-06-home-lane-discovery-and-selection.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §9 — Discovery and lane selection)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/discovery.ts` (create)
    - `src/foundation/lane-selector.ts` (create)
    - `src/foundation/paths.ts` (from RM-03 — consumed)
    - `src/foundation/workspace.ts` (from RM-03 — consumed)

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `highest available for complete-ambiguity-matrix reasoning`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Draw the complete ambiguity matrix before writing code: enumerate every
   combination of lanes discovered, UUID match, slug match, cwd context, and
   lane.json validity. Verify every cell has an expected result.
2. Inspect the current source and accepted RM-03/RM-04 output.
3. Enumerate every selection precedence rule from v1.md §9.3.
4. Use counterexamples: two lanes with the same slug in different control homes,
   a lane.json with missing required fields, a directory walk through a
   symlinked parent.
5. Build fixture workspace trees in test setup.
6. Never implement an interactive picker or repair invalid lane.json.

## Structural Design And Module-Size Gate

Per quality rules. Discovery and selection should be separate owners.

## Your Mission

Implement home-lane discovery and deterministic selection:

1. Create `src/foundation/discovery.ts`:
   - `discoverHomeLanes(workspace: string): DiscoveredLane[]` — walk up from the resolved workspace through parent directories. At each directory level, inspect `.watchtower/lanes/*/lane.json`. Parse and validate each `lane.json`: require `schemaVersion`, `laneId`, `kind`, `slug`, `initiativeId`, `controlHomeRepository`. Return all valid discovered lanes. Directories without `lane.json` are silently skipped. Non-Watchtower directories are silently skipped.
   - `discoverLanesFromDir(dir: string): DiscoveredLane[]` — inspect `.watchtower/lanes/*/lane.json` within a specific directory. Does not walk up.
   - `validateLaneManifest(path: string): LaneManifestValidation` — read and validate a `lane.json` file. Return valid manifest or error with reason.
2. Create `src/foundation/lane-selector.ts`:
   - `selectLane(discovered: DiscoveredLane[], opts: { laneId?: string; slug?: string; cwd?: string }): LaneSelectionResult` — apply v1.md §9.3 precedence:
     1. explicit `laneId` exact match → return matching lane or `not-found` error.
     2. explicit `slug` match among lanes relevant to the resolved workspace → return matching lane or `not-found` error.
     3. cwd is within a lane's directory → return that lane.
     4. exactly one active relevant lane → return it.
     5. exactly one relevant lane → return it.
     6. zero lanes → `ERR_LANE_NOT_FOUND`.
     7. multiple lanes → `ERR_AMBIGUOUS_SELECTION` with candidate listing (laneId, slug, initiativeId, kind, controlHome).
   - `resolveLane(workspace: string, opts?: { laneId?: string; slug?: string; cwd?: string }): ResolvedLane` — combine discovery and selection into one call.
3. Write focused Jasmine specs:
   - Discovery: walk from cwd finds ancestor lanes; walk from lane directory finds itself; walk from descendant finds ancestor; non-Watchtower `.watchtower/` ignored; directories without `lane.json` silently skipped.
   - Selection — UUID: exact match found; no match → `ERR_LANE_NOT_FOUND`.
   - Selection — slug: match among relevant lanes found; no match → `ERR_LANE_NOT_FOUND`.
   - Selection — cwd: cwd inside lane dir → selected; cwd not inside any lane → not selected.
   - Selection — single deduction: exactly one active lane → selected; exactly one relevant lane → selected.
   - Selection — ambiguity: 2+ lanes, no deduction → `ERR_AMBIGUOUS_SELECTION` with candidate listing.
   - Invalid lane.json: missing required field → not included in discovered lanes; missing `schemaVersion` → not included.
   - Symlink/case safety: walk through symlinked parent resolves correctly; case-insensitive comparison works correctly.

## What You Must Not Do

- Do not implement an interactive picker.
- Do not scan or modify non-Watchtower `.watchtower/` layouts.
- Do not silently select when multiple lanes match.
- Do not repair or normalize invalid lane.json.
- Do not commit.

## Required Proof

- Complete ambiguity matrix: every cell has a focused test.
- Symlink/case safety during walk.
- Non-Watchtower directories ignored.
- `nvb build` and `nvb test` pass.
- final `git status --short`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- the selection matrix must be exhaustive; no unhandled case
- ambiguity must produce an error with candidate listing, not silent selection
- invalid lane.json must be excluded or produce error, never silently repaired
- non-Watchtower directories must be ignored
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`

Include: documents studied, exact files changed, line counts, the complete
ambiguity matrix, proof commands and outcomes, final `git status --short`,
proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the discovery API (`discoverHomeLanes`, `discoverLanesFromDir`,
`validateLaneManifest`), the selector API (`selectLane`, `resolveLane`), and
the complete selection precedence matrix. RM-07 consumes discovery for
secondary-repository lookups through the membership index. RM-10 consumes
`resolveLane` for all three read-only commands. No command may reimplement
lane discovery or selection.
