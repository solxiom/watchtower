# Review Batch CA-05 — Ordered Routing Policy and Capability Floors

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
Reasoning: `R4`
Paired work brief: `work-batches/CA-05-ordered-routing-policy-and-capability-floors.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-05-ordered-routing-policy-and-capability-floors.md`

## Scope Verification

- [ ] `src/foundation/CapabilityFloors.ts` created with `CapabilityFloor`, `DecisionClass` enums and pure mapping functions
- [ ] `src/foundation/RoutingPolicy.ts` created with all 15 routing rules from `v1-contracts.md §4`
- [ ] First-match determinism enforced
- [ ] D1→C2, D2→C3, D3→C5 capability floors
- [ ] Classification only — no execution, no model invocation, no state mutation
- [ ] Operator escalation cannot downgrade below knowledge-pack minimum
- [ ] Economic ordering occurs only after capability/access/freshness/reserve constraints

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
14. Verify free-capable preference among eligible peers and refusal to select a
    cheaper endpoint that fails any hard constraint.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 15 rules evaluated in correct priority order.
- First-match determinism proven.
- Every guard condition tested.
- Capability floors enforced correctly.
- Cost preference cannot weaken eligibility or capability floors.
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
