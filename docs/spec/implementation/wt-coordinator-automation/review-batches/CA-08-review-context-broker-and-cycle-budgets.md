# Review Batch CA-08 — Context Broker and Cycle Budgets

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
Paired work brief: `work-batches/CA-08-context-broker-and-cycle-budgets.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-08-context-broker-and-cycle-budgets.md`

## Scope Verification

- [ ] `src/foundation/CycleBudget.ts` created with `CycleBudget`, `BudgetTracker`, per-class defaults
- [ ] `src/foundation/ContextBroker.ts` created with `ContextBroker`
- [ ] All 8 allowlisted context types implemented
- [ ] Unauthorized context types denied with recorded event
- [ ] Soft-limit warnings; hard-limit blocking
- [ ] Provenance and redaction applied to all responses
- [ ] Budget per-cycle isolation
- [ ] Broker does not kill processes

## Required Independent Proof

1. Independently test every allowlisted context type: `batch-brief`, `review-finding`, `recent-events`, `repository-state`, `tracker-projection`, `dependency-neighborhood`, `policy-fragment`, `push-journal`.
2. Test unauthorized context type request → denied with recorded event.
3. Test budget tracking: input soft limit reached → warning returned but context served. Input hard limit reached → context blocked.
4. Test broker request counting: after N requests reach hard limit → further requests blocked.
5. Test wall-clock elapsed tracking: exceed time budget → further requests blocked.
6. Test budget per-cycle isolation: two concurrent cycles have independent budgets.
7. Test provenance tracking: every response includes source digest and path references.
8. Test redaction: sensitive fields (credentials, tokens) are redacted in responses.
9. Verify the broker does not kill a process when hard limits are reached — only blocks further context.
10. Run `nvb build` and `nvb test`. Record output.
11. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All allowlisted context types resolve correctly.
- Unauthorized types denied and recorded.
- Soft-limit warnings; hard-limit blocking.
- Budget per-cycle isolation.
- Provenance and redaction applied.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Unauthorized context type served.
- Budget bypass — context served after hard limit exceeded.
- Budget leakage between cycles.
- Missing provenance or redaction.
- Process killed by broker.
- Stale tracker/roadmap.
- Implementation agent committed changes.
