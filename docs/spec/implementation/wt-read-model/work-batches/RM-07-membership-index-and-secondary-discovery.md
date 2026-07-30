# Batch RM-07 — Membership Index And Secondary-Repository Discovery

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

Status: ❌ Pending
Phase: Membership
Depends on: RM-03, RM-06 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** membership with staleness detection; advisory reads with no-repair proof. Wrong validation silently treats stale entries as authoritative.

## Objective

Validate user-local membership index. Discover secondary repositories. Report
stale entries; reads never repair.

## Required Work

1. Create `src/foundation/membershipIndex.ts`: validate the advisory user-local
   membership index at `<watchtower-data-root>/index/repository-memberships.json`.
   Parse the index. Validate each entry: canonicalize path, verify existence,
   resolve referenced lane home to a valid `lane.json`, verify binding matches.
2. Create `src/foundation/SecondaryDiscovery.ts`: discover lanes from a
   participating secondary repository through the validated membership index.
   Each candidate must resolve to a valid `lane.json` with matching binding.
3. Stale-entry detection: path no longer exists, lane.json missing, binding
   mismatch → report as stale warning, do not repair.
4. Write focused specs: valid index validation, stale-entry detection for each
   class, missing index handling, no-repair proof.

## Expected Ownership

- `src/foundation/membershipIndex.ts`, `src/foundation/SecondaryDiscovery.ts`
- Respective focused specs.

## Tests And Evidence

- Valid index: all entries resolve to valid lane.json with matching bindings.
- Stale entry — path removed: path no longer exists → reported, not repaired.
- Stale entry — lane.json missing: lane home has no lane.json → reported.
- Stale entry — binding mismatch: lane exists but binding doesn't match path.
- Missing index file: no error, returns empty.
- No-repair proof: after stale detection, the index file remains unchanged.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify each stale-entry class is detected and reported.
2. Confirm index file is never written to by read-only operations.
3. Trace secondary discovery from a participating repository path.
4. Verify stale entries are ignored but reported.

## Completion And Handoff

Membership validation and secondary discovery are accepted. RM-08 consumes
membership for conflict inspection. RM-10 consumes secondary discovery for
multi-repository status output. No read command repairs the index.
