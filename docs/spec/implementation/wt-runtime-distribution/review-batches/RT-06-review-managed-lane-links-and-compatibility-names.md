# Review Batch RT-06 — Managed Lane Links and Compatibility Names

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
Reviews work batch: RT-06
Depends on: RT-06 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent verification of managed-link ownership, checksum enforcement, collision refusal, and path-escape rejection. Cross-boundary filesystem safety requires deep verification.

## Scope Verification

Confirm that managed lane links validate targets against runtime manifest
checksums, refuse collisions with non-managed files, reject path-escape, and
enforce manifest-only ownership. Also verify exact lane task-profile pins,
catalog-only compatibility aliases, immutable config/module containment, and
project `nvb.json` non-interference. No second managed-asset/profile authority
exists.

## Required Independent Proof

1. Audit the codebase for `fs.symlink`, `fs.symlinkSync`, `fs.promises.symlink`.
   Verify only `ManagedAssets` creates managed symlinks.
2. Test link creation with valid target and checksum: symlink created at
   `bin/<scriptName>` pointing to correct runtime store path.
3. Test checksum mismatch: target exists in runtime store but checksum in
   manifest does not match actual file → `LINK_TARGET_CHECKSUM_MISMATCH`.
4. Test target escape: link target path contains `..` segments that would
   resolve outside the runtime root → `LINK_TARGET_ESCAPE`.
5. Test source collision: a regular file already exists at `bin/<scriptName>`
   that is not declared as managed → `LINK_SOURCE_COLLISION`.
6. Test source escape: link source path contains `..` segments that would
   resolve outside the lane directory → `LINK_SOURCE_ESCAPE`.
7. Test link removal: remove only symlinks whose current target matches the
   manifest-declared checksum (i.e., the link was genuinely managed).
8. Test link removal safety: a symlink that was replaced with a different target
   (operator edit) must NOT be removed.
9. Test a regular file at a managed path (operator replaced symlink with file) →
   must NOT be removed.
10. Test link validation: `validateLinks()` reports missing link, broken symlink,
    wrong-target symlink, and checksum-mismatched target.
11. Test compatibility name resolution: known name → canonical action; unknown
    name → `null`.
12. Test `createLinks` creates parent directories for `bin/` if absent.
13. Verify `install.json.taskRuntime` exactly pins catalog/profile/runtime
    identities/digests and immutable config/module targets.
14. Attempt profile-added code/tasks/handlers, checksum override, disallowed
    action, and target escape; require rejection.
15. Create a malicious project `nvb.json`; prove it is neither read nor changed
    and cannot alter the RT-05 target/task selection.
16. Verify planning, validation, mutation, compatibility, and profile binding
    remain focused collaborators rather than one `ManagedAssets` god object.
17. Run architecture checks.

## Acceptance Gate

Accept only if managed links validate checksums, refuse collision/escape,
compatibility names resolve only to profile-allowed catalog actions, task
runtime pins and target containment are exact, project `nvb.json` is unchanged
and irrelevant, removal is safe, all defect classes are reported, and focused
owners preserve one managed-asset/profile authority.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-06-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
