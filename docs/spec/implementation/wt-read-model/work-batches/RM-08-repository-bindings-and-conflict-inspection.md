# Batch RM-08 — Repository Bindings And Writable Conflict Inspection

Status: ❌ Pending
Phase: Bindings
Depends on: RM-03, RM-07 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** bindings with conflict detection; the claim overlap matrix spans shared-write, path-conflict, and branch-conflict classes. Wrong classification allows unsafe concurrent writes.

## Objective

Compute canonical bindings. Check branch/worktree/access. Detect claim overlap.
Read only.

## Required Work

1. Create `src/foundation/bindings.ts`: compute canonical repository bindings
   from `repositories.local.json` and current filesystem state. Validate
   branch, worktree mode (dedicated/shared), and access (read/write).
2. Create `src/foundation/conflicts.ts`: detect claim overlap between active
   lanes. Classify conflicts: shared-write (two lanes claim write on same
   worktree without shared override), path-conflict (exclusive-write claims
   overlap), branch-conflict (same worktree, different branches).
3. Write focused specs: canonical binding computation, branch/access/ worktree
   validation, claim overlap matrix (all three classes), dedicated vs shared
   classification, missing/unreadable repository handling.

## Expected Ownership

- `src/foundation/bindings.ts`, `src/foundation/conflicts.ts`
- Respective focused specs.

## Tests And Evidence

- Canonical bindings computed correctly from `repositories.local.json`.
- Branch verification against git HEAD.
- Worktree mode classification: dedicated vs shared.
- Access mode validation: read, write.
- Claim overlap — shared-write: detected and reported.
- Claim overlap — path-conflict: detected and reported.
- Claim overlap — branch-conflict: detected and reported.
- Missing/unreadable repository: error with diagnostic.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify every conflict class has a focused detection test.
2. Confirm dedicated worktree is the default recommendation.
3. Trace binding computation through path canonicalization.
4. Verify missing repositories produce errors, not null bindings.

## Completion And Handoff

Bindings and conflict inspection are accepted. RM-10 consumes bindings for
status display and conflict warnings. No consumer writes binding data.
