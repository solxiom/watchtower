# Review Batch RT-04 — Immutable Data-Root Catalog and Staging

Status: ❌ Pending
Reviews work batch: RT-04
Depends on: RT-04 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent verification of atomic staging, immutability, XDG precedence, and version coexistence. Filesystem state transitions require deep verification.

## Scope Verification

Confirm that the immutable catalog correctly stages runtime versions atomically,
enforces XDG precedence, supports version coexistence and immutability, and
correctly rejects invalid states. No adapter or managed-link logic introduced.

## Required Independent Proof

1. Test XDG precedence independently:
   - Set `WATCHTOWER_DATA_HOME` → resolved path matches
   - Unset it but set `XDG_DATA_HOME` → resolved path is `$XDG_DATA_HOME/watchtower`
   - Unset both → resolved path is `~/.local/share/watchtower`
   - Verify `~` resolved from `os.userInfo().homedir`, not `$HOME`
2. Stage a valid runtime version. Verify the version directory exists and
   contains the manifest and scripts.
3. Verify atomicity: simulate kill-during-staging (write a test that stages to a
   temp dir, kills the staging process before rename, and verifies the target
   version directory does not exist as a valid version).
4. Verify immutability: attempt to stage the same version again → must fail with
   `VERSION_ALREADY_INSTALLED`. Attempt a raw filesystem write into the staged
   directory → must be prevented or detectably invalid.
5. Verify version coexistence: stage a second version, verify both exist
   independently, verify `listInstalledRuntimes()` returns both in correct order.
6. Test rejection paths:
   - invalid version string (e.g., `v1`, `1.0`, `latest`) → `INVALID_VERSION_STRING`
   - staging with manifest/file mismatch → `STAGING_VALIDATION_FAILED`
   - `getRuntimeRoot` for uninstalled version → `VERSION_NOT_INSTALLED`
   - staging with I/O error (e.g., read-only data-root) → `STAGING_IO_ERROR`
7. Run architecture checks.

## Acceptance Gate

Accept only if XDG precedence is correct, `~` resolves from OS home, staging is
atomic (kill-safe), versions are immutable after staging, two versions coexist,
and every rejection path is independently proved.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-04-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
