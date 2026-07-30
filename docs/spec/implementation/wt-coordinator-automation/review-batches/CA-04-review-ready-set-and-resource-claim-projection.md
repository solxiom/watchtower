# Review Batch CA-04 — Ready Set and Resource-Claim Projection

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-04-ready-set-and-resource-claim-projection.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`

## Scope Verification

- [ ] `src/foundation/resource-claims.ts` created with `ResourceClaimStore`, `evaluateClaimConflict`, `registerBatchClaims`, `checkWorktreeConflict`, `checkWritableOverlap`
- [ ] `src/foundation/ready-set.ts` created with `computeReadySet`
- [ ] Ready-set formula: pending batch + all deps accepted + pack baseline admissible + claims non-conflicting + endpoint route active + capacity reserved = ready candidate
- [ ] No arbitrary winner selection when multiple candidates are ready
- [ ] All claim conflict kinds detected: worktree, branch, path, capacity
- [ ] Entirely model-free

## Required Independent Proof

1. Independently compute ready set from a 30-batch fixture pack. Verify correct ready candidates.
2. Verify all dependency blockers correctly identified.
3. Verify worktree conflict detection for shared-write, branch, and path overlap.
4. Verify capacity blockers when no eligible endpoint available.
5. Prove deterministic output: same inputs → identical `ReadySetResult`.
6. Prove no arbitrary winner: multiple ready candidates → all reported individually.
7. Run `nvb build` and `nvb test`. Record output.
8. Verify no model/AI imports.
9. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Ready set correctly computed for all fixture scenarios.
- No arbitrary winner selection.
- Every blocker has a specific kind and source reference.
- Deterministic output from identical inputs.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Arbitrary winner selection (implementation accident as policy).
- Non-deterministic output.
- Missing blocker classification.
- Model/AI imports.
- Stale tracker/roadmap.
- Implementation agent committed changes.
