# RM-03 Correction 01 — Close Canonical Authorization And Public Surface

Status: implemented but rejected in re-review; superseded by correction 02
Rejected review: `../RM-03-review-canonical-paths-and-workspace-resolution.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`
Superseding correction: `RM-03-correction-02.md`

## Rejection Reasons

1. `src/foundation/index.ts` exports none of the RM-03 capabilities. The
   focused spec deep-imports all three implementation modules, masking the
   missing supported surface. Downstream commands are required to consume the
   foundation barrel, so RM-06/RM-07/RM-08 cannot legally use this batch.
2. `isPathSafe` is presented as the path-safety boundary but performs lexical
   checks only. For a lane-local symlink `escape -> <outside>`, it returns
   `true` for `escape/future.txt`. This contradicts the batch's explicit
   symlink-escape contract and its handoff instruction to authorize consumer
   paths through `isPathSafe`.
3. `resolveWorkspace` accepts a regular file at `.watchtower/lanes` as an
   ancestor marker. The marker is specification-owned as a directory. This
   changes the required ancestor-versus-cwd precedence for malformed layouts.
4. The committed test module has no case-safety fixture even though the work
   brief, review brief, implementation map, tracker, and launch prompt require
   one. Independent Linux proof showed a wrong-case path rejects, but reviewer
   evidence cannot replace the required regression fixture.
5. The implementation report is stale: it records 85 lines for
   `canonicalPaths.ts` and 86 for `workspaceResolver.ts`; the reviewed files
   contain 83 and 88 lines. `workspaceResolver.ts` changed after the report was
   written. The report also claims the handoff is complete without disclosing
   the absent foundation export or the gaps above.

## Exact Adverse Paths And Expected Results

| Case | Trust boundary | Expected | Reviewed result |
| --- | --- | --- | --- |
| `<lane>/escape/future.txt`, where `<lane>/escape` symlinks to `<outside>` | public path-safety predicate | reject relative to an explicit authorized root, or keep a lexical predicate private and require a separate root-aware authorization API | `isPathSafe(...) === true` |
| `<workspace>/.watchtower/lanes` as a regular file | workspace ancestor marker | ignore malformed marker and continue to cwd/next valid ancestor | malformed ancestor selected as workspace |
| `<fixture>/TargetCase` addressed as `<fixture>/targetcase` on the supported Linux fixture | canonical case behavior | focused regression proves exact-case canonicalization and wrong-case rejection | behavior passed only in reviewer probe; no committed fixture |
| RM-03 imports through `src/foundation/index.ts` | supported foundation boundary | all intended downstream capabilities exported deliberately | no RM-03 exports |

## Required Corrected State

1. Export the deliberate RM-03 capability surface from
   `src/foundation/index.ts` and make focused consumer-facing tests import that
   surface. Do not export private containment helpers or foreign APIs.
2. Separate lexical validity from root-aware path authorization in names and
   types. No public API or handoff may represent lexical safety as symlink
   containment. Every constructed/accessed lane path must authorize both the
   lexical input and the canonical existing ancestor/candidate against an
   explicit canonical root.
3. Require `.watchtower/lanes` to be a directory after canonicalization and
   containment checks. A file, broken symlink, loop, or outside-root symlink is
   not an ancestor marker.
4. Add focused exact-case/wrong-case fixtures, plus regressions for the exact
   symlink-predicate and regular-file-marker cases above. Preserve the existing
   `..`, NUL, C0/DEL control, symlink-loop, missing-explicit, precedence, and
   zero-write cells.
5. Refresh the implementation report after the final bytes exist. Record exact
   categorized line counts, maximum function/constructor counts, public
   surface, real proof output, and final Git status.
6. Retain the evidenced `NIRVANA_API_GAP:CANONICAL_PATH_AUTHORIZATION`: the
   pinned commons storage factory is global-config-rooted and cached and does
   not provide root-aware realpath containment. Continue using Nirvana `cmd`
   for the static Git probe; do not introduce raw subprocess or a global
   storage singleton.

## Exact Files To Change

- `src/foundation/canonicalPaths.ts`
- `src/foundation/workspaceResolver.ts`
- `src/foundation/index.ts`
- `spec/foundation/pathResolution.spec.ts` (split only if the responsibility
  matrix grows beyond a cohesive preferred-band module)
- `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`
- RM-03 owner/status references affected by the correction outcome

## Required Regression Proof

- Complete data-home precedence: `WATCHTOWER_DATA_HOME`, XDG, default home.
- Complete workspace precedence: explicit, Git root, nearest valid Watchtower
  directory ancestor, cwd, and missing explicit error.
- Root-aware escape matrix: parent segments, outside symlink for existing and
  nonexistent descendants, loop/broken link, NUL, controls, absolute lane-file
  input, invalid slug, exact case, and wrong case.
- Malformed ancestor matrix: regular file, broken link, loop, outside-root
  link, and valid contained directory.
- Before/after filesystem proof for every exported resolution/construction
  capability; no directory, lock, repair, or other byte may be created.
- Foundation-barrel import proof, `nvb build`, `nvb test`, `git diff --check`,
  source architecture checks, categorized physical/function counts, ownership,
  no implementation commit, and `.local/` not staged.
