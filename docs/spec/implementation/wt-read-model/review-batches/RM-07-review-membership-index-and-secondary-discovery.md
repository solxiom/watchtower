# Review Batch RM-07 — Membership Index And Secondary-Repository Discovery

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
Paired work brief: `work-batches/RM-07-membership-index-and-secondary-discovery.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`

## Scope Verification

- [ ] `src/foundation/membershipIndex.ts` with membership index validation
- [ ] `src/foundation/SecondaryDiscovery.ts` with secondary-repository discovery

## Required Independent Proof

1. **Valid index**: Create a membership index with valid entries. Verify all entries validated and returned.
2. **Stale — PATH_MISSING**: Entry path no longer exists → stale warning, PATH_MISSING reason.
3. **Stale — LANE_JSON_MISSING**: Referenced lane home has no lane.json → stale warning.
4. **Stale — BINDING_MISMATCH**: Lane exists but no binding matches entry path → stale warning.
5. **Mixed index**: One valid + one stale entry. Verify valid returned, stale warned, valid still works.
6. **No-repair proof**: After every operation, verify the index file's modification time and MD5/SHA-256 are unchanged.
7. **Missing index**: File doesn't exist → null/empty, no error.
8. **Secondary discovery**: From a participating repo path, discover lanes through validated entries.
9. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All stale-entry classes detected and reported.
- Index file never modified by reads.
- Missing index handled gracefully.
- Build and tests pass independently.
