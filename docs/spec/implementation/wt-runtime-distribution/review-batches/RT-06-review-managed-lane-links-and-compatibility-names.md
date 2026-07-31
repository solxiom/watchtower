# Review Batch RT-06 — Managed lane links, task profiles, and compatibility names

## Synchronized batch execution matrix

- **Accepted-map title:** Managed lane links, task profiles, and compatibility names
- **Dependencies:** `RT-04`, `RT-05`
- **Exclusive ownership/interface:** managed-asset/task-profile foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-06-managed-lane-links-and-compatibility-names.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-06-managed-lane-links-and-compatibility-names-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **managed-asset/task-profile foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-04`, `RT-05`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **managed-asset/task-profile foundation** and **Manifest-only ownership; task catalog/profile pin; project `nvb.json` unchanged; link targets/checksums; collision/path-escape refusal**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-06-managed-lane-links-and-compatibility-names-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-runtime-distribution/reviews/RT-06-managed-lane-links-and-compatibility-names-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
