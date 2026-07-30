# Review Batch LC-03 — Transactional Lane Layout and Manifests

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-03-transactional-lane-layout-and-manifests.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-03-transactional-lane-layout-and-manifests.md`

## Scope Verification

- [ ] `src/foundation/lane-store.ts` created with lane directory layout, manifest generation, and final commit logic
- [ ] `src/foundation/transactional-writer.ts` created with adjacent staging, atomic rename, fsync, and rollback on failure
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

- Verify `transactional-writer.ts` is within the appropriate size band (target ≤300 lines, ceiling 400, given the failure-injection surface this is a very-large-class module).
- Verify `lane-store.ts` is within the appropriate size band (target ≤220 lines, ceiling 350 — manifest generation and layout responsibility).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify `transactional-writer.ts` is a general-purpose abstraction (not lane-specific); lane-specific logic stays in `lane-store.ts`.

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
