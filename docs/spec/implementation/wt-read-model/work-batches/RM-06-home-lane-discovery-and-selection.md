# Batch RM-06 — Home-Lane Discovery And Deterministic Selection

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

1. Create `src/foundation/discovery.ts`: home-lane discovery.
   Walk up from cwd through parent directories. At each level, inspect
   `.watchtower/lanes/*/lane.json`. Validate each `lane.json` (schemaVersion,
   laneId, kind, slug required). Return discovered lanes. Non-Watchtower
   directories without `lane.json` are silently skipped.
2. Create `src/foundation/lane-selector.ts`: deterministic lane selection
   following v1.md §9.3 precedence. UUID exact match → slug match among
   relevant → cwd-descendant deduction → single deductible → ambiguity error
   with candidate listing. Combine with discovery to provide a single
   `resolveLane(context)` function.
3. Write focused specs: walk-up discovery from cwd, lane-dir discovery,
   descendant discovery; selection precedence for every matrix cell; zero
   lanes, single lane, multiple lanes, invalid lane.json, missing schemaVersion;
   symlink/case safety during walk.

## Expected Ownership

- `src/foundation/discovery.ts`, `src/foundation/lane-selector.ts`
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

Per quality rules. No `helpers`/`utils` bags. Record line counts.

## Required Review Packet

Include: changed files, line counts, matrix coverage, proof commands.

## Completion And Handoff

Home-lane discovery and selection are accepted. RM-07, RM-08, and RM-10
consume these services. Every command requiring a lane delegates to
`resolveLane`. No command may reimplement lane selection.
