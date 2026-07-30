# Review Batch CA-06 — Endpoint Adapter Eligibility and Isolation

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
Paired work brief: `work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-06-endpoint-adapter-eligibility-and-isolation.md`

## Scope Verification

- [ ] `src/foundation/EndpointAdapter.ts` created with `EndpointAdapter` interface
- [ ] `src/foundation/EndpointEligibility.ts` created with `EndpointEligibilityChecker`
- [ ] All 10 unattended-eligibility requirements implemented
- [ ] Adapter classification: unattended, advisory-confirmed, skill-only
- [ ] Adapters default to skill-only until proven
- [ ] Classification is pure (no I/O, no state)
- [ ] No concrete provider adapters implemented — interface only

## Required Independent Proof

1. Independently enumerate all 10 eligibility requirements from `v1-contracts.md §6`.
2. Verify each requirement is independently testable.
3. Test eligibility pass: mock adapter meeting all 10 requirements → `eligible: true`.
4. Test eligibility fail: mock adapter failing each individual requirement → `eligible: false` with exact unmet requirement.
5. Verify default classification is skill-only.
6. Verify classification is pure function (no file I/O, no process execution).
7. Verify misclassified adapter cannot reach the invocation path.
8. Run `nvb build` and `nvb test`. Record output.
9. Verify no model invocation through any adapter code path.
10. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 10 eligibility requirements independently verifiable.
- Adapters default to skill-only.
- Eligibility checker is pure.
- No concrete provider logic leaked into interface.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Missing or untestable eligibility requirement.
- Adapter defaults to unattended without proof.
- Eligibility checker performs I/O or process execution.
- Concrete provider logic (Codex, Cursor, Claude specifics) in the interface layer.
- Stale tracker/roadmap.
- Implementation agent committed changes.
