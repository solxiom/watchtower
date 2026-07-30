# Review Batch LC-05 — Coordinator Session Baselines and Pack Index

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-05-coordinator-session-baselines-and-pack-index.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md`

## Scope Verification

- [ ] `src/foundation/coordinator-baseline.ts` created with finite policy seeding, correct provenance markers, and deterministic output
- [ ] `src/foundation/pack-index-bootstrap.ts` created with sealed index construction, deterministic reproduction, and seal matching
- [ ] Shipping-policy baseline seed: exact values from v1-contracts.md §7
- [ ] Routing policy baseline seed: every rule from v1-contracts.md §4, all 15 rules present
- [ ] Operator-session policy baseline seed: all defaults present
- [ ] Provenance markers reference correct spec sections
- [ ] Sealed pack index build: matches active pack seal digest
- [ ] Deterministic reproduction: two independent builds produce identical index bytes
- [ ] No full-pack fallback path
- [ ] No model invocation
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Shipping-policy baseline**: extract the seeded values. Compare against v1-contracts.md §7. Every value must match exactly. No invented defaults. No missing required keys. No extra keys not in the contract.
2. **Routing policy baseline**: verify all 15 routing rules from v1-contracts.md §4 are present. Each rule must have: rule ID, capability floor, classification, and route. Verify rule order is preserved. Verify no extra rules beyond the contract.
3. **Operator-session policy baseline**: verify all defaults from v1-contracts.md operator-session section are present. Verify session count limits, turn budgets, and hold constraints match.
4. **Provenance markers**: each policy file must include a `_provenance` field or equivalent marker referencing the exact spec section and version from which the policy was derived. Verify every provenance reference is correct.
5. **Sealed pack index build**: build the pack index from a known-good pack. Verify the index seal matches the active pack seal. Verify index entries for every pack file with correct paths, digests, and byte counts.
6. **Deterministic reproduction**: build the index twice from the same pack. Verify byte-for-byte identical output (same SHA-256 of index file). Verify no timestamp, process ID, or random value appears in the output.
7. **Model-free verification**: search all source code, imports, and function bodies in `coordinator-baseline.ts` and `pack-index-bootstrap.ts`. Verify zero model imports or invocations.
8. **No full-pack fallback**: search code paths for any condition where a full-pack scan replaces the sealed index. Verify no such fallback exists.
9. **Seal mismatch rejection**: build an index with a seal that does NOT match the pack seal. Verify the index construction rejects the mismatch.
10. **Index tampering resistance**: verify the index digest is deterministic — any change to pack content produces a different digest. Verify index validation catches digest mismatch.
11. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.

## Required Reasoning Posture

The reviewer must independently verify every seeded policy value against the
contracts. Seed correctness is the foundation for all later coordinator behavior
— a single wrong default or missing rule cascades into incorrect routing
decisions. Verify deterministic reproduction — the index must be absolutely
identical across rebuilds. Prove that no model invocation or full-pack fallback
exists in any code path.

## Structural And Module-Size Acceptance

- Verify `coordinator-baseline.ts` is within the appropriate size band (target ≤300 lines, ceiling 400, given the breadth of three policy types with multiple rules each).
- Verify `pack-index-bootstrap.ts` is within the appropriate size band (target ≤220 lines, ceiling 350).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify both modules import from LC-02 (pack seal) and RT-02 (runtime/knowledge manifests), not from commands or CLI layers.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
policy seed verification table (every key/value against contract reference),
deterministic reproduction evidence (hash before/after rebuild), model-free audit
results, structural verification results, line-count verification, tracker/roadmap
sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every policy value matches the contract exactly.
- All 15 routing rules seeded correctly.
- Provenance markers reference correct spec sections.
- Pack index seal matches active pack seal.
- Index builds are byte-for-byte identical across rebuilds.
- Zero model invocations.
- No full-pack fallback path.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Any policy value that does not match the contract.
- Missing routing rule.
- Incorrect routing rule order.
- Non-deterministic index output (timestamps, PIDs, random values).
- Model invocation for policy seeding or index construction.
- Full-pack fallback when index is available or should be built.
- Index seal mismatch silently accepted.
- Missing provenance markers.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
