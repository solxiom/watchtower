# Review Batch LC-04 — Bindings, Git-ignore, and Membership Registration

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-04-bindings-gitignore-and-membership-registration.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`

## Scope Verification

- [ ] `src/foundation/binding-mutator.ts` created with lock-ordered binding writes, conditional Git-ignore rollback, and digest tracking
- [ ] `src/foundation/membership-registrar.ts` created with post-commit idempotent index registration and retry logic
- [ ] Lock acquisition order enforced: data-root catalog/membership-index lock, then lane lock, then session lock, then projection/index publication lock
- [ ] `.gitignore` update with atomic replace and original digest preservation
- [ ] Conditional rollback: current digest matches written value
- [ ] Membership index creation under its lock
- [ ] Post-commit registration with retry on failure
- [ ] Stale entries ignored on read (never repaired)
- [ ] Registration-warning surface on index-write failure
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Lock order verification**: instrument or trace lock acquisition calls. Verify that locks are acquired in the exact order: data-root → lane → session → projection/index. Prove that no inversion occurs in any code path (success, failure, rollback). Test with concurrent access simulation where lock inversion would cause deadlock.
2. **Binding schema validation**: valid binding fixture passes; invalid (missing required field, invalid path, duplicate repository ID) rejected.
3. **`.gitignore` presence check**: verify the file is checked before any write.
4. **`.gitignore` atomic update**: verify the original `.gitignore` is read, the new content is written to a temp file, and the temp file is renamed over the original atomically. Verify original content is preserved (not replaced). Verify new watcher entry is added.
5. **Original digest preservation**: compute SHA-256 of original `.gitignore` before modification. Verify the digest is stored (for rollback validation).
6. **Conditional rollback**: after writing, compute digest of current `.gitignore`. If it matches the expected post-write digest, the write was clean. If it does NOT match (interleaving write), the rollback condition triggers. Verify rollback restores original content. Verify rollback does not remove legitimate user additions.
7. **Membership index creation**: verify the index is created under the membership-index lock. Verify index format matches contract.
8. **Post-commit registration**: simulate a registration failure (e.g., permission denied on index file). Verify retry behavior. Verify that after retry exhaustion, the lane remains valid but a warning is surfaced.
9. **Idempotent registration**: register the same lane twice. Verify the second call does not duplicate entries. Verify the index remains valid.
10. **Stale entry handling**: create an index with a stale entry (pointing to a removed path). Verify reads report the entry as stale but do NOT remove or repair it. Verify no index mutation during read.
11. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.

## Required Reasoning Posture

The reviewer must independently verify lock ordering, atomic Git-ignore
operations, and idempotent registration. The lock order is a safety guarantee —
prove it is enforced in every code path. Do not accept implementation report
narrative about rollback correctness; rerun the rollback scenarios independently.
Verify that membership index reads never mutate the index file.

## Structural And Module-Size Acceptance

- Verify `binding-mutator.ts` is within the appropriate size band (target ≤220 lines, ceiling 350).
- Verify `membership-registrar.ts` is within the appropriate size band (target ≤220 lines, ceiling 350).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify both modules import from RM-07 (membership/index) and LC-03 (lane layout), not from commands or CLI layers.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
lock-order verification details, rollback scenario results, structural
verification results, line-count verification, tracker/roadmap sync status,
and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Lock order enforced in all code paths.
- `.gitignore` atomic update preserves original content.
- Conditional rollback proven on digest mismatch.
- Membership index created under its lock.
- Post-commit registration retries on failure.
- Idempotent registration: no duplicates.
- Stale entries reported but never repaired.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Lock inversion in any code path.
- `.gitignore` rollback removes user content.
- Non-atomic `.gitignore` replacement (partial writes visible).
- Membership index mutation during read.
- Duplicate entries from repeated registration.
- Auto-repair of stale entries.
- Silent registration failure without warning surface.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
