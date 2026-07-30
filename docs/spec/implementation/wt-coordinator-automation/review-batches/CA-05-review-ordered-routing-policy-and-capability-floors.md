# Review Batch CA-05 — Ordered Routing Policy and Capability Floors

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/CA-05-ordered-routing-policy-and-capability-floors.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-05-ordered-routing-policy-and-capability-floors.md`

## Scope Verification

- [ ] `src/foundation/capability-floors.ts` created with `CapabilityFloor`, `DecisionClass` enums and pure mapping functions
- [ ] `src/foundation/routing-policy.ts` created with all 15 routing rules from `v1-contracts.md §4`
- [ ] First-match determinism enforced
- [ ] D1→C2, D2→C3, D3→C5 capability floors
- [ ] Classification only — no execution, no model invocation, no state mutation
- [ ] Operator escalation cannot downgrade below knowledge-pack minimum

## Required Independent Proof

1. Independently enumerate all 15 routing rules. Verify exact order matches `v1-contracts.md §4`.
2. Test every guard condition with positive and negative fixtures.
3. Prove first-match determinism: same trigger facts → same rule matched every time.
4. Verify `M0` classification for: no new durable event, heartbeat/session change, unique preauthorized candidate, status queries, uniquely-determined blocker routes.
5. Verify `D1` classification for: several ready candidates without total priority.
6. Verify `D2` classification for: reviewer REJECT, ambiguous worker BLOCKED.
7. Verify `D3` classification for: state contradiction, repeated reject above threshold, pack/source drift.
8. Verify capability floors: D1 requires C2, D2 requires C3, D3 requires C5.
9. Verify escalation cannot downgrade below knowledge-pack minimum.
10. Verify invalid/out-of-schema trigger escalates, never coerced into lower-risk shape.
11. Run `nvb build` and `nvb test`. Record output.
12. Verify no model invocation through any routing code path.
13. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 15 rules evaluated in correct priority order.
- First-match determinism proven.
- Every guard condition tested.
- Capability floors enforced correctly.
- Classification only — no mutation.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Rule order differs from `v1-contracts.md §4`.
- First-match not deterministic.
- Capability floor silently downgraded.
- M0 route invokes a model.
- Effect execution or state mutation in routing code.
- Stale tracker/roadmap.
- Implementation agent committed changes.
