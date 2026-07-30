# Review Batch RT-02 — Runtime and Knowledge Manifests

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
Reviews work batch: RT-02
Depends on: RT-02 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent verification of closed type contracts and every rejection path. Manifest types are consumed by every later batch. The class is a floor.

## Scope Verification

Confirm that this batch defined closed, versioned runtime, knowledge,
packaged-NVB manifest/catalog, and lane-profile contracts; reviewable capability
fragments; and deterministic aggregate generation/validation. It must reject
missing/extra/mode/checksum errors, duplicate or stale aggregates, dangling
handlers/leaves, and profiles that add tasks/code or escape immutable targets.
No TaskHandler implementation, package staging, runner, or managed link entered.

## Required Independent Proof

1. Compare `RuntimeManifestV1` and `KnowledgeManifestV1` types with the v1 spec
   requirements in `docs/spec/v1.md` §15. Every required field must be present.
2. Independently run JSON Schema validation of the manifest types against
   `docs/spec/schemas/v1.schema.json`.
3. Run the manifest validator against a synthetic valid manifest with matching
   files. Assert `valid: true` and zero errors.
4. Independently test each rejection path:
   - missing file in directory → `MISSING_ASSET`
   - extra file in directory not in manifest → `EXTRA_ASSET`
   - checksum mismatch → `CHECKSUM_MISMATCH`
   - executable bit wrong → `MODE_MISMATCH`
   - unknown `schemaVersion` → `UNKNOWN_SCHEMA_VERSION`
5. Verify executable/task/profile records reject unknown fields unless the
   governing schema explicitly marks a metadata extension point.
6. Verify every RT-01 inventoried asset is representable in the manifest types.
7. Independently regenerate `runtime-nvb.json` and `task-catalog.json` from
   shuffled fragment enumeration and prove identical canonical output.
8. Test duplicate action/task/group/handler IDs, dangling references, missing
   declared files, schema incompatibility, and stale checked-in aggregates.
9. Verify every RT-01 migration class has the correct catalog treatment.
10. Attempt to make a profile add a task/handler/code/path, override a checksum,
    select an unknown action, or escape config/module targets; require rejection.
11. Run architecture, naming, size, and no-handler/no-staging scope checks.

## Acceptance Gate

Accept only if every manifest/catalog/profile type is closed and complete,
generated aggregates are deterministic and current, all asset and catalog
rejection paths are proven, profiles can only narrow known actions inside the
immutable runtime target, all RT-01 classifications are represented, and no
handler/staging/runner/managed-link scope entered.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-02-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-02-runtime-and-knowledge-manifests-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
