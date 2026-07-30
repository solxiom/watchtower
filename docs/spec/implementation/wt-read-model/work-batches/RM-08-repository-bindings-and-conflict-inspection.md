# Batch RM-08 — Repository Bindings And Writable Conflict Inspection

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
Phase: Bindings
Depends on: RM-03, RM-07 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** bindings with conflict detection; the claim overlap matrix spans shared-write, path-conflict, and branch-conflict classes. Wrong classification allows unsafe concurrent writes.

## Objective

Compute canonical bindings. Check branch/worktree/access. Detect claim overlap.
Read only.

## Required Work

1. Create `src/foundation/repositoryBindings.ts`: compute canonical repository bindings
   from `repositories.local.json` and current filesystem state. Validate
   branch, worktree mode (dedicated/shared), and access (read/write).
2. Create `src/foundation/writableConflicts.ts`: detect claim overlap between active
   lanes. Classify conflicts: shared-write (two lanes claim write on same
   worktree without shared override), path-conflict (exclusive-write claims
   overlap), branch-conflict (same worktree, different branches).
3. Write focused specs: canonical binding computation, branch/access/ worktree
   validation, claim overlap matrix (all three classes), dedicated vs shared
   classification, missing/unreadable repository handling.

## Expected Ownership

- `src/foundation/repositoryBindings.ts`, `src/foundation/writableConflicts.ts`
- Respective focused specs.

## Tests And Evidence

- Canonical bindings computed correctly from `repositories.local.json`.
- Branch verification against git HEAD.
- Worktree mode classification: dedicated vs shared.
- Access mode validation: read, write.
- Claim overlap — shared-write: detected and reported.
- Claim overlap — path-conflict: detected and reported.
- Claim overlap — branch-conflict: detected and reported.
- Missing/unreadable repository: error with diagnostic.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify every conflict class has a focused detection test.
2. Confirm dedicated worktree is the default recommendation.
3. Trace binding computation through path canonicalization.
4. Verify missing repositories produce errors, not null bindings.

## Completion And Handoff

Bindings and conflict inspection are accepted. RM-10 consumes bindings for
status display and conflict warnings. No consumer writes binding data.
