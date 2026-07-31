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
- [ ] Concrete `opencode-cli` and `hermes-cli` adapters remain behind the common interface
- [ ] OpenCode required conformance and Hermes conditional conformance pass
- [ ] Catalog/executable drift invalidates eligibility; shared pools are not duplicated

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
11. Run the OpenCode adapter fixture through detection, invocation, malformed
    result, timeout/cancellation, write-denial, redaction, and catalog-drift cases.
12. Verify Hermes absence is an explicit skip and an installed fixture cannot
    be selected before passing the same applicable checks.
13. Verify aliases sharing one entitlement resolve to one `capacityPoolId`.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 10 eligibility requirements independently verifiable.
- Adapters default to skill-only.
- Eligibility checker is pure.
- OpenCode and Hermes specifics remain isolated from the common interface.
- OpenCode passes batch conformance fixtures; Hermes is conditionally qualified.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Missing or untestable eligibility requirement.
- Adapter defaults to unattended without proof.
- Eligibility checker performs I/O or process execution.
- Concrete provider logic in the common interface or eligibility checker.
- Missing OpenCode adapter proof, or treating an installed unqualified Hermes
  adapter as eligible.
- Stale tracker/roadmap.
- Implementation agent committed changes.
