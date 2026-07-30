# Review Batch RT-06 — Managed Lane Links and Compatibility Names

Status: ❌ Pending
Reviews work batch: RT-06
Depends on: RT-06 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent verification of managed-link ownership, checksum enforcement, collision refusal, and path-escape rejection. Cross-boundary filesystem safety requires deep verification.

## Scope Verification

Confirm that managed lane links validate targets against runtime manifest
checksums, refuse collisions with non-managed files, reject path-escape, and
enforce manifest-only ownership. No second managed-asset authority exists.

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
13. Run architecture checks.

## Acceptance Gate

Accept only if managed links validate checksums, refuse collision and escape,
compatibility names resolve correctly, removal is safe (only manifest-matching
symlinks), validation reports all defect classes, and only `ManagedAssets`
creates managed symlinks.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-06-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
