# Review Batch RM-03 — Canonical Paths And Workspace Resolution

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
Paired work brief: `work-batches/RM-03-canonical-paths-and-workspace-resolution.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`

## Scope Verification

- [ ] `src/foundation/dataHomeResolver.ts` created with `resolveWatchtowerDataHome`, `validateWatchtowerDataHome`
- [ ] `src/foundation/workspaceResolver.ts` created with `resolveWorkspace`, `resolveRepositoryRoot`
- [ ] `src/foundation/canonicalPaths.ts` created with `canonicalizePath`, `isPathSafe`, `buildLanePath`, `buildLaneFilePath`

## Required Independent Proof

1. Trace every resolution path through the precedence chain: `WATCHTOWER_DATA_HOME` env → XDG fallback → `~/.local/share/watchtower`.
2. Verify workspace resolution: explicit → git toplevel → ancestor walk → cwd. Missing explicit workspace throws `ERR_WORKSPACE_NOT_FOUND`.
3. Verify every path-escape class: `..`, symlink loops, null bytes, control characters — all rejected.
4. Verify canonicalization via `realpath` before all comparisons.
5. Confirm no directories are created during resolution functions.
6. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All resolution precedence tests pass.
- All path-escape attacks rejected.
- Missing workspace is an error, not creation.
- Build and tests pass independently.

## Reject Conditions

- Any path escape accepted.
- Missing workspace silently created.
- Paths compared without canonicalization.
- Stale tracker/roadmap.
- Implementation agent committed.
