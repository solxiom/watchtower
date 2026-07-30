# Review Batch RT-03 — NVB Distribution Staging

Status: ❌ Pending
Reviews work batch: RT-03
Depends on: RT-03 implementation complete, implementation report written

**Required reviewer reasoning class:** `R3`
**Class rationale:** bounded build-automation validation with explicit output verification. The class is a floor.

## Scope Verification

Confirm that NVB distribution staging produces a correct `dist/` tree with
validated manifests, preserved executables, and reproducible builds. No npm
scripts, catalog logic, or adapter logic was introduced.

## Required Independent Proof

1. Run `nvb dist` from a clean state. Inspect the `dist/` tree structure.
2. Compare `dist/runtime/` contents with RT-01 inventory and RT-02 manifest
   types — every inventoried script must be present.
3. Compare `dist/knowledge/` contents — every inventoried doc must be present.
4. Run `wt:runtime:validate` independently. Assert exit 0 on correct dist.
5. Independently test each rejection path:
   - remove a file from `dist/runtime/coordinator/` → validation fails
   - add an extra file to `dist/runtime/` → validation fails
   - modify a runtime script's content → checksum mismatch
   - remove execute bit from an `executable: true` script → mode mismatch
6. Verify executable bits on runtime scripts: `stat -c '%a'` shows 755 or
   higher owner-execute.
7. Prove reproducible builds: run `nvb dist` twice, compute SHA-256 of every
   `dist/` file, assert identical.
8. Confirm `nvb build` still compiles TypeScript.
9. Confirm no npm convenience scripts were added.
10. Run architecture checks.

## Acceptance Gate

Accept only if `dist/` tree matches the spec layout, every runtime and knowledge
asset is present, `wt:runtime:validate` passes, all five rejection paths fail
correctly, executable bits are preserved, builds are reproducible, and no npm
scripts were added.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-03-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-03-nvb-distribution-staging-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
