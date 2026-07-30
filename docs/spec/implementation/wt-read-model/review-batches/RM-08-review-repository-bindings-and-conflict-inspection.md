# Review Batch RM-08 — Repository Bindings And Writable Conflict Inspection

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-08-repository-bindings-and-conflict-inspection.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`

## Scope Verification

- [ ] `src/foundation/bindings.ts` with canonical repository binding computation
- [ ] `src/foundation/conflicts.ts` with writable conflict inspection

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

- Verify `bindings.ts` and `conflicts.ts` are within the appropriate size bands.
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify clear separation between binding computation and conflict detection.

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
