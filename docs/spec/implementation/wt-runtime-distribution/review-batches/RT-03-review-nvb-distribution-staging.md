# Review Batch RT-03 — NVB Distribution Staging

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
Reviews work batch: RT-03
Depends on: RT-03 implementation complete, implementation report written

**Required reviewer reasoning class:** `R3`
**Class rationale:** bounded build-automation validation with explicit output verification. The class is a floor.

## Scope Verification

Confirm that the packaged Watchtower NVB runtime contains generated validated
config/catalog aggregates, focused pinned-public-API TaskHandlers, structured
event/result contracts, runtime and knowledge assets, and the
DB-01-selected driver. Confirm repository NVB build/dist tasks produce a
complete reproducible `dist/` tree. `LaneTaskRunner` and managed-link logic
remain outside this batch.

## Required Independent Proof

1. Run `nvb dist` from a clean state. Inspect the `dist/` tree structure.
2. Compare `dist/runtime/` contents with RT-01 inventory and RT-02 manifest
   types — every inventoried script must be present.
3. Compare `dist/knowledge/` contents — every inventoried doc must be present.
4. Inspect every `runtime-nvb/catalog/` fragment and handler. Verify each
   handler extends the pinned public `TaskHandler` export, owns one mechanical
   capability, and contains no product policy, terminal rendering, or mutation
   authority.
5. Rebuild `runtime-nvb.json` and `task-catalog.json`; verify exact agreement
   with fragments/handlers and rejection of duplicate IDs, missing handlers,
   unknown actions, stale generated aggregates, and mismatched input/result
   schemas.
6. Verify packaged `runtime-nvb.json`, compiled module, task catalog, handlers,
   and manifest are complete and load from the relocated `dist/` tree.
7. Run `wt:runtime:validate` independently. Assert exit 0 on correct dist.
8. Independently test each rejection path:
   - remove a file from `dist/runtime/coordinator/` → validation fails
   - add an extra file to `dist/runtime/` → validation fails
   - modify a runtime script's content → checksum mismatch
   - remove execute bit from an `executable: true` script → mode mismatch
9. Verify executable bits on runtime scripts: `stat -c '%a'` shows 755 or
   higher owner-execute.
10. Prove reproducible builds: run `nvb dist` twice, compute SHA-256 of every
   `dist/` file, assert identical.
11. Verify the DB-01-selected driver resolves in a clean global install on the
    current target and inspect CI/artifact proof for every additional supported
    target. Reject a claim that one host proves another ABI/platform.
12. Verify the repository's real `nvb.json`/handler conventions were used,
    `nira.json` remains ecosystem metadata, and no invented `dist.nvb` exists.
13. Confirm `nvb build` still compiles TypeScript.
14. Confirm no npm convenience scripts were added.
15. Run architecture, naming, size, and ownership checks.

## Acceptance Gate

Accept only if `dist/` matches the full packaged task-runtime layout, generated
aggregates match reviewed fragments, every focused handler uses the pinned
public API and structured contracts, runtime/knowledge/driver assets are
complete, validation rejects all tampering, target claims have real evidence,
executable bits and reproducibility hold, and no invented NVB format, npm
shortcut, `LaneTaskRunner`, or managed-link scope entered the batch.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-03-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-03-nvb-distribution-staging-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
