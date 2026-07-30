# Review Batch RM-06 — Home-Lane Discovery And Deterministic Selection

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
Paired work brief: `work-batches/RM-06-home-lane-discovery-and-selection.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`

## Scope Verification

- [ ] `src/foundation/laneDiscovery.ts` with home-lane discovery and walk-up
- [ ] `src/foundation/LaneSelector.ts` with deterministic selection

## Required Independent Proof

1. **Ambiguity matrix — audit every cell**: Draw the complete matrix (0 lanes, 1 lane, 2+ lanes, invalid lane.json, missing schemaVersion) × (UUID match, slug match, cwd deduction, single deduction, no deduction). Verify each cell has a focused test with the correct expected outcome.
2. **Discovery walk**: Set up temp workspace with `.watchtower/lanes/<slug>/lane.json` at multiple levels. Walk from cwd, from lane dir, from descendant. Verify discovery finds correct lanes.
3. **Selection precedence**: Test each rule independently. Confirm order is exactly as specified (UUID → slug → cwd → single active → single relevant → ambiguity).
4. **Invalid lane.json**: Missing required field → excluded. Missing `schemaVersion` → excluded. Bad JSON → error.
5. **Symlink/case**: Set up workspace with symlinked parent. Verify resolved paths used in comparison.
6. **Non-Watchtower directories**: Directories without `lane.json` silently skipped. No error.
7. **No interactive picker**: Verify no code path reads stdin or prompts for selection.
8. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- Every ambiguity matrix cell tested and correct.
- Selection precedence matches v1.md §9.3 exactly.
- Symlink/case safety verified.
- No interactive picker.
- Build and tests pass independently.

## Reject Conditions

- Any matrix cell untested or incorrect.
- Silent selection when ambiguous.
- Non-Watchtower directories scanned or modified.
- Interactive picker implemented.
- Stale tracker/roadmap.
- Implementation agent committed.
