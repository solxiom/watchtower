# Review Batch CA-04 — Ready Set and Resource-Claim Projection

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-04-ready-set-and-resource-claim-projection.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`

## Scope Verification

- [ ] `src/foundation/ResourceClaims.ts` created with `ResourceClaimStore`, `evaluateClaimConflict`, `registerBatchClaims`, `checkWorktreeConflict`, `checkWritableOverlap`
- [ ] `src/foundation/ReadySet.ts` created with `computeReadySet`
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
