# Review Batch RT-04 — Immutable data-root catalog and staging

## Synchronized batch execution matrix

- **Accepted-map title:** Immutable data-root catalog and staging
- **Dependencies:** `RT-02`, `RM-03`
- **Exclusive ownership/interface:** runtime catalog foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** XDG precedence; atomic first stage; two versions coexist; immutable version roots
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-04-immutable-data-root-catalog-and-staging.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-04-immutable-data-root-catalog-and-staging-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **runtime catalog foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-02`, `RM-03`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **XDG precedence; atomic first stage; two versions coexist; immutable version roots**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **runtime catalog foundation** and **XDG precedence; atomic first stage; two versions coexist; immutable version roots**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-04-immutable-data-root-catalog-and-staging-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
